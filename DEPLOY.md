# Deploy HackCentral — Confluence on hackdaytemp

**This is a Confluence Forge app. All deployment is via Forge to hackdaytemp.atlassian.net.**

**Directory:** `/Users/nickster/Downloads/HackCentral/forge-native`

---

## Deploy (do this every time)

**You must build the Custom UI first. Forge does not build it.**

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run custom-ui:build
forge deploy --environment production --no-verify
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

Open Confluence on hackdaytemp → HackCentral. Done.

---

## Confluence still old? Use staging (bypass CDN)

Staging has no CDN cache, so you see the bundle you just deployed.

```bash
cd /Users/nickster/Downloads/HackCentral/forge-native
npm run custom-ui:build
forge deploy --environment staging --no-verify
forge install -e staging --non-interactive --site hackdaytemp.atlassian.net --product confluence
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
