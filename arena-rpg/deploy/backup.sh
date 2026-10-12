#!/bin/sh
# Daily database backup (consistent snapshot while the game keeps running).
# crontab -e  →  15 4 * * * /path/to/arena-rpg/deploy/backup.sh >> /var/log/arena-backup.log 2>&1
set -eu
cd "$(dirname "$0")"
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p backups
docker compose exec -T server node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/data/arena.db');
db.exec(\"VACUUM INTO '/data/backup.db'\");
"
docker compose cp server:/data/backup.db "backups/arena-$STAMP.db"
docker compose exec -T server rm -f /data/backup.db
# Keep 14 days (KVKK: backups are not kept forever either).
find backups -name 'arena-*.db' -mtime +14 -delete
echo "backup ok: backups/arena-$STAMP.db"
