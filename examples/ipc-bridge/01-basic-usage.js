const { IpcBridge, IpcHandler } = require('../../dist/index.js'); // Assuming built files are in dist

// Mocking the API object that might be exposed to handlers
const mockApi = {
    log: (msg) => console.log(`[API Log]: ${msg}`)
};

// 1. Create the Bridge
const bridge = new IpcBridge();
bridge.addApi('logger', mockApi);

// 2. Define Handlers
const echoHandler = new IpcHandler('echo-service', 'echo', (api, data) => {
    api.logger.log('Echo handler called');
    return `Echo: ${data.message}`;
});

const mathHandler = new IpcHandler('math-service', 'add', (api, data) => {
    api.logger.log(`Adding ${data.a} + ${data.b}`);
    return data.a + data.b;
});

// 3. Register Handlers
bridge.addHandler(echoHandler);
bridge.addHandlers([mathHandler]);

// 4. Simulate IPC Calls
console.log('--- Testing Echo Handler ---');
const echoResult = bridge.handle({ name: 'echo-service', message: 'Hello IPC!' });
console.log('Result:', echoResult);

console.log('\n--- Testing Math Handler ---');
const mathResult = bridge.handle({ name: 'math-service', a: 5, b: 3 });
console.log('Result:', mathResult);

console.log('\n--- Testing Unknown Handler ---');
const unknownResult = bridge.handle({ name: 'unknown-service' });
console.log('Result:', unknownResult);
