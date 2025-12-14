import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  type TransactionResponse,
} from "@aptos-labs/ts-sdk";

// ============================================================================
// Custom Error Classes
// ============================================================================

export class MovementError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "MovementError";
  }
}

export class MovementNetworkError extends MovementError {
  constructor(message: string, details?: any) {
    super(message, "NETWORK_ERROR", details);
    this.name = "MovementNetworkError";
  }
}

export class MovementContractError extends MovementError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = "MovementContractError";
  }
}

export class MovementValidationError extends MovementError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "MovementValidationError";
  }
}

// Move contract error codes
export const CONTRACT_ERRORS = {
  E_NOT_ADMIN: { code: 1, message: "Only admin can perform this action" },
  E_MARKET_NOT_FOUND: { code: 2, message: "Market not found" },
  E_MARKET_RESOLVED: { code: 3, message: "Market already resolved" },
  E_MARKET_NOT_RESOLVED: { code: 4, message: "Market not yet resolved" },
  E_INVALID_AMOUNT: { code: 6, message: "Invalid amount" },
  E_NO_WINNINGS: { code: 7, message: "No winnings to claim" },
  E_MARKET_EXPIRED: { code: 8, message: "Market has expired" },
  E_ALREADY_INITIALIZED: { code: 9, message: "Already initialized" },
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface DeploymentConfig {
  packageAddress: string;
  registryAddress: string;
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

export interface MarketPrices {
  yesPriceBps: number;
  noPriceBps: number;
}

export interface MarketStatus {
  resolved: boolean;
  expired: boolean;
  winningOutcome: boolean;
}

// ============================================================================
// Movement Client Class
// ============================================================================

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

    // Load deployment config from env
    this.deploymentConfig = {
      packageAddress: process.env.MOVEMENT_CONTRACT_ADDRESS!,
      registryAddress: process.env.MOVEMENT_RESOURCE_ACCOUNT!,
    };

    const config = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: this.rpcUrl,
      // GraphQL Indexer endpoint - ESSENTIAL for efficient queries
      indexer: process.env.MOVEMENT_INDEXER_URL,
      faucet: process.env.MOVEMENT_FAUCET_URL,
    });

    this.aptos = new Aptos(config);

    // Initialize admin account if private key is provided
    if (process.env.MOVEMENT_ADMIN_PRIVATE_KEY) {
      try {
        const privateKey = new Ed25519PrivateKey(
          process.env.MOVEMENT_ADMIN_PRIVATE_KEY
        );
        this.adminAccount = Account.fromPrivateKey({ privateKey });
        console.log(`✓ Admin account initialized: ${this.adminAccount.accountAddress.toString()}`);
      } catch (error) {
        console.error("Failed to initialize admin account:", error);
        throw new MovementValidationError(
          "Invalid MOVEMENT_ADMIN_PRIVATE_KEY",
          { originalError: error }
        );
      }
    } else {
      console.warn("⚠ No admin private key provided - admin operations will not be available");
    }
  }

  // ==========================================================================
  // Configuration & Validation
  // ==========================================================================

  private validateEnvVars(): void {
    const requiredVars = [
      "MOVEMENT_RPC_URL",
      "MOVEMENT_CHAIN_ID",
      "MOVEMENT_CONTRACT_ADDRESS",
      "MOVEMENT_RESOURCE_ACCOUNT",
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new MovementValidationError(
        `Missing required environment variables: ${missing.join(", ")}`,
        { missingVars: missing }
      );
    }
  }

  private getRegistryAddress(): string {
    return this.deploymentConfig.registryAddress;
  }

  // ==========================================================================
  // Market Query Methods
  // ==========================================================================

  /**
   * Get a single market by ID using the get_market_details view function
   */
  async getMarketFromChain(marketId: string): Promise<MovementMarket | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_market_details`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress(), marketId],
        },
      });

      if (!result || result.length === 0) {
        return null;
      }

      // Result is a tuple: (id, company_name, description, yes_pool, no_pool, total_liquidity, expiry_timestamp, resolved, winning_outcome, creator)
      return this.parseMarketDetailsResult(result);
    } catch (error: any) {
      // Check if it's a "not found" error
      if (error?.message?.includes("MARKET_NOT_FOUND") || error?.message?.includes("not found")) {
        return null;
      }

      console.error(`Failed to fetch market ${marketId} from chain:`, error);
      throw new MovementNetworkError(
        `Failed to fetch market ${marketId}`,
        { originalError: error, marketId }
      );
    }
  }

  /**
   * Get all markets by iterating through market IDs and fetching details
   */
  async getMarketsFromChain(): Promise<MovementMarket[]> {
    try {
      // First, get all market IDs
      const idsResult = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_market_ids`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress()],
        },
      });

      if (!idsResult || idsResult.length === 0 || !Array.isArray(idsResult[0])) {
        return [];
      }

      const marketIds = idsResult[0] as string[];

      // Fetch details for each market
      const markets: MovementMarket[] = [];

      for (const marketId of marketIds) {
        try {
          const market = await this.getMarketFromChain(marketId);
          if (market) {
            markets.push(market);
          }
        } catch (error) {
          console.error(`Failed to fetch market ${marketId}, skipping:`, error);
          // Continue with other markets
        }
      }

      return markets;
    } catch (error: any) {
      console.error("Failed to fetch markets from chain:", error);
      throw new MovementNetworkError(
        "Failed to fetch markets from blockchain",
        { originalError: error }
      );
    }
  }

  /**
   * Get user position in a market using the get_position view function
   */
  async getPositionFromChain(
    marketId: string,
    userAddress: string
  ): Promise<MovementPosition | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_position`,
          typeArguments: [],
          functionArguments: [userAddress, marketId],
        },
      });

      if (!result || result.length < 3) {
        return null;
      }

      // Result is a tuple: (yes_tokens, no_tokens, total_invested)
      const yesTokens = BigInt(result[0] as string);
      const noTokens = BigInt(result[1] as string);
      const totalInvested = BigInt(result[2] as string);

      // If no position, return null
      if (yesTokens === 0n && noTokens === 0n && totalInvested === 0n) {
        return null;
      }

      // Calculate average prices (simplified - in production you'd track this from trades)
      const averageYesPrice = 5000; // 50% in basis points
      const averageNoPrice = 5000;

      return {
        marketId,
        userAddress,
        yesTokens,
        noTokens,
        totalInvested,
        averageYesPrice,
        averageNoPrice,
      };
    } catch (error: any) {
      console.error(
        `Failed to fetch position for ${userAddress} in market ${marketId}:`,
        error
      );
      // Return null instead of throwing - user may not have a position
      return null;
    }
  }

  // ==========================================================================
  // Transaction Submission Methods
  // ==========================================================================

  /**
   * Submit a create market transaction (admin only)
   */
  async submitCreateMarketTx(marketData: {
    companyName: string;
    description: string;
    initialLiquidity: bigint;
    expiryTimestamp: bigint;
  }): Promise<string> {
    if (!this.adminAccount) {
      throw new MovementContractError(
        "Admin account not initialized",
        "E_NOT_ADMIN"
      );
    }

    console.log(`\n========== CREATE MARKET DEBUG ==========`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Admin Address: ${this.adminAccount.accountAddress.toString()}`);
    console.log(`Package Address: ${this.deploymentConfig.packageAddress}`);
    console.log(`Registry Address: ${this.getRegistryAddress()}`);
    console.log(`Market Data:`, JSON.stringify({
      companyName: marketData.companyName,
      description: marketData.description,
      initialLiquidity: marketData.initialLiquidity.toString(),
      expiryTimestamp: marketData.expiryTimestamp.toString(),
    }, null, 2));
    console.log(`RPC URL: ${this.rpcUrl}`);

    try {
      // First, check if registry exists
      console.log(`\n[Step 1] Checking if MarketRegistry exists at ${this.getRegistryAddress()}...`);
      try {
        const registryType = `${this.deploymentConfig.packageAddress}::market::MarketRegistry`;
        await this.aptos.getAccountResource({
          accountAddress: this.getRegistryAddress(),
          resourceType: registryType,
        });
        console.log(`✓ MarketRegistry found`);
      } catch (registryError: any) {
        console.error(`✗ MarketRegistry NOT FOUND at ${this.getRegistryAddress()}`);
        console.error(`  Error: ${registryError?.message}`);
        console.error(`  This likely means the contract is not initialized.`);
        console.error(`  Run: npm run move:deploy:movement`);
        throw new MovementContractError(
          `MarketRegistry not found at ${this.getRegistryAddress()}. Has the contract been deployed and initialized?`,
          "REGISTRY_NOT_FOUND",
          { originalError: registryError }
        );
      }

      // Check admin account balance
      console.log(`\n[Step 2] Checking admin account balance...`);
      try {
        const balance = await this.aptos.getAccountAPTAmount({
          accountAddress: this.adminAccount.accountAddress,
        });
        console.log(`✓ Admin balance: ${balance} octas (${balance / 100000000} APT)`);
        if (balance < 10000000) { // Less than 0.1 APT
          console.warn(`⚠ Warning: Admin balance is low. May not have enough for gas + liquidity.`);
        }
      } catch (balanceError: any) {
        console.error(`✗ Failed to check balance: ${balanceError?.message}`);
      }

      console.log(`\n[Step 3] Building transaction...`);
      const builtTxn = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::create_market`,
          typeArguments: [],
          functionArguments: [
            this.getRegistryAddress(),
            marketData.companyName,
            marketData.description,
            marketData.initialLiquidity.toString(),
            marketData.expiryTimestamp.toString(),
          ],
        },
      });
      console.log(`✓ Transaction built successfully`);

      console.log(`\n[Step 4] Signing and submitting transaction...`);
      const txnResponse = await this.aptos.transaction.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction: builtTxn,
      });

      console.log(`✓ Create market transaction submitted: ${txnResponse.hash}`);
      console.log(`========== END DEBUG ==========\n`);
      return txnResponse.hash;
    } catch (error: any) {
      console.error(`\n========== CREATE MARKET ERROR ==========`);
      console.error(`Error Type: ${error?.name || 'Unknown'}`);
      console.error(`Error Message: ${error?.message || String(error)}`);
      console.error(`Error Code: ${error?.code || 'N/A'}`);

      // Log full error details
      if (error?.response) {
        console.error(`Response Status: ${error.response.status}`);
        console.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
      }

      if (error?.body) {
        console.error(`Error Body:`, JSON.stringify(error.body, null, 2));
      }

      // Log stack trace
      if (error?.stack) {
        console.error(`Stack Trace:\n${error.stack}`);
      }

      console.error(`========== END ERROR ==========\n`);

      throw new MovementContractError(
        `Failed to create market: ${error?.message || String(error)}`,
        error?.code,
        { originalError: error, marketData }
      );
    }
  }

  /**
   * Submit a resolve market transaction (admin only)
   */
  async submitResolveMarketTx(
    marketId: string,
    winningOutcome: boolean
  ): Promise<string> {
    if (!this.adminAccount) {
      throw new MovementContractError(
        "Admin account not initialized",
        "E_NOT_ADMIN"
      );
    }

    try {
      const builtTxn = await this.aptos.transaction.build.simple({
        sender: this.adminAccount.accountAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::resolve_market`,
          typeArguments: [],
          functionArguments: [
            this.getRegistryAddress(),
            marketId,
            winningOutcome,
          ],
        },
      });

      const txnResponse = await this.aptos.transaction.signAndSubmitTransaction({
        signer: this.adminAccount,
        transaction: builtTxn,
      });

      console.log(`✓ Resolve market transaction submitted: ${txnResponse.hash}`);
      return txnResponse.hash;
    } catch (error: any) {
      console.error("Failed to submit resolve market transaction:", error);
      throw new MovementContractError(
        "Failed to resolve market",
        undefined,
        { originalError: error, marketId, winningOutcome }
      );
    }
  }

  /**
   * Build an unsigned place bet transaction for client-side signing
   */
  async submitPlaceBetTx(
    marketId: string,
    betType: "YES" | "NO",
    moveAmount: bigint,
    userAddress: string
  ): Promise<string> {
    try {
      const functionName = betType === "YES" ? "buy_yes" : "buy_no";

      const builtTxn = await this.aptos.transaction.build.simple({
        sender: userAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::${functionName}`,
          typeArguments: [],
          functionArguments: [
            this.getRegistryAddress(),
            marketId,
            moveAmount.toString(),
          ],
        },
      });

      // Return unsigned transaction as JSON for client to sign
      return JSON.stringify(builtTxn);
    } catch (error: any) {
      console.error("Failed to build place bet transaction:", error);
      throw new MovementContractError(
        "Failed to build bet transaction",
        undefined,
        { originalError: error, marketId, betType, moveAmount, userAddress }
      );
    }
  }

  /**
   * Build an unsigned claim winnings transaction for client-side signing
   */
  async submitClaimWinningsTx(
    marketId: string,
    userAddress: string
  ): Promise<string> {
    try {
      const builtTxn = await this.aptos.transaction.build.simple({
        sender: userAddress,
        data: {
          function: `${this.deploymentConfig.packageAddress}::market::claim_winnings`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress(), marketId],
        },
      });

      // Return unsigned transaction as JSON for client to sign
      return JSON.stringify(builtTxn);
    } catch (error: any) {
      console.error("Failed to build claim winnings transaction:", error);
      throw new MovementContractError(
        "Failed to build claim transaction",
        undefined,
        { originalError: error, marketId, userAddress }
      );
    }
  }

  // ==========================================================================
  // Transaction Verification Methods
  // ==========================================================================

  /**
   * Wait for transaction confirmation with retry logic
   */
  async verifyTransaction(
    txHash: string,
    maxRetries: number = 3
  ): Promise<TransactionResponse> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tx = await this.aptos.transaction.waitForTransaction({
          transactionHash: txHash,
        });
        return tx;
      } catch (error) {
        lastError = error;
        console.warn(
          `Transaction verification attempt ${attempt}/${maxRetries} failed:`,
          error
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new MovementNetworkError(
      `Failed to verify transaction after ${maxRetries} attempts`,
      { originalError: lastError, txHash }
    );
  }

  /**
   * Verify if a transaction was successful
   */
  async verifyTransactionSuccess(txHash: string): Promise<boolean> {
    try {
      const tx = await this.verifyTransaction(txHash);

      // Check if transaction was confirmed (has a version)
      if (!("version" in tx) || !tx.version) {
        console.error(`Transaction ${txHash} failed or not confirmed`);
        return false;
      }

      // Check if transaction was successful (not aborted)
      if ("success" in tx && !tx.success) {
        console.error(`Transaction ${txHash} was aborted`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to verify transaction:", error);
      return false;
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get the resource account address
   */
  async getResourceAddress(): Promise<string> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_resource_address`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress()],
        },
      });

      if (!result || result.length === 0) {
        throw new Error("Resource address not found");
      }

      return result[0] as string;
    } catch (error: any) {
      throw new MovementNetworkError(
        "Failed to get resource address",
        { originalError: error }
      );
    }
  }

  /**
   * Calculate market prices in basis points
   */
  async getMarketPrices(marketId: string): Promise<MarketPrices> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_prices_bps`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress(), marketId],
        },
      });

      if (!result || result.length < 2) {
        throw new Error("Invalid price data");
      }

      return {
        yesPriceBps: parseInt(result[0] as string, 10),
        noPriceBps: parseInt(result[1] as string, 10),
      };
    } catch (error: any) {
      throw new MovementNetworkError(
        `Failed to get prices for market ${marketId}`,
        { originalError: error, marketId }
      );
    }
  }

  /**
   * Get market status (resolved, expired, winning outcome)
   */
  async getMarketStatus(marketId: string): Promise<MarketStatus> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.deploymentConfig.packageAddress}::market::get_market_status`,
          typeArguments: [],
          functionArguments: [this.getRegistryAddress(), marketId],
        },
      });

      if (!result || result.length < 3) {
        throw new Error("Invalid status data");
      }

      return {
        resolved: result[0] as boolean,
        expired: result[1] as boolean,
        winningOutcome: result[2] as boolean,
      };
    } catch (error: any) {
      throw new MovementNetworkError(
        `Failed to get status for market ${marketId}`,
        { originalError: error, marketId }
      );
    }
  }

  /**
   * Validate that a market exists
   */
  async validateMarketExists(marketId: string): Promise<boolean> {
    const market = await this.getMarketFromChain(marketId);
    return market !== null;
  }

  /**
   * Retry wrapper for blockchain operations
   * Provides exponential backoff for transient failures
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = "operation"
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on validation errors or contract errors
        if (error instanceof MovementValidationError ||
          error instanceof MovementContractError) {
          throw error;
        }

        console.warn(
          `${operationName} attempt ${attempt}/${maxRetries} failed:`,
          error?.message || error
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new MovementNetworkError(
      `${operationName} failed after ${maxRetries} attempts`,
      { originalError: lastError }
    );
  }

  /**
   * Get total count of markets
   */
  async getMarketCount(): Promise<number> {
    try {
      const result = await this.withRetry(
        async () => {
          return await this.aptos.view({
            payload: {
              function: `${this.deploymentConfig.packageAddress}::market::get_market_ids`,
              typeArguments: [],
              functionArguments: [this.getRegistryAddress()],
            },
          });
        },
        3,
        "Get market count"
      );

      if (!result || result.length === 0 || !Array.isArray(result[0])) {
        return 0;
      }

      return (result[0] as string[]).length;
    } catch (error: any) {
      console.error("Failed to get market count:", error);
      // Return 0 instead of throwing to allow graceful degradation
      return 0;
    }
  }

  /**
   * Check health of blockchain connection
   */
  async checkHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    rpcUrl: string;
    chainId: string;
    blockHeight?: number;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Try to get ledger info as a health check
      const ledgerInfo = await this.aptos.getLedgerInfo();
      const latencyMs = Date.now() - startTime;

      return {
        status: "healthy",
        rpcUrl: this.rpcUrl,
        chainId: this.chainId,
        blockHeight: parseInt(ledgerInfo.block_height, 10),
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      return {
        status: latencyMs < 10000 ? "degraded" : "unhealthy",
        rpcUrl: this.rpcUrl,
        chainId: this.chainId,
        latencyMs,
        error: error?.message || String(error),
      };
    }
  }


  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Parse the result from get_market_details view function
   * Returns: (id, company_name, description, yes_pool, no_pool, total_liquidity, expiry_timestamp, resolved, winning_outcome, creator)
   */
  private parseMarketDetailsResult(result: any[]): MovementMarket {
    return {
      id: result[0]?.toString() || "",
      companyName: result[1] as string || "",
      description: result[2] as string || "",
      yesPool: BigInt(result[3]?.toString() || "0"),
      noPool: BigInt(result[4]?.toString() || "0"),
      totalLiquidity: BigInt(result[5]?.toString() || "0"),
      volume24h: 0n, // Not tracked in current contract
      expiryTimestamp: BigInt(result[6]?.toString() || "0"),
      resolved: result[7] as boolean || false,
      winningOutcome: result[8] as boolean || undefined,
      creator: result[9] as string || "",
    };
  }

  // ==========================================================================
  // Public Getters
  // ==========================================================================

  getDeploymentConfig(): DeploymentConfig {
    return this.deploymentConfig;
  }

  getAdminAddress(): string | null {
    return this.adminAccount
      ? this.adminAccount.accountAddress.toString()
      : null;
  }

  isAdminInitialized(): boolean {
    return this.adminAccount !== null;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  getChainId(): string {
    return this.chainId;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const movementClient = new MovementClient();
