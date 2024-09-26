import { connection, MoonshotAccount } from "./config"
import { buyIx } from "./buyIx"

export const monitorMoonshot = async () => {
  const subscription = connection.onLogs(
    MoonshotAccount,
    async logs => {
      if (!logs.err && logs.signature) {
        sniper(logs.signature)
      }
    }
  )
  console.log(subscription);
}

export const sniper = async (signature: string) => {
  const transaction = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) return;

  const { meta } = transaction;
  if (meta?.err) return;

  const accounts = transaction.transaction.message.getAccountKeys().staticAccountKeys;

  const mintAddress = accounts[1].toBase58();
  console.log(mintAddress);
  await buyIx(mintAddress);
}

monitorMoonshot().catch((err) => {
  console.error('Error: ', err)
  process.exit(1)
})