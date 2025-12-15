// MOVE token has 8 decimal places (same as Aptos)
// 1 MOVE = 100,000,000 octas (10^8)
export const MOVE_DECIMALS = 8;
export const OCTAS_PER_MOVE = 100_000_000;

/**
 * Convert MOVE amount (decimal) to octas (integer)
 * @param moveAmount - Amount in MOVE (e.g., 0.1)
 * @returns Amount in octas (e.g., 10_000_000)
 */
export function moveToOctas(moveAmount: number): number {
  return Math.round(moveAmount * OCTAS_PER_MOVE);
}

/**
 * Convert octas (integer) to MOVE amount (decimal)
 * @param octasAmount - Amount in octas (e.g., 10_000_000)
 * @returns Amount in MOVE (e.g., 0.1)
 */
export function octasToMove(octasAmount: number): number {
  return octasAmount / OCTAS_PER_MOVE;
}

export const CONTRACT_CONFIG = {
  marketFactory: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",
  amm: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",
  resolution: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",
  treasury: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",
  positions: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",

  // Movement Testnet RPC endpoint (for transactions)
  rpcEndpoint: "https://testnet.movementnetwork.xyz/v1",
  // GraphQL Indexer endpoint (for queries)
  indexerEndpoint: "https://hasura.testnet.movementnetwork.xyz/v1/graphql",

  adminAddress: "0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91",

  // CRITICAL: Must use "custom" for Movement (not "testnet")
  network: "custom" as const,
  chainName: "Movement Testnet",
  chainId: 250,

  fees: {
    tradingFeeBps: 0, // No fees in parimutuel model
  },

  slippage: {
    defaultBps: 0, // No slippage in parimutuel model
  },
};

export const isContractsDeployed = (): boolean => {
  return !CONTRACT_CONFIG.marketFactory.includes("_ADDRESS_");
};
