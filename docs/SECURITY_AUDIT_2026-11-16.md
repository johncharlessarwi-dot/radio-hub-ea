# Security audit — REDIO HUB EA (2026-11-16)

## Scope and changes

Security remediation commits target:
- **URL parsing:** length/control-character validation, URL credentials, public-address filters, restricted network ports, removal of fragments, and bounded discovery.
- **Crawler and stream health:** explicit approved host allowlist (`CRAWL_ALLOWED_HOSTS`), HTTPS-only official sites, no redirects, robots compliance, body-size caps, bounded workers, and restrictive failure states.
- **Fastify API:** rate limiting, report-specific anti-spam limits, strict input schemas, bounded payloads/timeouts, restricted production CORS, response hardening headers, and filtered broadcaster metadata.
- **SQLite:** limited busy waits and `trusted_schema=OFF`.
- **Community ingestion:** bounded response size and metadata lengths, deduplication, and unapproved-by-default imports.
- **Video metadata:** HTTPS canonical URLs, strict YouTube URL format and query arguments, prevention of private network addresses, source provenance and non-future verification timestamps.
- **Regression tests:** negative input and unsafe URL cases, restrictive API response checks and video metadata checks.

## Important limitations and remaining blockers

This is **source-level security work, not a penetration-test certification**. The crawler performs a DNS check before sending a request, but this alone does not provide complete protection against DNS rebinding / time-of-check-to-time-of-use. No public arbitrary URL proxy should be deployed. Keep `CRAWL_ENABLED=false` until the hosts are manually approved and outbound network rules enforce the allowlist.

The `CRAWL_ALLOWED_HOSTS` environment variable must list exact official hostnames, comma-separated. Empty means no official crawling. Do not accept untrusted URLs from user input, configuration requests, or API endpoints. Deploy behind infrastructure firewalls that block private/reserved network destinations.

The API includes rate limiting but uses in-memory counters by default; in multi-instance deployments use a shared limiter store or a reverse-proxy/WAF with distributed controls. Do not expose the management database to the public network.

Before declaring release readiness:
1. Confirm `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` return success in GitHub Actions.
2. Run dependency audit with `npm audit --omit=dev --audit-level=high` and record actionable findings.
3. Confirm Android Gradle APK builds; review Media3 notification controls, service permissions and signing keys.
4. Test server-side egress restrictions and reject nonpublic/DNS-rebinding targets.
5. Perform a safe staging-only rate-limit test; do not DDoS real broadcasters or public services.
6. Verify broadcasters permit linking/embedding; do not approve unverified streams.
7. Test user-supplied metadata against encoded URLs, malicious hostnames and payload bursts.

No CI PASS, APK signing result, live-stream rights approval, or physical-device security test is asserted by this document.
