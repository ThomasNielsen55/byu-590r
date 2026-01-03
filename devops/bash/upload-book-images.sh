#!/bin/bash

# Script to upload book images to both dev and prod S3 buckets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BOOKS_DIR="$PROJECT_ROOT/backend/public/assets/books"

# Files to upload (matching BooksSeeder.php)
FILES_TO_UPLOAD=(
    "hp1.jpeg"
    "hp2.jpeg"
    "hp3.jpeg"
    "hp4.jpeg"
    "hp5.jpeg"
    "hp6.jpeg"
    "hp7.jpeg"
    "mb1.jpg"
    "mb2.jpg"
    "mb3.jpg"
    "bom.jpg"
)

upload_to_bucket() {
    local BUCKET_NAME=$1
    local BUCKET_TYPE=$2
    
    if [ -z "$BUCKET_NAME" ]; then
        log_warning "$BUCKET_TYPE bucket not provided, skipping"
        return 1
    fi
    
    log_info "Uploading book images to $BUCKET_TYPE bucket: $BUCKET_NAME"
    
    if [ ! -d "$BOOKS_DIR" ]; then
        log_warning "Book images directory not found: $BOOKS_DIR"
        return 1
    fi
    
    UPLOADED_COUNT=0
    FAILED_COUNT=0
    
    for local_file in "${FILES_TO_UPLOAD[@]}"; do
        s3_key="images/$local_file"
        local_path="$BOOKS_DIR/$local_file"
        
        if [ -f "$local_path" ]; then
            log_info "Uploading $local_file to s3://$BUCKET_NAME/$s3_key"
            UPLOAD_OUTPUT=$(aws s3 cp "$local_path" "s3://$BUCKET_NAME/$s3_key" 2>&1)
            UPLOAD_EXIT_CODE=$?
            
            if [ $UPLOAD_EXIT_CODE -eq 0 ]; then
                ((UPLOADED_COUNT++))
                log_success "Uploaded $local_file to $BUCKET_TYPE bucket"
            else
                ((FAILED_COUNT++))
                log_error "Failed to upload $local_file to $BUCKET_TYPE bucket"
                log_error "Error: $UPLOAD_OUTPUT"
            fi
        else
            log_warning "File not found: $local_path"
            ((FAILED_COUNT++))
        fi
    done
    
    if [ $UPLOADED_COUNT -gt 0 ]; then
        log_success "Uploaded $UPLOADED_COUNT book images to $BUCKET_TYPE bucket"
    fi
    if [ $FAILED_COUNT -gt 0 ]; then
        log_warning "$FAILED_COUNT files failed to upload to $BUCKET_TYPE bucket"
    fi
    
    return 0
}

# Main execution
main() {
    log_info "Starting book image upload to S3 buckets..."
    
    # Check if .server-config exists
    if [ -f "$PROJECT_ROOT/.server-config" ]; then
        source "$PROJECT_ROOT/.server-config"
    fi
    
    # Get bucket names from environment or .server-config
    DEV_BUCKET="${S3_BUCKET_DEV:-}"
    PROD_BUCKET="${S3_BUCKET_PROD:-}"
    
    if [ -z "$DEV_BUCKET" ] && [ -z "$PROD_BUCKET" ]; then
        log_error "No bucket names provided. Set S3_BUCKET_DEV and/or S3_BUCKET_PROD environment variables"
        log_info "Or run this from the devops/bash directory after running setup-ec2-server.sh"
        exit 1
    fi
    
    # Upload to dev bucket
    if [ -n "$DEV_BUCKET" ]; then
        upload_to_bucket "$DEV_BUCKET" "DEV"
        echo ""
    fi
    
    # Upload to prod bucket
    if [ -n "$PROD_BUCKET" ]; then
        upload_to_bucket "$PROD_BUCKET" "PROD"
        echo ""
    fi
    
    log_success "Book image upload complete!"
}

main "$@"

