# Step 29.0 - Production Hardening Starter

This step keeps the stable local build from Step 28.5A and adds starter production hardening.

## Added

### 1. Score audit log
Every player score save/finalize now writes an audit entry.

APIs:
```text
GET /api/audits/match/{matchId}
GET /api/audits/{tournamentId}/{format}
```

### 2. Environment template
Added `.env.example`.

### 3. Production checklist
Before public launch:
- lock CORS to real frontend domain
- move admin PIN to environment variable
- add real login/admin roles
- add MongoDB Atlas backups
- add score-change audit screen in UI
- add database export/import script
- add SSL/custom domain

## Local run
```powershell
docker compose down
docker compose up --build
```

Do not run:
```powershell
docker compose down -v
```
