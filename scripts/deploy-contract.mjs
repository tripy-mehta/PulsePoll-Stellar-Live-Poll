import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

config();

const secret = process.env.DEPLOYER_SECRET_KEY;
const wasmPath = resolve("contracts/live-poll/target/wasm32-unknown-unknown/release/live_poll.wasm");

if (!secret) {
  throw new Error("DEPLOYER_SECRET_KEY is required. Add a funded Stellar testnet secret key to .env.local.");
}

if (!existsSync(wasmPath)) {
  console.log("Contract WASM not found. Building first...");
  execFileSync("stellar", ["contract", "build"], {
    cwd: resolve("contracts/live-poll"),
    stdio: "inherit"
  });
}

execFileSync(
  "stellar",
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
