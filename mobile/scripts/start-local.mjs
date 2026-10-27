// Run the app against the backend on this computer.
//
//   npm run start:local              phone on the same Wi-Fi (Expo Go / dev build)
//   npm run start:local -- --emulator  Android emulator (10.0.2.2 = this computer)
//
// The phone reaches the backend through this computer's Wi-Fi address, so
// the backend must be running (backend: npm run db:local + npm run dev:localdb)
// and Windows may ask once to allow Node through the firewall.
import { spawn } from 'node:child_process';
import os from 'node:os';

const PORT = 5000;
const emulator = process.argv.includes('--emulator');

function lanAddress() {
    const candidates = Object.values(os.networkInterfaces()).flat()
        .filter((i) => i && i.family === 'IPv4' && !i.internal)
        .map((i) => i.address);
    return candidates.find((a) => a.startsWith('192.168.')) || candidates.find((a) => a.startsWith('10.')) || candidates[0];
}

const host = emulator ? '10.0.2.2' : lanAddress();
if (!host) {
    console.error('No network address found — connect to Wi-Fi, or use --emulator.');
    process.exit(1);
}
const apiUrl = `http://${host}:${PORT}/api`;
console.log(`[start-local] API: ${apiUrl}`);

const child = spawn('npx', ['expo', 'start', ...(emulator ? ['--android'] : [])], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl },
});
child.on('exit', (code) => process.exit(code ?? 0));
