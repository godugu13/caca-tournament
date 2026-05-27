# Step 29.3 - Public Network Beta Deployment

This build is for public beta testing before final Step 30.

## Recommended public beta hosting

- Frontend: Vercel
- Backend: Railway
- Database: MongoDB Atlas Free M0

---

## 1. MongoDB Atlas

Create a free cluster.

Create database user and password.

Allow network access:
```text
0.0.0.0/0
```

Copy URI:
```text
mongodb+srv://USER:PASSWORD@cluster.mongodb.net/caca_tournament
```

---

## 2. Railway backend

Deploy backend using:
```text
backend/Dockerfile.prod
```

Environment variables:
```text
SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/caca_tournament
CACA_ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app
```

Backend test:
```text
https://YOUR-BACKEND.up.railway.app/api/tournaments
```

---

## 3. Vercel frontend

Deploy the `frontend` folder.

After frontend deploys, open:
```text
https://YOUR-FRONTEND.vercel.app/admin-login
```

Login with admin PIN.

Open:
```text
Deployment
```

Set Backend API Base URL:
```text
https://YOUR-BACKEND.up.railway.app/api
```

Save. App reloads and uses public backend.

---

## 4. Public player scoring test

From Game Day page, copy player scoring link.

It should look like:
```text
https://YOUR-FRONTEND.vercel.app/player-score?tournamentId=...&format=...
```

Send it to phone/WhatsApp.

Player enters phone number and sees only assigned score card.

---

## 5. Public beta test checklist

- Dashboard loads on public URL.
- Register For works.
- Admin Login works.
- Add Tournament hidden unless admin logged in.
- Game Day hidden unless admin logged in.
- Scores hidden unless admin logged in.
- Player Score page works from phone.
- Score save/finalize reflects in admin Scores.
- Standings update.
- Audit History works.
- Mobile layout works on iPhone/Android.
- Logout hides admin pages.

---

## 6. Data backup

Local backup scripts included:
```text
scripts/backup-mongo.ps1
scripts/restore-mongo.ps1
```

For MongoDB Atlas, use Atlas dashboard backup/export options during beta.

---

## Important

Do not call this final production yet. This is Step 29.3 public beta.

After public testing is successful, Step 30 can include:
- final production URLs
- official domain
- locked CORS
- stronger admin auth
- final build/version tag
- final deployment runbook
