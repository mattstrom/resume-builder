#!/bin/bash

# PostgreSQL Backup Script
# Creates timestamped backups of the PostgreSQL database

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/pg-common.sh"

# Configuration
DATABASE_URL=${DATABASE_URL:-""}
PGHOST=${PGHOST:-"localhost"}
PGPORT=${PGPORT:-"5432"}
PGDATABASE=${PGDATABASE:-"resume-builder"}
PGUSER=${PGUSER:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.dump"

require_command pg_dump

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    print_status "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

build_connection_args

# Perform the backup
print_status "Starting PostgreSQL backup..."
print_status "Connection: $CONN_DISPLAY"
print_status "Backup location: $BACKUP_PATH"

pg_dump -Fc "${CONNECTION_ARGS[@]}" -f "$BACKUP_PATH"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    print_status "Backup completed successfully!"
    print_status "Backup size: $BACKUP_SIZE"

    # Optional: Remove old backups (keep last 7 days)
    if [ "$CLEANUP_OLD_BACKUPS" = "true" ]; then
        print_status "Cleaning up old backups (keeping last 7 days)..."
        find "$BACKUP_DIR" -name "postgres_backup_*.dump" -type f -mtime +7 -delete
        print_status "Old backups cleaned up"
    fi
else
    print_error "Backup failed!"
    rm -f "$BACKUP_PATH"
    exit 1
fi

# Display recent backups
echo ""
print_status "Recent backups:"
ls -lht "$BACKUP_DIR" | grep postgres_backup | head -5
