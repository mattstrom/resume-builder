import type { Request } from 'express';

import config from '@/config';

/**
 * Resolve the origin that clients actually reach this server on.
 *
 * OAuth protected-resource metadata has to advertise the public origin: the
 * `resource` value a client reads here is compared against the audience its
 * token was minted for, so an origin that is merely reachable is not enough —
 * it has to be the exact one.
 *
 * A request cannot be trusted to supply it. Behind the Cloudflare Tunnel, TLS
 * terminates at Cloudflare's edge and the request arrives at the pod as plain
 * HTTP, so `request.protocol` reports `http` and any URL built from it
 * advertises a scheme the public origin does not serve. `X-Forwarded-Proto`
 * is no better: it is spoofable by any client, and Traefik overwrites it with
 * its own entrypoint scheme unless its trusted-IP list is configured to
 * forward it.
 *
 * So `publicUrl` is configuration, not inference. Left empty — local
 * development — this falls back to the request, which is correct there because
 * the client really is talking to the server directly.
 */
export function publicOrigin(request: Request): string {
	if (config.publicUrl) {
		return config.publicUrl.replace(/\/+$/, '');
	}

	return `${request.protocol}://${request.get('host')}`;
}
