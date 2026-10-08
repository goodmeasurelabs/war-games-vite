# Cloudflare migration

The migration preserves the original published frontend assets from commit
`475d5b6d1159949b2725509d78cc620616c65dd9`. The deployed manifest records
SHA-256 checksums for those assets and the Cloudflare Pages advanced-mode worker.

`public/_worker.js` preserves the existing `www` to apex redirect and excludes
`pages.dev` previews from indexing. It is copied by Vite into future builds.

The owner retired the Heroku API and WebSocket backend before migration. Both
single-player and multiplayer retain that existing limitation pending a rebuild.
The original Netlify deployment remains available for rollback.

The original compiled assets were reused intentionally. A newly compiled bundle
may differ, so do not replace the recorded production artifact without a separate
build and integration review. No deployment credentials are committed here.
