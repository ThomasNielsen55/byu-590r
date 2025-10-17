# GitHub Actions CI/CD Setup

This repository uses GitHub Actions for automated testing and deployment to AWS EC2.

## Prerequisites

1. **EC2 Server Setup**: Run the server setup script first:
   ```bash
   cd devops
   chmod +x setup-server-only.sh
   ./setup-server-only.sh
   ```

2. **GitHub Secrets**: Add the following secrets to your GitHub repository:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret" and add:

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | Public IP address of your EC2 instance | `3.101.62.67` |
| `EC2_SSH_PRIVATE_KEY` | Contents of your SSH private key file | Contents of `~/.ssh/byu-590r.pem` |

### How to get the SSH Private Key

```bash
# Display the private key content
cat ~/.ssh/byu-590r.pem
```

Copy the entire output (including the `-----BEGIN` and `-----END` lines) and paste it as the value for `EC2_SSH_PRIVATE_KEY` in GitHub secrets.

## Workflows

### Backend Workflow (`backend-deploy.yml`)
- **Triggers**: Push/PR to main branch when files in `backend/` change
- **Jobs**:
  1. **Test**: Runs PHP tests using PHPUnit
  2. **Deploy**: Deploys to EC2 (only on main branch)

### Frontend Workflow (`frontend-deploy.yml`)
- **Triggers**: Push/PR to main branch when files in `web-app/` change
- **Jobs**:
  1. **Test**: Runs Angular tests and linting
  2. **Deploy**: Builds and deploys to EC2 (only on main branch)

## Deployment Process

1. **Backend Deployment**:
   - Copies backend files to EC2
   - Installs PHP dependencies via Composer
   - Configures environment variables
   - Runs database migrations
   - Restarts Laravel service

2. **Frontend Deployment**:
   - Builds Angular application
   - Copies built files to EC2
   - Updates Nginx configuration
   - Restarts Nginx service

## Manual Deployment

If you need to deploy manually:

```bash
# Backend
cd devops
chmod +x deploy-real-apps.sh
./deploy-real-apps.sh

# Or use the individual deployment scripts
```

## Troubleshooting

### Check Deployment Status
```bash
# SSH into your EC2 instance
ssh -i ~/.ssh/byu-590r.pem ubuntu@YOUR_EC2_IP

# Check Laravel service status
sudo systemctl status byu-590r-laravel

# Check Nginx status
sudo systemctl status nginx

# Check application logs
tail -f /var/www/byu-590r/backend/storage/logs/laravel.log
```

### View GitHub Actions Logs
1. Go to your repository on GitHub
2. Click on the "Actions" tab
3. Click on the workflow run you want to inspect
4. Click on the job to see detailed logs

## Security Notes

- The EC2 instance is configured with a security group that only allows:
  - SSH (port 22) from anywhere
  - HTTP (port 80) from anywhere
  - HTTPS (port 443) from anywhere
- All outbound traffic is allowed for dependency downloads
- Database is only accessible from localhost
- SSH key authentication is used instead of passwords
