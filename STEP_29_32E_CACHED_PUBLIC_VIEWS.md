# Step 29.32E — Cached public Dashboard / Registration views

Baseline: Step 29.32D. Frontend-only changes.

- Cache public tournament catalog and public registration names separately by real tournament ID in browser localStorage.
- Dashboard and Registration can show previously loaded data on that SAME browser immediately while Render wakes.
- Refresh public catalog and names from backend in background; show stale-data notice.
- Extend catalog wait to 210 seconds for slow Render cold starts.
- Disable Register until a live catalog verifies the selected tournament. Registration writes to existing backend API using real tournament ID.
- Show registration success only after the server confirms save. Keep user input if the request fails. Do not auto-retry writes.
- Do not cache private emails, phone numbers, PINs, or full admin registrations.
- No backend, DB, or tournament data migrations.

IMPORTANT LIMITATION: Browser localStorage is PER DEVICE. It cannot supply a current shared snapshot to a first-time visitor on another device. To deliver immediate shared, up-to-date tournament and registration lists to all users, a separately provisioned always-on public cache (e.g., managed KV/object store with a publishing mechanism) is required. This ZIP does NOT implement cross-device snapshot publication, and should not be represented as doing so.

TESTS: ZIP integrity and source checks only. npm install timed out in this environment; Angular build and browser testing NOT completed. Deploy to Vercel Preview and test new browser vs returning browser, different tournaments, cold-start registration, failure states, and DB writes before production.
