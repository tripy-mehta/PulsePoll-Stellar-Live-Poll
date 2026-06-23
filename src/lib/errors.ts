import type { WalletErrorType } from "../types";

export function classifyWalletError(error: unknown): WalletErrorType {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("not found") || lower.includes("not installed") || lower.includes("missing")) {
    return "wallet_not_found";
  }

  if (
    lower.includes("reject") ||
    lower.includes("denied") ||
    lower.includes("declined") ||
    lower.includes("cancel")
  ) {
    return "user_rejected";
  }

  if (
    lower.includes("insufficient") ||
    lower.includes("underfunded") ||
    lower.includes("balance")
  ) {
    return "insufficient_balance";
  }

  if (lower.includes("network") || lower.includes("timeout") || lower.includes("failed to fetch")) {
    return "network_error";
  }

  return "unknown";
}

export function errorMessage(type: WalletErrorType): string {
  const messages: Record<WalletErrorType, string> = {
    wallet_not_found: "Wallet not found. Install Freighter, xBull, LOBSTR, or another Stellar wallet.",
    user_rejected: "The wallet request was rejected. Nothing was submitted.",
    insufficient_balance: "Insufficient XLM balance for fees or minimum reserve on testnet.",
    network_error: "The Stellar testnet request failed. Check your connection and try again.",
    unknown: "Something unexpected happened. Please try again."
  };

  return messages[type];
}
