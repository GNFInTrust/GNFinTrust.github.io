# Membership site (Patreon-style) for GitHub Pages

No build step, no server needed:

- `index.html` — public page: membership tiers, payment buttons, how it works, upcoming webinars, FAQ.
- `checkout.html` — opens when a visitor presses a "Join" button. Shows your payment details (card number, phone transfer, PayPal, Ko-fi) and a form where the buyer enters name, email, phone/Telegram, and payment method. Submitting opens a pre-filled email to you with all their details.
- `login.html` — login / sign-up page: "Continue with Google" or email + password (powered by Firebase, free).
- `members.html` — members-only area: signed-in users with confirmed payment see the webinar library. Pressing a webinar opens it with the embedded video, photos, and notes. What's unlocked depends on the member's rank (Supporter / Member / Pro); locked items show 🔒. Everyone else sees payment instructions.
- `firebase-config.js` — paste your Firebase keys here (setup below).
- `tracker.html` — private accounting page: log who paid, mark who received webinar access, see totals, export CSV. Data is stored only in your own browser (localStorage). Don't link to it from the public page.

## Deploy on GitHub Pages

1. Create a new repository on GitHub (e.g. `membership-site`).
2. Upload all the files in this folder to the repository root.
3. In the repo: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**.
4. Your site will be live at `https://<your-username>.github.io/membership-site/`.
5. The tracker will be at `.../tracker.html` — bookmark it for yourself.

## Customize (search for `TODO` in index.html)

- **Your name / brand** — in the headers and footer of `index.html` and `checkout.html`.
- **Payment details** — in `checkout.html`, replace the placeholder card number, phone transfer number, PayPal, and Ko-fi lines with your real details. Remove any lines you don't use.
- **Email** — replace `you@example.com` in `index.html` and in the `OWNER_EMAIL` variable near the bottom of `checkout.html`.
- **Tiers, prices, perks, webinar dates** — edit the text in `index.html`; prices also appear in the tier dropdown in `checkout.html`.

## Login & members area (Firebase setup, ~10 minutes, free)

The login system uses Firebase — Google's free service for user accounts and databases. The free tier is far more than enough for a webinar membership site.

1. Go to <https://console.firebase.google.com> and create a project (any name).
2. **Add a web app**: Project overview → the `</>` (Web) icon → register the app. Firebase shows you a `firebaseConfig` code block — copy those values into `firebase-config.js` in this folder.
3. **Enable login methods**: Build → Authentication → Get started → Sign-in method → enable **Google** and **Email/Password**.
4. **Authorize your site**: Authentication → Settings → Authorized domains → add `<your-username>.github.io`.
5. **Create the database**: Build → Firestore Database → Create database → Start in production mode.
6. **Set the security rules**: Firestore → Rules → replace everything with the rules below → Publish. They let people create their own profile but NOT activate their own access — only you can do that.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.access == false;
      allow update: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.access == resource.data.access;
    }
  }
}
```

### Activating a member after they pay

1. Open Firestore Database → `users` collection. Each signed-up person is a row (find them by the `email` field).
2. Change their `access` field from `false` to `true`.
3. Set their `tier` field to `Supporter`, `Member`, or `Pro` (exactly as written — it controls which webinars unlock; if empty, they're treated as Supporter).
4. Done — next time they open `members.html` they'll see their webinars. Also log the payment in `tracker.html` for your own accounting.

### Adding webinar content (videos, photos, text)

All content lives in the `WEBINARS` list at the bottom of `members.html` — each entry has a title, date, minimum tier, one video, photos, and text notes. Copy an existing entry to add a new webinar.

- **Video from Google Drive**: open the video → Share → Copy link → change the ending `/view?usp=...` to `/preview`, e.g. `https://drive.google.com/file/d/FILE_ID/preview`. Set the video's sharing to "Anyone with the link".
- **Video from YouTube** (unlisted): use `https://www.youtube.com/embed/VIDEO_ID`.
- **Photos from Google Drive**: use `https://drive.google.com/thumbnail?id=FILE_ID&sz=w1200` (FILE_ID is in the photo's share link).
- **Text**: write paragraphs separated by a blank line (`\n\n`).

Until you paste real links, members see tidy "coming soon" placeholders instead of broken videos or images.

### Using your 5 TB Google Drive

Google Drive can't run the login system or the database, but it's ideal for **storing webinar recordings and materials**:

1. Upload recordings to a folder in your Google Drive.
2. Right-click the folder → Share → "Anyone with the link" (Viewer).
3. Use the per-video `/preview` links inside the `WEBINARS` list in `members.html` (see "Adding webinar content" above).

Note: anyone who obtains the link can open a Drive folder shared this way — the login page keeps honest people out, but a member could still forward the link. For a small paid community this trade-off is normal; rotating the link occasionally helps.

## Important notes

- GitHub Pages is a static host: it cannot process payments or restrict access automatically. This site follows a manual flow: supporter pays → emails you the receipt → you reply with the webinar links and record it in `tracker.html`.
- Tracker data lives only in the browser where you entered it. Use **Export CSV** regularly as a backup.
