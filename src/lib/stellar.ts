import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  Operation,
  Asset
} from "@stellar/stellar-sdk";
import { POLL_OPTIONS, TESTNET, type PollOptionId } from "../config";
import type { PollResults, VoteEvent } from "../types";
import { signTransactionXdr } from "./wallet";

const server = new rpc.Server(TESTNET.rpcUrl, { allowHttp: TESTNET.rpcUrl.startsWith("http://") });

function getContract(): Contract {
  if (!TESTNET.contractId) {
    throw new Error("VITE_CONTRACT_ID is missing. Deploy the contract and add it to .env.local.");
  }

  return new Contract(TESTNET.contractId);
}

export function optionToScVal(option: PollOptionId): xdr.ScVal {
  return nativeToScVal(option, { type: "symbol" });
}

export async function readResults(): Promise<PollResults> {
  const contract = getContract();
  // Use a dummy account for simulation without making a network request
  const account = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(contract.call("results"))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(tx);

  if (!rpc.Api.isSimulationSuccess(response)) {
    throw new Error("Unable to simulate results read.");
  }

  const raw = response.result?.retval;
  const native = raw ? scValToNative(raw) : {};

  return POLL_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.id]: Number(native[option.id] || 0)
    }),
    {} as PollResults
  );
}

export async function submitVote(option: PollOptionId, address: string): Promise<string> {
  const contract = getContract();
  const source = await server.getAccount(address);
  
  // 1. Payment Transaction
  const paymentTx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET.networkPassphrase
  })
    .addOperation(
      Operation.payment({
        destination: TESTNET.treasuryAddress,
        asset: Asset.native(),
        amount: TESTNET.voteCost
      })
    )
    .setTimeout(30)
    .build();

  const signedPaymentXdr = await signTransactionXdr(paymentTx.toXDR(), address);
  const signedPayment = TransactionBuilder.fromXDR(signedPaymentXdr, TESTNET.networkPassphrase);
  const sentPayment = await server.sendTransaction(signedPayment);

  if (sentPayment.status === "ERROR") {
    throw new Error(sentPayment.errorResult?.toXDR("base64") || "Payment transaction failed.");
  }

  // Wait for the payment transaction to confirm on-chain
  await waitForTransaction(sentPayment.hash);

  // 2. Vote Transaction
  // Now that the payment is confirmed, Horizon has the updated sequence number
  const updatedSource = await server.getAccount(address);
  const voteTx = new TransactionBuilder(updatedSource, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET.networkPassphrase
  })
    .addOperation(contract.call("vote", Address.fromString(address).toScVal(), optionToScVal(option)))
    .setTimeout(30)
    .build();

  const preparedVote = await server.prepareTransaction(voteTx);
  const signedVoteXdr = await signTransactionXdr(preparedVote.toXDR(), address);
  const signedVote = TransactionBuilder.fromXDR(signedVoteXdr, TESTNET.networkPassphrase);
  const sentVote = await server.sendTransaction(signedVote);

  if (sentVote.status === "ERROR") {
    throw new Error(sentVote.errorResult?.toXDR("base64") || "Vote transaction failed.");
  }

  return sentVote.hash;
}

export async function waitForTransaction(hash: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await server.getTransaction(hash);

    if (result.status === "SUCCESS") {
      return;
    }

    if (result.status === "FAILED") {
      throw new Error("Transaction failed on-chain.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1200));
  }

  throw new Error("Transaction is still pending. Check the explorer link.");
}

export async function fetchVoteEvents(cursor?: string): Promise<{ events: VoteEvent[]; cursor?: string }> {
  const requestArgs: any = {
    filters: [
      {
        type: "contract",
        contractIds: TESTNET.contractId ? [TESTNET.contractId] : undefined,
        topics: [[nativeToScVal("vote", { type: "symbol" }).toXDR("base64")]]
      }
    ],
    limit: 20
  };

  if (cursor) {
    requestArgs.cursor = cursor;
  }

  const eventResponse = await server.getEvents(requestArgs);

  const events = eventResponse.events.map((event: any) => {
    const value = scValToNative(event.value) as { option?: PollOptionId; voter?: string };

    return {
      id: event.id,
      option: value.option || "dex",
      voter: value.voter || "",
      ledger: Number(event.ledger),
      txHash: event.txHash,
      createdAt: new Date().toISOString()
    };
  });

  return {
    events,
    cursor: eventResponse.cursor
  };
}

export async function fetchBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`${TESTNET.horizonUrl}/accounts/${address}`);
    if (!res.ok) return "0.00";
    const data = await res.json();
    const nativeBal = data.balances?.find((b: any) => b.asset_type === "native");
    return nativeBal ? nativeBal.balance : "0.00";
  } catch (e) {
    return "0.00";
  }
}
