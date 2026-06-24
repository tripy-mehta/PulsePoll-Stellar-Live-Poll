import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

config();

const secret = process.env.DEPLOYER_SECRET_KEY;
const wasmPath = resolve("contracts/live-poll/target/wasm32v1-none/release/live_poll.wasm");
const stellarPath = resolve("stellar.exe");

if (!secret) {
  throw new Error("DEPLOYER_SECRET_KEY is required. Add a funded Stellar testnet secret key to .env.local.");
}

if (!existsSync(wasmPath)) {
  console.log("Contract WASM not found. Building first...");
  execFileSync(stellarPath, ["contract", "build"], {
    cwd: resolve("contracts/live-poll"),
    stdio: "inherit"
  });
}

execFileSync(
  stellarPath,
  [
    "contract",
    "deploy",
    "--wasm",
    wasmPath,
    "--source-account",
    secret,
    "--network",
    "testnet"
  ],
  { stdio: "inherit" }
);
