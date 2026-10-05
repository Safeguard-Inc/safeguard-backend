import { createApp } from './app.js';

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`[Safeguard Backend] Service running on http://localhost:${PORT}`);
  console.log(`[Safeguard Backend] Health endpoint: http://localhost:${PORT}/health`);
});
