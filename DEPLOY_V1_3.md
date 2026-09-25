# INSPIRE V1.3 Pilot — Deployment Guide

This branch adds the frontend for:
- Employee Center (Policies, Forms, Benefits, Directory)
- Community post with video + Like + Comment + Reply
- Learning Hub with PDF viewer + progress tracking

The existing login, PIN, session, PWA, and Cloudflare gateway design are intentionally preserved.

## 1. Google Sheets backend
Already prepared in **INSPIRE Engagement Hub - Backend**:
- Employee_Resources
- Learning_Modules
- Learning_Progress
- Posts media columns (MEDIA_TYPE, MEDIA_URL, MEDIA_TITLE)
- Outing 2026 community post
- Sequence of Service 2024 learning module
- EATS attendance video in Policies

## 2. Apps Script
Do NOT replace the login/security core.

Add this repository file as a **new Apps Script file**:
`apps-script/INSPIRE_V1_3_Addon.gs`

Then, inside the existing `doPost(e)` handler map in `Code.gs`, add:

```javascript
getEmployeeCenterData: function () {
  return getEmployeeCenterData.apply(null, args);
},

getCommunityData: function () {
  return getCommunityData.apply(null, args);
},

togglePostLike: function () {
  return togglePostLike.apply(null, args);
},

addPostComment: function () {
  return addPostComment.apply(null, args);
},

addCommentReply: function () {
  return addCommentReply.apply(null, args);
},

getLearningData: function () {
  return getLearningData.apply(null, args);
},

setLearningProgress: function () {
  return setLearningProgress.apply(null, args);
}
```

Save → Deploy → Manage deployments → Edit → New version → Deploy.

Keep:
- Execute as: Me
- Who has access: Anyone
- existing GATEWAY_SECRET
- existing PIN_PEPPER
- existing SESSION_PEPPER

## 3. Cloudflare Worker
Keep all current variables/secrets exactly as-is.

Extend the allowed action list to include:

```text
getEmployeeCenterData
getCommunityData
togglePostLike
addPostComment
addCommentReply
getLearningData
setLearningProgress
```

For example, if your Worker contains:

```javascript
new Set(["login","getAppData","logout","changePin"])
```

change only that line to:

```javascript
new Set([
  "login",
  "getAppData",
  "logout",
  "changePin",
  "getEmployeeCenterData",
  "getCommunityData",
  "togglePostLike",
  "addPostComment",
  "addCommentReply",
  "getLearningData",
  "setLearningProgress"
])
```

Deploy the Worker. Do not change APPS_SCRIPT_URL, GATEWAY_SECRET, or ALLOWED_ORIGIN.

## 4. GitHub Pages
After Apps Script and Cloudflare are deployed, merge this branch into `main`.
The service-worker cache version is already bumped so phones fetch the new UI.

## 5. Test order
1. Login existing EMP001 + PIN.
2. Employee → Policies → play EATS video.
3. Employee → Benefits → verify reimbursement info and Asana button.
4. Community → play Outing video → Like → Comment → Reply.
5. Learning → Sequence of Service → Start Learning → open PDF → Mark as Completed.
6. Re-open app and confirm session/login still works.

## Rollback
If a frontend issue appears, do not touch Apps Script security. Revert the GitHub V1.3 frontend commit/PR and the existing login remains intact.
