# FoundersNet

## Overview

FoundersNet is a prediction market web application built for the Movement M1 blockchain (Aptos-based). Users trade YES/NO outcome tokens representing predictions about private company valuations. The platform features an AMM (Automated Market Maker) using constant product formula (x*y=k) for price discovery, with a 2% trading fee structure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Query for server state, React Context for wallet/market state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration

**Key Frontend Patterns**:
- Context providers wrap the app for wallet connection (`WalletContext`) and market data (`MarketContext`)
- Components follow a clear separation: pages in `/pages`, reusable components in `/components`, UI primitives in `/components/ui`
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Style**: REST endpoints under `/api/*`

**Key Backend Patterns**:
- Single entry point at `server/index.ts`
- Routes registered in `server/routes.ts`
- Database access through `server/storage.ts` which implements the `IStorage` interface
- Admin-only endpoints check wallet address against configured admin address

### Database Schema
Located in `shared/schema.ts` using Drizzle:
- **users**: Basic user accounts (id, username, password)
- **markets**: Prediction markets with YES/NO pools, liquidity, expiry, resolution status
- **positions**: User holdings per market (YES tokens, NO tokens, invested amounts)
- **trades**: Trade history with amounts, prices, and fees

### Smart Contract Integration
The app is designed to integrate with Move 2 smart contracts on Movement M1:
- Contract addresses configured in `client/src/config/contracts.ts` (placeholder addresses)
- AMM calculations implemented in TypeScript at `client/src/services/amm.ts`
- Wallet integration via `@aptos-labs/wallet-adapter-react` for Petra wallet support

### Key Design Decisions

1. **Hybrid Architecture**: Frontend implements AMM math locally for instant price estimates, with backend serving as source of truth for market state until smart contracts are deployed.

2. **Basis Points Pricing**: All prices stored/calculated in basis points (0-10000) for precision, converted to USD for display.

3. **Admin Controls**: Market creation and resolution restricted to a single admin wallet address defined in config.

4. **Component Library**: Uses shadcn/ui with extensive Radix UI primitives for accessible, customizable components.

## External Dependencies

### Blockchain
- **Network**: Movement M1 (Aptos-based testnet)
- **RPC Endpoint**: `https://api.testnet.staging.aptoslabs.com/v1`
- **Wallet**: Petra wallet via `@aptos-labs/wallet-adapter-react`

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable
- **ORM**: Drizzle with `drizzle-kit` for migrations

### UI/Charting
- **Recharts**: For price history visualization
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon library

### Build & Development
- **Vite**: Frontend bundling with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Strict mode enabled across the project