import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import promptSync from 'prompt-sync';
import path from 'path';
import bs58 from 'bs58';

const prompt = promptSync();

const keypairsDir = path.join(__dirname, 'keypairs');

interface IPoolInfo {
  [key: string]: any;
  numOfWallets?: number;
}

// Ensure the keypairs directory exists
if (!fs.existsSync(keypairsDir)) {
  fs.mkdirSync(keypairsDir, { recursive: true });
}

function generateWallets(numOfWallets: number): Keypair[] {
  let wallets: Keypair[] = [];
  for (let i = 0; i < numOfWallets; i++) {
    const wallet = Keypair.generate();
    wallets.push(wallet);
  }
  return wallets;
}

function saveKeypairToFile(keypair: Keypair, index: number) {
  const keypairPath = path.join(keypairsDir, `keypair${index + 1}.json`);
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
}

function readKeypairs(): Keypair[] {
  const files = fs.readdirSync(keypairsDir);
  return files.map(file => {
    const filePath = path.join(keypairsDir, file);
    const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  });
}

export async function createKeypairs() {
  console.log('WARNING: If you create new ones, ensure you don\'t have SOL, OR ELSE IT WILL BE GONE.');
  const action = prompt('Do you want to (c)reate new wallets or (u)se existing ones? (c/u): ');
  let wallets: Keypair[] = [];

  if (action === 'c') {
    const numOfWallets = 50; // Hardcode 50 buyer keypairs here.
    if (isNaN(numOfWallets) || numOfWallets <= 0) {
      console.log('Invalid number. Please enter a positive integer.');
      return;
    }

    wallets = generateWallets(numOfWallets);
    wallets.forEach((wallet, index) => {
      saveKeypairToFile(wallet, index);
      console.log(`Wallet ${index + 1} Public Key: ${wallet.publicKey.toString()}`);
    });
  } else if (action === 'u') {
    wallets = readKeypairs();
    wallets.forEach((wallet, index) => {
      console.log(`Read Wallet ${index + 1} Public Key: ${wallet.publicKey.toString()}`);
      console.log(`Read Wallet ${index + 1} Private Key: ${bs58.encode(wallet.secretKey)}\n`);
    });
  } else {
    console.log('Invalid option. Please enter "c" for create or "u" for use existing.');
    return;
  }

  console.log(`${wallets.length} wallets have been processed.`);
}

export function loadKeypairs(): Keypair[] {
  // Define a regular expression to match filenames like 'keypair1.json', 'keypair2.json', etc.
  const keypairRegex = /^keypair\d+\.json$/;

  return fs.readdirSync(keypairsDir)
    .filter(file => keypairRegex.test(file)) // Use the regex to test each filename
    .map(file => {
      const filePath = path.join(keypairsDir, file);
      const secretKeyString = fs.readFileSync(filePath, { encoding: 'utf8' });
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      return Keypair.fromSecretKey(secretKey);
    });
}

export async function printKeys() {
  const keypairs = loadKeypairs();

  let output = '';

  output += '\n'; // Add a blank line between senders and keypairs

  keypairs.forEach(keypair => {
    output += `${bs58.encode(keypair.secretKey)}\n`;
  });

  // Write the output to a .txt file
  fs.writeFileSync('keys.txt', output);
  console.log('Keys written to keys.txt');
}
