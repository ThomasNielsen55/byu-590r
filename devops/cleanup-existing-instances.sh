#!/bin/bash

# Cleanup script for existing EC2 instances from testing

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

# Get running instances
get_running_instances() {
    aws ec2 describe-instances \
        --filters "Name=instance-state-name,Values=running,stopped,pending" \
        --query 'Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key==`Name`].Value|[0]]' \
        --output text
}

# Main cleanup function
main() {
    log_info "Finding existing EC2 instances..."
    
    INSTANCES=$(get_running_instances)
    
    if [ -z "$INSTANCES" ]; then
        log_info "No running EC2 instances found"
        exit 0
    fi
    
    echo "Found the following instances:"
    echo "$INSTANCES"
    echo ""
    
    log_warning "This will terminate ALL running EC2 instances!"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    # Terminate instances
    while IFS=$'\t' read -r INSTANCE_ID STATE NAME; do
        if [ -n "$INSTANCE_ID" ]; then
            log_info "Terminating instance $INSTANCE_ID ($NAME)..."
            aws ec2 terminate-instances --instance-ids "$INSTANCE_ID"
        fi
    done <<< "$INSTANCES"
    
    log_success "All instances are being terminated"
    log_info "Check AWS Console to confirm termination"
}

main "$@"
