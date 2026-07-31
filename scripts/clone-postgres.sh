#!/bin/bash

# PostgreSQL Clone Script
# Rebuilds a development database as a copy of production.
#
# The CloudNativePG `app` role is not a superuser and has no CREATEDB, and
# pgvector is not a trusted extension in this image -- so creating the database
# and installing `vector` must happen as `postgres` over the pod's local socket.
#
# The clone is owned by a dedicated `app_dev` role rather than production's
# `app`, so a stale DATABASE_URL or a bad paste fails closed instead of writing
# to production. The role is created here on first run; its password is taken
# from DEV_DB_PASSWORD, or generated and printed once if that is unset.
#
# Usage:
#   ./scripts/clone-postgres.sh                     # pick a backup interactively
#   ./scripts/clone-postgres.sh --from-file <dump>  # restore a specific dump
#   ./scripts/clone-postgres.sh --from-prod         # dump prod live, no file
#
# Environment overrides:
#   NAMESPACE        k8s namespace                (default: resume-builder)
#   PG_CLUSTER       CNPG cluster name            (default: resume-builder-postgres)
#   SOURCE_DB        database to copy from        (default: resume-builder)
#   TARGET_DB        database to overwrite        (default: resume-builder-dev)
#   DB_OWNER         role owning the copy         (default: app_dev)
#   DEV_DB_PASSWORD  password for DB_OWNER        (default: generated on creation)
#   BACKUP_DIR       where dumps live             (default: ./backup)
#   ALLOW_PROD       set to 1 to permit writing to PROD_DB / PROD_OWNER

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/pg-common.sh"

NAMESPACE=${NAMESPACE:-"resume-builder"}
PG_CLUSTER=${PG_CLUSTER:-"resume-builder-postgres"}
SOURCE_DB=${SOURCE_DB:-"resume-builder"}
TARGET_DB=${TARGET_DB:-"resume-builder-dev"}
DB_OWNER=${DB_OWNER:-"app_dev"}
PROD_OWNER=${PROD_OWNER:-"app"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}
APP_SCHEMA=${APP_SCHEMA:-"resume_builder"}

SOURCE_MODE="file"
DUMP_PATH=""
ASSUME_YES="false"

usage() {
    sed -n '3,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit "${1:-0}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --from-file)
            SOURCE_MODE="file"
            # An optional path may follow; anything starting with - is the next flag.
            if [ $# -gt 1 ] && [ "${2#-}" = "$2" ]; then
                DUMP_PATH="$2"
                shift
            fi
            ;;
        --from-prod)
            SOURCE_MODE="prod"
            ;;
        -y|--yes)
            ASSUME_YES="true"
            ;;
        -h|--help)
            usage 0
            ;;
        *)
            print_error "Unknown argument: $1"
            usage 1
            ;;
    esac
    shift
done

require_command kubectl
require_command pg_restore

# Never rebuild production, whatever the flags say.
assert_not_prod "$TARGET_DB"

if [ "$TARGET_DB" = "$SOURCE_DB" ]; then
    print_error "TARGET_DB and SOURCE_DB are both '$TARGET_DB'. Refusing to clone a database onto itself."
    exit 1
fi

# The role branch below can ALTER a password. Pointing DB_OWNER at production's
# role would rotate the credential the deployed app is using.
if [ "$DB_OWNER" = "$PROD_OWNER" ] && [ "${ALLOW_PROD:-}" != "1" ]; then
    print_error "DB_OWNER is '$DB_OWNER', which is the production role."
    print_error "Re-run with ALLOW_PROD=1 if this is intentional."
    exit 1
fi

# --- Resolve the primary pod -------------------------------------------------
# Looked up by role rather than hardcoded to -1, so this keeps working after a
# failover or if the cluster is scaled up.
print_status "Locating the primary Postgres pod in namespace '$NAMESPACE'..."
PRIMARY_POD=$(kubectl get pod -n "$NAMESPACE" \
    -l "cnpg.io/cluster=${PG_CLUSTER},cnpg.io/instanceRole=primary" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

if [ -z "$PRIMARY_POD" ]; then
    print_error "Could not find a primary pod for cluster '$PG_CLUSTER' in namespace '$NAMESPACE'."
    print_error "Check your kubectl context (currently: $(kubectl config current-context 2>/dev/null || echo unknown))."
    exit 1
fi

print_status "Primary pod: $PRIMARY_POD"

# Run SQL as the postgres superuser over the pod's local socket.
psql_super() {
    local database="$1"
    shift
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -c postgres -- \
        psql -U postgres -d "$database" -v ON_ERROR_STOP=1 "$@"
}

# Same, but reads SQL from stdin -- used for anything containing a password so
# the secret never appears in the pod's process arguments.
psql_super_stdin() {
    kubectl exec -i -n "$NAMESPACE" "$PRIMARY_POD" -c postgres -- \
        psql -U postgres -d "$1" -v ON_ERROR_STOP=1 --quiet
}

# Escape a value for use inside a single-quoted SQL literal.
sql_quote() {
    printf "%s" "${1//\'/\'\'}"
}

# --- Work out where the data is coming from ----------------------------------
TMP_DIR=$(mktemp -d)
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ "$SOURCE_MODE" = "prod" ]; then
    SOURCE_DESC="live dump of '$SOURCE_DB'"
else
    if [ -z "$DUMP_PATH" ]; then
        print_status "Available backups:"
        echo ""
        list_backups
        prompt_for_backup
        DUMP_PATH="${BACKUP_DIR}/${selected_backup}"
    fi

    if [ ! -f "$DUMP_PATH" ]; then
        print_error "Dump file not found: $DUMP_PATH"
        exit 1
    fi

    SOURCE_DESC="$DUMP_PATH"
fi

echo ""
print_warning "This will DROP and rebuild the database '$TARGET_DB'."
print_warning "Source: $SOURCE_DESC"
print_warning "Target: $TARGET_DB on $PRIMARY_POD (namespace $NAMESPACE)"

if [ "$ASSUME_YES" != "true" ]; then
    print_prompt "Continue? (yes/no): "
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        print_status "Clone cancelled"
        exit 0
    fi
fi

if [ "$SOURCE_MODE" = "prod" ]; then
    # pg_dump takes an MVCC snapshot, so this does not block or disrupt the
    # running application. A local copy is needed because building the restore
    # list below requires a seekable archive.
    DUMP_PATH="${TMP_DIR}/prod.dump"
    print_status "Dumping '$SOURCE_DB' from the primary..."
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -c postgres -- \
        pg_dump -U postgres -Fc -d "$SOURCE_DB" > "$DUMP_PATH"
    print_status "Dumped $(du -h "$DUMP_PATH" | cut -f1)"
fi

# --- Ensure the dev role exists ----------------------------------------------
# Created once and then left alone: re-running the clone must not rotate the
# password out from under an existing DATABASE_URL. Pass DEV_DB_PASSWORD to set
# or deliberately rotate it.
GENERATED_PASSWORD=""
ROLE_EXISTS=$(psql_super postgres -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname = '$(sql_quote "$DB_OWNER")'" | tr -d '[:space:]')

if [ -z "$ROLE_EXISTS" ]; then
    if [ -z "${DEV_DB_PASSWORD:-}" ]; then
        # Alphanumeric only, so it needs no escaping inside a connection URI.
        # Avoid piping /dev/urandom into `head`, which SIGPIPEs the writer and
        # trips pipefail.
        if command -v openssl &> /dev/null; then
            GENERATED_PASSWORD=$(openssl rand -hex 16)
        else
            GENERATED_PASSWORD=$(head -c 256 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | cut -c1-32)
        fi
        DEV_DB_PASSWORD="$GENERATED_PASSWORD"
    fi
    print_status "Creating role '$DB_OWNER'..."
    printf "CREATE ROLE %s LOGIN PASSWORD '%s';\n" \
        "\"$DB_OWNER\"" "$(sql_quote "$DEV_DB_PASSWORD")" \
        | psql_super_stdin postgres
elif [ -n "${DEV_DB_PASSWORD:-}" ]; then
    print_status "Updating password for role '$DB_OWNER'..."
    printf "ALTER ROLE %s WITH LOGIN PASSWORD '%s';\n" \
        "\"$DB_OWNER\"" "$(sql_quote "$DEV_DB_PASSWORD")" \
        | psql_super_stdin postgres
else
    print_status "Role '$DB_OWNER' already exists; leaving its password unchanged."
fi

# --- Bootstrap the target database as superuser ------------------------------
print_status "Recreating database '$TARGET_DB'..."

# WITH (FORCE) terminates any local backend still holding a connection, so a
# refresh does not fail just because the dev server is running.
psql_super postgres -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\" WITH (FORCE);"
psql_super postgres -c "CREATE DATABASE \"${TARGET_DB}\" OWNER \"${DB_OWNER}\";"

# `public` holds the Mastra tables and is not world-writable on PG 15+, so it
# needs an explicit owner. `vector` is untrusted, so only postgres can install
# it -- and it must exist before the restore creates any vector-typed column.
print_status "Installing extensions and schemas..."
psql_super "$TARGET_DB" \
    -c "ALTER SCHEMA public OWNER TO \"${DB_OWNER}\";" \
    -c "CREATE SCHEMA IF NOT EXISTS \"${APP_SCHEMA}\" AUTHORIZATION \"${DB_OWNER}\";" \
    -c "CREATE EXTENSION IF NOT EXISTS vector SCHEMA \"${APP_SCHEMA}\";"

# --- Restore ------------------------------------------------------------------
# Drop the archive entries that duplicate what was just created. Without this
# the restore aborts on `CREATE SCHEMA` (the dump omits IF NOT EXISTS) and on
# `COMMENT ON EXTENSION` (which requires extension ownership). Matching on the
# entry type rather than specific names keeps this correct if another extension
# is added later.
TOC_FILE="${TMP_DIR}/restore.list"
pg_restore -l "$DUMP_PATH" \
    | grep -vE ' (SCHEMA|EXTENSION) - | COMMENT - EXTENSION ' \
    > "$TOC_FILE"

print_status "Restoring into '$TARGET_DB'..."

# Streaming SQL text into the pod's psql avoids copying the archive into the
# container and avoids needing the app role's password locally. The `\restrict`
# guard emitted by pg_dump 18 is stripped because the server's psql 17.0
# predates that meta-command; it is a wrapper directive, not data.
pg_restore -L "$TOC_FILE" --no-owner --role="$DB_OWNER" -f - "$DUMP_PATH" \
    | sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' \
    | kubectl exec -i -n "$NAMESPACE" "$PRIMARY_POD" -c postgres -- \
        psql -U postgres -d "$TARGET_DB" -v ON_ERROR_STOP=1 --quiet -o /dev/null

# --- Verify -------------------------------------------------------------------
print_status "Verifying..."

table_counts() {
    psql_super "$1" -tAc \
        "SELECT schemaname || '=' || count(*)
           FROM pg_tables
          WHERE schemaname IN ('public', '${APP_SCHEMA}')
          GROUP BY schemaname
          ORDER BY schemaname" | tr -d '\r' | paste -sd' ' -
}

SOURCE_COUNTS=$(table_counts "$SOURCE_DB")
TARGET_COUNTS=$(table_counts "$TARGET_DB")

echo ""
echo "  source ($SOURCE_DB): $SOURCE_COUNTS"
echo "  target ($TARGET_DB): $TARGET_COUNTS"

EXT_LOCATION=$(psql_super "$TARGET_DB" -tAc \
    "SELECT e.extname || ' in ' || n.nspname
       FROM pg_extension e
       JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'vector'" | tr -d '\r')
echo "  extension: ${EXT_LOCATION:-MISSING}"
echo ""

if [ "$SOURCE_COUNTS" != "$TARGET_COUNTS" ]; then
    print_error "Table counts differ between source and target -- the clone is incomplete."
    exit 1
fi

print_status "Clone completed successfully!"
echo ""

if [ -n "$GENERATED_PASSWORD" ]; then
    print_warning "Generated a password for '$DB_OWNER'. It is not stored anywhere -- save it now:"
    echo ""
    echo "  $GENERATED_PASSWORD"
    echo ""
    PASSWORD_DISPLAY="$GENERATED_PASSWORD"
else
    PASSWORD_DISPLAY="<password>"
fi

print_status "Point local development at it with:"
echo "  DATABASE_URL=postgresql://${DB_OWNER}:${PASSWORD_DISPLAY}@localhost:5432/${TARGET_DB}"
echo "  POSTGRES_USER=${DB_OWNER}"
echo "  POSTGRES_DB=${TARGET_DB}   # orchestration / Mastra reads these separately"
