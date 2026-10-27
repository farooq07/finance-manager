// jest-expo swaps in Expo's web-streams polyfill; axios probes streams when it
// loads and that polyfill throws ("Cannot cancel a stream that already has a
// reader"). Tests run in Node, so use Node's own implementation.
const webStreams = require('stream/web');
globalThis.ReadableStream = webStreams.ReadableStream;
globalThis.WritableStream = webStreams.WritableStream;
globalThis.TransformStream = webStreams.TransformStream;

// In-memory SecureStore so tests never touch the device keychain.
jest.mock('expo-secure-store', () => {
    const store = new Map();
    return {
        __store: store,
        getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItemAsync: jest.fn(async (key, value) => { store.set(key, value); }),
        deleteItemAsync: jest.fn(async (key) => { store.delete(key); }),
    };
});
