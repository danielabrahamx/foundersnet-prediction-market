export const CONTRACT_CONFIG = {
  marketFactory: "0x_MARKET_FACTORY_ADDRESS_",
  amm: "0x_AMM_ADDRESS_",
  resolution: "0x_RESOLUTION_ADDRESS_",
  treasury: "0x_TREASURY_ADDRESS_",
  positions: "0x_POSITIONS_ADDRESS_",
  
  rpcEndpoint: "https://api.testnet.staging.aptoslabs.com/v1",
  
  adminAddress: "0xf9d1cf9d709d9dd591d3ed29428c63eedc569cbaeac1bf44cad628047b192ab2",
  
  network: "testnet" as const,
  chainName: "Aptos Testnet",
  
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
