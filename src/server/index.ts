import { createApp } from './app.js';
import { serverConfig } from './config.js';
import { defaultIndexer } from './indexer.js';

const app = createApp();

app.listen(serverConfig.PORT, () => {
  console.log(`[Safeguard Backend] Service running on http://localhost:${serverConfig.PORT}`);
  console.log(`[Safeguard Backend] Health endpoint: http://localhost:${serverConfig.PORT}/health`);
  console.log(`[Safeguard Backend] API Docs: http://localhost:${serverConfig.PORT}/docs`);

  if (serverConfig.NODE_ENV !== 'test') {
    defaultIndexer.start(30_000);
    console.log('[Safeguard Indexer] Background event indexing daemon active.');
  }
});
