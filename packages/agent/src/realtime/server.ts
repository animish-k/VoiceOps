import { config as loadEnv } from 'dotenv';
import http from 'node:http';
import { loadVoiceOpsConfig } from '../config.js';
import { issueBrowserVoiceToken } from './token.js';
loadEnv({ path: '../../.env' });

export interface TokenServerOptions {
  port?: number;
  host?: string;
}

export function createTokenServer(options: TokenServerOptions = {}): http.Server {
  const port = options.port ?? parseInt(process.env.PORT || '3001', 10);
  const host = options.host ?? '0.0.0.0';

  const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && (url.pathname === '/api/livekit/token' || url.pathname === '/token')) {
      try {
        const config = loadVoiceOpsConfig();
        const room = url.searchParams.get('room') || 'voiceops-ops-room';
        const identity = url.searchParams.get('identity') || `analyst-${Math.random().toString(36).slice(2, 8)}`;
        const tokenData = await issueBrowserVoiceToken(config, room, identity);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tokenData));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return server;
}

export function startTokenServer(port = 3001): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = createTokenServer({ port });
    server.listen(port, () => {
      console.log(`[VoiceOps Token Server] Listening on http://localhost:${port}/api/livekit/token`);
      resolve(server);
    });
  });
}

