# INSPIRE V1.4 — Migration Foundation

This release adds:

- Full employee name in the Home greeting.
- Home "About Us" page with Black Owl Vision, Mission, and EPIIC.
- Official Instagram directory on Home/About Us.
- Operational Learning Library (109 published modules currently indexed in the backend).
- Learning search + Department + Period filters.
- Employee Forms dynamic actions:
  - Employee Request
  - Promotion
  - SP & PP
- Whistle Blowing System (WBS) Employee Resource with embedded Drive video.
- PWA cache refresh.

## Existing core remains unchanged
No changes are required to:
- Employee ID + PIN login
- PIN/session hashing
- Gateway secret
- Cloudflare action whitelist
- Cloudflare variables
- PWA manifest/icons

## Google Sheets
Backend has already been prepared:
- Learning_Modules: 109 PUBLISHED items
- Resource_Actions: Forms actions
- Employee_Resources: Forms updated + WBS added
- Migration_Tracker updated

## Apps Script — REQUIRED BEFORE MERGING FRONTEND
Open the existing Apps Script project.

1. Open:
   INSPIRE_V1_3_Addon.gs

2. Replace its entire content using this repo file:
   apps-script/INSPIRE_V1_3_Addon.gs
   from branch: inspire-v1.4-migration-foundation

3. Save.

4. DO NOT change Code.gs handlers. V1.4 uses the same existing endpoint:
   getEmployeeCenterData

5. Deploy:
   Deploy → Manage deployments → Edit → New version → Deploy

Keep existing deployment settings and secrets.

## Cloudflare
No changes required.

## GitHub
After Apps Script deployment succeeds:
- merge the V1.4 pull request into main
- wait for GitHub Pages deployment
- reopen/refresh INSPIRE

## Test
1. Home:
   - greeting shows full employee name
   - About Us opens
   - Vision / Mission / EPIIC display
   - Instagram links work
2. Learning:
   - 109 modules available
   - search works
   - Department filter works
   - Period filter works
3. Employee → Forms:
   - Employee Request visible
   - Promotion and SP & PP visible for Leader/Admin
4. Employee → WBS:
   - WBS description displays
   - WBS video loads
5. Login/session/logout remain normal
