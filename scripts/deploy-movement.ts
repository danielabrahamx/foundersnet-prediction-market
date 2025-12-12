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

function runAptos(
  aptosBin: string,
  configPath: string,
  profile: string,
  args: string[],
  cwd: string,
) {
  const fullArgs = ["--config", configPath, "--profile", profile, ...args];
  const res = spawnSync(aptosBin, fullArgs, { cwd, stdio: "inherit" });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        `\nMissing Aptos CLI binary (tried: '${aptosBin}'). Install it from https://aptos.dev/tools/aptos-cli/ or set APTOS_BIN.\n`,
      );
    }
    throw res.error;
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const contractsDir = path.join(repoRoot, "contracts");

  const aptosBin = process.env.APTOS_BIN ?? "aptos";
  const profile = process.env.MOVEMENT_PROFILE ?? "movement";

  const movementRpcUrl = getRequiredEnv("MOVEMENT_RPC_URL");
  const movementFaucetUrl = process.env.MOVEMENT_FAUCET_URL;
  const movementPrivateKeyHex = normalizeHex(getRequiredEnv("MOVEMENT_PRIVATE_KEY"));

  const seedHex = (process.env.MOVEMENT_RESOURCE_SEED_HEX ?? "01").replace(/^0x/i, "");

  const privateKey = new Ed25519PrivateKey(movementPrivateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const packageAddress = account.accountAddress.toString();
  const adminAddress = packageAddress;
  const moduleAddress = process.env.PREDICTION_MARKET_ADDRESS ?? packageAddress;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aptos-movement-"));
  const configPath = path.join(tmpDir, "config.yaml");

  const yamlLines = [
    "profiles:",
    `  ${profile}:`,
    "    network: custom",
    `    account: \"${packageAddress}\"`,
    `    private_key: \"${movementPrivateKeyHex}\"`,
    `    public_key: \"${account.publicKey.toString()}\"`,
    `    rest_url: \"${movementRpcUrl}\"`,
  ];
  if (movementFaucetUrl) {
    yamlLines.push(`    faucet_url: \"${movementFaucetUrl}\"`);
  }
  fs.writeFileSync(configPath, `${yamlLines.join("\n")}\n`, "utf8");

  runAptos(
    aptosBin,
    configPath,
    profile,
    [
      "move",
      "compile",
      "--package-dir",
      contractsDir,
      "--named-addresses",
      `prediction_market=${moduleAddress}`,
    ],
    repoRoot,
  );

  runAptos(
    aptosBin,
    configPath,
    profile,
    [
      "move",
      "test",
      "--package-dir",
      contractsDir,
      "--named-addresses",
      `prediction_market=${moduleAddress}`,
    ],
    repoRoot,
  );

  runAptos(
    aptosBin,
    configPath,
    profile,
    [
      "move",
      "publish",
      "--package-dir",
      contractsDir,
      "--named-addresses",
      `prediction_market=${moduleAddress}`,
      "--assume-yes",
    ],
    repoRoot,
  );

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
  } catch {
    initialized = false;
  }

  if (!initialized) {
    runAptos(
      aptosBin,
      configPath,
      profile,
      [
        "move",
        "run",
        "--function-id",
        `${moduleAddress}::market::initialize`,
        "--args",
        `hex:${seedHex}`,
      ],
      repoRoot,
    );
  }

  const [resourceAddress] = (await aptos.view({
    payload: {
      function: `${moduleAddress}::market::get_resource_address`,
      typeArguments: [],
      functionArguments: [adminAddress],
    },
  })) as [string];

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

  console.log(`\nWrote deployment manifest: ${deploymentPath}`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
