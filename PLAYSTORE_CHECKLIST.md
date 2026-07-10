# Google Play Store Readiness — Zenamaze

_Package: `com.zenamaze.knocdoc.in` · Capacitor 8 + Angular 19 · Audited 2026-07-03_

## Readiness: 82 / 100
App config + policy pages are complete. Blockers are all **console/asset** tasks (signing keystore, store listing graphics, data-safety form) — none are code.

## ✅ Completed (in repo)

### App configuration
- **App name:** `Zenamaze` (`capacitor.config.ts`, `strings.xml` label).
- **Package / applicationId:** `com.zenamaze.knocdoc.in` (config + `build.gradle` namespace) — consistent.
- **Versioning:** `versionCode 1`, `versionName "1.0"` (`android/app/build.gradle`).
- **Release signing:** wired to a gitignored `keystore.properties` (see `keystore.properties.example`); R8 minify + resource shrink enabled for release.
- **Splash screen:** configured, dark brand `#08090d`, 800 ms, faded from JS.
- **Orientation:** portrait (manifest).
- **Notification icon/color:** LocalNotifications small icon + `#7c5cff`.

### Permissions — minimal & justified (no over-ask)
| Permission | Reason |
|-----------|--------|
| `INTERNET` | API calls to backend |
| `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` | via LocalNotifications plugin — reminders |
| `USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM` | exact-time reminders on Android 12+ |

No camera, location, storage, contacts, or mic — **nothing to justify or strip**. `USE_EXACT_ALARM` is auto-granted for alarm/reminder apps; if Play flags it, keep only `SCHEDULE_EXACT_ALARM`.

### Required policy pages (all live, in footer, mobile-friendly, with SEO metadata)
Privacy Policy · Terms & Conditions · Contact Us · About Us · Help & Support · Disclaimer · Data Deletion Policy · Cookie Policy.

- **Privacy Policy** is publicly reachable at `/privacy` (Play requires a public URL) — prerendered.
- **Account & data deletion** documented at `/data-deletion` + in-app from Profile + email path — satisfies Play's account-deletion requirement.
- **No payments** in the app (reward points are non-monetary) → Refund/Cancellation policy **N/A**. Add only if monetization is introduced.

### Policy compliance
- **User-generated content:** goals/notes are private to the user, not published → low UGC surface.
- **Data collection disclosure:** covered in Privacy + Cookie policies.
- **Medical content:** none — general productivity/self-improvement; `/disclaimer` clarifies Zenamaze is not professional/medical/mental-health advice.

## ⛔ Manual before submission (Play Console + assets)

1. **Generate upload keystore** → fill `android/keystore.properties`; build AAB: `npm run cap:sync && cd android && ./gradlew bundleRelease`.
2. **Set `targetSdkVersion`** — confirm `variables.gradle` targets **API 35** (Play requirement for new apps, 2025+). Verify before build.
3. **Store graphics:** app icon 512×512, feature graphic 1024×500, ≥2 phone screenshots. (Raster launcher icons already in `res/mipmap`; store listing needs its own uploads.)
4. **Data safety form** — declare: account info (name/email/phone), user content, analytics (if Firebase enabled). Mark "not sold", "encrypted in transit".
5. **Content rating questionnaire** (IARC) — expect Everyone / PEGI 3.
6. **App category:** Productivity. Short + full description (see MARKETING_READINESS.md).
7. **Privacy Policy URL** field → `https://<domain>/privacy`.
8. **Deep Links / App Links** — not configured. Optional for v1; add an `intent-filter` + `assetlinks.json` if you want `https://<domain>` to open the app.
9. **Adaptive icon** — confirm `ic_launcher` foreground/background layers exist in `mipmap-anydpi-v26` (Capacitor scaffolds these; verify after `cap sync`).
10. **Pre-launch report** — upload to internal testing track first; review Play's automated device report.

## Notes
- `allowBackup="true"` is fine for this app; set `false` only if you later store sensitive local secrets.
- No `google-services.json` yet → push/Firebase inactive by design (see ANALYTICS_PLAN.md).
