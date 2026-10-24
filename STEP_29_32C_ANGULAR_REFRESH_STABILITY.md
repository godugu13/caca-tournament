# Step 29.32C — Angular UI refresh stability

Based on the complete Step 29.32B project.

One code change: frontend/src/main.ts explicitly enables Zone.js-based Angular change detection via provideZoneChangeDetection(). The existing angular.json already loads zone.js. This aims to update ordinary component properties changed in asynchronous HTTP subscriptions across Registration, Player Score, Game Day, Brackets, etc.

No backend, database, API, or business-logic changes. No tournament completion or active-tournament persistence changes.

Test on a preview deployment before production, including page reloads, tournament loading, scorecard lookup/save/finalize, SRR generation and bracket refresh. Avoid duplicate clicks during testing.
