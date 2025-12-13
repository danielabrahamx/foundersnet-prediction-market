import { spawnSync } from "node:child_process";

function main() {
  const aptosBin = process.env.APTOS_BIN ?? "aptos";
  const packageDir = process.env.MOVE_PACKAGE_DIR ?? "contracts";
  const predictionMarketAddress = process.env.PREDICTION_MARKET_ADDRESS ?? "0xcafe";

  const args = [
    "move",
    "test",
    "--package-dir",
    packageDir,
    "--named-addresses",
    `prediction_market=${predictionMarketAddress}`,
  ];

  const res = spawnSync(aptosBin, args, { stdio: "inherit" });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        `\nMissing Aptos CLI binary (tried: '${aptosBin}'). Install it from https://aptos.dev/tools/aptos-cli/ or set APTOS_BIN.\n`,
      );
    }
    throw res.error;
  }
  process.exit(res.status ?? 1);
}

main();
