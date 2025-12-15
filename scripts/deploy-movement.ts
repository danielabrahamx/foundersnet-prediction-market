import * as dotenv from 'dotenv';
dotenv.config();

import { spawnSync, SpawnSyncReturns } from "node:child_process";
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

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): CommandResult {
  console.log(`\n$ ${command} ${args.join(" ")}\n`);
  const res = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: true,
  });

  // Print output
  if (res.stdout) console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);

  // Check for errors in output (Aptos CLI returns 0 even on errors sometimes)
  const output = (res.stdout || "") + (res.stderr || "");
  const hasError = output.includes('"Error"') ||
    output.includes('error:') ||
    output.includes('DESERIALIZATION_ERROR') ||
    output.includes('LINKER_ERROR');

  return {
    success: res.status === 0 && !hasError,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    status: res.status,
  };
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..");
  const contractsDir = path.join(repoRoot, "contracts");

  const movementRpcUrl = getRequiredEnv("MOVEMENT_RPC_URL");
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

  // Create config files for both Movement CLI and Aptos CLI
  // Movement CLI uses ~/.movement/config.yaml, Aptos CLI uses ~/.aptos/config.yaml
  const configContent = `---
profiles:
  default:
    network: Custom
    private_key: "${movementPrivateKeyHex}"
    public_key: "${account.publicKey.toString()}"
    account: ${packageAddress}
    rest_url: "${movementRpcUrl}"
`;

  // Create Movement CLI config
  const movementConfigDir = path.join(os.homedir(), ".movement");
  fs.mkdirSync(movementConfigDir, { recursive: true });
  const movementConfigPath = path.join(movementConfigDir, "config.yaml");
  fs.writeFileSync(movementConfigPath, configContent, "utf8");
  console.log(`\n✓ Created Movement CLI config at ${movementConfigPath}`);

  // Also create Aptos CLI config for backwards compatibility
  const aptosConfigDir = path.join(os.homedir(), ".aptos");
  fs.mkdirSync(aptosConfigDir, { recursive: true });
  const aptosConfigPath = path.join(aptosConfigDir, "config.yaml");
  fs.writeFileSync(aptosConfigPath, configContent, "utf8");
  console.log(`✓ Created Aptos CLI config at ${aptosConfigPath}`);

  // Step 1: Compile the contract (no --profile needed with default)
  console.log("\n========================================");
  console.log("  Step 1: Compiling Contract");
  console.log("========================================");

  // Clean build directory first
  const buildDir = path.join(contractsDir, "build");
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
    console.log("✓ Cleaned build directory");
  }

  // Try without bytecode-version flag first (use default), or use version 7 for #[view] support
  let result = runCommand("movement", [
    "move", "compile",
    "--package-dir", contractsDir,
    "--named-addresses", `prediction_market=${moduleAddress}`,
    // Removed --bytecode-version to use CLI default (supports #[view] attributes)
  ], repoRoot);

  if (!result.success) {
    console.error("✗ Compilation failed");
    throw new Error("Compilation failed");
  }
  console.log("✓ Compilation successful");

  // Step 2: Run tests (optional, don't fail on test errors)
  console.log("\n========================================");
  console.log("  Step 2: Running Tests");
  console.log("========================================");

  result = runCommand("movement", [
    "move", "test",
    "--package-dir", contractsDir,
    "--named-addresses", `prediction_market=${moduleAddress}`,
  ], repoRoot);

  if (result.success) {
    console.log("✓ Tests passed");
  } else {
    console.warn("⚠ Tests failed or skipped, continuing with deployment...");
  }

  // Step 3: Publish the contract
  console.log("\n========================================");
  console.log("  Step 3: Publishing Contract");
  console.log("========================================");

  result = runCommand("movement", [
    "move", "publish",
    "--package-dir", contractsDir,
    "--named-addresses", `prediction_market=${moduleAddress}`,
    "--private-key", movementPrivateKeyHex,
    "--url", movementRpcUrl,
    "--assume-yes",
    // Removed --bytecode-version to use CLI default (supports #[view] attributes)
  ], repoRoot);

  if (!result.success) {
    console.error("\n✗ Publishing failed!");

    const output = result.stdout + result.stderr;

    // Detect specific errors and give targeted advice
    if (output.includes("Unable to find config") || output.includes("config.yaml")) {
      console.error("\n❌ Movement CLI config not found.");
      console.error("The script should have created ~/.movement/config.yaml automatically.");
      console.error("If this persists, try running: movement init");
    } else if (output.includes("DESERIALIZATION_ERROR") || output.includes("LINKER_ERROR")) {
      console.error("\nThis is likely due to bytecode version incompatibility with Movement testnet.");
      console.error("Try these solutions:");
      console.error("1. Check Move.toml uses a compatible AptosFramework version");
      console.error("2. Try adding --bytecode-version 6 flag");
      console.error("3. Clear cache with: rm -rf ~/.move");
    } else if (output.includes("INSUFFICIENT_BALANCE") || output.includes("insufficient")) {
      console.error("\n❌ Insufficient balance in your wallet.");
      console.error("Get testnet tokens from: https://faucet.testnet.movementnetwork.xyz");
    } else {
      console.error("\nUnknown error. Check the output above for details.");
    }

    throw new Error("Contract publishing failed - see errors above");
  }
  console.log("✓ Contract published successfully");

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
    result = runCommand("movement", [
      "move", "run",
      "--function-id", `${moduleAddress}::market::initialize`,
      "--args", `hex:${seedHex}`,
      "--assume-yes",
    ], repoRoot);

    if (!result.success) {
      console.error("✗ Initialization failed");
      throw new Error("MarketRegistry initialization failed");
    }
    console.log("✓ MarketRegistry initialized");
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
