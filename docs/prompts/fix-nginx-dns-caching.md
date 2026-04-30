Fix nginx DNS caching that breaks proxying after container restarts in this Docker
Compose stack.

## Problem

nginx (the `gateway` service) proxies `/api/` → api:8080 and `/py/` → pyservice:8000
via `upstream` blocks. nginx resolves those names ONCE at worker startup and caches
the IP forever, even though `resolver 127.0.0.11 valid=10s` is set — the resolver
directive only applies to runtime variables, not static `upstream { server ... }`
blocks. So when api/pyservice get rebuilt and Docker assigns them new IPs, nginx
keeps hitting the stale IP (which now belongs to a different container) and fails
with `connect() failed (111: Connection refused)`. Workaround today is
`docker compose restart gateway`.

## Files to change

- infra/nginx/nginx.conf
- infra/nginx/nginx.prod.conf
- infra/nginx/nginx.dev-ssl.conf

(All three follow the same shape — same `upstream nutrimurt_api { server api:8080; }`
and `upstream nutrimurt_py { server pyservice:8000; }` blocks plus several
`proxy_pass http://nutrimurt_api;` / `proxy_pass http://nutrimurt_py;` directives.)

## Required fix

Replace the static upstream-block pattern with a runtime variable so nginx
re-resolves DNS via `resolver 127.0.0.11` on each request:

1. Remove the two `upstream nutrimurt_api { ... }` and `upstream nutrimurt_py { ... }`
   blocks.
2. Keep `resolver 127.0.0.11 valid=10s ipv6=off;` and `resolver_timeout 5s;`.
3. In every `location` block that proxies, add a `set` line and reference the
   variable in `proxy_pass`. Example:

       location /api/ {
         set $upstream_api "api:8080";
         proxy_pass http://$upstream_api;
         proxy_set_header Host $host;
         ...
       }

   Same treatment for the pyservice blocks (`set $upstream_py "pyservice:8000";`
   and `proxy_pass http://$upstream_py;`).
4. Preserve every other directive in those blocks (rate limits, headers,
   X-Forwarded-*, CSP, etc.) exactly as-is. Don't change behavior, only the
   DNS-resolution mechanism.

Apply the change consistently across all three nginx files (nginx.conf,
nginx.prod.conf, nginx.dev-ssl.conf).

## Verify

After editing, run `docker compose restart gateway` and confirm:
- `curl -k -o /dev/null -w "%{http_code}\n" https://localhost/api/dashboard` returns
  401 (auth required, which means it reached the API), not 502.
- `docker compose logs --tail=20 gateway` shows no `connect() failed`.
- Optional: rebuild api (`docker compose up -d --force-recreate api`) WITHOUT
  restarting gateway, then re-run the curl. With the fix, it should still return
  401, not 502 — because nginx now re-resolves `api` via Docker's embedded DNS
  on each request instead of caching the IP from gateway startup.

## Don't do

- Don't change the resolver IP (127.0.0.11 is Docker's built-in DNS — correct).
- Don't switch to hardcoded IPs or compose service `links:`.
- Don't add a healthcheck dependency just to mask the problem; fix the resolution.
- Don't touch any other files (the React app, docker-compose, the API code) —
  this is purely an nginx config change.
