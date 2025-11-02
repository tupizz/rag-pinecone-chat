#!/bin/bash
# Script to check if .env.dev is in sync with deployed ECS configuration

set -e

echo "🔍 Checking environment variable sync between .env.dev and deployed ECS task..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load .env.dev file
ENV_FILE="../backend/.env.dev"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE not found${NC}"
    exit 1
fi

echo "📄 Loading $ENV_FILE..."
source "$ENV_FILE"

# Get deployed task definition
TASK_DEF=$(aws ecs describe-task-definition --task-definition eloquent-backend-dev --query 'taskDefinition.containerDefinitions[0]' --output json)

# Extract deployed values
DEPLOYED_OPENAI_MODEL=$(echo "$TASK_DEF" | jq -r '.environment[] | select(.name=="OPENAI_MODEL") | .value')
DEPLOYED_PINECONE_INDEX=$(echo "$TASK_DEF" | jq -r '.environment[] | select(.name=="PINECONE_INDEX_NAME") | .value')
DEPLOYED_OPENAI_EMBEDDING=$(echo "$TASK_DEF" | jq -r '.environment[] | select(.name=="OPENAI_EMBEDDING_MODEL") | .value')
DEPLOYED_PINECONE_ENV=$(echo "$TASK_DEF" | jq -r '.environment[] | select(.name=="PINECONE_ENVIRONMENT") | .value')

# Check OpenAI API Key (first 20 chars only for security)
DEPLOYED_OPENAI_KEY=$(aws secretsmanager get-secret-value --secret-id "eloquent/dev/openai-api-key" --query 'SecretString' --output text | jq -r '.apiKey' | cut -c1-20)
LOCAL_OPENAI_KEY=$(echo "$OPENAI_API_KEY" | cut -c1-20)

# Check Pinecone API Key (first 20 chars only)
DEPLOYED_PINECONE_KEY=$(aws secretsmanager get-secret-value --secret-id "eloquent/dev/pinecone-api-key" --query 'SecretString' --output text | jq -r '.apiKey' | cut -c1-20)
LOCAL_PINECONE_KEY=$(echo "$PINECONE_API_KEY" | cut -c1-20)

echo ""
echo "=========================================="
echo "Environment Variable Comparison"
echo "=========================================="
echo ""

# Function to compare values
compare_value() {
    local name=$1
    local local_value=$2
    local deployed_value=$3

    if [ "$local_value" == "$deployed_value" ]; then
        echo -e "${GREEN}✅ $name${NC}"
        echo "   Local:    $local_value"
        echo "   Deployed: $deployed_value"
    else
        echo -e "${RED}❌ $name${NC}"
        echo "   Local:    $local_value"
        echo "   Deployed: $deployed_value"
        return 1
    fi
    echo ""
}

# Track if any differences found
DIFFERENCES=0

compare_value "OPENAI_MODEL" "$OPENAI_MODEL" "$DEPLOYED_OPENAI_MODEL" || DIFFERENCES=1
compare_value "OPENAI_EMBEDDING_MODEL" "$OPENAI_EMBEDDING_MODEL" "$DEPLOYED_OPENAI_EMBEDDING" || DIFFERENCES=1
compare_value "PINECONE_INDEX_NAME" "$PINECONE_INDEX_NAME" "$DEPLOYED_PINECONE_INDEX" || DIFFERENCES=1
compare_value "PINECONE_ENVIRONMENT" "$PINECONE_ENVIRONMENT" "$DEPLOYED_PINECONE_ENV" || DIFFERENCES=1
compare_value "OPENAI_API_KEY (first 20 chars)" "$LOCAL_OPENAI_KEY" "$DEPLOYED_OPENAI_KEY" || DIFFERENCES=1
compare_value "PINECONE_API_KEY (first 20 chars)" "$LOCAL_PINECONE_KEY" "$DEPLOYED_PINECONE_KEY" || DIFFERENCES=1

echo "=========================================="
echo ""

if [ $DIFFERENCES -eq 0 ]; then
    echo -e "${GREEN}✅ All environment variables are in sync!${NC}"
    exit 0
else
    echo -e "${RED}❌ Environment variables are OUT OF SYNC!${NC}"
    echo ""
    echo "To fix this, update the values in:"
    echo "  infrastructure/lib/stacks/ecs-stack.ts"
    echo ""
    echo "Then deploy the changes:"
    echo "  cd infrastructure"
    echo "  make deploy"
    exit 1
fi
