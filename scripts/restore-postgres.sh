#!/bin/bash

# PostgreSQL Restore Script
# Restores a PostgreSQL database from a backup

# Configuration
DATABASE_URL=${DATABASE_URL:-""}
PGHOST=${PGHOST:-"localhost"}
PGPORT=${PGPORT:-"5432"}
PGDATABASE=${PGDATABASE:-"mastra"}
PGUSER=${PGUSER:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_prompt() {
    echo -e "${BLUE}[?]${NC} $1"
}

# Check if pg_restore is installed
if ! command -v pg_restore &> /dev/null; then
    print_error "pg_restore is not installed. Please install PostgreSQL client tools."
    echo "  macOS: brew install libpq && brew link --force libpq"
    echo "  Linux: apt-get install postgresql-client"
    exit 1
fi

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory does not exist: $BACKUP_DIR"
    exit 1
fi

# List available backups
print_status "Available backups:"
echo ""
backups=($(ls -1 "$BACKUP_DIR" | grep "postgres_backup_.*\.dump$" | sort -r))

if [ ${#backups[@]} -eq 0 ]; then
    print_error "No backups found in $BACKUP_DIR"
    exit 1
fi

# Display backups with numbers
for i in "${!backups[@]}"; do
    backup_file="${backups[$i]}"
    backup_size=$(du -h "$BACKUP_DIR/$backup_file" | cut -f1)
    backup_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_DIR/$backup_file" 2>/dev/null || \
                  stat -c "%y" "$BACKUP_DIR/$backup_file" 2>/dev/null | cut -d' ' -f1,2)
    echo "  $((i+1)). $backup_file ($backup_size, $backup_date)"
done

echo ""
print_prompt "Select a backup to restore (1-${#backups[@]}) or 'q' to quit: "
read -r selection

# Validate selection
if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
    print_status "Restore cancelled"
    exit 0
fi

if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
    print_error "Invalid selection"
    exit 1
fi

# Get selected backup
selected_backup="${backups[$((selection-1))]}"
backup_path="$BACKUP_DIR/$selected_backup"

print_status "Selected backup: $selected_backup"

# Build connection args
if [ -n "$DATABASE_URL" ]; then
    DB_DISPLAY="$DATABASE_URL"
    CONNECTION_ARGS=(-d "$DATABASE_URL")
else
    DB_DISPLAY="${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
    CONNECTION_ARGS=(-h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE")
fi

# Confirm restoration
echo ""
print_warning "This will restore the database: $DB_DISPLAY"
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
