import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork
} from "@creit.tech/stellar-wallets-kit";
import { TESTNET } from "../config";
import type { WalletInfo } from "../types";
import { fetchBalance } from "./stellar";

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

  return new Promise((resolve, reject) => {
    walletKit.openModal({
      modalTitle: "Connect a Stellar wallet",
      notAvailableText: "Install this wallet to use it on Stellar testnet.",
      onWalletSelected: async (option: any) => {
        try {
          walletKit.setWallet(option.id);
          const { address } = await walletKit.getAddress();
          const balance = await fetchBalance(address);
          resolve({
            address,
            name: option.name || "Stellar wallet",
            balance
          });
        } catch (e) {
          reject(e);
        }
      },
      onClosed: (err: any) => {
        reject(err || new Error("Modal closed"));
      }
    });
  });
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
