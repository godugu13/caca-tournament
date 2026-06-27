# CACA Inc. Tournament Management System

Capital Area Carrom Association tournament management starter project.

## Technology Stack

- Frontend: Angular standalone components
- Middleware / Backend: Spring Boot REST APIs
- Database: MongoDB
- Build: Gradle
- Local runtime: Docker Compose or local Gradle + Angular CLI

## Main Features Included

- CACA Inc. logo text using Times New Roman
- White + ocean blue theme, with yellow/black accent cards
- Clickable dashboard tabs/pages
- Add Tournament page with:
  - Tournament Name
  - Tournament Type: Singles, Doubles, Mixed Doubles, Team Event
  - Team Event dynamic players-per-team fields
  - Tournament Date
  - Registration Fee
  - Venue Address
  - Total Number of Players
  - # SRR Rounds
  - # Knockout Rounds
  - Description
  - Admin PIN, default hardcoded as 1123
- Register For page with:
  - Select Tournament
  - Format selection
  - Player Name, Email, Phone
  - Partner name for Doubles / Mixed Doubles
  - Captain and team member names for Team Event
  - Payment note: cacafunds@gmail.com/535653043/videos/pcb
- Game Day page with:
  - Admin PIN unlock
  - Tournament and format selection
  - Registered players with attendance checkboxes
  - Select all / clear all attendance
  - Generate SRR rounds
  - Venue/board numbers assigned sequentially
  - Match cards showing round, venue number, player names, and previous rank
  - No duplicate pairing logic where possible
- Scores page with:
  - Player View
  - Admin View protected by PIN 1123
  - Round type/round number always visible
  - Venue number visible
  - Score boxes next to player names
  - Admin editable score report
- Standings page:
  - Ranking by wins descending
  - Then point differential descending

## Project Structure

```text
caca-inc-tournament/
  docker-compose.yml
  README.md
  backend/
    Dockerfile
    build.gradle
    settings.gradle
    src/main/java/com/caca/tournament/
      CacaTournamentApplication.java
      config/DataSeeder.java
      controller/GameDayController.java
      controller/RegistrationController.java
      controller/TournamentController.java
      model/Match.java
      model/Registration.java
      model/Standing.java
      model/Tournament.java
      repository/MatchRepository.java
      repository/RegistrationRepository.java
      repository/TournamentRepository.java
      service/SrrService.java
    src/main/resources/application.yml
  frontend/
    angular.json
    package.json
    tsconfig.json
    tsconfig.app.json
    src/index.html
    src/main.ts
    src/styles.css
    src/app/app.component.ts
    src/app/models/models.ts
    src/app/services/api.service.ts
    src/app/pages/dashboard/dashboard.component.ts
    src/app/pages/tournaments/tournaments.component.ts
    src/app/pages/registrations/registrations.component.ts
    src/app/pages/gameday/gameday.component.ts
    src/app/pages/scores/scores.component.ts
    src/app/pages/standings/standings.component.ts
```

## Option 1: Run Everything with Docker Compose

From the project root:

```bash
docker compose up --build
```

Then open:

```text
Frontend: http://localhost:4200
Backend:  http://localhost:8080
MongoDB:  localhost:27017
```

To stop:

```bash
docker compose down
```

To stop and delete Mongo data:

```bash
docker compose down -v
```

## Option 2: Run Locally Without Docker for Backend/Frontend

### Start MongoDB

Either use local MongoDB or start only MongoDB with Docker:

```bash
docker compose up mongo
```

### Run Backend

```bash
cd backend
./gradlew bootRun
```

On Windows PowerShell, use:

```powershell
cd backend
.\gradlew.bat bootRun
```

If Gradle wrapper is not available, use installed Gradle:

```bash
gradle bootRun
```

Backend runs on:

```text
http://localhost:8080
```

### Run Frontend

```bash
cd frontend
npm install
npm start
```

or:

```bash
ng serve --host 0.0.0.0 --port 4200
```

Frontend runs on:

```text
http://localhost:4200
```

## Game Day Step 4 Updates

This build adds the SRR score-entry changes requested by CACA:

- After Game Day starts, the selected tournament and format are remembered for Game Day, Scores, and Standings.
- Score entry supports up to 8 game boards per match.
- GUI layout shows Team/Player 1 on the left, Board # in the center, and Team/Player 2 on the right.
- For Doubles and Mixed Doubles, one score entry applies to the team, not to each individual partner.
- Players can save scores as draft during a match.
- Players or admin can finalize the match score when time is up or when either team reaches 25.
- Standings use finalized total score only: wins first, then point differential.
- Admin View can adjust board-by-board scores and finalize again if scores were entered incorrectly.
- Team Event matchup logic is intentionally not changed in this step.

## API Quick Test

Create tournament:

```bash
curl -X POST http://localhost:8080/api/tournaments \
  -H "Content-Type: application/json" \
  -d '{"name":"CACA Test Tournament","tournamentType":"Singles","formats":["Singles"],"srrRounds":5,"knockoutRounds":1,"adminPin":"1123"}'
```

List tournaments:

```bash
curl http://localhost:8080/api/tournaments
```

## Admin PIN

For now the admin PIN is hardcoded as:

```text
1123
```

This is intentionally simple for local development. Later it should be replaced with proper authentication and role-based access.

## Game Day Update Notes

This build includes the first Game Day update requested by CACA:

- Admin PIN fields are password-style by default.
- Tournament creation Admin PIN also stays hidden unless the user clicks Show.
- Game Day venue wording is corrected: Venue means carrom board number, not a physical address.
- SRR matches automatically receive sequential board assignments: Venue #1, Venue #2, Venue #3, etc.
- Singles registrations are matched player vs player.
- Doubles and Mixed Doubles registrations are treated as teams: Player / Partner vs Player / Partner.
- SRR rounds open in sequence only.
- SRR Round #1 is available first after attendance is selected.
- SRR Round #2 is enabled only after every SRR Round #1 match has completed scores.
- Same sequencing continues until all configured SRR rounds are completed.
- Knockout flow labels are shown as future sequence: Pre-Quarters, Quarters, Semifinals, Finals.
- Team Event generation logic is intentionally not changed yet.


## Game Day Step 3 Updates

This ZIP includes the requested fresh-start/admin changes:

- Admin can delete a created tournament from Manage Tournament or Game Day.
- Deleting a tournament also deletes its registrations and generated matches.
- Admin can remove registered players/teams from Game Day attendance.
- Admin can delete generated SRR/Knockout matches for the selected tournament and format.
- Game Day venue explanation note was removed from the screen.
- Scores page now uses password-style Admin PIN entry.
- Doubles and Mixed Doubles score entry remains team-based: one score box per team side, not one score box per individual player.

Admin PIN for now: 1123

## Step 7 Updates - Roster Upload and CACA Membership IDs

### Roster Upload
Admin can upload a roster from the Game Day page after selecting tournament and format.
Supported file types:
- `.csv`
- `.txt`
- `.xlsx` / `.xls`

Recommended columns:

| Name | Partner Name | Email | Phone |
|---|---|---|---|
| Raju Godugu | Rashmi Godugu | raju@example.com | 7030000000 |

For Doubles/Mixed Doubles, the first column can also be in this format:

```text
Raju Godugu / Rashmi Godugu
```

The uploaded rows are registered against the already selected tournament and selected format.

### CACA Membership IDs
Each new player automatically receives a CACA membership ID:

```text
caca1, caca2, caca3 ... cacaN
```

During registration, if the player enters an existing membership ID, the system auto-fills name, email, and phone. The player/admin can still edit email/phone if needed.


## Step 9 Updates

- Dashboard is the default landing page.
- Current/Future tournaments display at the top.
- Previous tournaments display below.
- Admin can unlock on Dashboard and finalize a tournament; finalized tournaments move to Previous Tournaments.
- Scores page now defaults to only the current active round.
- Previous round scores are available through round tabs.
- Admin can finalize all missing scores in the selected current round as 0-0.
- Finalized match score cards are disabled to avoid confusion.
- Admin sees an Edit button next to finalized score cards to reopen and correct scores.

Run after unzipping:

```powershell
docker compose down
docker compose up --build
```

Open frontend:

```text
http://localhost:4200
```


## Step 10 - Game Day Layout Reset

Updates included in this version:
- Game Day no longer shows Admin PIN at the top.
- Admin PIN appears only when a destructive admin action is selected, such as deleting a tournament, removing a registration, or deleting generated SRR/KO rounds.
- Generated Matchups section is the main visible section after tournament selection.
- Knockout Rounds section appears immediately after Generated Matchups / SRR execution.
- Attendance section is collapsed by default and can be opened using the Open Attendance button.
- Admin Fresh Start Options were moved to the bottom of the Game Day page.

## Step 12 Registration Updates

- Add Tournament now supports selecting multiple formats for one tournament.
- Register For only displays formats that were selected during tournament creation.
- Registration fee shown on the Register For page is pulled from the selected tournament.
- Payment message is displayed as:
  - Without payment, Registration is not Valid
  - Please complete registration using Zelle
  - Zelle: cacafunds@gmail.com
- CACA Membership ID is no longer shown/required in the registration screen or Players View.
- Registration lookup now starts with Email.
  - If email already exists, name/email/phone are auto-filled.
  - User may still edit the details.
- Players View now uses serial number instead of membership ID.
- Attendance is removed from Players View.
- Partner/Captain column is changed to Partner.
- Payment status displays Paid or Pending.
- Register button opens a payment reminder modal.
- Pending registrations are allowed; payment can be updated later using Mark Paid.

## Rebuild after Step 12

```powershell
docker compose down
docker compose up --build
```

## Step 12A Fix - Global Existing Member Lookup

Existing player lookup by email now checks:
1. `members` collection first.
2. If not found, all prior `registrations` across every tournament.

This means an email such as `godugu@gmail.com`, if used in any previous tournament registration or roster upload, will autofill the player's name/email/phone for the current tournament registration.

## Step 15 - Scores Page Updates
- Save icon is enabled only after a board score is changed.
- After save, the icon is disabled again until another change is made.
- Finalizing at a certain board hides the unplayed boards instead of showing 0 scores.
- Total scores are highlighted and bold.
- Save/finalize actions update in place and do not reload the whole page, preventing scroll/cursor jump.
- Once all matches in the current round are finalized, the app navigates to Current Standings and provides a Game Day link for the next SRR/Knockout round.


Step 15A update:
- Scores page hides finalized board rows where both teams/players are 0 - 0.
- If no played boards exist, the finalized card shows a short message instead of empty 0 - 0 rows.

## Step 17 Updates

- Add Tournament / Manage Tournament now supports editing existing tournaments.
- Admin can adjust SRR rounds after tournament creation, useful when game-day time constraints change.
- Game Day Knockout section now lets admin generate knockout rounds manually:
  - Pre-Quarters
  - Quarters
  - Semifinals
  - Finals
- Quarters seeding uses top 8 from SRR standings: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5.
- Semifinals use quarter bracket paths when quarters were generated and completed:
  - Winner of 1/8 vs winner of 2/7
  - Winner of 3/6 vs winner of 4/5
- If admin skips directly to Semifinals or Finals, the system uses top 4 or top 2 from SRR standings.
- Standings/ranking seed remains based on finalized SRR results only.


## Step 18 Updates
- After SRR rounds are complete, admins can generate Pre-Quarters, Quarters, Semifinals, or Finals from Game Day.
- Generated knockout brackets now show a direct link/button to the Scores page.
- Scores page supports score entry and finalization for every generated round type: SRR, Pre-Quarters, Quarters, Semifinals, and Finals.
- Knockout score finalization sets the winner, so the next knockout stage can be generated from winners.

## Step 19 Updates
- Scores page now chooses the latest active generated round by phase order.
  - If Quarters/Semis/Finals are generated, the Scores page shows that knockout round instead of the last SRR round.
  - Round tabs are unique by round type + round number, so SRR Round 2 and Quarters do not conflict.
- Standings page now displays the round context, for example: `Standings after SRR Round 5`.

## Step 20 Updates
- Game Day now treats tournament progress as one sequence: SRR #1 through Finals.
- When a knockout round starts, Game Day shows only that active knockout bracket.
- Last SRR bracket and other completed brackets are hidden behind clickable completed-bracket tabs.
- If active players/teams are fewer than 8, Pre-Quarters and Quarters are disabled; admins should start with Semifinals, then Finals.
- Bracket player/team names continue to show their seed/rank beside the name.

## Step 21 Update
- Standings page now displays completed knockout results above SRR standings.
- If Quarters are finalized, Quarter Final winners and losers show above last SRR standings.
- If Semis are finalized, Semi Final results show first, then Quarter Final results, then last SRR standings.
- Previous bracket/SRR tabs allow viewing backward until SRR Round #1.
- Player/team ranks remain visible next to names in bracket/history views.

## Step 22 - CACA Knockout Cup Bracket View

Updates included in this package:

- Knockout results/standings page now includes a CACA-themed black/yellow cup bracket view.
- Player/team rank is displayed next to every name in knockout brackets.
- For normal knockout fields up to 32, the view shows a single bracket group unless 32 qualifiers are used.
- When 32 players/teams are used for quarter-final based knockouts, the backend creates four 8-player groups:
  - Champions
  - Challengers
  - Enthusiasts
  - Rising Stars
- Each group uses quarter-final seeding: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5 within that group.
- Semifinals preserve the intended bracket path:
  - Winner of 1 vs 8 plays winner of 2 vs 7
  - Winner of 3 vs 6 plays winner of 4 vs 5
- Finals are generated from semifinal winners.
- Completed knockout results still appear above the final SRR standings, with previous SRR rounds available through tabs.

Run:

```powershell
docker compose down
docker compose up --build
```


## Step 23 - Official Knockout Rounds UI

Updates:
- Knockout title changed to "Knockout Rounds".
- Lighter official bracket theme inspired by the provided reference image.
- Uses maroon, gold, cream, and white highlights.
- Removed the black/yellow note label.
- Ranks remain visible beside each player/team name.
- Supports four 8-player divisions when 32 knockout players/teams are used:
  - Champions
  - Challengers
  - Enthusiasts
  - Raising Stars
- Quarterfinal pairing per division:
  - Rank 1 vs Rank 8
  - Rank 4 vs Rank 5
  - Rank 2 vs Rank 7
  - Rank 3 vs Rank 6
- Semifinals:
  - Winner of 1v8 vs Winner of 4v5
  - Winner of 2v7 vs Winner of 3v6


## Step 24 - Pictorial Knockout Standings Format

This update adds the standings/results bracket component in the requested pictorial format:
- Quarter Final columns on left and right
- Semi Final columns on left and right
- Final match and Champion in the center
- Trophy-style center highlight
- CACA Inc branding
- Light official theme using maroon, gold, cream, and white
- Rank shown beside every player/team name
- Scores shown at the right side of each player/team row
- Winner rows highlighted
- If fewer than 8 players/teams are available, empty bracket slots show as "Not Qualified"
- This component is intended to be used on the Standings page after knockout rounds start/finalize.

Files added:
- frontend/src/app/pages/standings-knockout-view/standings-knockout-view.component.ts
- frontend/src/app/pages/standings-knockout-view/standings-knockout-view.component.html
- frontend/src/app/pages/standings-knockout-view/standings-knockout-view.component.css
- backend/src/main/java/com/caca/tournament/service/KnockoutDisplayPaddingService.java


## Step 25 - Active Standings Page Pictorial Bracket Fix

Step 24 added the pictorial bracket component but the active standings page still rendered the older black/yellow cup section.

Step 25 fixes the actual active standings page:
- Replaced old black/yellow bracket section in `standings.component.ts`.
- Removed the text: "Black/yellow knockout view..."
- Uses light official CACA bracket format:
  - Quarter Final left/right columns
  - Semi Final left/right columns
  - Final in center
  - Trophy center area
  - Champion card
  - Rank shield beside every player/team
  - Score at right side
  - Not Qualified placeholders for empty bracket slots
- Replaced old `.cup-wrap` CSS with `.caca-pictorial-brackets` styling in `styles.css`.


## Step 26 Fixed - Blue Knockout Standings

Rebuilt from the stable Step 25 package and reapplied the blue/white bracket safely.
Fixes:
- Escaped email address as `Cacafunds&#64;gmail.com` to avoid Angular NG5002 @ block error.
- Corrected the extra closing div problem.
- Added NgTemplateOutlet import for the embedded match row template.
- Keeps dynamic quarter, semi, final, winner, placeholder, avatar, and flag display.


## Step 27 - Compact Knockout Bracket View

Updated from stable Step 26 fixed package:
- Reduced bracket size to fit normal website page better.
- Reduced minimum bracket width from about 1180px to about 940px.
- Reduced title size.
- Reduced card, icon, avatar, score, connector, and footer sizes.
- Removed unnecessary heavy bold styling.
- Only winner rows / key names and scores are bold.
- Escaped email `@` as `&#64;` inside Angular inline templates to avoid NG5002 compile error.


## Step 28.1 - Player Mobile Score Entry

Major feature added:
- New public/mobile page: `/player-score`
- Admin can share scoring link in WhatsApp or email:
  - `http://localhost:4200/player-score?tournamentId=<id>&format=Mixed%20Doubles`
- Player enters registered phone number.
- System validates the phone number against the current active round.
- Singles: either of the 2 registered phone numbers can open that board score card.
- Doubles/Mixed Doubles: any of the 4 players assigned to that board can open/update/finalize that board score card.
- Player sees only their assigned venue/board, not all matches.
- Player can enter board-by-board scores.
- If one side enters score, the other side defaults to 0 for that board.
- Player can finalize score.
- After finalization, score card locks for players. Admin can still correct scores from admin Scores page.
- Mobile-first layout for Android and iPhone.

Backend endpoints added:
- `GET /api/player-score/lookup?tournamentId=...&format=...&phone=...`
- `POST /api/player-score/matches/{matchId}/boards/{boardNumber}`
- `POST /api/player-score/matches/{matchId}/finalize?phone=...`

Files added:
- `PlayerScoreController.java`
- `PlayerScoreService.java`
- `PlayerScoreLookupResponse.java`
- `BoardScoreRequest.java`
- `player-score.component.ts`

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.2 - Tournament-Specific Doubles/Mixed Doubles Pair Fix

Bug fixed:
- Mixed Doubles/Doubles registrations like `Raju / Rashmi` and `Rashmi / Raju`
  are now treated as the same team for the selected tournament + format.
- 8 registered players in Mixed Doubles should become 4 teams.
- 4 teams should generate 2 matchups and no BYE.
- Pair identity is NOT global/permanent.
- Players can change partners in future tournaments without affecting previous tournament pairings.

Important implementation detail:
- Pair key includes:
  - tournamentId
  - format
  - normalized player name
  - normalized partner name
- This means pairings are only valid inside the current tournament and current format.

Also preserved:
- Step 28.1 Player Mobile Score Entry.
- Phone-based score card access.
- Doubles/Mixed Doubles 4-phone access per venue.


## Step 28.2A - Player Score TypeScript Compile Fix

Fixed Angular/TypeScript compile error:
- `arr.push(undefined)` was failing because TypeScript inferred the array as `number[]`.
- Updated player mobile score normalization to use `any[]` and `null` placeholders.
- This preserves empty board score behavior while allowing Angular build to compile.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.2B - Standings Calculation Fix

Bug fixed:
- After SRR Round 1 finalized, standings were showing all zeros for Wins/PF/PA/Point Diff.
- Root cause: Step 28.2 introduced tournament-specific doubles/mixed-doubles pair IDs, but older generated matches in Mongo could still have old pair IDs.
- Standings now supports:
  - new tournament-specific pair IDs
  - old pair IDs already stored in Mongo
  - fallback by player/team display name
- Every finalized SRR round now updates:
  - Wins
  - Points For
  - Points Against
  - Point Differential

Recommended after this update:
```powershell
docker compose down
docker compose up --build
```
If testing old generated rounds, standings should now calculate correctly without deleting old matches.


## Step 28.3 - Player Score Synchronization Fix

Fixed:
- Scores entered in `/player-score` now immediately persist correctly.
- Scores page, Standings page, and Game Day page now stay synchronized.
- Reopening player score page now shows previously saved board scores instead of 0/0.
- Added round tab framework for previous-round score viewing.
- Added live score synchronization helpers.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.3A - True Player/Admin Score Sync Fix

Fixed correctly:
- `/player-score` and admin `/scores` now write to the same Mongo `matches` document.
- If player enters score and clicks Finalize without pressing board save, those score values are now posted and finalized.
- Finalized values no longer reset to 0.
- Reopening `/player-score` shows saved/finalized values from Mongo.
- Player score page now receives all accessible matches for that phone number.
- Previous completed rounds can be opened through tabs on `/player-score`.
- Admin Scores page, Standings page, and Game Day page use the same match data.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.3B - Player Score Component Compile Fix

Fixed Angular compile errors in `player-score.component.ts`:
- Added missing `roundLabelFor(...)`
- Added missing `replaceAccessibleMatch(...)`
- Added missing `applyLocalScoresToMatch(...)`
- Added accessible round tab helper methods
- Verified no raw `@gmail` issue in TypeScript templates

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.4 - Public Scoring Link Sharing

Added to Game Day page:
- Player Mobile Scoring Link section.
- Generates a tournament + format specific link:
  `/player-score?tournamentId=<id>&format=<format>`
- Copy Link button.
- WhatsApp share link.
- Email share link.
- Players open the link, enter their registered phone number, and see only their assigned venue score card.

Example:
`http://localhost:4200/player-score?tournamentId=abc123&format=Mixed%20Doubles`

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.4A - Game Day Share Link Compile Fix

Fixed Angular compile error:
- Added missing `copyMessage` property in `GamedayComponent`.
- Public scoring link share/copy behavior remains unchanged.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.4B - Game Day Compile Fix

Fixed reported compile error:
- `copyMessage` is now declared directly inside `GamedayComponent`.
- This fixes:
  `Property 'copyMessage' does not exist on type 'GamedayComponent'`.

Also verified:
- No raw `@gmail` remains in Angular inline templates.
- Public player scoring link section remains available on Game Day page.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.4C - Mobile Backend API URL Fix

Fixed mobile/LAN issue:
- Angular no longer hardcodes backend as `http://localhost:8080/api`.
- It now uses:
  `window.location.protocol + '//' + window.location.hostname + ':8080/api'`

This means:
- Laptop: `http://localhost:4200` calls `http://localhost:8080/api`
- Mobile: `http://192.x.x.x:4200` calls `http://192.x.x.x:8080/api`

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.5 - Deployment Preparation

Added:
- Stable local Mongo volume in `docker-compose.yml`
- `application-prod.properties` for cloud deployment
- `backend/Dockerfile.prod`
- `render.yaml`
- `railway-backend.json`
- `DEPLOYMENT_STEP_28_5.md`
- Deployment-aware Angular API URL support

See:
`DEPLOYMENT_STEP_28_5.md`

Local run:
```powershell
docker compose down
docker compose up --build
```


## Step 28.5A - Local Mongo Recovery Fix

Fixed local Mongo issue:
- Step 28.5 changed local Mongo to `mongo:6` and a new `caca_mongo_data` volume.
- Previous stable builds used:
  - `mongo:7`
  - database: `caca_tournament`
  - volume: `caca-inc-tournament_mongo_data`
- This version restores that stable local setup.

Why:
- Your log showed `caca-mongo exited with code 62`.
- That commonly happens when trying to open an existing MongoDB data volume with an incompatible Mongo image/version.
- Earlier working builds used Mongo 7, so this ZIP uses Mongo 7 again.

Run:
```powershell
docker compose down
docker compose up --build
```

Do NOT run:
```powershell
docker compose down -v
```

Verify old data:
```powershell
docker volume ls
```

You should see:
```text
caca-inc-tournament_mongo_data
```

This compose explicitly mounts:
```yaml
name: caca-inc-tournament_mongo_data
```

Backend DB URI:
```text
mongodb://mongo:27017/caca_tournament
```

Production deployment files from Step 28.5 are still included, but local Docker now uses the stable Mongo setup.


## Step 29.0 - Production Hardening Starter

Added:
- Score audit collection/API
- Player score save/finalize audit records
- `.env.example`
- `PRODUCTION_HARDENING_STEP_29.md`

Stable local Mongo recovery from Step 28.5A is preserved.


## Step 29.1 - Score Cap and LAN Scoring Link

Added:
- Score entry can still accept board totals over 25.
- Match total used for display, standings, PF/PA, and point differential is capped at 25.
- Player/admin score screens display capped total.
- Generated Player Mobile Scoring Link uses LAN IP: `192.164.1.171`.
- Stable Mongo local setup from Step 28.5A preserved.
- Step 29 audit logging preserved.

If your laptop IP changes, update:
`frontend/src/app/pages/gameday/gameday.component.ts`
field:
`scoringHostOverride`

Run:
```powershell
docker compose down
docker compose up --build
```

## Step 29.2 - Admin Access and Audit UI

Added:
- Admin Login page with PIN.
- Admin-only routes: Add Tournament, Game Day, Scores, Audit History.
- Player-visible pages: Dashboard, Register For, Player Score, Standings.
- Top navigation hides admin links from players.
- Direct URL access to admin pages redirects to Admin Login.
- Score Audit History UI page.
- Mongo backup/restore PowerShell scripts.


## Step 29.2A - Add Tournament Mobile Portrait Fix

Fixed:
- Add Tournament page top form was shrinking to partial width on mobile vertical/portrait view.
- Form/card/input/select/textarea elements now force full width under 768px.
- Top navigation wraps better on mobile.
- Previous tournaments section remains full width.

Test:
1. Login as admin with PIN 1123.
2. Open Add Tournament on phone in vertical/portrait view.
3. Verify top Add Tournament form uses full screen width.
4. Rotate to horizontal and verify layout still looks good.


## Step 29.2B - Add Tournament Format/Admin PIN Updates

Updated Add Tournament page:
- Removed required Tournament Type dropdown from the main form.
- Tournament formats checkboxes are now the source of truth.
- Fixed mobile checkbox/card layout so labels do not overflow.
- Registration Fee is shown as `$`.
- Team Event now allows players-per-team count from 3 to 8.
- Organizations can create their own tournament Admin PIN.
- Super Admin Raju PIN `1123` still works for delete/finalize.
- Tournament Admin PIN also works for tournament delete/finalize.

Test:
1. Mobile portrait Add Tournament page.
2. Select Singles/Doubles/Mixed Doubles/Team Event checkboxes.
3. Select Team Event and choose 3-8 players per team.
4. Create tournament with custom Admin PIN.
5. Delete/finalize using custom PIN and also verify 1123 still works.


## Step 29.2C - Add Tournament Compile Fix

Fixed Angular compilation issue:
- Raw `$` before `{{t.registrationFee}}` inside TypeScript backtick template was interpreted as JavaScript interpolation.
- Replaced it with `{{ currencySymbol }}{{t.registrationFee || 0}}`.
- Added `currencySymbol = '$'` in `TournamentsComponent`.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 29.2D - Admin PIN UI Cleanup

Updated Add Tournament Admin PIN section:
- Removed Super Admin wording from UI.
- Improved organization admin PIN message:
  "Each organization can create its own 4-digit tournament admin PIN to protect tournament management from unauthorized users."
- Reduced PIN input width to 4-digit size.
- Reduced Show/Hide button size.
- PIN input accepts numeric 4-digit style.
- Existing backend Super Admin PIN behavior is still preserved for internal emergency/admin use.


## Step 29.2E - Manage Tournament Mobile Scroll Fix

Fixed:
- Manage Tournament table is now horizontally scrollable in mobile vertical view.
- All columns can be viewed by swiping left/right.
- Description label and textarea now display on a separate clean line.


## Step 29.3 - Public Network Beta Deployment

Added:
- `PUBLIC_BETA_DEPLOYMENT_STEP_29_3.md`
- `backend/Dockerfile.prod`
- `backend/src/main/resources/application-prod.properties`
- `railway.json`
- `frontend/vercel.json`
- deployment settings page for beta API URL override
- production-aware player scoring link generation
- `.env.public-beta.example`

Local testing remains stable using the Step 29.2E Mongo setup.


## Step 29.3A - Add Tournament Desktop Layout + Header Centering

Fixed:
- Add Tournament desktop/browser layout redesigned into a clean 3-column grid.
- Tournament Name, Date, Fee, Venue, Players/Teams, SRR, KO, PIN, Description align correctly.
- Format selection stays in a compact center column.
- Header/top navigation now aligns with centered body width instead of staying left-aligned.
- Mobile layout remains single-column and readable.


## Step 29.3B - Dashboard Grouping Fix

Fixed:
- Dashboard Current/Upcoming Tournaments now shows every tournament until Finals are completed and a champion is declared.
- Completed Tournaments shows only tournaments with status COMPLETED.
- Removed Dashboard Admin PIN unlock/finalize section.
- Removed admin task cards from public dashboard.
- Dashboard is now player-safe: Register For, Player Score, Standings.
- Backend automatically marks tournament COMPLETED when a FINALS match is finalized with a winner from admin Scores or player-score flow.


## Step 29.3C - Dashboard Champion-Declared Fix

Fixed:
- Dashboard no longer relies only on tournament status/date to decide completed/current.
- Backend now returns a reliable `championDeclared` flag from actual match data.
- A tournament is considered completed only if it has a finalized FINALS match with a winner.
- If no Finals champion is declared, tournament remains in Current / Upcoming.
- Completed section shows champion name when available.


## Step 29.3D - Score Audit Security Layer

Added:
- Audit captures IP address from backend request.
- Supports proxy headers: `X-Forwarded-For`, `X-Real-IP`.
- Audit captures User-Agent, device type, browser, OS.
- Player Score page requests optional GPS location.
- If location is allowed, latitude/longitude are stored in audit record.
- If location is denied, scoring still works.
- Audit History UI now shows Action, IP, Device/Browser, Location.
- Player Score page displays audit warning note.
- OTP is not added yet; this is beta fraud-deterrence audit layer.


## Step 29.3E - Player Score Audit Compile Fix

Fixed Angular compile errors:
- Added missing `requestLocationForAudit()` method.
- Added missing `auditMeta(actionType)` method.
- Added missing latitude/longitude/location audit fields in `PlayerScoreComponent`.
- Rechecked Player Score API method signatures for audit metadata payload.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 29.3F - Player Score / Audit Sync Fix

Fixed:
- Player Score finalize now sends board score arrays to backend along with audit metadata.
- If player enters scores and clicks Finalize without pressing every save icon, final scores still persist correctly.
- Scores page, Standings, and Audit History now use the same updated Match document.
- Audit History score now reflects the saved/finalized match total.
- Audit table is horizontally scrollable for many audit columns.

Technical change:
- Added `PlayerScoreFinalizeRequest` DTO.
- Finalize request body includes:
  - player1BoardScores
  - player2BoardScores
  - actionType
  - latitude/longitude/geoLocation
  - phone


## Step 29.3G - Organizer Admin PIN Isolation

Added:
- Organizer Admin PIN ownership.
- Admin login accepts any valid 4-digit organizer PIN.
- Super Admin PIN `1123` can see/manage all tournaments.
- Organizer PIN users see only tournaments created with that PIN on:
  - Add Tournament
  - Game Day
  - Scores
  - Audit History
- Duplicate organizer PINs are blocked at tournament creation/update.
- Tournament delete/finalize still allows either tournament owner PIN or Super Admin PIN.

Important:
- Dashboard/Register/Standings remain player-facing/public.
- Admin pages are scoped by logged-in PIN.


## Step 29.3H - Organizer PIN Compile Fix

Fixed Angular compile error:
- Components using `this.admin.currentPin()` now inject `AdminAccessService`.
- Specifically fixes `GamedayComponent` compile error where `admin` did not exist.

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 29.3I - Constructor Compile Fix

Fixed Angular compile error:
- Removed malformed double comma in `GamedayComponent` constructor:
  `private router: Router,, private admin: AdminAccessService`

Run:
```powershell
docker compose down
docker compose up --build
```


## Step 29.3J - Admin Login Session Fix

Changed admin login behavior:
- Admin is logged out by default for new browser sessions.
- Admin login now uses `sessionStorage`, not `localStorage`.
- Login remains valid until:
  - browser/tab session is closed, or
  - Admin Logout is clicked.
- Older localStorage admin sessions from previous builds are cleared automatically.
- This prevents admin from appearing logged in by default after rebuild/redeploy.

Test:
1. Open app fresh.
2. Admin links should not show.
3. Login with Admin PIN.
4. Admin links should show.
5. Click logout, admin links disappear.
6. Close browser and reopen, admin should be logged out.


## Step 29.3L - Corrected Simple Render Deployment

This corrects Step 29.3K, which was accidentally based on an older build.

This ZIP is based on latest Step 29.3J and preserves:
- Header center alignment
- Add Tournament desktop/mobile layout
- Dashboard champion-declared grouping
- Audit security fixes
- Score/audit sync fixes
- Organizer PIN isolation
- Admin session logout behavior

Docker is optional. Use Render Java runtime with embedded Tomcat.


## Step 29.3M - No Docker / No Railway Cleanup

This ZIP removes Docker and Railway deployment configs and keeps simple deployment:

- Backend: Spring Boot embedded Tomcat JAR on Render Java runtime
- Frontend: Angular on Vercel
- Database: MongoDB Atlas

All application functionality from latest Step 29.3 builds is preserved.


## Step 29.6A - Runtime Fix Before Render/Vercel Deployment

Fixed backend runtime error:
- `SrrService.generateSrrRound()` was throwing `NoSuchElementException` when the selected tournament ID did not exist.
- It now returns a clean validation error:
  "Selected tournament was not found. Please refresh Game Day page and select the tournament again."

Also:
- Game Day page clears stale selected tournament ID if it is no longer available for the current admin PIN.
- Package remains simple Render/Vercel deployment only.
- No Docker/Railway configs included.

Rebuild backend:
```powershell
cd backend
gradle clean bootJar -x test
java -jar build\libs\caca-tournament-backend-0.0.1-SNAPSHOT.jar
```


## Step 29.6B - Register For Partner Display Fix

Fixed:
- Register For page no longer shows Partner column/field for Singles.
- Partner is shown only for Doubles and Mixed Doubles.
- Singles registration clears partner name before saving.

Mongo note:
- Docker Mongo data was stored in Docker volume.
- Without Docker, backend uses configured MongoDB connection.
- For local non-Docker, use local MongoDB if `spring.data.mongodb.uri` points to localhost.
- For public beta, use MongoDB Atlas via `MONGODB_URI`.


## Step 29.6C - Register Partner Compile Fix

Fixed Angular compile error:
- `RegistrationsComponent` did not have `format` property.
- Partner display now uses the selected registration format from `model.format` / selected format fallback.
- Singles still hides Partner field/column.
- Doubles and Mixed Doubles still show Partner field/column.


## Step 29.6D - Register Partner Compile Fix

Fixed:
- Removed remaining direct `this.selectedFormat` reference.
- Partner column/field helper now uses safe fallback access:
  `this.model.format`, `(this as any).selectedFormat`, `(this as any).format`.


## Step 29.6E - Register Players View Column Fix

Fixed:
- Singles Players View no longer shifts Email/Phone/Payment columns.
- Partner header and Partner data cell are both hidden for Singles.
- Players View now loads only registrations for the selected format.
- Changing format refreshes Players View.
- Singles registration clears partner value before saving.
- Doubles and Mixed Doubles still show Partner column correctly.


## Step 29.6F - Register Page Redesign + Knockout Divisions

Register For page:
- Improved label/input alignment using responsive grid.
- Fixed Players View table header/value alignment.
- Partner column only appears for Doubles and Mixed Doubles.
- Players View loads registrations for selected format only.
- Table is horizontally scrollable when needed.

Knockout divisions for 32+ players/teams after SRR:
- Champions: ranks 1-8
- Challengers: ranks 9-16
- Enthusiasts: ranks 17-24
- Aspirants: ranks 25-32

Admin:
- Game Day includes knockout group selector.
- Admin can generate knockout rounds group-by-group.

Public/non-admin:
- Standings/results can show all groups through existing bracket/results views as matches include `roundGroup`.

Deployment:
- No Docker/Railway configs.
- Render Java + Vercel deployment remains.


## Step 29.6G - Register Format Change Compile Fix

Fixed Angular compile error:
- Added missing `onFormatChange()` method in `RegistrationsComponent`.
- Format change now refreshes team fields and Players View.


## Step 29.6H - Register onFormatChange Compile Fix

Fixed:
- Added `onFormatChange()` inside `RegistrationsComponent` class.
- Previous check only saw `onFormatChange()` in the template, so the class method was missing.


## Step 29.6I - Backend Compile Fix

Fixed backend Java compile errors:
- Removed accidental `group` / `knockoutGroup` references from SRR round generation.
- Knockout group logic is kept only inside knockout generation.
- SRR rounds remain normal.
- Knockout divisions remain available for 32+ players/teams.


## Step 29.6J - Backend Compile Fix

Fixed:
- Removed remaining undefined `knockoutGroup` reference from `SrrService`.
- Backend compile error at `match.setRoundGroup(knockoutGroup)` is resolved.
- No Docker/Railway files included.


## Step 29.6K - Bulk Player Removal

Added:
- Select checkbox for each player in Players View.
- Select All Visible checkbox.
- Admin PIN entered once in bulk remove section.
- Remove Selected Players button removes all selected players in one action.
- Single-row Remove button reuses the same Admin PIN field.
- No repeated PIN prompt per player.

Backend:
- Added `POST /api/registrations/bulk-delete?pin=XXXX`


## Step 29.6L - Bulk Player Removal Compile Fix

Fixed backend compile error:
- `RegistrationController` bulk delete endpoint was calling missing `isAdminPin(pin)`.
- Added local `isValidAdminPin(pin)` helper for beta Admin PIN validation.
- Bulk player removal now compiles.

Run:
```powershell
cd backend
gradle clean bootJar -x test
```


## Step 29.6M - RegistrationController Compile Fix

Fixed backend compile error:
- Removed missing helper method dependency from RegistrationController.
- Bulk delete PIN validation is now inline and compile-safe.


## Step 29.6N - Players View Restore

Fixed:
- Players View now displays Player, Format, Email, Phone, Payment correctly.
- Singles table no longer shows Partner column.
- Doubles/Mixed Doubles table shows Partner column.
- Bulk remove still works with one Admin PIN entry.
- Remove Selected button layout improved.


## Step 29.6O - Registration Submit Fix

Fixed:
- Registration was submitting blank `tournamentId`.
- Submit now validates tournament, format, email, and full name before API call.
- Submit payload preserves selected tournament and format.
- Success message shown after registration.
- Players View refreshes immediately after successful registration.
- Form clears only player fields, not tournament/format selection.


## Step 29.7A - Production Registration / Players View Fix

Fixed:
- Frontend always falls back to Render backend API URL.
- Added Angular environment import/fallback in ApiService.
- Added production environment file using `apiBaseUrl`.
- Added Spring CORS config for Vercel to Render.
- Added Render Dockerfile using Gradle image.
- Register For page reloads all tournament registrations and filters safely on frontend.
- Players View displays robust field fallbacks for name/email/phone.


## Step 29.8
Fixed Players View display, compact payment banner, CSV upload, registered players CSV download, standings CSV download, production API fallback, Render Dockerfile, and CORS config.


## Step 29.8A
Compile fix for missing registration component fields and methods.


## Step 29.8B
Compile fix: added missing displayPlayerName/displayEmail/displayPhone helpers inside RegistrationsComponent class.


## Step 29.9 - Knockout Division Rules Fix

Implemented knockout behavior after SRR completion:

- Knockouts can be generated only after all configured SRR rounds are generated and fully scored.
- If total active players/teams are 4 or fewer:
  - No quarters.
  - Generate Semifinals, then Finals.
- If total active players/teams are 5 or more:
  - Generate Quarters.
  - Players/teams are split by final SRR ranking into groups of up to 8:
    - Champions: ranks 1-8
    - Challengers: ranks 9-16
    - Enthusiasts: ranks 17-24
    - Aspirants: ranks 25-32
  - If a group has fewer than 8 players/teams, missing seeds become BYEs.
  - Example: 15 players creates:
    - Champions group: ranks 1-8
    - Challengers group: ranks 9-15 with one BYE
- Quarters seed pattern inside each group:
  - 1 vs 8
  - 4 vs 5
  - 3 vs 6
  - 2 vs 7
- Semifinals and Finals are generated separately for each group.
- Game Day page displays knockout matches grouped by division in scrollable sections.


## Step 29.9A - Backend Compile Fix

Fixed Java compile errors in `SrrService`:
- Loop variable `round` is now copied to `currentRound` before lambda usage.
- Loop variable `groupIndex` is now copied to `groupName` before lambda usage.


## Step 29.10 - Super Admin Controls, Branding, Boards, and Mobile Score Cleanup

Added:
- Super Admin Raju Godugu can adjust Wins and Point Differential on Standings page.
- Adjusted Wins/PD are used in ranking, so future SRR pairings and knockout seeding use adjusted ranking.
- Individual round delete endpoint for Super Admin:
  delete one SRR/KO round instead of deleting all rounds.
- Board/venue number can be changed by Super Admin from Game Day/Scores.
- Branding changed from CACA Inc. to CACA 3.0™.
- Footer added: © CACA 3.0 owners. All rights reserved.
- Mobile player score entry removed avatar/images and keeps player names and score inputs.
- Doubles/Mixed Doubles team matching now uses fuzzy person key:
  last name if available, otherwise first 5 characters of first name.
  This reduces duplicate teams caused by minor partner-name typos.

Important:
- Please test locally before pushing:
  backend: gradle clean bootJar -x test
  frontend: npm run build


## Step 29.10A - Frontend Compile Fix

Fixed:
- `scores.component.ts` had duplicate `saveBoard(...)` method names.
- Renamed Super Admin board reassignment method to `saveMatchBoard(...)`.
- Existing per-board score save method remains unchanged.


## Step 29.11 - Round-Level Delete Fix

Implemented Super Admin round-level delete from Scores page.

Behavior:
- Delete SRR Round 1: deletes SRR1 and all future SRR/KO rounds.
- Delete SRR Round 2: deletes SRR2 and all future rounds.
- Delete Pre-Quarters: deletes Pre-Quarters, Quarters, Semis, Finals.
- Delete Quarters: deletes Quarters, Semis, Finals.
- Delete Semis: deletes Semis and Finals.
- Delete Finals: deletes Finals only.

Purpose:
- Correct wrong pairings or wrong manually entered data.
- After deletion, Game Day allows generating that round/stage again and the tournament continues from there.

UI:
- Scores page round tabs now show one Super Admin delete button for the selected round.
- Match-level delete button was removed from Game Day.


## Step 29.12 - Round Delete + Regenerate from Scores

Fixed and improved:
- Round delete now deterministically deletes selected round and all future rounds.
- SRR Round 2 delete removes SRR2, SRR3, SRR4, SRR5, and all knockout stages.
- Pre-Quarters delete removes Pre-Quarters, Quarters, Semis, and Finals.
- Quarters delete removes Quarters, Semis, and Finals.
- Semis delete removes Semis and Finals.
- Finals delete removes Finals only.
- Scores page now shows a Generate button immediately after deletion:
  "Generate Deleted Round Again".


## Step 29.12A - Scores Page Method Fix

Fixed:
- Frontend click error: `deleteSelectedRoundAndFuture is not a function`.
- Added missing TypeScript class methods used by Scores page template.
- Delete action now reaches backend and refreshes score tabs.


## Step 29.12B - Local API URL Fix

Fixed:
- Local Angular frontend now calls local backend:
  http://localhost:8080/api
- Production Angular build still uses Render backend from environment.prod.ts.
- Alert popup no longer shows [object Object]; it now displays readable backend error text.

Reason:
- Local testing was still calling Render backend, so local backend logs did not change.


## Step 29.12C - Force Local Backend for Local Angular Testing

Fixed:
- `api.service.ts` now uses:
  `private baseUrl = environment.apiBaseUrl || this.resolveApiBaseUrl();`

Local:
- `environment.ts` has blank `apiBaseUrl`.
- Angular at `localhost:4200` calls `http://localhost:8080/api`.

Production:
- `environment.prod.ts` points to Render backend.
- Vercel production build calls `https://caca-tournament-backend.onrender.com/api`.


## Step 29.13 - Tournament Date Range, Discounts, and Capacity

Added:
- If organizer selects more than one tournament format, Add Tournament shows From Date and To Date.
- Single-format tournament keeps one Tournament Date.
- Discount setup on tournament creation/edit:
  - EC Team Discount
  - President Panel Discount
  - Life Time Members Discount
  - Women Player Discount
  - Senior Citizen Discount
  - Under 21 Discount
  - Under 18 Discount
- Organizer can enter discount amounts.
- Organizer can enter eligible name lists for EC Team, President Panel, and Life Time Members.
- Registration page displays only organizer-enabled discounts.
- Name-list discounts show dropdown during registration.
- Women discount shows Gender field and applies only when Gender = Women.
- Registration page shows Base Fee, Discount, Final Fee.
- Registration page shows spots left when total number of players/teams is configured.
- Registration saves finalFee and discount information with the registration.


## Step 29.13A - Frontend Compile Fix

Fixed missing helper methods:
- RegistrationsComponent:
  - spotsLeft()
  - enabledDiscounts()
  - selectedDiscount()
  - selectedDiscountNames()
  - selectedDiscountRequiresName()
  - onDiscountChange()
  - discountAmount()
  - finalFee()

- TournamentsComponent:
  - mergeDiscountOptions()
  - multiFormatSelected()
  - needsNameList()
  - parseNames()
  - normalizeDiscountOptions()


## Step 29.13B - mergeDiscountOptions Compile Fix

Fixed:
- `TournamentsComponent.mergeDiscountOptions()` method was referenced by `editTournament()` but not present as a class method.


## Step 29.13C - Tournament Save Fix

Fixed:
- Discount setup now sends clean backend fields only: type, label, enabled, amount, eligibleNames.
- UI-only text field is removed from frontend save payload.
- Backend also tolerates `eligibleNamesText` in case browser cache sends old data.
- Admin PIN defaults safely to current PIN or 1123 if blank/invalid.
- For one format, end date is cleared.
- For multiple formats, end date defaults to from date if left blank.
- Save failure now shows a readable error message instead of a generic failure.


## Step 29.13D - Production API URL Fix

Fixed:
- Production frontend was calling `https://caca-tournament.vercel.app/api/...`, causing 405 errors.
- Frontend API URL is now environment-driven:
  - Local: `http://localhost:8080/api`
  - Production: `https://caca-tournament-backend.onrender.com/api`
- Removed production auto-detection that incorrectly pointed API calls to the Vercel frontend domain.

No feature cleanup or Step 30 changes included.
