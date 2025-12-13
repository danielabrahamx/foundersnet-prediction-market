# Movement Prediction Market Tech Stack

## Project Overview

FoundersNet Movement Prediction Market is a decentralized prediction market application built specifically for the Movement blockchain (Aptos-compatible). This hackathon demo version features a simplified architecture:

**Architecture Pattern:** Client → Backend → Movement Blockchain

## Core Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18+, Vite, TypeScript, Tailwind CSS |
| **Backend** | Node.js 18+, Express, TypeScript |
| **Blockchain** | Movement SDK, Aptos-compatible smart contracts |

**No Database Layer** - All state is managed on-chain via Movement blockchain

## Application Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Client    │───▶│  Backend    │───▶│ Movement Blockchain │
│ (React/Vite)│◀───│ (Express)   │◀───│ (Smart Contracts) │
└─────────────┘    └─────────────┘    └─────────────────┘
```

### Data Flow:
1. Client requests market data
2. Backend queries Movement blockchain via SDK
3. Movement returns real-time on-chain state
4. Backend processes and returns data to client
5. Client displays trading interface

## Directory Structure

```
/
├── client/              # React frontend
│   ├── src/             # Source files
│   │   ├── components/  # UI components
│   │   ├── pages/       # Application pages
│   │   ├── hooks/       # Custom hooks
│   │   └── ...
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── services/        # Movement integration
│   └── ...
├── contracts/           # Smart contracts
│   └── deployments/     # Deployment configs
├── shared/              # Shared types/schemas
└── docs/                # Documentation
```

## Integration Strategy

### Movement SDK Integration
- Use `@aptos-labs/ts-sdk` version 1.39.0
- Direct blockchain queries for market data
- Transaction signing and submission
- Real-time state synchronization

### Transaction Handling
- Backend builds and signs transactions
- Frontend displays transaction status
- Real-time updates via blockchain events

## Development Environment Requirements

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Movement RPC endpoint access

### No Database Setup Required
This implementation queries the Movement blockchain directly - no PostgreSQL or other database needed.

## Key Dependencies

### Frontend
- `react`: 18.2.0+
- `react-dom`: 18.2.0+
- `vite`: 4.0.0+
- `tailwindcss`: 3.0.0+
- `@aptos-labs/ts-sdk`: 1.39.0

### Backend
- `express`: 4.18.0+
- `typescript`: 5.0.0+
- `@aptos-labs/ts-sdk`: 1.39.0
- `zod`: 3.0.0+ (for validation)

### Shared
- `zod`: 3.0.0+ (for schema validation)
- TypeScript types for data sharing

## Environment Configuration

Create `.env` file in project root:

```env
# Movement Blockchain Configuration
MOVEMENT_RPC_URL=https://your-movement-rpc-endpoint.com
MOVEMENT_CHAIN_ID=movement_testnet
MOVEMENT_CONTRACT_ADDRESS=0x123...
MOVEMENT_RESOURCE_ACCOUNT=0x456...
MOVEMENT_FAUCET_URL=https://faucet.movementlabs.xyz

# Backend Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Build and Run

### Frontend
```bash
cd client
npm install
npm run dev
```

### Backend
```bash
cd server
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173` with backend API at `http://localhost:3001`
