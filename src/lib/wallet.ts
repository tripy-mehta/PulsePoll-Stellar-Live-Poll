import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork
} from "@creit.tech/stellar-wallets-kit";
import { TESTNET } from "../config";
import type { WalletInfo } from "../types";

let kit: StellarWalletsKit | undefined;

export function getWalletKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules()
    });
  }

  return kit;
}

export async function connectWallet(): Promise<WalletInfo> {
  const walletKit = getWalletKit();

  await walletKit.openModal({
    modalTitle: "Connect a Stellar wallet",
    notAvailableText: "Install this wallet to use it on Stellar testnet."
  });

  const { address } = await walletKit.getAddress();
  const selected = walletKit.getSelectedWallet();

  return {
    address,
    name: selected?.name || "Stellar wallet"
  };
}

export async function signTransactionXdr(xdr: string, address: string): Promise<string> {
  const response = await getWalletKit().signTransaction(xdr, {
    address,
    networkPassphrase: TESTNET.networkPassphrase
  });

  if (typeof response === "string") {
    return response;
  }

  return response.signedTxXdr;
}
