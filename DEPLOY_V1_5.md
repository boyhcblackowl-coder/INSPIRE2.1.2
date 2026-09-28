# INSPIRE V1.5 — Native Employee Handbook

This release moves the Black Owl Indonesia Employee Handbook into the INSPIRE Web App as a native, searchable experience.

## What is already prepared

Google Sheets backend:
- Handbook_Meta
- Handbook_Blocks
- 17 handbook chapters
- 647 handbook content blocks
- Employee_Resources now includes a dedicated "Employee Handbook" card
- Policies no longer opens the handbook document
- The original Google Doc remains available only as a backup/source link

Native handbook features:
- Table of Contents
- Search across handbook content
- Chapter navigation
- Previous / Next chapter
- Mobile responsive layout
- Search term highlighting
- Original Google Doc backup button

## Core security remains unchanged

No changes are required to:
- Code.gs handlers
- Cloudflare Worker
- Employee ID + PIN login
- Session hashing
- GATEWAY_SECRET
- PIN_PEPPER
- SESSION_PEPPER
- PWA manifest or icon

V1.5 reuses the existing action:
getEmployeeCenterData

The handbook is requested with:
getEmployeeCenterData(sessionToken, "HANDBOOK")

## REQUIRED STEP 1 — Apps Script

Open the existing INSPIRE Apps Script project.

Open:
INSPIRE_V1_3_Addon.gs

Replace its entire content with:
apps-script/INSPIRE_V1_3_Addon.gs
from branch:
inspire-v1.5-native-handbook

Save.

Do NOT edit Code.gs.

Deploy:
Deploy → Manage deployments → Edit → New version → Deploy

Keep the existing deployment settings, URL, and secrets.

## REQUIRED STEP 2 — GitHub

After the Apps Script deployment is successful:
- open the V1.5 pull request
- merge it into main
- wait for GitHub Pages deployment
- reopen/refresh INSPIRE

The service worker cache version is already bumped.

## TEST

1. Login normally.
2. Employee → confirm these cards:
   - Policies
   - Employee Handbook
   - Forms
   - Benefits
   - Directory
   - Whistle Blowing System
3. Open Employee Handbook.
4. Confirm 17 chapters are shown.
5. Search for:
   - cuti
   - pelecehan
   - medical
   - WBS
6. Open several chapters.
7. Test Previous / Next chapter.
8. On mobile, confirm chapter cards can scroll horizontally.
9. Confirm login/logout/session remain normal.

## Source integrity

The handbook content in Handbook_Blocks is a snapshot migrated from:
Black Owl Indonesia-Employee Handbook
Google Doc ID:
1b0nmVgDMxJbUjMbMwoSi0sNyBa2mHjOJwjxxByrJXZw

The migration preserves source wording rather than silently rewriting handbook content.
