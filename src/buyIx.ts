import { Environment, FixedSide, Moonshot } from '@wen-moon-ser/moonshot-sdk';
import {
  ComputeBudgetProgram,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import testWallet from '../test-wallet.json';
import { connection, rpc } from './config';
import { loadKeypairs } from './createKeys';
import { sendBundle } from './utils/sendBundle';

export const buyIx = async (mintAddress: string): Promise<void> => {
  console.log('--- Buying token ---');

  const moonshot = new Moonshot({
    rpcUrl: rpc,
    environment: Environment.DEVNET,
    chainOptions: {
      solana: { confirmOptions: { commitment: 'confirmed' } },
    },
  });

  const token = moonshot.Token({
    mintAddress,
  });

  const curvePos = await token.getCurvePosition();
  console.log('Current position of the curve: ', curvePos); // Prints the current curve position

  const bundleTransaction: VersionedTransaction[] = [];

  // make sure creator has funds
  const keypairs = loadKeypairs();

  for (let i = 0; i < 4; i++) {
    const creator = keypairs[i];

    console.log('Creator: ', creator.publicKey.toBase58());

    const tokenAmount = 10000n * 1000000000n; // Buy 10k tokens

    // Buy example
    const collateralAmount = await token.getCollateralAmountByTokens({
      tokenAmount,
      tradeDirection: 'BUY',
    });

    const { ixs } = await token.prepareIxs({
      slippageBps: 500,
      creatorPK: creator.publicKey.toBase58(),
      tokenAmount,
      collateralAmount,
      tradeDirection: 'BUY',
      fixedSide: FixedSide.OUT, // This means you will get exactly the token amount and slippage is applied to collateral amount
    });

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 200_000,
    });

    const { blockhash } = await connection.getLatestBlockhash('finalized');
    const messageV0 = new TransactionMessage({
      payerKey: creator.publicKey,
      recentBlockhash: blockhash,
      instructions: [priorityIx, ...ixs],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    transaction.sign([creator]);
    bundleTransaction.push(transaction);
  }

  let success = await sendBundle(bundleTransaction) as boolean;
  console.log("bundle result " + success);
  if (success === false) {
    success = await sendBundle(bundleTransaction) as boolean;
  }
  if (success === true) {
    console.log("------------- Bundle Successful ---------");
  }

  // const txHash = await connection.sendTransaction(transaction, {
  //   skipPreflight: false,
  //   maxRetries: 0,
  //   preflightCommitment: 'confirmed',
  // });

  // console.log('Buy Transaction Hash:', txHash);
};
