# Deploy HackCentral — Confluence on hackdaytemp

**This is a Confluence Forge app. All deployment is via Forge to hackdaytemp.atlassian.net.**

**Directory:** `/Users/nickster/Downloads/HackCentral/forge-native`

---

## Deploy (do this every time)

**You must build the Custom UI first. Forge does not build it.**

```bash
cd /Users/nickster/Downloads/HackCentral
./scripts/with-node22.sh npm run qa:backup:predeploy-snapshot -- --apply --environment production --site hackdaytemp.atlassian.net
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment production --no-verify
../scripts/with-node22.sh forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

Open Confluence on hackdaytemp → HackCentral. Done.

---

## Showcase Page-Only Rollout Flag

Set this at build-time for `forge-native/static/frontend` when legacy showcase fallback can be retired:

```bash
VITE_HDC_SHOWCASE_PAGE_ONLY_V1=true
```

- `false` (default): hybrid mode (`Open page` for page-backed, legacy detail fallback for old rows).
- `true`: page-only mode (all cards route to Confluence pages; legacy drawer path disabled).

Recommended guardrail before enabling:
- Run `npm run qa:phase8:showcase-backfill -- --apply` until coverage report shows `legacyCount=0`.

---

## Confluence still old? Use staging (bypass CDN)

Staging has no CDN cache, so you see the bundle you just deployed.

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
../scripts/with-node22.sh npm run custom-ui:build
../scripts/with-node22.sh forge deploy --environment staging --no-verify
../scripts/with-node22.sh forge install -e staging --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

Get the staging environment ID:

```bash
forge environments list
```

Open the app via the **staging URL** (replace `STAGING_ENV_ID`):

```
https://hackdaytemp.atlassian.net/forge-apps/a/f828e0d4-e9d0-451d-b818-533bc3e95680/e/STAGING_ENV_ID/r/hackday-central
```

---

## Quick reference

| Directory       | Build step                | Deploy command                                          |
|-----------------|---------------------------|---------------------------------------------------------|
| `forge-native/` | `npm run custom-ui:build` | `forge deploy --environment production --no-verify` then `forge install ...`   |
