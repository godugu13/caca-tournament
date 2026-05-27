# Step 29.3M - Simple Render/Vercel Deployment, No Docker, No Railway

This package preserves the latest application functionality from Step 29.3J/L and removes Docker/Railway deployment files.

## Included functionality preserved

- Header center alignment
- Add Tournament desktop/mobile layout
- Dashboard champion-declared grouping
- Audit security layer
- Score/audit sync fixes
- Organizer Admin PIN isolation
- Duplicate organizer PIN prevention
- Admin session logout behavior
- Player score mobile workflow
- Standings, scores, audit history, game day, registration

## Deployment model

Frontend:
- Vercel

Backend:
- Render Java Web Service
- Spring Boot embedded Tomcat JAR

Database:
- MongoDB Atlas

## No Docker required

Backend local build:

```powershell
cd backend
gradle clean bootJar -x test
java -jar build\libs\caca-tournament-backend-0.0.1-SNAPSHOT.jar
```

Frontend local run:

```powershell
cd frontend
npm install
npm start
```

## Render Backend Settings

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

## Vercel Frontend Settings

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
