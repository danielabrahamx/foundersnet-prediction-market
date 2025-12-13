# Movement Prediction Market Requirements (Hackathon Demo)

## Project Overview

FoundersNet Movement Prediction Market is a decentralized prediction market application built for the Movement blockchain testnet. This hackathon demo version features:

- **No Database**: Direct Movement blockchain integration only
- **Simplified Architecture**: Frontend → Backend → Movement Blockchain
- **Demo-Ready**: Focused on core functionality for hackathon presentation
- **Local Deployment**: Easy setup on developer machines

## Functional Requirements

### 1. Wallet Integration

**Requirements:**
- [ ] Connect to Movement-compatible wallets (Petra, Martian, etc.)
- [ ] Display connected wallet address
- [ ] Show wallet balance in native token
- [ ] Auto-reconnect wallet on page refresh
- [ ] Disconnect wallet functionality
- [ ] Error handling for connection failures

**Technical Notes:**
- Use `@aptos-labs/wallet-adapter-react`
- Support multiple wallet providers
- Handle wallet connection state globally

### 2. Market Management

**Requirements:**
- [ ] Create new prediction markets (admin only)
- [ ] List all available markets
- [ ] Filter markets by status (open/closed/resolved)
- [ ] Search markets by keyword
- [ ] View market details (question, description, odds, volume)
- [ ] Resolve markets (admin only)

**Technical Notes:**
- Market data fetched directly from Movement blockchain
- Admin functions require signed transactions
- Real-time updates via blockchain events

### 3. Trading/Betting

**Requirements:**
- [ ] Place bets on market outcomes
- [ ] Display current odds for each outcome
- [ ] Show available liquidity
- [ ] Calculate potential payouts
- [ ] Confirm transactions before submission
- [ ] Show transaction status (pending/confirmed/failed)
- [ ] Real-time odds updates

**Technical Notes:**
- Bet placement via Movement smart contract calls
- Odds calculation based on on-chain liquidity pools
- Transaction monitoring for confirmation

### 4. Position Management

**Requirements:**
- [ ] View user's open positions
- [ ] Show position details (market, outcome, amount, potential payout)
- [ ] Claim winnings from resolved markets
- [ ] View transaction history
- [ ] Filter positions by status

**Technical Notes:**
- Position data from on-chain user resources
- Claim functionality via smart contract call
- Historical data from blockchain events

## Non-Functional Requirements

### Data Integrity

**Requirements:**
- [ ] All market data sourced directly from Movement blockchain
- [ ] No caching layer (direct blockchain queries)
- [ ] Transaction verification before UI updates
- [ ] Error handling for blockchain connectivity issues
- [ ] Fallback mechanisms for failed queries

**Technical Notes:**
- Use Movement SDK for all blockchain interactions
- Implement retry logic for failed queries
- Show clear error messages to users

### Performance

**Acceptable for Hackathon Demo:**
- Market list load time: < 3 seconds
- Transaction confirmation: < 10 seconds (blockchain dependent)
- Real-time updates: < 5 second delay
- Page navigation: < 1 second

**Optimization Strategies:**
- Efficient blockchain query batching
- Minimal frontend bundle size
- Optimized React rendering

### Security

**Requirements:**
- [ ] Wallet connection security
- [ ] Transaction signing verification
- [ ] Input validation (frontend + backend)
- [ ] Rate limiting on backend endpoints
- [ ] Secure environment variable handling

**Technical Notes:**
- Never expose private keys
- Validate all user inputs with Zod schemas
- Use HTTPS in production

### Deployment

**Requirements:**
- [ ] Simple local machine deployment
- [ ] Docker support for easy setup
- [ ] Environment variable configuration
- [ ] Clear setup documentation
- [ ] Minimal external dependencies

**Deployment Process:**
1. Clone repository
2. Install dependencies (`npm install`)
3. Configure `.env` file
4. Run backend (`npm run dev:server`)
5. Run frontend (`npm run dev:client`)

**Expected Setup Time:** < 5 minutes for experienced developers

## Technical Constraints

### Blockchain Limitations
- Transaction confirmation times (blockchain dependent)
- Gas costs for transactions
- Blockchain RPC rate limits
- Smart contract execution limits

### Hackathon Demo Scope
- Focus on core prediction market functionality
- Limited error handling (basic coverage only)
- Minimal testing (manual testing sufficient)
- No advanced features (liquidity pools, complex markets)

## User Experience Requirements

### Core User Flows

1. **New User Flow:**
   - Connect wallet
   - Browse markets
   - Place first bet
   - Monitor position

2. **Returning User Flow:**
   - Auto-reconnect wallet
   - View open positions
   - Check resolved markets
   - Claim winnings

3. **Admin Flow:**
   - Create new market
   - Monitor market activity
   - Resolve market when event occurs

### Error Handling UX
- Clear, user-friendly error messages
- Actionable error states
- Recovery options where possible
- Loading states during operations

## Compatibility Requirements

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest version)
- Edge (latest version)

### Device Support
- Desktop (primary focus)
- Tablet (basic support)
- Mobile (responsive layout)

## Monitoring and Analytics (Future)

While not required for hackathon demo, consider:
- Basic usage analytics
- Error tracking
- Performance monitoring
- User feedback mechanism

## Documentation Requirements

### In-Scope for Hackathon
- [ ] Setup instructions
- [ ] Basic usage guide
- [ ] Wallet connection guide
- [ ] Troubleshooting common issues

### Out of Scope
- Comprehensive API documentation
- Advanced user guides
- Video tutorials
- Detailed architecture diagrams

## Success Metrics (Hackathon)

1. **Functional Completion:**
   - All core features working
   - No critical bugs
   - Stable wallet integration
   - Successful transaction flow

2. **User Experience:**
   - Intuitive interface
   - Clear error messages
   - Responsive design
   - Fast load times

3. **Deployment:**
   - Easy setup process
   - Works on multiple machines
   - Minimal configuration needed
   - Clear documentation

## Future Enhancements (Post-Hackathon)

Potential improvements beyond hackathon scope:
- Advanced market types
- Liquidity pool management
- Social features (comments, sharing)
- Advanced analytics
- Mobile app version
- Multi-chain support
