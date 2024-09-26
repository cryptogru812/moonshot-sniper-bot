import {
  Blockhash,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import promptSync from 'prompt-sync';
import { connection, LP_wallet_keypair } from "./config";
import { loadKeypairs } from "./createKeys";
import { sendBundle } from "./utils/sendBundle";

const prompt = promptSync();

async function generateSOLTransferForKeypairs(SendAmt: number, steps: number = 5): Promise<TransactionInstruction[]> {
  const amount = SendAmt * LAMPORTS_PER_SOL;
  const keypairs: Keypair[] = loadKeypairs(); // Load your keypairs
  const keypairSOLIxs: TransactionInstruction[] = [];


  for (let index = 0; index < 4; index += 1) {
    const keypair = keypairs[index];
    const transferIx = SystemProgram.transfer({
      fromPubkey: LP_wallet_keypair.publicKey,
      toPubkey: keypair.publicKey,
      lamports: amount,
    });
    keypairSOLIxs.push(transferIx);
    console.log(`Transfer of ${Number(amount) / LAMPORTS_PER_SOL} SOL to Wallet ${index + 1} (${keypair.publicKey.toString()}) bundled.`);
  }

  return keypairSOLIxs;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function createAndSignVersionedTx(
  instructionsChunk: TransactionInstruction[],
  blockhash: Blockhash | string,
  keypairs?: Keypair[]
): Promise<VersionedTransaction> {

  const addressesMain: PublicKey[] = [];
  instructionsChunk.forEach((ixn) => {
    ixn.keys.forEach((key) => {
      addressesMain.push(key.pubkey);
    });
  });

  const message = new TransactionMessage({
    payerKey: LP_wallet_keypair.publicKey,
    recentBlockhash: blockhash,
    instructions: instructionsChunk,
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(message);
  const serializedMsg = versionedTx.serialize();

  console.log("Txn size:", serializedMsg.length);
  if (serializedMsg.length > 1232) { console.log('tx too big'); }

  if (keypairs) {
    versionedTx.sign([LP_wallet_keypair, ...keypairs]);
  } else {
    versionedTx.sign([LP_wallet_keypair]);
  }

  return versionedTx;
}

async function processInstructionsSOL(blockhash: string | Blockhash, keypairSOLIxs: TransactionInstruction[]): Promise<VersionedTransaction[]> {
  const instructionChunks = chunkArray(keypairSOLIxs, 10); // Adjust the chunk size as needed
  const sendTxns: VersionedTransaction[] = [];

  for (let i = 0; i < instructionChunks.length; i++) {
    const versionedTx = await createAndSignVersionedTx(instructionChunks[i], blockhash);
    sendTxns.push(versionedTx);
  }

  return sendTxns;
}

export const distributeSOL = async () => {
  const BundledTxns: VersionedTransaction[] = [];
  const SolAmt = prompt('Sol to send (Ex. 0.005): ');

  const SendAmt = parseFloat(SolAmt ?? '0.004');

  const { blockhash } = await connection.getLatestBlockhash('finalized');

  const sendSolIxs = await generateSOLTransferForKeypairs(SendAmt);
  const sendSolTxns = await processInstructionsSOL(blockhash, sendSolIxs);

  BundledTxns.push(
    ...sendSolTxns,
  );

  let success = await sendBundle(BundledTxns) as boolean;
  console.log("bundle result " + success);
  if (success === false) {
    success = await sendBundle(BundledTxns) as boolean;
  }
  if (success === true) {
    console.log("------------- Bundle Successful ---------");
  }
}
