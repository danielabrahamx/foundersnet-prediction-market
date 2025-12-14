export const CONTRACT_CONFIG = {
  marketFactory: "0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e",
  amm: "0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e",
  resolution: "0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e",
  treasury: "0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e",
  positions: "0x5bf2c4dde989ae89042eba11691e76407d129f9a06eb90eafee5bcaead2df58e",

  // Movement Testnet RPC endpoint (for transactions)
  rpcEndpoint: "https://testnet.movementnetwork.xyz/v1",
  // GraphQL Indexer endpoint (for queries)
  indexerEndpoint: "https://hasura.testnet.movementnetwork.xyz/v1/graphql",

  adminAddress: "0x3cab0d4baece087681585a2ccb8b09f7957c74abef25938f02046c8030ed83a1",

  // CRITICAL: Must use "custom" for Movement (not "testnet")
  network: "custom" as const,
  chainName: "Movement Testnet",
  chainId: 250,

  fees: {
    tradingFeeBps: 200,
  },

  slippage: {
    defaultBps: 100,
  },
};

export const isContractsDeployed = (): boolean => {
  return !CONTRACT_CONFIG.marketFactory.includes("_ADDRESS_");
};
