#!/bin/bash

# MongoDB Backup Script
# This script creates timestamped backups of the MongoDB database

# Configuration
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017"}
DATABASE_NAME=${DATABASE_NAME:-"resume-builder"}
BACKUP_DIR=${BACKUP_DIR:-"./backup"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if mongodump is installed
if ! command -v mongodump &> /dev/null; then
    print_error "mongodump is not installed. Please install MongoDB Database Tools."
    echo "Visit: https://www.mongodb.com/docs/database-tools/installation/"
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    print_status "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Perform the backup
print_status "Starting MongoDB backup..."
print_status "Database: $DATABASE_NAME"
print_status "Backup location: $BACKUP_PATH"

mongodump \
    --uri="$MONGODB_URI" \
    --db="$DATABASE_NAME" \
    --out="$BACKUP_PATH" \
    --quiet

# Check if backup was successful
if [ $? -eq 0 ]; then
    print_status "Backup completed successfully!"

    # Create a compressed archive
    print_status "Compressing backup..."
    tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

    if [ $? -eq 0 ]; then
        # Remove the uncompressed backup directory
        rm -rf "$BACKUP_PATH"
        print_status "Compressed backup created: ${BACKUP_PATH}.tar.gz"

        # Display backup size
        BACKUP_SIZE=$(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)
        print_status "Backup size: $BACKUP_SIZE"
    else
        print_warning "Compression failed, keeping uncompressed backup"
    fi

    # Optional: Remove old backups (keep last 7 days)
    if [ "$CLEANUP_OLD_BACKUPS" = "true" ]; then
        print_status "Cleaning up old backups (keeping last 7 days)..."
        find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +7 -delete
        print_status "Old backups cleaned up"
    fi

else
    print_error "Backup failed!"
    exit 1
fi

# Display recent backups
echo ""
print_status "Recent backups:"
ls -lht "$BACKUP_DIR" | grep mongodb_backup | head -5
