#!/bin/bash

# Setup script for .env file
# This script helps configure the environment variables needed for the server

echo "🔧 Setting up .env file for FoundersNet Prediction Market"
echo "=========================================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Creating backup..."
  cp .env .env.backup.$(date +%s)
  echo "✅ Backup created"
  echo ""
fi

# Create .env from template
echo "📝 Creating .env file..."

cat > .env << 'ENVFILE'
# ============================================================================
# Server Configuration
# ============================================================================
PORT=5000
NODE_ENV=development

# ============================================================================
# Session Configuration
# ============================================================================
SESSION_SECRET=your-secret-session-key-change-this-in-production

# ============================================================================
# Movement Blockchain Configuration
# ============================================================================

# Movement RPC endpoint (testnet)
MOVEMENT_RPC_URL=https://aptos.testnet.suzuka.movementnetwork.xyz/v1

# Chain identifier
MOVEMENT_CHAIN_ID=177

# Optional faucet URL for testnet
MOVEMENT_FAUCET_URL=https://faucet.testnet.suzuka.movementnetwork.xyz

# ============================================================================
# Movement Smart Contract Configuration
# ============================================================================

# Deployed package/module address
MOVEMENT_CONTRACT_ADDRESS=0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e

# Registry address (your wallet address)
MOVEMENT_RESOURCE_ACCOUNT=0x13d4743ed990c3e5c58df1465373685c0e7b3ef35b0556fbb175521e789ac4d1

# ============================================================================
# Admin Configuration
# ============================================================================

# CRITICAL: Add your private key here (see instructions below)
MOVEMENT_ADMIN_PRIVATE_KEY=

ENVFILE

echo "✅ .env file created successfully!"
echo ""
echo "=========================================================="
echo "⚠️  NEXT STEPS - YOU MUST COMPLETE THESE:"
echo "=========================================================="
echo ""
echo "1. 🔐 Export your PRIVATE KEY from Petra wallet:"
echo "   - Open Petra wallet extension"
echo "   - Click Settings → Manage Account"
echo "   - Select your account"  
echo "   - Click 'Show Private Key' or 'Export Private Key'"
echo "   - Enter your password"
echo "   - Copy the HEX STRING (64 characters, starts with 0x)"
echo "   - DO NOT use the mnemonic phrase!"
echo ""
echo "2. ✏️  Edit the .env file:"
echo "   nano .env"
echo "   or"
echo "   code .env"
echo ""
echo "3. 📝 Paste your hex private key after MOVEMENT_ADMIN_PRIVATE_KEY="
echo "   Example: MOVEMENT_ADMIN_PRIVATE_KEY=0x1234abcd..."
echo ""
echo "4. 💾 Save the file"
echo ""
echo "=========================================================="
echo "🚨 CRITICAL SECURITY WARNING 🚨"
echo "=========================================================="
echo ""
echo "YOU SHARED YOUR SEED PHRASE PUBLICLY!"
echo ""
echo "Your mnemonic was exposed in this conversation:"
echo "  'swift battle multiply idea update pupil blossom lunch task soldier face weird'"
echo ""
echo "Anyone who saw this can access your wallet!"
echo ""
echo "⚠️  IMMEDIATE ACTIONS REQUIRED:"
echo "  1. Create a NEW wallet in Petra"
echo "  2. Transfer ALL funds from this wallet to your new wallet:"
echo "     0x13d4743ed990c3e5c58df1465373685c0e7b3ef35b0556fbb175521e789ac4d1"
echo "  3. NEVER use the exposed seed phrase again"
echo "  4. For this project, consider using a dedicated test wallet"
echo ""
echo "=========================================================="
echo ""
echo "Once you've added your private key to .env, you can start the server:"
echo "  npm run dev"
echo ""
