import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Bundle as JitoBundle } from 'jito-ts/dist/sdk/block-engine/types.js';
import { SearcherClient, searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { isError } from "jito-ts/dist/sdk/block-engine/utils";
import base58 from 'bs58';
import { blockEngineUrl, connection, jito_auth_keypair, wallet_2_pay_jito_fees_keypair } from "../config";

const simulateTxBeforeSendBundle = async (transactions: VersionedTransaction[]) => {
  for (const tx of transactions) {
    // console.log("tx", tx);
    const txid = await connection.simulateTransaction(tx, { commitment: 'finalized' });
    console.log("txid", txid);
    if (txid.value.err) {
      console.log("txid err", txid.value.err);
      return false;
    }
  }
  return true;
};

const onSignatureResult = async (signature: string) => {
  console.log("OnSignature", signature);
  return new Promise((resolve, reject) => {
    let timeout = setTimeout(() => {
      console.log("transaction failed", signature);
      reject(false);
    }, 30000);
    connection.onSignature(signature, (updatedTxInfo, context) => {
      console.log("update account info", updatedTxInfo);
      clearTimeout(timeout);
      resolve(true)
    }, 'confirmed');
  });
};

const onBundleResultFromConfirmTransaction = async (signatures: string[]) => {
  for (const signature of signatures) {
    try {
      const txResult = await onSignatureResult(signature);
      console.log("txResult", txResult, signature);
      if (txResult == false) return false;
    } catch (err) {
      console.log("transaction confirmation error", err);
      return false;
    }
  }
  return true;
};

export async function sendBundle(bundledTxns: VersionedTransaction[]) {
  try {
    const searcher = searcherClient(blockEngineUrl, undefined);
    const bundle = new JitoBundle(bundledTxns, bundledTxns.length + 1)

    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const _tipAccount = (await searcher.getTipAccounts())[0];
    console.log("tip account:", _tipAccount);
    const tipAccount = new PublicKey(_tipAccount);

    let maybeBundle = bundle.addTipTx(
      wallet_2_pay_jito_fees_keypair,
      1000000,
      tipAccount,
      blockhash
    );

    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    const signatures = bundledTxns.map(element => {
      return base58.encode(element.signatures[0]);
    });
    console.log("bundle signatures", signatures)
    // const simulateResult = await simulateTxBeforeSendBundle(bundledTxns);
    // if (!simulateResult) {
    //   console.error("bundle transactions simulate error");
    //   return false;
    // }
    // console.log("bundle transaction simulate success!");

    const bundleId = await searcher.sendBundle(maybeBundle);
    console.log(`Bundle ${bundleId} sent.`);

    const res = await onBundleResultFromConfirmTransaction(signatures);
    return res;

    ///*
    // Assuming onBundleResult returns a Promise<BundleResult>
    const result = await new Promise((resolve, reject) => {
      searcher.onBundleResult(
        (result) => {
          console.log(`${result.bundleId}: ${result.accepted}`)
          if (bundleId === result.bundleId) {
            console.log('Received bundle result:', result);
            resolve(result); // Resolve the promise with the result
          }
        },
        (e: Error) => {
          console.error('Error receiving bundle result:', e);
          reject(e); // Reject the promise if there's an error
        }
      );
    });

    console.log('Result:', result);
    //*/
  } catch (error) {
    const err = error as any;
    console.error("Error sending bundle:", err.message);

    if (err?.message?.includes('Bundle Dropped, no connected leader up soon')) {
      console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
    } else {
      console.error("An unexpected error occurred:", err.message);
    }
  }
}

export const onBundleResult = (c: SearcherClient, id: string): Promise<number> => {
  let first = 0;
  let isResolved = false;

  return new Promise((resolve) => {
    // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
    setTimeout(() => {
      resolve(first);
      isResolved = true
    }, 30000);

    c.onBundleResult(


      (result) => {

        if (isResolved) return first;
        // clearTimeout(timeout); // Clear the timeout if a bundle is accepted


        const bundleId = result.bundleId;
        const isAccepted = result.accepted;
        const isRejected = result.rejected;
        if (isResolved == false && bundleId === id) {

          if (isAccepted) {
            console.log(
              "bundle accepted, ID:",
              result.bundleId,
              " Slot: ",
              result.accepted?.slot
            );
            first += 1;
            isResolved = true;
            resolve(first); // Resolve with 'first' when a bundle is accepted
          }

          if (isRejected) {
            console.log("bundle is Rejected:", result);
            // Do not resolve or reject the promise here
          }

        }

      },
      (e) => {
        console.error(e);
        // Do not reject the promise here
      }
    );
  });
};
