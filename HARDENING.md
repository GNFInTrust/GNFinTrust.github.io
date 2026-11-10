# Security and reliability hardening

Prepared locally on branch `security/reliability-hardening` on 2026-11-10.
Repository: `GNFinTrust/GNFinTrust.github.io`. Nothing has been pushed or deployed.

This is a source-level hardening pass, not a claim that the application is
unbreakable. Ghidra is not installed, and no release executable is present in this
checkout. Source review and isolated regression tests were used instead.

## Changes

- The loopback API validates the exact Host and Origin, rejects browser requests
  from other sites and simple HTML form submissions, requires JSON for POST,
  limits request sizes and timeouts, and returns errors for malformed bodies.
  Private responses use no-store and same-origin resource headers.
- Opening Excel uses a process argument array with `shell: false`. Workbook
  creation/opening accepts only `.xlsx` files. Visiting a document URL with GET
  cannot spend tokens; the UI uses POST.
- Restored the missing `license.js` and `converter.js` startup modules. Licensing
  uses the ordinary Firebase user APIs and Firestore rules, never an Admin SDK or
  service account. There is no unconfigured-license bypass. Token changes re-read
  the remote profile, use update-time preconditions and serialize spending.
  Revoked admin rights are rechecked when spending. Only a refresh token is saved,
  with restrictive file permissions where the operating system supports them.
- Workbook operations run through one queue. Writes replace the workbook only
  after a temporary file finishes successfully. A failed save preserves both the
  previous file and dirty in-memory data for retry. JSON caches and sessions also
  use temporary-file replacement. This protects against partial writes, not every
  possible power failure or forced process termination.
- AI endpoint defaults now point to the official providers. Custom endpoints must
  use HTTPS; automatic redirects and automatic rerouting of credentials to another
  provider are disabled. Existing explicit proxy settings in a local `config.txt`
  are still honored. Browser automation no longer disables Chromium's sandbox.
- Restored spreadsheet conversion with a bounded worker, deadline, input and sheet
  limits, and CSV formula escaping. CSV output contains only the first worksheet;
  the conversion UI should be used with that format limitation in mind.
  SheetJS is pinned to the official 0.20.3 distribution instead of npm's 0.18.5.
- The installer preflights every archive entry before writing. It rejects path
  traversal, Windows drive/stream/device paths, symlinks, duplicate paths and
  oversized archives. Downloads are staged, and an incomplete download or checksum
  failure preserves the old file. The portable Node 24.22.2 distribution is pinned
  by SHA-256 and includes npm. Installation calls that npm directly and reports
  dependency failures. Updates verify the runtime and spreadsheet dependency.
- Website CSP allows specific hashes for inline script bodies. Inline event
  attributes have been replaced with listeners. Video frames accept only supported
  HTTPS provider hosts, carry a sandbox, and omit referrers. Installer overrides
  accept only release executable URLs in this GitHub repository.
- Booking rules require a new meeting and new busy slot to refer to each other in
  the same atomic write. Orphan slots, unreserved bookings and duplicate bookings
  are rejected. The old non-atomic fallback is removed. Booking hours match the UI
  (10:00–18:00). Order rules reject empty contacts and negative/excessive prices.
- Added regression tests and a GitHub Actions workflow, including an emulator job.

## Verification

Commands that ran locally:

```sh
python scripts/check_site.py
python -m unittest discover -s tests -v
npm test --prefix GNTools-client
```

Local result: **36 tests passed, 6 skipped** (27 JavaScript tests and 9 Python
tests passed). Website script hashes and JavaScript syntax checks passed.
Route tests execute the real handler with fake network/filesystem dependencies;
license and Excel tests simulate Firebase responses and failed disk writes.
These tests do not replace integration tests with the actual services/libraries.

The real spreadsheet worker test was skipped because dependencies are unavailable.
Five database rules tests were skipped because Firebase emulators are unavailable.
Run them in a network-enabled environment with Java 21 and Node 24:

```sh
npm install --ignore-scripts --no-audit --no-fund --prefix GNTools-client
npm test --prefix GNTools-client
npx --yes firebase-tools emulators:exec --only firestore,auth --project demo-gnfintrust \
  'python -m unittest discover -s tests -p test_firestore_rules.py -v'
```

The emulator tests refuse non-loopback emulator hosts and use a `demo-` project.
The GitHub Actions integration job runs these same checks after dependencies are
installed. Its result is not yet known.

Full Windows, browser, authentication and production checks remain outstanding:

- This environment cannot resolve GitHub/npm hosts; the configured GitHub account
  also reports invalid authentication. A remote fetch/push could not be completed.
- Offline npm installation failed with `ENOTCACHED` for ExcelJS. No lockfile or
  dependency audit could be generated. Do not treat dependency security as audited.
- Local network listeners are denied (`PermissionError: Operation not permitted`).
  A headless Chrome launch also failed in this sandbox. Google login, video playback,
  browser CSP enforcement and full navigation have not been smoke-tested.
- No Windows executable has been built, signed, reverse-engineered or replaced.
  The installer GUI and real messenger sessions have not been run.

## Before rollout

1. Restore network/GitHub access, fetch the current remote head, review/rebase this
   branch, install dependencies, generate and review a lockfile, and run both CI jobs.
2. Test the website in a browser, especially Google login, admin editing, videos and
   booking. Whenever inline website JavaScript changes, refresh and check hashes:

   ```sh
   python scripts/check_site.py --write
   python scripts/check_site.py
   ```

3. Test the Windows installation/update path, real spreadsheet conversion and
   messenger sessions. Package all client runtime modules, not just `index.js`.
   The installer executable build must include `installer_security.py` (PyInstaller
   follows its import). Rebuild the release artifacts and refresh their checksums.
4. Deploy the new Firestore rules and booking page in the same rollout window.
   Their booking schemas changed together. Old tabs must reload; old clients will
   be denied new bookings after the rules change. Existing busy slots remain
   readable. Do not roll back only one half without considering that schema.
5. After these checks, publish the branch and release assets through the normal
   review/deployment process. Source changes alone do not update Firebase rules or
   the already-distributed Windows application.

## Remaining trust boundaries

Distributed JavaScript, Python executables and HTML can be inspected and modified
by their owner. Local printing, parsing and conversion cannot be made resistant to
licensing bypass with obfuscation or Ghidra alone. The client can still be patched
to skip local work gates. Trial-account creation can also be repeated with new
identities. Stronger paid enforcement requires a trusted backend that owns the
paid operation, authorizes it, charges atomically, and handles retries/refunds.
User AI keys must remain local; shipping a shared secret would not solve this.

Anonymous booking/order creation remains public by design. The new rules validate
data and atomic reservations; they do not provide rate limiting, bot protection,
canonical pricing or payment verification. These require server-side controls.
An administrator must continue to verify actual payments before granting access.

Further production work includes monitoring and backups, Firebase App Check or a
server-side submission API, signed installer/update artifacts, a locked/audited
dependency graph, and vendoring or integrity-pinning the local UI's QR-code script.
Existing cached/course URLs do not constitute DRM for third-party hosted videos.

## Technical references

- [Firebase atomic rule validation](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Node process execution without a shell](https://nodejs.org/api/child_process.html)
- [Node 24.22.2 release and published checksums](https://nodejs.org/en/blog/release/v24.22.2)
- [Official SheetJS package installation](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/)
