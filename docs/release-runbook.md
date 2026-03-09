# Phase 13 Release Runbook

## Preflight
1. Install dependencies: `npm ci`
2. Run ship-blocker checks: `npm run release:check`
3. Run browser smoke tests: `npm run test:smoke`
4. Freeze content snapshots in a fixed order: `npm run content:freeze`
5. Review content diffs: `git diff -- public/index.html`

## Deploy Sequence
1. Deploy static site using the existing `adamjones.ca` publish flow.
2. If API code or migrations changed:
   - `cd workers/todos-api`
   - `npx wrangler d1 migrations apply adamjones_todos --remote`
   - `npx wrangler deploy`
   - `cd ../..`

## Post-Deploy Verification
1. Homepage availability:
   - `curl -I https://adamjones.ca`
   - Open `https://adamjones.ca` and verify machine scene load + panel interactions.
2. API health:
   - `curl https://api.adamjones.ca/health`
   - Expect HTTP `200` with `{ "ok": true }`.
3. Manual regression spot-check:
   - Desktop: one-open-panel behavior.
   - Mid-size: panel anchoring near hotspots.
   - Mobile: vertical strip layout + drawer toggle/Escape close.
