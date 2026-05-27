param([Parameter(Mandatory=$true)][string]$BackupFolder)
docker cp "$BackupFolder" caca-mongo:/tmp/caca_restore
docker exec caca-mongo mongorestore --db caca_tournament --drop /tmp/caca_restore
Write-Host "Restore completed from: $BackupFolder"
