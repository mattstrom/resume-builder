#!/bin/bash

# MongoDB Restore Script
# This script restores a MongoDB database from a backup

# Configuration
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017"}
DATABASE_NAME=${DATABASE_NAME:-"resume-builder"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if mongorestore is installed
if ! command -v mongorestore &> /dev/null; then
    print_error "mongorestore is not installed. Please install MongoDB Database Tools."
    echo "Visit: https://www.mongodb.com/docs/database-tools/installation/"
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
backups=($(ls -1 "$BACKUP_DIR" | grep "mongodb_backup_.*\.tar\.gz$" | sort -r))

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

# Confirm restoration
echo ""
print_warning "This will restore the database: $DATABASE_NAME"
print_warning "Current data will be replaced with the backup data!"
print_prompt "Are you sure you want to continue? (yes/no): "
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    print_status "Restore cancelled"
    exit 0
fi

# Extract the backup
temp_dir="/tmp/mongodb_restore_$$"
mkdir -p "$temp_dir"

print_status "Extracting backup..."
tar -xzf "$backup_path" -C "$temp_dir"

if [ $? -ne 0 ]; then
    print_error "Failed to extract backup"
    rm -rf "$temp_dir"
    exit 1
fi

# Find the extracted directory
extracted_dir=$(find "$temp_dir" -name "mongodb_backup_*" -type d | head -1)

if [ -z "$extracted_dir" ]; then
    print_error "Could not find extracted backup directory"
    rm -rf "$temp_dir"
    exit 1
fi

# Perform the restore
print_status "Restoring database..."
print_status "Target database: $DATABASE_NAME"

mongorestore \
    --uri="$MONGODB_URI" \
    --db="$DATABASE_NAME" \
    --drop \
    --dir="$extracted_dir/$DATABASE_NAME" \
    --quiet

# Check if restore was successful
if [ $? -eq 0 ]; then
    print_status "Database restored successfully!"
else
    print_error "Restore failed!"
    rm -rf "$temp_dir"
    exit 1
fi

# Cleanup
rm -rf "$temp_dir"

print_status "Restore completed!"
