# FoundersNet (Movement M1)

This repo includes a Move package under `contracts/` for the on-chain prediction market, plus scripts to test and deploy it to Movement testnet.

## Prerequisites

- Aptos CLI installed (`aptos`)
  - https://aptos.dev/tools/aptos-cli/

## Move contract workflow

### Run Move tests

```bash
npm run move:test
```

Environment variables:

- `APTOS_BIN` (optional): path to the `aptos` binary.
- `PREDICTION_MARKET_ADDRESS` (optional): named address to use for tests (defaults to `0xcafe`).

### Deploy to Movement testnet

```bash
npm run move:deploy:movement
```

Required environment variables:

- `MOVEMENT_RPC_URL`: Movement fullnode REST endpoint (e.g. `https://aptos.testnet.suzuka.movementnetwork.xyz/v1`).
- `MOVEMENT_PRIVATE_KEY`: deployer/admin private key (hex, with or without `0x`).

Optional environment variables:

- `MOVEMENT_PROFILE`: profile name to write into the generated Aptos config (default: `movement`).
- `MOVEMENT_FAUCET_URL`: faucet URL (only needed if your CLI flow requires it).
- `MOVEMENT_RESOURCE_SEED_HEX`: seed used by `market::initialize` when creating the resource account (default: `01`).
- `PREDICTION_MARKET_ADDRESS`: overrides the named address `prediction_market` for compile/publish (defaults to the deployer account address).

On success, the script writes a manifest to:

- `contracts/deployments/movement.json`

This includes the published package address (named address `prediction_market`) and the derived resource account address used by the contract treasury.
