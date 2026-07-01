import { loadConfig } from './config.js';
import { createServer } from './server.js';

const config = loadConfig();
createServer(config);
console.log(`server listening on port ${config.port}`);
