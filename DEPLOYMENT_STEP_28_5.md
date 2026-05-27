# CACA Inc Tournament System - Step 28.5 Deployment Preparation

This step prepares the project for beta deployment while preserving local development.

## What changed

### 1. Stable local Mongo volume
`docker-compose.yml` now uses a named volume:

```yaml
volumes:
  caca_mongo_data:
    name: caca_mongo_data
```

Do not run:

```powershell
docker compose down -v
```

That deletes data.

Normal restart:

```powershell
docker compose down
docker compose up --build
```

### 2. Mobile/LAN API support preserved

Angular API URL automatically works for:

```text
http://localhost:4200
http://192.x.x.x:4200
```

### 3. Cloud backend support

Backend production profile added:

```text
backend/src/main/resources/application-prod.properties
```

Required cloud environment variable:

```text
MONGODB_URI=mongodb+srv://...
SPRING_PROFILES_ACTIVE=prod
```

### 4. Production backend Dockerfile

```text
backend/Dockerfile.prod
```

### 5. Render/Railway starter files

```text
render.yaml
railway-backend.json
```

---

# Recommended Beta Deployment

## Database: MongoDB Atlas Free

1. Create MongoDB Atlas account.
2. Create free M0 cluster.
3. Create database user.
4. Allow network access:
   - for beta, allow `0.0.0.0/0`
   - later restrict in Step 29
5. Copy connection string:
   ```text
   mongodb+srv://USER:PASSWORD@cluster.mongodb.net/caca
   ```

## Backend: Render or Railway

Use environment variables:

```text
SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/caca
CACA_ALLOWED_ORIGINS=*
```

Backend health test:

```text
https://your-backend-url/api/tournaments
```

## Frontend: Render Static Site or Vercel

After frontend deploys, configure API base URL during beta from browser console:

```javascript
localStorage.setItem('cacaApiBaseUrl', 'https://your-backend-url/api');
location.reload();
```

This is a beta workaround. In Step 29 we can add proper environment files.

---

# Local testing after Step 28.5

```powershell
docker compose down
docker compose up --build
```

Open:

```text
http://localhost:4200
```

Mobile LAN:

```text
http://YOUR_WIFI_IP:4200
```

Player scoring link:

```text
http://YOUR_WIFI_IP:4200/player-score?tournamentId=<id>&format=Mixed%20Doubles
```

---

# Step 28.5 Test Checklist

1. Dashboard shows previous/current tournaments.
2. Game Day page shows Player Mobile Scoring Link.
3. Copy link works.
4. Mobile can open link using 192.x.x.x.
5. Mobile can enter phone number.
6. Only assigned score card appears.
7. Player-entered scores reflect in admin Scores page.
8. Standings update after finalization.
9. Data persists after:
   ```powershell
   docker compose down
   docker compose up
   ```

---

# Next Step 29

Production hardening:
- Real auth/admin login
- CORS locked to official domain
- frontend environment config instead of localStorage
- database backup/export
- audit log for score changes
- deployment runbook


---

## Step 28.5A Local Mongo Note

For local Docker testing, the main `docker-compose.yml` intentionally uses:

```yaml
image: mongo:7
volumes:
  mongo_data:
    name: caca-inc-tournament_mongo_data
```

This keeps compatibility with previous local tournament data.

For cloud deployment, MongoDB Atlas is still recommended.
