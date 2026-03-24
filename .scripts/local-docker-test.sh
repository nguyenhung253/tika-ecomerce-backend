#!/bin/bash

# Local Docker testing before actual deployment
# This script builds and tests the Docker environment locally

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$SCRIPT_DIR"

echo "🐳 Local Docker Testing"
echo "======================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker
echo "1️⃣ Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"

# Check Docker Compose
echo "1️⃣ Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found: $(docker-compose --version)${NC}"
echo ""

# Stop existing containers
echo "2️⃣ Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Create .env for local testing
echo "3️⃣ Creating test .env file..."
if [ ! -f .env ]; then
    cat > .env << EOF
PORT=4953
NODE_ENV=development
MONGO_USER=admin
MONGO_PASSWORD=password123
REDIS_PASSWORD=
ACCESS_TOKEN_SECRET=test_secret_key_$(openssl rand -hex 8)
REFRESH_TOKEN_SECRET=test_refresh_key_$(openssl rand -hex 8)
OTP_EXPIRY=10
OTP_DIGIT=6
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists, skipping${NC}"
fi
echo ""

# Build Docker image
echo "4️⃣ Building Docker image..."
if docker-compose build; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi
echo ""

# Start containers
echo "5️⃣ Starting containers..."
if docker-compose up -d; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}✗ Failed to start containers${NC}"
    docker-compose logs
    exit 1
fi
echo ""

# Wait for containers to be ready
echo "6️⃣ Waiting for services to be ready..."
sleep 5

# Check MongoDB
echo -n "  Checking MongoDB... "
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "MongoDB logs:"
    docker-compose logs mongodb | tail -20
fi

# Check Redis
echo -n "  Checking Redis... "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Redis logs:"
    docker-compose logs redis | tail -20
fi

# Check App
echo -n "  Checking App... "
for i in {1..10}; do
    if timeout 2 bash -c "</dev/tcp/localhost/4953" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗${NC}"
        echo "App logs:"
        docker-compose logs app | tail -30
    else
        echo -n "."
        sleep 1
    fi
done
echo ""

# Run tests
echo "7️⃣ Running unit tests..."
if npm test; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi
echo ""

# Show container status
echo "8️⃣ Container Status:"
docker-compose ps
echo ""

# Show resource usage
echo "9️⃣ Resource Usage:"
docker stats --no-stream
echo ""

echo "✅ Local Docker testing completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  - Push changes: git push origin main"
echo "  - Pipeline will automatically deploy to EC2"
echo ""
echo "To stop containers locally:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f app"
