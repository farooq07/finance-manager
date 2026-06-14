import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [],
        // Playwright specs live in e2e/ and must not be picked up by Vitest —
        // they import @playwright/test and call test.describe() at module load.
        exclude: ['node_modules', 'dist', 'e2e/**'],
    },
});
