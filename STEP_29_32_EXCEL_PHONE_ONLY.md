# Step 29.32 — Excel Import + Mandatory Phone Only

Based on stable Step 29.31Z.

1. Add Tournament (Super Admin): optional Excel/CSV roster upload. The new tournament is created first, then the existing `/api/roster/upload` API imports rows using the newly created tournament ID and new tournament PIN. The existing exported XLSX template is supported. Existing source registrations are not modified. A failed import leaves the newly created tournament in place; retry via Registrations.
2. Register For: phone is required; email is optional. Both frontend validation and backend registration POST enforce phone. Existing registrations are not migrated or modified.

No changes to Game Day, SRR, knockout, standings, simulation, or tournament limits.

Manual verification: create new tournament with existing exported XLSX, confirm import counts and registrations, confirm original tournament unchanged; try blank email + valid phone (should succeed), blank phone (should be rejected), and normal existing tournament creation without upload.
