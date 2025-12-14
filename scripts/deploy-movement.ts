import * as dotenv from 'dotenv';
dotenv.config();

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function normalizeHex(input: string): string {
  return input.startsWith("0x") ? input : `0x${input}`;
}

function normalizePrivateKey(input: string): string {
  // Strip the "ed25519-priv-" prefix if present (from Petra wallet export)
  let key = input.replace(/^ed25519-priv-/i, "");
  // Ensure it has 0x prefix
  key = normalizeHex(key);
  return key;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>
): void {
  console.log(`\n$ ${command} ${args.join(" ")}\n`);
  const res = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`Command failed with exit code ${res.status}`);
  }
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const contractsDir = path.join(repoRoot, "contracts");

  const movementRpcUrl = getRequiredEnv("MOVEMENT_RPC_URL");
  const movementFaucetUrl = process.env.MOVEMENT_FAUCET_URL;
  const movementPrivateKeyHex = normalizePrivateKey(getRequiredEnv("MOVEMENT_PRIVATE_KEY"));

  const seedHex = (process.env.MOVEMENT_RESOURCE_SEED_HEX ?? "01").replace(/^0x/i, "");

  const privateKey = new Ed25519PrivateKey(movementPrivateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const packageAddress = account.accountAddress.toString();
  const adminAddress = packageAddress;
  const moduleAddress = process.env.PREDICTION_MARKET_ADDRESS ?? packageAddress;

  console.log("========================================");
  console.log("  Movement Contract Deployment");
  console.log("========================================\n");
  console.log(`Package Address: ${packageAddress}`);
  console.log(`Module Address: ${moduleAddress}`);
  console.log(`RPC URL: ${movementRpcUrl}`);
  console.log(`Contracts Directory: ${contractsDir}`);

  // Create a temporary .aptos/config.yaml for CLI
  const aptosConfigDir = path.join(os.homedir(), ".aptos");
  fs.mkdirSync(aptosConfigDir, { recursive: true });

  const configContent = `---
profiles:
  movement:
    network: Custom
    private_key: "${movementPrivateKeyHex}"
    public_key: "${account.publicKey.toString()}"
    account: ${packageAddress}
    rest_url: "${movementRpcUrl}"
${movementFaucetUrl ? `    faucet_url: "${movementFaucetUrl}"` : ""}
`;

  const configPath = path.join(aptosConfigDir, "config.yaml");
  fs.writeFileSync(configPath, configContent, "utf8");
  console.log(`\n✓ Created Aptos CLI config at ${configPath}`);

  // Step 1: Compile the contract
  console.log("\n========================================");
  console.log("  Step 1: Compiling Contract");
  console.log("========================================");

  try {
    runCommand("aptos", [
      "move", "compile",
      "--package-dir", contractsDir,
      "--named-addresses", `prediction_market=${moduleAddress}`,
      "--profile", "movement",
    ], repoRoot);
    console.log("✓ Compilation successful");
  } catch (error) {
    console.error("✗ Compilation failed");
    throw error;
  }

  // Step 2: Run tests
  console.log("\n========================================");
  console.log("  Step 2: Running Tests");
  console.log("========================================");

  try {
    runCommand("aptos", [
      "move", "test",
      "--package-dir", contractsDir,
      "--named-addresses", `prediction_market=${moduleAddress}`,
      "--profile", "movement",
    ], repoRoot);
    console.log("✓ Tests passed");
  } catch (error) {
    console.warn("⚠ Tests failed, continuing with deployment...");
  }

  // Step 3: Publish the contract
  console.log("\n========================================");
  console.log("  Step 3: Publishing Contract");
  console.log("========================================");

  try {
    runCommand("aptos", [
      "move", "publish",
      "--package-dir", contractsDir,
      "--named-addresses", `prediction_market=${moduleAddress}`,
      "--profile", "movement",
      "--assume-yes",
    ], repoRoot);
    console.log("✓ Contract published successfully");
  } catch (error) {
    console.error("✗ Publishing failed");
    throw error;
  }

  // Step 4: Check if MarketRegistry exists, if not initialize
  console.log("\n========================================");
  console.log("  Step 4: Checking MarketRegistry");
  console.log("========================================");

  const aptos = new Aptos(
    new AptosConfig({ network: Network.CUSTOM, fullnode: movementRpcUrl }),
  );

  const registryType = `${moduleAddress}::market::MarketRegistry`;
  let initialized = true;
  try {
    await aptos.getAccountResource({
      accountAddress: adminAddress,
      resourceType: registryType,
    });
    console.log("✓ MarketRegistry already initialized");
  } catch {
    initialized = false;
    console.log("⚠ MarketRegistry not found, initializing...");
  }

  if (!initialized) {
    try {
      runCommand("aptos", [
        "move", "run",
        "--function-id", `${moduleAddress}::market::initialize`,
        "--args", `hex:${seedHex}`,
        "--profile", "movement",
        "--assume-yes",
      ], repoRoot);
      console.log("✓ MarketRegistry initialized");
    } catch (error) {
      console.error("✗ Initialization failed");
      throw error;
    }
  }

  // Step 5: Get resource address and save deployment manifest
  console.log("\n========================================");
  console.log("  Step 5: Saving Deployment Manifest");
  console.log("========================================");

  let resourceAddress = "";
  try {
    const [resAddr] = (await aptos.view({
      payload: {
        function: `${moduleAddress}::market::get_resource_address`,
        typeArguments: [],
        functionArguments: [adminAddress],
      },
    })) as [string];
    resourceAddress = resAddr;
  } catch (error) {
    console.warn("⚠ Could not fetch resource address");
  }

  const deploymentsDir = path.join(contractsDir, "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, "movement.json");
  const manifest = {
    network: "movement-testnet",
    rpcUrl: movementRpcUrl,
    packageAddress: moduleAddress,
    registryAddress: adminAddress,
    resourceAddress,
    namedAddresses: {
      prediction_market: moduleAddress,
    },
    resourceSeedHex: seedHex,
    publishedAt: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`\n✓ Wrote deployment manifest: ${deploymentPath}`);
  console.log(JSON.stringify(manifest, null, 2));

  console.log("\n========================================");
  console.log("  Deployment Complete!");
  console.log("========================================\n");
  console.log("Update your .env file with:");
  console.log(`  MOVEMENT_CONTRACT_ADDRESS=${moduleAddress}`);
  console.log(`  MOVEMENT_RESOURCE_ACCOUNT=${adminAddress}`);
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message || err);
  process.exit(1);
});
