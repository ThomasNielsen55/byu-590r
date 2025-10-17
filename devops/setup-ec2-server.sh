#!/bin/bash

# BYU 590R Monorepo - Server Setup Only
# This script only sets up the EC2 server infrastructure, not the applications
# Applications will be deployed via GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Configuration
AWS_REGION="us-west-1"
KEY_NAME="byu-590r"
SECURITY_GROUP="sg-07cb07cc76067db76"
PROJECT_NAME="byu-590r"

log_info "Starting EC2 server setup (applications will be deployed via GitHub Actions)..."

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi
    
    # Check if AWS credentials work
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create EC2 instance
create_ec2_instance() {
    log_info "Creating EC2 instance..."
    
    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create EC2 instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id ami-04f34746e5e1ec0fe \
        --instance-type t2.micro \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SECURITY_GROUP" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME-server}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "INSTANCE_ID=$INSTANCE_ID" > .server-config
    
    log_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
    
    # Get instance IP
    INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo "INSTANCE_IP=$INSTANCE_IP" >> .server-config
    
    log_success "EC2 instance created: $INSTANCE_ID ($INSTANCE_IP)"
}

# Setup EC2 instance with dependencies only
setup_ec2_dependencies() {
    log_info "Setting up EC2 instance with dependencies only..."
    
    # Create setup script
    cat > setup-server.sh << 'EOF'
#!/bin/bash
set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PHP 8.3 and extensions
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-xml php8.3-mbstring php8.3-curl php8.3-zip php8.3-gd php8.3-cli php8.3-common

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Install MySQL
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install Git
sudo apt install -y git

# Create application directories
sudo mkdir -p /var/www/byu-590r/backend
sudo mkdir -p /var/www/byu-590r/frontend
sudo chown -R ubuntu:ubuntu /var/www/byu-590r

# Create database and user
sudo mysql -u root << 'MYSQL_EOF'
CREATE DATABASE IF NOT EXISTS byu_590r_app;
CREATE USER IF NOT EXISTS 'byu_user'@'localhost' IDENTIFIED BY 'byu590r123!';
GRANT ALL PRIVILEGES ON byu_590r_app.* TO 'byu_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_EOF

# Configure Nginx
sudo tee /etc/nginx/sites-available/byu-590r > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/byu-590r/frontend/dist/byu-590r-builder;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

sudo ln -sf /etc/nginx/sites-available/byu-590r /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Create systemd service for Laravel (but don't start it yet)
sudo tee /etc/systemd/system/byu-590r-laravel.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=BYU 590R Laravel Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/byu-590r/backend
ExecStart=/usr/bin/php artisan serve --host=0.0.0.0 --port=8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

sudo systemctl daemon-reload
sudo systemctl enable byu-590r-laravel

echo "Server setup complete! Ready for GitHub Actions deployment."
EOF
    
    # Copy and run setup script
    scp -i ~/.ssh/"$KEY_NAME".pem -o StrictHostKeyChecking=no setup-server.sh ubuntu@"$INSTANCE_IP":~/
    ssh -i ~/.ssh/"$KEY_NAME".pem -o StrictHostKeyChecking=no ubuntu@"$INSTANCE_IP" "chmod +x setup-server.sh && ./setup-server.sh"
    
    # Clean up
    rm setup-server.sh
    
    log_success "EC2 server setup complete"
}

# Main setup function
main() {
    log_info "Starting BYU 590R Server Setup..."
    
    check_prerequisites
    create_ec2_instance
    setup_ec2_dependencies
    
    echo ""
    log_success "🎉 Server setup complete!"
    echo ""
    log_info "Server Details:"
    echo "  Instance ID: $INSTANCE_ID"
    echo "  Public IP: $INSTANCE_IP"
    echo ""
    log_info "Next Steps:"
    echo "  1. Add these secrets to your GitHub repository:"
    echo "     - EC2_HOST: $INSTANCE_IP"
    echo "     - EC2_SSH_PRIVATE_KEY: Contents of ~/.ssh/$KEY_NAME.pem"
    echo ""
    echo "  2. Push changes to main branch to trigger deployment"
    echo ""
    log_info "Configuration saved to: .server-config"
}

# Run main function
main "$@"
