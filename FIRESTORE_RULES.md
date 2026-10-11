# Firestore security rules

`firestore.rules` holds the security rules for the Firebase project `fintrust-af741`.
GitHub Pages does not deploy them, so they only take effect once pasted into the Firebase console.

## What the rules allow

| Data | Who can read | Who can write |
| --- | --- | --- |
| `users/{uid}` | the user themselves, admins | the user can create their own profile (no admin flag, no purchases, at most 5 trial tokens), send an Instagram promo request (status `pending` only) and spend GN Tools tokens (only downwards). Everything else, including `admin`, `purchases`, `tokens` top-ups and `promoStatus: granted`, is admin only. |
| `orders/{id}` | admins | anyone can submit a new order from the buy page (status `new`, fixed fields); only admins can mark done or delete |
| `products/{id}` | everyone | admins |
| `productContent/{id}` | admins, and users whose `purchases` contains that id | admins |
| `settings/{id}` (payment, promo, gntools) | everyone | admins |
| anything else | nobody | nobody |

An admin is a user whose `users/{uid}` document has `admin: true`.

## How to apply them

1. Open https://console.firebase.google.com/project/fintrust-af741/firestore/rules
2. Copy your current rules into a text file first, so you can roll back if something breaks.
3. Replace everything in the editor with the contents of `firestore.rules`.
4. Click **Publish**.
5. Check the site: log in on `login.html`, open `members.html`, submit a test order on `buy.html`, and open `admin.html` with an admin account.

## Making the first admin

Nobody can give themselves `admin: true` from the site. To make the first admin:

1. Log in once on `login.html` with the account that should be admin, so its profile is created.
2. In the Firebase console open **Firestore Database > Data > users**, find that account's document (the id is the user's UID from **Authentication > Users**).
3. Change the `admin` field to `true` (type boolean) and save.

After that, this admin can make other admins from the Accounts tab in `admin.html`.
