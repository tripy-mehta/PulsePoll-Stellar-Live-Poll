import type { PollOptionId } from "./config";

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export type WalletErrorType =
  | "wallet_not_found"
  | "user_rejected"
  | "insufficient_balance"
  | "network_error"
  | "unknown";

export type TxStatus = "idle" | "pending" | "success" | "failed";

export type VoteEvent = {
  id: string;
  option: PollOptionId;
  voter: string;
  ledger: number;
  txHash?: string;
  createdAt: string;
};

export type PollResults = Record<PollOptionId, number>;

export interface WalletInfo {
  address: string;
  name: string;
  balance?: string;
};

export type TxState = {
  status: TxStatus;
  hash?: string;
  message: string;
};
