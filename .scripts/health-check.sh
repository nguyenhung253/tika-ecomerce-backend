#!/bin/bash

# Health check script for Docker deployment
# Usage: ./health-check.sh [max_attempts] [delay_seconds]

set -e

PORT=${PORT:-4953}
MAX_ATTEMPTS=${1:-30}
DELAY=${2:-2}
ATTEMPT=1

echo "🔍 Checking application health on port $PORT..."
echo "Max attempts: $MAX_ATTEMPTS, Delay: ${DELAY}s"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -n "[$ATTEMPT/$MAX_ATTEMPTS] "
    
    # Check if port is accessible
    if timeout 5 bash -c "</dev/tcp/localhost/$PORT" 2>/dev/null; then
        echo "✓ Port $PORT is responding"
        
        # Try to fetch health endpoint
        if command -v curl &> /dev/null; then
            if curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1; then
                echo "✓ Health endpoint is responding"
                echo "✅ Application is healthy!"
                exit 0
            fi
            
            # Fallback - try root endpoint
            if curl -sf "http://localhost:$PORT/" > /dev/null 2>&1; then
                echo "✓ Root endpoint is responding"
                echo "✅ Application is healthy!"
                exit 0
            fi
        fi
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "waiting...${DELAY}s"
        sleep $DELAY
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ Application health check failed after $MAX_ATTEMPTS attempts"
echo "Commands to debug:"
echo "  docker-compose logs app"
echo "  docker-compose ps"
exit 1
