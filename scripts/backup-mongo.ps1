$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups/caca_mongo_$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
docker exec caca-mongo mongodump --db caca_tournament --out /tmp/caca_backup
docker cp caca-mongo:/tmp/caca_backup/caca_tournament "$backupDir"
Write-Host "Backup completed: $backupDir"
