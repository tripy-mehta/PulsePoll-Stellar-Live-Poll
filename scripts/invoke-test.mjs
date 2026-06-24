import { Keypair, rpc, Networks, TransactionBuilder, BASE_FEE, Contract, nativeToScVal } from '@stellar/stellar-sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

const secret = process.env.DEPLOYER_SECRET_KEY;
if (!secret) throw new Error('Missing secret');

const keypair = Keypair.fromSecret(secret);
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const contract = new Contract('CAT4BOL7HQQ7C37C7H3UEPBNSMPTVD65XBTKWOXGHG76YDL3RHVCI56M');

async function main() {
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call('vote', nativeToScVal(keypair.publicKey(), { type: 'address' }), nativeToScVal('dex', { type: 'symbol' })))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  const sent = await server.sendTransaction(prepared);
  console.log(sent.hash);
}

main().catch(console.error);
