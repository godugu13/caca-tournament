# Step 29.3L - Simple Public Deployment Without Docker

This package is based on the latest Step 29.3J build and preserves:
- Header centered alignment
- Dashboard champion-declared grouping
- Audit security layer
- Score/audit sync fixes
- Organizer Admin PIN isolation
- Admin session logout behavior
- Add Tournament layout fixes

## Local Backend Build

From backend folder:

```powershell
gradle clean bootJar -x test
```

Run exact jar:

```powershell
java -jar build\libs\caca-tournament-backend-0.0.1-SNAPSHOT.jar
```

If jar name differs:

```powershell
dir build\libs
```

## Local Frontend

From frontend folder:

```powershell
npm install
npm start
```

## Render Backend Deploy - No Docker

Render settings:

Root Directory:
```text
backend
```

Runtime:
```text
Java
```

Build Command:
```text
gradle clean bootJar -x test
```

Start Command:
```text
java -jar build/libs/caca-tournament-backend-0.0.1-SNAPSHOT.jar
```

Environment Variables:
```text
SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=<MongoDB Atlas URI>
CACA_ALLOWED_ORIGINS=*
```

## Vercel Frontend Deploy

Root Directory:
```text
frontend
```

Framework:
```text
Angular
```

Build Command:
```text
npm run build
```

After deployment, login as admin and set Deployment API URL:
```text
https://YOUR-RENDER-BACKEND.onrender.com/api
```
