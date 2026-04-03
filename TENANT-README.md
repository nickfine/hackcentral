This working copy is the dedicated HackCentral tenant clone for `tag-hackday.atlassian.net`.

Use this clone for all live `tag-hackday` deploys.

Working model:
- local-only branch: `tenant/tag-hackday`
- do shared product work first in `/Users/nickster/Downloads/HackCentral`
- pull shared changes into this clone before deploy:
  - `git fetch origin`
  - `git rebase origin/main`
- never push `tenant/tag-hackday`

Allowed tenant-local differences in this clone:
- `forge-native/manifest.yml`
- `TENANT-README.md`
- untracked local env files such as `.env.local`

Key ids:
- Forge app id: `22696465-0692-48af-9741-323e1cfc2631`
- Production env id: `1c797890-3b54-448e-85da-4ecbe9e9e777`
- Staging env id: `15ac566f-3a62-4ffd-9fd6-1e50e5a47c9b`

Canonical production URL:
- `https://tag-hackday.atlassian.net/wiki/apps/22696465-0692-48af-9741-323e1cfc2631/1c797890-3b54-448e-85da-4ecbe9e9e777/hackday-central`

Guardrail:
- Do not use `/Users/nickster/Downloads/HackCentral` for `tag-hackday` deploys.
- That checkout is still wired to the legacy `hackdaytemp` Forge app.
