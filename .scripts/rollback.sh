#!/bin/bash

# Rollback deployment script
# Usage: ./rollback.sh [commits_back]

set -e

ROLLBACK_COMMITS=${1:-1}
DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "🔄 Rollback Deployment Script"
echo "Current directory: $DEPLOY_DIR"
echo "Rolling back $ROLLBACK_COMMITS commit(s)..."
echo ""

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Backup current state
echo "📦 Creating backup..."
mkdir -p ~/.rollback_backups
BACKUP_DIR="$HOME/.rollback_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker-compose config > "$BACKUP_DIR/docker-compose.yml"
cp .env "$BACKUP_DIR/.env" 2>/dev/null || echo "No .env file to backup"
echo "✓ Backup saved to: $BACKUP_DIR"
echo ""

# Show current status
echo "📊 Current Status:"
git log -1 --oneline
echo ""

# Fetch latest from remote
echo "🔄 Fetching latest from remote..."
git fetch origin

# Revert commits
echo "⏪ Reverting $ROLLBACK_COMMITS commit(s)..."
for ((i=0; i<$ROLLBACK_COMMITS; i++)); do
    echo "  Reverting commit $(($i + 1))..."
    git revert --no-edit HEAD
done

# Push to remote
echo "📤 Pushing revert commits to remote..."
git push origin main

echo ""
echo "✅ Rollback initiated!"
echo "Pipeline will automatically:"
echo "  1. Run tests on reverted code"
echo "  2. Build new Docker image"
echo "  3. Deploy reverted version to EC2"
echo ""
echo "To undo this rollback:"
echo "  git reset --hard origin/main"
echo "  git push -f origin main"
echo ""
echo "To view backup:"
echo "  cat $BACKUP_DIR/docker-compose.yml"
