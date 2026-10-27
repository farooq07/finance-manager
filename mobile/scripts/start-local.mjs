// Run the app against the backend on this computer.
//
//   npm run start:local              phone on the same Wi-Fi (Expo Go / dev build)
//   npm run start:local -- --emulator  Android emulator (10.0.2.2 = this computer)
//
// The phone reaches the backend through this computer's Wi-Fi address, so
// the backend must be running (backend: npm run db:local + npm run dev:localdb)
// and Windows may ask once to allow Node through the firewall.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

// --offline: app.json names an Expo owner/projectId, so without it the CLI asks
// for an Expo login the first time a device connects — and crashes when it
// can't (a background terminal has no input). Local dev needs no account.
// Expo finds adb and the emulator through ANDROID_HOME. Android Studio installs
// the SDK in a standard place but doesn't set the variable, so fill it in —
// then --emulator also boots the emulator if it isn't running yet.
const env = { ...process.env, EXPO_PUBLIC_API_URL: apiUrl };
if (!env.ANDROID_HOME) {
    const sdk = process.platform === 'win32'
        ? path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
        : path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk');
    if (fs.existsSync(sdk)) {
        env.ANDROID_HOME = sdk;
        env.ANDROID_SDK_ROOT = sdk;
        // Windows spells it "Path"; a second "PATH" key would be ambiguous.
        const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
        env[pathKey] = [path.join(sdk, 'platform-tools'), path.join(sdk, 'emulator'), env[pathKey]].join(path.delimiter);
    }
}

const child = spawn('npx', ['expo', 'start', '--offline', ...(emulator ? ['--android'] : [])], {
    stdio: 'inherit',
    shell: true,
    env,
});
child.on('exit', (code) => process.exit(code ?? 0));
