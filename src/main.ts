import promptSync from 'prompt-sync'
import { createKeypairs } from './createKeys'
import { createLookupTable } from './createLookupTable'
import { exec } from 'child_process'
import { distributeSOL } from './distribute'

const prompt = promptSync()

async function main() {
  let running = true

  while (running) {
    console.log('\nMenu')
    console.log('1. Create 50 Keypairs')
    console.log('2. Create Lookup Table')
    console.log('3. Distribute Funds')
    console.log('4. Sniper moonshot')
    console.log('Type "exit" to quit.')

    // Use prompt-sync for user input
    const answer = prompt('Choose an option or "exit": ')

    switch (answer) {
      case '1':
        await createKeypairs()
        break
      case '2':
        await createLookupTable()
        break
      case '3':
        await distributeSOL()
        break
      case '4':
        openNewTerminal('ts-node ./src/sniper.ts')
        break
      case 'exit':
        running = false
        break
      default:
        console.log('Invalid option, please choose again.')
    }
  }

  console.log('Exiting...')
  process.exit(0)
}

function openNewTerminal(command: string) {
  const platform = process.platform;
  let terminalCommand: string;

  if (platform === 'win32') {
    terminalCommand = `start cmd.exe /K ${command}`;
  } else if (platform === 'darwin') {
    terminalCommand = `osascript -e 'tell application "Terminal" to do script "${command}"'`;
  } else if (platform === 'linux') {
    terminalCommand = `gnome-terminal -- bash -c "${command}; exec bash"`;
  } else {
    console.error('Unsupported platform:', platform);
    return;
  }

  exec(terminalCommand, (err, stdout, stderr) => {
    if (err) {
      console.error('Error opening terminal:', err);
      return;
    }
    if (stdout) console.log('stdout:', stdout);
    if (stderr) console.error('stderr:', stderr);
  });
}

main().catch((err) => {
  console.error('Error: ', err)
  process.exit(1)
})
