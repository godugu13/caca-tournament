# Step 29.32D — Registration & Dashboard Refresh Only

Baseline: Step 29.32C. Backend and database models unchanged.

- Registration: explicitly run Angular change detection when tournament catalog request succeeds/fails, bound catalog request to 45 seconds, and show a Retry action on failure.
- Dashboard: explicitly run Angular change detection when tournament catalog and optional dashboard metadata arrive, bound primary catalog request to 45 seconds, show a loading indicator and Retry on failure.
- No changes to registration submission, scoring, brackets, game day, or backend.

Deployment: test on preview before production. Verify direct refresh of /registrations and /, and navigating back to Dashboard.

Build status: not verified; npm dependencies were unavailable in this environment.
