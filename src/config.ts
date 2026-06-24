export const TESTNET = {
  rpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  horizonUrl: import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org",
  networkPassphrase:
    import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
  contractId: import.meta.env.VITE_CONTRACT_ID || "",
  explorerBase:
    import.meta.env.VITE_STELLAR_EXPERT_BASE || "https://stellar.expert/explorer/testnet",
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
  treasuryAddress: import.meta.env.VITE_TREASURY_ADDRESS || "GA2C5RFPE6GCKMY3US5PAB6ALIIG5EPCEUEXCEKDFQHQZICOMRUFBPTN",
  voteCost: "100.0000000"
};

export const POLL_OPTIONS = [
  {
    id: "dex",
    label: "Token Swap",
    accent: "#2a9d8f",
    description: "A simple Stellar DEX route finder."
  },
  {
    id: "nft",
    label: "NFT Minter",
    accent: "#e76f51",
    description: "Mint small collectibles with metadata."
  },
  {
    id: "auction",
    label: "Live Auction",
    accent: "#577590",
    description: "Real-time bids and event updates."
  }
] as const;

export type PollOptionId = (typeof POLL_OPTIONS)[number]["id"];
