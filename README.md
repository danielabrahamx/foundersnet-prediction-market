# 🚀 FoundersNet

<div align="center">

**Prediction Markets for Startup Fundraises**

*The closest thing to trading in private companies' shares*

[![Movement Network](https://img.shields.io/badge/Built%20on-Movement-6366f1?style=for-the-badge)](https://movementnetwork.xyz)
[![Move Language](https://img.shields.io/badge/Smart%20Contracts-Move-00d4aa?style=for-the-badge)](https://move-language.github.io/move/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

[Features](#-features) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Smart Contracts](#-smart-contracts) • [Contributing](#-contributing)

</div>

---

## ✨ What is FoundersNet?

FoundersNet is a **decentralized prediction market platform** where users can bet on whether startups will successfully raise their next funding round. Built on the **Movement Network**, it leverages the security and efficiency of the Move programming language.

### 🎯 Use Cases

- **Investors**: Gauge market sentiment on startup funding prospects
- **Founders**: Understand how the community perceives your fundraising chances  
- **Traders**: Profit from accurate predictions on startup outcomes
- **Researchers**: Access crowd-sourced probability estimates for startup success

---

## 🌟 Features

<table>
<tr>
<td width="50%">

### 💰 Parimutuel Betting
Fair, transparent odds where winners share the losing pool proportionally. No house edge manipulation.

### 🔐 Secure Smart Contracts
Built with Move's resource-oriented programming model for maximum security and correctness.

### 👛 Wallet Integration
Seamless connection with Petra, Pontem, and other Movement-compatible wallets.

</td>
<td width="50%">

### 📊 Real-time Portfolio
Track your positions, potential profits, and claim winnings with a beautiful dashboard.

### ⚡ Fast & Cheap
Movement's high-performance blockchain enables quick transactions with minimal fees.

### 🎨 Modern UI
Sleek dark-mode interface with smooth animations and responsive design.

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Aptos CLI** - [Installation Guide](https://aptos.dev/tools/aptos-cli/)
- A Movement-compatible wallet (e.g., [Petra](https://petra.app/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/foundersnet-prediction-market.git
cd foundersnet-prediction-market

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Setup

Create a `.env` file with the following variables:

```env
# Movement Network Configuration
MOVEMENT_RPC_URL=<your-rpc-endpoint>
MOVEMENT_CHAIN_ID=<chain-id>
MOVEMENT_CONTRACT_ADDRESS=<your-deployed-contract-address>
MOVEMENT_RESOURCE_ACCOUNT=<resource-account-address>
MOVEMENT_ADMIN_PRIVATE_KEY=<admin-private-key>

# Client Configuration  
VITE_MOVEMENT_RPC_URL=<your-rpc-endpoint>
VITE_MOVEMENT_CHAIN_ID=<chain-id>
VITE_CONTRACT_ADDRESS=<your-deployed-contract-address>
```

### Running Locally

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 🏗️ Architecture

```
foundersnet-prediction-market/
├── 📁 client/                 # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── contexts/          # React contexts (Market, Wallet)
│   │   ├── pages/             # Route pages
│   │   ├── services/          # AMM calculations
│   │   └── types/             # TypeScript definitions
│   └── index.html
├── 📁 contracts/              # Move smart contracts
│   ├── sources/
│   │   └── prediction_market.move
│   ├── tests/
│   └── Move.toml
├── 📁 server/                 # Express.js backend
│   ├── routes.ts              # API endpoints
│   └── services/
│       └── movementClient.ts  # Blockchain interaction
├── 📁 scripts/                # Deployment scripts
│   └── deploy-movement.ts
└── 📁 shared/                 # Shared types
    └── schema.ts
```

---

## 📜 Smart Contracts

### Contract Overview

The `prediction_market` module implements a **parimutuel betting system** with the following key functions:

| Function | Description | Access |
|----------|-------------|--------|
| `initialize` | Sets up the market registry | Admin only |
| `create_market` | Create a new prediction market | Admin only |
| `buy_yes` / `buy_no` | Place a bet on an outcome | Public |
| `resolve_market` | Declare the winning outcome | Admin only |
| `claim_winnings` | Collect winnings from resolved markets | Winners only |

### Parimutuel Model

Unlike traditional order-book markets, FoundersNet uses a **parimutuel** system:

```
Payout = (Total Pool / Winning Pool) × Your Bet
```

- All bets go into a single pool
- Winners split the entire pool proportionally
- No counterparty risk - payouts are guaranteed by the smart contract

### Deploy to Movement

```bash
# Run Move tests first
npm run move:test

# Deploy to Movement
npm run move:deploy:movement
```

**Required environment variables:**
- `MOVEMENT_RPC_URL` - Movement fullnode REST endpoint
- `MOVEMENT_PRIVATE_KEY` - Deployer/admin private key (hex)

**Optional:**
- `MOVEMENT_PROFILE` - Aptos CLI profile name (default: `movement`)
- `MOVEMENT_RESOURCE_SEED_HEX` - Resource account seed (default: `01`)

Deployment manifest is written to: `contracts/deployments/movement.json`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/markets` | List all prediction markets |
| `GET` | `/api/markets/:id` | Get market details |
| `GET` | `/api/positions` | Get user's positions |
| `POST` | `/api/create-market` | Create new market (admin) |
| `POST` | `/api/place-bet` | Place a YES/NO bet |
| `POST` | `/api/resolve-market` | Resolve market outcome (admin) |
| `POST` | `/api/claim-winnings` | Claim winnings |

---

## 🛠️ Development

### Running Tests

```bash
# Move contract tests
npm run move:test

# Frontend type checking
npm run check
```

### Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn/ui
- **Backend**: Express.js, TypeScript
- **Blockchain**: Movement Network, Move language
- **SDK**: @aptos-labs/ts-sdk

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Movement Labs](https://movementnetwork.xyz) for the incredible blockchain infrastructure
- [Aptos Labs](https://aptos.dev) for the Move language and SDK
- The open-source community for inspiration and tools

---

<div align="center">

**Built with ❤️ for the Movement Hackathon**

[⬆ Back to Top](#-foundersnet)

</div>
