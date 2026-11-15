# Community station discovery

This is optional. Radio Browser provides a free community directory that **does not prove broadcast authorization**. Use only for candidate discovery. Country ISO codes: TZ, KE, UG, RW, BI. Imported streams are `approved=0` and not included in the public station list until verified and approved. Dedupe uses normalized station name + country; IDs use Radio Browser's stable `stationuuid`.

Reference: https://docs.radio-browser.info/

`fetchCommunityStations(country)` retrieves up to 100 candidates from a short allowlist of API mirrors. Import with `importCommunityStations(db, entries)` in an operator-controlled workflow. Do not enable arbitrary host selection or expose an unauthenticated import endpoint.
