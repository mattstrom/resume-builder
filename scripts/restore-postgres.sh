#!/bin/bash

# PostgreSQL Restore Script
# Restores a PostgreSQL database from a backup
#
# To seed a development copy instead of overwriting an existing database, use
# ./scripts/clone-postgres.sh -- it creates the target database and its
# extensions first, which this script assumes are already in place.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/pg-common.sh"

# Configuration
DATABASE_URL=${DATABASE_URL:-""}
PGHOST=${PGHOST:-"localhost"}
PGPORT=${PGPORT:-"5432"}
PGDATABASE=${PGDATABASE:-"resume-builder"}
PGUSER=${PGUSER:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}

require_command pg_restore

# Refuse to overwrite production unless explicitly allowed. Resolved from
# DATABASE_URL when set, since that takes precedence over PGDATABASE below.
assert_not_prod "$(resolve_target_db)"

# List available backups
print_status "Available backups:"
echo ""
list_backups
prompt_for_backup

backup_path="$BACKUP_DIR/$selected_backup"

print_status "Selected backup: $selected_backup"

build_connection_args

# Confirm restoration
echo ""
print_warning "This will restore the database: $CONN_DISPLAY"
print_warning "Existing data will be replaced with the backup data!"
print_prompt "Are you sure you want to continue? (yes/no): "
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    print_status "Restore cancelled"
    exit 0
fi

# Perform the restore
print_status "Restoring database..."
pg_restore "${CONNECTION_ARGS[@]}" --clean --if-exists --no-owner --no-privileges -Fc "$backup_path"

# Check if restore was successful
if [ $? -eq 0 ]; then
    print_status "Database restored successfully!"
else
    print_error "Restore failed!"
    exit 1
fi

print_status "Restore completed!"
