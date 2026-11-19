# Step 29.32F — Dashboard tournament-specific registrations and privacy

Based on Step 29.32E. Only the Dashboard component and browser-local public snapshot reader changed.

- Preloads registered players independently for **every** upcoming tournament, not only the first.
- Suppresses doubles-partner lookout on Singles tournaments.
- Shows lookout phone numbers only to signed-in administrators; public users never see phone numbers in this section.
- Sanitizes older browser-local cached player lists on read to avoid surfacing previously cached contact numbers.
- Preserves the backend, registration writes, tournament IDs, scoring and Game Day logic.

**Verification needed:** Angular build and browser tests against both tournaments. If DCPL still shows zero registrations after the backend responds, inspect the `/api/registrations/tournament/{id}/public-names` response and compare the registration tournament IDs; this patch does not migrate records.
