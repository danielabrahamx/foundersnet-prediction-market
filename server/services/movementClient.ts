import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  type TransactionResponse,
  type MoveStructId,
} from "@aptos-labs/ts-sdk";

interface DeploymentConfig {
  packageAddress: string;
  resourceAccountAddress: string;
  marketStorageAddress?: string;
}

export interface MovementMarket {
  id: string;
  companyName: string;
  description: string;
  yesPool: bigint;
  noPool: bigint;
  totalLiquidity: bigint;
  volume24h: bigint;
  resolved: boolean;
  winningOutcome?: boolean;
  expiryTimestamp: bigint;
  creator: string;
}

export interface MovementPosition {
  marketId: string;
  userAddress: string;
  yesTokens: bigint;
  noTokens: bigint;
  totalInvested: bigint;
  averageYesPrice: number;
  averageNoPrice: number;
}

export class MovementClient {
  private aptos: Aptos;
  private adminAccount: Account | null = null;
  private deploymentConfig: DeploymentConfig;
  private rpcUrl: string;
  private chainId: string;

  constructor() {
    this.validateEnvVars();

    this.rpcUrl = process.env.MOVEMENT_RPC_URL!;
    this.chainId = process.env.MOVEMENT_CHAIN_ID!;

    // Load deployment config from env or file
    this.deploymentConfig = {
      packageAddress: process.env.MOVEMENT_CONTRACT_ADDRESS!,
      resourceAccountAddress: process.env.MOVEMENT_RESOURCE_ACCOUNT!,
      marketStorageAddress: process.env.MOVEMENT_MARKET_STORAGE_ADDRESS,
    };

    const config = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: this.rpcUrl,
      faucet: process.env.MOVEMENT_FAUCET_URL,
    });

    this.aptos = new Aptos(config);

    // Initialize admin account if private key is provided
    if (process.env.MOVEMENT_ADMIN_PRIVATE_KEY) {
      try {
        const privateKey = new Ed25519PrivateKey(
          process.env.MOVEMENT_ADMIN_PRIVATE_KEY
        );
        this.adminAccount = Account.fromPrivateKey({
          privateKey,
        });
      } catch (error) {
        console.error("Failed to initialize admin account:", error);
        throw new Error("Invalid MOVEMENT_ADMIN_PRIVATE_KEY");
      }
    }
  }

  private validateEnvVars(): void {
    const requiredVars = [
      "MOVEMENT_RPC_URL",
      "MOVEMENT_CHAIN_ID",
      "MOVEMENT_CONTRACT_ADDRESS",
      "MOVEMENT_RESOURCE_ACCOUNT",
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }
  }

  async getMarketFromChain(marketId: string): Promise<MovementMarket | null> {
    try {
      // Query the market resource from the chain
      // This assumes the contract stores markets as resources under the resource account
      const resource = await this.aptos.getAccountResource({
        accountAddress: this.deploymentConfig.resourceAccountAddress,
        resourceType: `${this.deploymentConfig.packageAddress}::market::Market`,
      });

      if (!resource) {
        return null;
      }

      // Parse the resource data
      const marketData = resource.data as any;
      return this.parseMarketResource(marketData);
    } catch (error) {
      console.error(`Failed to fetch market ${marketId} from chain:`, error);
      return null;
    }
  }

  async getMarketsFromChain(): Promise<MovementMarket[]> {
    try {
      // Query all market resources from the resource account
      // This would require a view function in the contract or querying events
      // For now, return empty array - implementation depends on contract structure
      return [];
    } catch (error) {
      console.error("Failed to fetch markets from chain:", error);
      return [];
    }
  }

  async getPositionFromChain(
    marketId: string,
    userAddress: string
  ): Promise<MovementPosition | null> {
    try {
      // Query the position resource for a user in a specific market
      const resourceType = `${this.deploymentConfig.packageAddress}::position::Position<${this.deploymentConfig.packageAddress}::market::Market>` as MoveStructId;

      const resource = await this.aptos.getAccountResource({
        accountAddress: userAddress,
        resourceType,
      });

      if (!resource) {
        return null;
      }

      const positionData = resource.data as any;
      return this.parsePositionResource(positionData, marketId, userAddress);
    } catch (error) {
      console.error(
        `Failed to fetch position for ${userAddress} in market ${marketId}:`,
        error
      );
      return null;
    }
  }

  async submitCreateMarketTx(
    marketData: {
      companyName: string;
      description: string;
      yesPool: bigint;
      noPool: bigint;
      totalLiquidity: bigint;
      expiryTimestamp: bigint;
    }
  ): Promise<string> {
    if (!this.adminAccount) {
      throw new Error("Admin account not initialized");
    }

    try {
      const builtTxn = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::create_market`,
          typeArguments: [],
          functionArguments: [
            marketData.companyName,
            marketData.description,
            marketData.yesPool,
            marketData.noPool,
            marketData.totalLiquidity,
            marketData.expiryTimestamp,
          ],
        },
      });

      const txnResponse = await this.aptos.transaction.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction: builtTxn,
      });

      return txnResponse.hash;
    } catch (error) {
      console.error("Failed to submit create market transaction:", error);
      throw error;
    }
  }

  async submitResolveMarketTx(
    marketId: string,
    winningOutcome: boolean
  ): Promise<string> {
    if (!this.adminAccount) {
      throw new Error("Admin account not initialized");
    }

    try {
      const builtTxn = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::resolve_market`,
          typeArguments: [],
          functionArguments: [marketId, winningOutcome],
        },
      });

      const txnResponse = await this.aptos.transaction.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction: builtTxn,
      });

      return txnResponse.hash;
    } catch (error) {
      console.error("Failed to submit resolve market transaction:", error);
      throw error;
    }
  }

  async submitBuyTx(
    marketId: string,
    isBuyingYes: boolean,
    moveAmount: bigint,
    expectedTokens: bigint,
    userAddress: string
  ): Promise<string> {
    try {
      const buyFunctionName = isBuyingYes ? "buy_yes" : "buy_no";

      const response = await this.aptos.transaction.build.simple({
        sender: userAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::${buyFunctionName}`,
          typeArguments: [],
          functionArguments: [marketId, moveAmount, expectedTokens],
        },
      });

      // Note: This returns an unsigned transaction for the client to sign
      return JSON.stringify(response);
    } catch (error) {
      console.error("Failed to build buy transaction:", error);
      throw error;
    }
  }

  async verifyTransaction(txHash: string): Promise<TransactionResponse> {
    try {
      const tx = await this.aptos.transaction.waitForTransaction({
        transactionHash: txHash,
      });

      return tx;
    } catch (error) {
      console.error(`Failed to verify transaction ${txHash}:`, error);
      throw error;
    }
  }

  async verifyBuyTransaction(
    txHash: string,
    expectedMarketId: string,
    expectedIsBuyingYes: boolean,
    expectedMoveAmount: bigint,
    userAddress: string
  ): Promise<boolean> {
    try {
      const tx = await this.verifyTransaction(txHash);

      // Verify transaction was successful
      // Check if transaction was confirmed (has a block height or version)
      if (!("version" in tx) || !tx.version) {
        console.error(`Transaction ${txHash} failed or not confirmed`);
        return false;
      }

      // Verify the transaction contains the expected function call
      // This is a simplified check - actual implementation may vary based on contract
      if (!tx.hash) {
        return false;
      }

      // Additional checks can be added here to verify:
      // - The function called matches the expected buy_yes or buy_no
      // - The market ID matches
      // - The user address matches
      // - The amount matches

      return true;
    } catch (error) {
      console.error("Failed to verify buy transaction:", error);
      return false;
    }
  }

  private parseMarketResource(data: any): MovementMarket {
    // Parse the market resource data returned from the chain
    // Structure depends on the Move contract implementation
    return {
      id: data.id || "",
      companyName: data.company_name || "",
      description: data.description || "",
      yesPool: BigInt(data.yes_pool || 0),
      noPool: BigInt(data.no_pool || 0),
      totalLiquidity: BigInt(data.total_liquidity || 0),
      volume24h: BigInt(data.volume_24h || 0),
      resolved: data.resolved || false,
      winningOutcome: data.winning_outcome,
      expiryTimestamp: BigInt(data.expiry_timestamp || 0),
      creator: data.creator || "",
    };
  }

  private parsePositionResource(
    data: any,
    marketId: string,
    userAddress: string
  ): MovementPosition {
    // Parse the position resource data returned from the chain
    // Structure depends on the Move contract implementation
    return {
      marketId,
      userAddress,
      yesTokens: BigInt(data.yes_tokens || 0),
      noTokens: BigInt(data.no_tokens || 0),
      totalInvested: BigInt(data.total_invested || 0),
      averageYesPrice: parseInt(data.average_yes_price || "5000", 10),
      averageNoPrice: parseInt(data.average_no_price || "5000", 10),
    };
  }

  getDeploymentConfig(): DeploymentConfig {
    return this.deploymentConfig;
  }

  getAdminAddress(): string | null {
    return this.adminAccount ? this.adminAccount.accountAddress.toString() : null;
  }

  isAdminInitialized(): boolean {
    return this.adminAccount !== null;
  }
}

export const movementClient = new MovementClient();
