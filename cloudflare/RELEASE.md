# Release verification

Prepared on a reconciliation branch. This workflow has not deployed production through GitHub Actions. Pull requests build and run the existing checks without deployment secrets. Pushes to `main` validate, rebuild the same commit in the `cloudflare-production` environment, then deploy. Manual runs also require `main`. Failed validation stops the release.

Before merging: verify deployed-source parity, approve and bind the least-privilege encrypted `CLOUDFLARE_DEPLOY_TOKEN`, confirm current runtime bindings with authenticated provider reads, and test the candidate host. Missing credentials are a blocker, not evidence that no secret exists (the current GitHub secret read returned 403). Existing protection rules must remain intact.

Retain original hosting and the current Cloudflare deployment/version ID for rollback. A homepage HTTP 200 alone does not establish functional correctness or source parity. Record the successful Actions run, exact commit, resulting provider version, critical-route/browser checks, and rollback target in the platform release registry. Only then disconnect obsolete repository-scoped provider build/check integration. Keep data services and rollback deployments.

Browser QA must block analytics, feedback, email, and writes; it does not verify those live integrations. Bitcoin retains its D1 relay and disabled newsletter sending. Babe Ruth gameplay retains its previously accepted retired-backend limitation.

## Reproduced production artifact

The original published bundle uses the retired Heroku HTTP origin (including its trailing slash) and WebSocket origin. The repository previously selected Fly through `.env.production`; a green rebuild therefore did not prove production parity. Restoring the historical public build inputs reproduces all 13 SHA-256 entries in `deployment-manifest.json`, including the JavaScript bundle and routing worker, byte-for-byte. No backend was contacted, restarted or changed.

CI now checks the entire publish-directory file list and every hash against that reviewed manifest. An intentional product change must update the manifest as part of its reviewed release. Changing backend origins or reactivating gameplay needs a separate explicit decision; do not silently update the baseline to make CI green.

Retirement provenance: `cloudflare/README.md` introduced in migration commit `d1c9cd09db2e0fd075df5e1f1ba2bea7f8eb4150` records the owner's prior retirement of the Heroku API/WebSocket service. Platform's hosting record in `d35041a93612c77266abdec6d4617e71105fb5a9` independently preserves that migration-ledger statement. These are repository records of the prior decision, not a new instruction to delete or disable any backend.
