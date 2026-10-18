# Step 29.32A — Tournament-specific registration

Baseline: Step 29.32 Excel Upload + Mandatory Phone (itself based on 29.31Z).

- Dashboard Register links already pass `tournamentId` and `format`. Registration page now honors these query parameters and fetches the real tournament from the existing catalog endpoint.
- Registration submission and player list now use the selected tournament ID rather than the fixed Rolling Trophy alias.
- Registration confirmation displays the selected tournament name, date and format.
- Player list cache is separated by tournament ID and admin/public view to prevent cross-tournament display.
- Existing backend, Add Tournament Excel import, phone-required validation, Game Day, SRR, scoring, and knockout logic are unchanged.

Manual test: Create two tournaments in a separate test database, use each Dashboard Register link, confirm the correct tournament and format are selected, register a player in each, and verify players are not mixed. Confirm Excel-imported players appear in the selected tournament. Also test direct /registrations entry and missing tournament IDs.

Build status: Angular dependencies were not available locally; npm install timed out. No Angular or Gradle build passed in this environment. Test locally before production deployment.
