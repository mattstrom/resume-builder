# Self-hosted GitHub Actions runner on macOS

This repository's deployment workflow runs after a commit reaches `main`. It
builds and pushes the backend, web, orchestration, and CRDT images with the
commit SHA as the image tag, then deploys that exact tag with Helm.

The setup can be applied through the included
[`github_actions_runner_macos`](../ansible/roles/github_actions_runner_macos/README.md)
Ansible role. The manual steps below also document the role's prerequisites and
the GitHub-side configuration that remains outside the MacBook.

The runner is deliberately not used for pull request jobs. A persistent
self-hosted runner executes repository code directly on its host and should be
treated as production infrastructure.

## 1. Prepare the MacBook

Use a dedicated standard macOS account for the runner. Do not keep personal
files, browser sessions, SSH keys, or unrelated credentials in that account.
Keep macOS patched and enable FileVault and the firewall.

Install the command-line tools and Homebrew, then install the build tools while
logged in as the runner account:

```sh
xcode-select --install
brew install node@24 helm kubectl
```

Install Docker Desktop for Mac in `/Applications` if it is not already
installed. Docker Desktop supplies the Docker CLI, Buildx, and the Linux VM
that runs Docker Engine. Open Docker Desktop while logged in as the dedicated
runner account, complete its initial setup, and enable **Start Docker Desktop
when you sign in** under **Settings > General**.

Under **Settings > Advanced**, set **CLI tools installation** to **System** so
Docker places its command symlinks in `/usr/local/bin`. That directory is on
the GitHub runner service's configured `PATH`.

Confirm that Docker Desktop is running and that the runner account can use both
the engine and Buildx without `sudo`:

```sh
command -v docker
docker version
docker info
docker buildx version
docker run --rm hello-world
```

Under **Docker Desktop > Settings > Resources**, allocate enough CPU, memory,
and disk for four image builds. The workflow runs the builds sequentially, so a
reasonable starting point is 4 CPUs, 8 GB of memory, and at least 100 GB of
Docker disk capacity, adjusted to the MacBook's available resources.

Keep the machine connected to power and configure macOS not to sleep while on
power. Docker Desktop and the standard GitHub runner service both start in the
logged-in user's session, so the runner account must be logged in after a
reboot. Automatic login improves unattended recovery but weakens physical
security; use it only if the machine is in a physically secure location. After
rebooting, verify that Docker Desktop reaches the **Engine running** state and
that the GitHub runner returns to **Idle**.

Allow outbound HTTPS to GitHub, `registry.mattstrom.com`, and the Kubernetes
API endpoint. GitHub's runner initiates its connection outbound, so it does not
need an inbound port exposed to the internet.

## 2. Match the deployment architecture

By default, Docker Desktop builds for its Linux VM's native architecture.
Compare it with the Kubernetes nodes:

```sh
uname -m
kubectl get nodes \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.architecture}{"\n"}{end}'
```

If an Apple Silicon Mac builds for an amd64 cluster, create a GitHub Actions
repository variable named `DOCKER_PLATFORM` with the value `linux/amd64`. For
an arm64 cluster, use `linux/arm64`. Leave the variable unset when the
architectures already match. Cross-platform builds use emulation and will be
slower than native builds.

## 3. Give the runner cluster access

Create a Kubernetes service account or kubeconfig whose permissions are
limited to the `resume-builder` namespace and the resources managed by the
chart. Confirm the credential works from the runner account:

```sh
KUBECONFIG=/path/to/production.kubeconfig kubectl cluster-info
KUBECONFIG=/path/to/production.kubeconfig helm list -n resume-builder
```

Store the complete kubeconfig as the `KUBE_CONFIG` GitHub environment secret
in the next section. The workflow writes it to a temporary file for each job
and removes it afterward.

## 4. Register the runner

In the repository, open **Settings > Actions > Runners > New self-hosted
runner**, select macOS and the MacBook's architecture, and run the generated
commands as the dedicated runner account. The registration token shown by
GitHub expires after one hour.

When running `config.sh`, use these values:

- Runner name: `resume-builder-mac`
- Additional label: `resume-builder-deploy`
- Work folder: accept `_work`

After registration, install and start the generated macOS service from the
runner directory:

```sh
./svc.sh install
./svc.sh start
./svc.sh status
```

The runner should now appear as **Idle** with the `self-hosted`, `macOS`, CPU
architecture, and `resume-builder-deploy` labels.

## 5. Configure the production environment

In **Settings > Environments**, create an environment named `production`.
Restrict its deployment branches to `main`. Add a required reviewer if the
repository plan supports it and a human approval is desired after every merge.
Protect `main` with a repository ruleset that requires changes to arrive
through pull requests, along with the desired reviews and CI status checks.
The deployment listens for a `push` to `main`, which deploys the repository's
actual post-merge commit and also makes accidental direct pushes visible.

Add a single environment secret:

| Secret                     | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password service account token, scoped to the vault below |

The workflow's "Load secrets from 1Password" step uses this token to pull the
remaining deploy secrets from the `resume-builder-deploy` vault's
`production-deploy` item at run time, rather than storing them as GitHub
Actions secrets:

| Field               | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `kube_token`        | Bearer token for the `resume-builder-deployer` ServiceAccount |
| `postgres_password` | PostgreSQL password passed to the Helm chart                  |
| `anthropic_api_key` | Orchestration service API key                                 |
| `auth_client_id`    | Production Auth0 client ID                                    |

Create a 1Password service account (**1Password.com > Developer > Service
Accounts**) scoped to read-only access on the `resume-builder-deploy` vault
only, and store its token as the `OP_SERVICE_ACCOUNT_TOKEN` secret above. The
`1password/load-secrets-action` step masks each field's value in the job log
and exports it as a plain environment variable for the rest of the job.

The workflow assembles its kubeconfig at run time from `kube_token` plus two
non-secret **environment variables** (\*\*Settings > Environments > production

> Environment variables\*\*, not secrets — the cluster address and CA cert
> aren't sensitive):

| Variable       | Purpose                               |
| -------------- | ------------------------------------- |
| `KUBE_SERVER`  | Kubernetes API server URL             |
| `KUBE_CA_DATA` | Base64-encoded cluster CA certificate |

Get both from an existing admin kubeconfig for the cluster:

```sh
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'
```

Generate `kube_token` with a bound ServiceAccount token, scoped to the
`resume-builder` namespace:

```sh
kubectl create token resume-builder-deployer -n resume-builder --duration=8760h
```

This token expires after the requested duration (here, roughly a year) — it
is not a permanent credential. Rotate it before it expires by re-running the
command above and updating the `kube_token` field in 1Password, or deploys
will start failing with an authentication error.

`registry.mattstrom.com` fronts the MicroK8s registry without authentication,
so the workflow pushes without a `docker login` step. The workflow gives
`GITHUB_TOKEN` read-only repository access and keeps the Docker config in a
temporary, isolated directory rather than the runner account's persistent
Docker config.

## 6. Test and operate it

Before relying on automatic deploys, open **Actions > Build and deploy > Run
workflow** on `main`. Check that all four commit-tagged images exist in the
registry and that the Helm release reports the same tag:

```sh
helm get values resume-builder -n resume-builder
kubectl get pods -n resume-builder
```

After the manual test, merging a pull request into `main` produces a `push`
event and runs the same workflow. The production concurrency group allows only
one deployment at a time. Helm's `--atomic` option rolls the release back if it
does not become ready within ten minutes.

Periodically update macOS and the Homebrew packages, check free disk space, and
remove unused Docker build data during a maintenance window. GitHub updates the
runner application automatically by default.
