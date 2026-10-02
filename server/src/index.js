import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initSocketServer } from './socketServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Resolve the client build path — works both locally and on Render
const clientBuildPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
console.log(`[Server] Looking for client build at: ${clientBuildPath}`);
console.log(`[Server] Client build exists: ${fs.existsSync(clientBuildPath)}`);

if (fs.existsSync(clientBuildPath)) {
  // Serve static frontend files
  app.use(express.static(clientBuildPath));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clientBuildPath,
    clientBuildExists: fs.existsSync(clientBuildPath),
  });
});

// SPA fallback – serve index.html for all non-API, non-socket routes
app.get('*', (_req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send(
      `Client build not found at: ${clientBuildPath}\n` +
      `Looked for: ${indexPath}\n` +
      `__dirname: ${__dirname}\n` +
      `cwd: ${process.cwd()}`
    );
  }
});

const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🎬 Watch Party server running on http://localhost:${PORT}`);
});
