# MongoDB Backup Scripts

This directory contains scripts for backing up and restoring the MongoDB database.

## Scripts

### backup-mongodb.sh

Creates timestamped backups of the MongoDB database and compresses them.

**Usage:**

```bash
./scripts/backup-mongodb.sh
```

**Environment Variables:**

- `MONGODB_URI` - MongoDB connection URI (default: `mongodb://localhost:27017`)
- `DATABASE_NAME` - Name of database to backup (default: `resume-builder`)
- `BACKUP_DIR` - Directory to store backups (default: `./backup`)
- `CLEANUP_OLD_BACKUPS` - Set to `true` to auto-delete backups older than 7 days

**Example with custom settings:**

```bash
MONGODB_URI="mongodb://user:pass@host:27017" \
DATABASE_NAME="my-database" \
BACKUP_DIR="/path/to/backups" \
./scripts/backup-mongodb.sh
```

### restore-mongodb.sh

Restores a MongoDB database from a previously created backup.

**Usage:**

```bash
./scripts/restore-mongodb.sh
```

The script will:

1. List all available backups
2. Let you select which backup to restore
3. Confirm before restoring (as it will drop existing data)
4. Restore the selected backup

**Environment Variables:**

- `MONGODB_URI` - MongoDB connection URI (default: `mongodb://localhost:27017`)
- `DATABASE_NAME` - Name of database to restore (default: `resume-builder`)
- `BACKUP_DIR` - Directory containing backups (default: `./backup`)

## Requirements

Both scripts require MongoDB Database Tools to be installed:

- `mongodump` (for backup)
- `mongorestore` (for restore)

Install MongoDB Database Tools:

- **macOS**: `brew install mongodb-database-tools`
- **Linux/Windows**: Visit [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/)

## Backup Schedule

For automated backups, you can set up a cron job:

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * cd /path/to/resume-builder && ./scripts/backup-mongodb.sh

# Weekly backup on Sundays at 3 AM with cleanup
0 3 * * 0 cd /path/to/resume-builder && CLEANUP_OLD_BACKUPS=true ./scripts/backup-mongodb.sh
```
