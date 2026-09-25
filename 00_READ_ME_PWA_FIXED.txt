INSPIRE 2.1.2 — PWA FIX BASED ON YOUR ACTUAL REPOSITORY

I inspected the uploaded INSPIRE2.1.2-main repository.

ROOT CAUSE FOUND:
Your repository stores the icon files at the repository ROOT:
  /icon-192.png
  /icon-512.png
  /icon-180.png
  /icon-maskable-512.png

But index.html, manifest files, service-worker.js, and pwa-check.html were requesting:
  /INSPIRE2.1.2/icons/icon-192.png
  /INSPIRE2.1.2/icons/icon-512.png
  etc.

That /icons/ folder does not exist in the uploaded repository.

This caused:
- broken icon references
- PWA icon fallback
- service worker installation failure because cache.addAll() fails if one required file is 404
- Chrome falling back to Create shortcut / generic browser icon

WHAT WAS CHANGED:
- UI/app.js/styles.css/config.js logic preserved.
- Icon references now point to root icon files.
- Manifest start_url/scope remain /INSPIRE2.1.2/
- Service Worker cache bumped to inspire-2-1-2-pwa-fixed-v2
- pwa-check.html updated.
- Backend and Cloudflare URL preserved.

UPLOAD:
Replace the files in the GitHub repo root with this package.

AFTER DEPLOY:
1. Delete any existing INSPIRE shortcut from the phone.
2. Chrome > Site settings > All sites > boyhcblackowl-coder.github.io > Clear & reset.
3. Open:
   https://boyhcblackowl-coder.github.io/INSPIRE2.1.2/pwa-check.html
4. Refresh once.
5. All checks should return HTTP 200 and Service Worker should be registered.
6. Open:
   https://boyhcblackowl-coder.github.io/INSPIRE2.1.2/
7. Wait 5-10 seconds.
8. Chrome menu > Add to Home screen / Install app.

DIRECT ICON TESTS:
https://boyhcblackowl-coder.github.io/INSPIRE2.1.2/icon-192.png
https://boyhcblackowl-coder.github.io/INSPIRE2.1.2/icon-512.png
