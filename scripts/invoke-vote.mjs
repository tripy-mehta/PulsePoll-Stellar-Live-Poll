import { config } from "dotenv";
import { execFileSync } from "node:child_process";

config();

const secret = process.env.DEPLOYER_SECRET_KEY;
const publicKey = process.env.DEPLOYER_PUBLIC_KEY;
const contractId = process.env.PUBLIC_POLL_CONTRACT_ID || process.env.VITE_CONTRACT_ID;
const option = process.argv[2] || "dex";

if (!secret || !publicKey || !contractId) {
  throw new Error("DEPLOYER_SECRET_KEY, DEPLOYER_PUBLIC_KEY, and PUBLIC_POLL_CONTRACT_ID/VITE_CONTRACT_ID are required.");
}

execFileSync(
  "stellar",
  [
    "contract",
    "invoke",
    "--id",
    contractId,
    "--source-account",
    secret,
    "--network",
    "testnet",
    "--",
    "vote",
    "--voter",
    publicKey,
    "--option",
    option
  ],
  { stdio: "inherit" }
);
