import { Keypair, PublicKey } from "@solana/web3.js";
import { connection, swap_wallet_keypair } from "./config";
import { loadKeypairs } from "./createKeys";
import { initializeLookupTable } from "./utils/initializeLookupTable";
import { sendBundle } from "./utils/sendBundle";
import { lookupTableProvider } from "./utils/LookupTableProvider";

export async function createLookupTable() {
  console.log("------------- Creating Lookup Table -------------")

  const keypairs: Keypair[] = loadKeypairs()
  const keypairPublicKeys: PublicKey[] = keypairs.map(keypair => keypair.publicKey)
  const { txsSigned, lookupTableAddress } = await initializeLookupTable(swap_wallet_keypair, connection, [...keypairPublicKeys])

  for (let i = 0; i < txsSigned.length; i += 4) {
    await sendBundle(txsSigned.slice(i, i + 4));
  }

  lookupTableProvider.getLookupTable(
    // custom lookup tables
    new PublicKey(lookupTableAddress),
  );
}
