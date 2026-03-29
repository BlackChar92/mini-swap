#!/bin/bash
set -e

# Deploy to local Anvil and update frontend .env
# Prerequisite: anvil must be running on port 8545

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Deploying contracts to Anvil..."

# Anvil default private key (account 0)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

OUTPUT=$(cd "$PROJECT_DIR" && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key $PRIVATE_KEY --broadcast 2>&1)

echo "$OUTPUT"

# Extract addresses from output
TOKEN_A=$(echo "$OUTPUT" | grep "TokenA:" | awk '{print $2}')
TOKEN_B=$(echo "$OUTPUT" | grep "TokenB:" | awk '{print $2}')
FACTORY=$(echo "$OUTPUT" | grep "Factory:" | awk '{print $2}')
ROUTER=$(echo "$OUTPUT" | grep "Router:" | awk '{print $2}')

# Update frontend .env.local
ENV_FILE="$PROJECT_DIR/frontend/.env.local"
cat > "$ENV_FILE" << EOF
NEXT_PUBLIC_FACTORY_ADDRESS=$FACTORY
NEXT_PUBLIC_ROUTER_ADDRESS=$ROUTER
NEXT_PUBLIC_TOKEN_A_ADDRESS=$TOKEN_A
NEXT_PUBLIC_TOKEN_B_ADDRESS=$TOKEN_B
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=mini-swap-dev
EOF

echo ""
echo "Deployed! Addresses written to frontend/.env.local"
echo "  TokenA:  $TOKEN_A"
echo "  TokenB:  $TOKEN_B"
echo "  Factory: $FACTORY"
echo "  Router:  $ROUTER"
