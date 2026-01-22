#!/bin/bash
# Deploy hearth to a fresh Ubuntu server
# Run: curl -sSL <this-file-url> | bash
# Or copy to server and run: bash deploy.sh

set -e

echo "=== Hearth Deployment Script ==="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Create app directory
APP_DIR=/opt/hearth
sudo mkdir -p $APP_DIR
cd $APP_DIR

# Clone or pull the repo (adjust URL when you have a git repo)
# For now, we assume files are copied manually or via scp

echo "=== Build and Start ==="
sudo docker compose build
sudo docker compose up -d

echo "=== Setup Complete ==="
echo "Hearth is running on port 3000"
echo "Caddy will auto-provision SSL for thehearth.dev"
echo ""
echo "Check status: docker compose ps"
echo "View logs: docker compose logs -f"
