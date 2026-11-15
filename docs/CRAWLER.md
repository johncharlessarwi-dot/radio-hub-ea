# Official stream discovery / Utambuzi wa streams

The 10 seeds contain metadata placeholders and no invented stream URL. Only station-owned sites should be added to `stations.website` after manual verification. Enable scheduled discovery with `CRAWL_ENABLED=true`. The job runs once daily at 03:15 server-local time; it honors `robots.txt` and throttles each host. Discovered streams are stored as `approved=0` and must be reviewed before inclusion in the API. Health checks run every 15 minutes for approved streams.

This early implementation is **not** yet hardened against all DNS-rebinding attacks and should not be exposed as a public arbitrary-URL stream proxy. No proxy endpoint is enabled. Broadcasts must have valid reuse permissions.
