#!/bin/bash

# Shared helpers for the PostgreSQL backup / restore / clone scripts.
# Source this file; do not execute it directly.

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

# Exit with an error unless the named command is on PATH.
require_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed. Please install PostgreSQL client tools."
        echo "  macOS: brew install libpq && brew link --force libpq"
        echo "  Linux: apt-get install postgresql-client"
        exit 1
    fi
}

# Extract the database name from a libpq connection URI, i.e. the path segment
# after the host[:port], minus any ?query string.
db_name_from_url() {
    local url="$1"
    local without_scheme="${url#*://}"
    local path="${without_scheme#*/}"

    # No path component at all means no database was specified.
    if [ "$path" = "$without_scheme" ]; then
        echo ""
        return
    fi

    echo "${path%%\?*}"
}

# The database a script is about to write to. DATABASE_URL wins over PGDATABASE
# because the connection-arg builders below give it precedence -- checking only
# PGDATABASE would let a DATABASE_URL pointed at prod slip past the guard.
resolve_target_db() {
    if [ -n "$DATABASE_URL" ]; then
        db_name_from_url "$DATABASE_URL"
    else
        echo "$PGDATABASE"
    fi
}

# Refuse to write to the production database unless explicitly overridden.
assert_not_prod() {
    local target="$1"

    if [ "$target" = "${PROD_DB:-resume-builder}" ] && [ "${ALLOW_PROD:-}" != "1" ]; then
        print_error "Refusing to write to prod database '$target'."
        print_error "Re-run with ALLOW_PROD=1 if this is intentional."
        exit 1
    fi
}

# Populate CONNECTION_ARGS / CONN_DISPLAY from DATABASE_URL, falling back to the
# discrete PG* variables.
build_connection_args() {
    if [ -n "$DATABASE_URL" ]; then
        CONN_DISPLAY="$DATABASE_URL"
        CONNECTION_ARGS=(-d "$DATABASE_URL")
    else
        CONN_DISPLAY="${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
        CONNECTION_ARGS=(-h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE")
    fi
}

# Print the available custom-format backups in $BACKUP_DIR, newest first, into
# the `backups` array. Exits if the directory is missing or empty.
list_backups() {
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi

    backups=($(ls -1 "$BACKUP_DIR" | grep "postgres_backup_.*\.dump$" | sort -r))

    if [ ${#backups[@]} -eq 0 ]; then
        print_error "No backups found in $BACKUP_DIR"
        exit 1
    fi

    for i in "${!backups[@]}"; do
        backup_file="${backups[$i]}"
        backup_size=$(du -h "$BACKUP_DIR/$backup_file" | cut -f1)
        backup_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_DIR/$backup_file" 2>/dev/null || \
                      stat -c "%y" "$BACKUP_DIR/$backup_file" 2>/dev/null | cut -d' ' -f1,2)
        echo "  $((i+1)). $backup_file ($backup_size, $backup_date)"
    done
}

# Prompt for one of the entries printed by list_backups; sets `selected_backup`.
prompt_for_backup() {
    echo ""
    print_prompt "Select a backup (1-${#backups[@]}) or 'q' to quit: "
    read -r selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        print_status "Cancelled"
        exit 0
    fi

    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        print_error "Invalid selection"
        exit 1
    fi

    selected_backup="${backups[$((selection-1))]}"
}
