import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { closeDatabase, databaseConfigured, getDatabase } from './db.js';
import { getJoinOptions, getQueueStatus, joinQueue } from './queue.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/ready', async (_request, response) => {
  if (!databaseConfigured) {
    return response.status(503).json({ status: 'unavailable' });
  }

  try {
    await getDatabase().command({ ping: 1 });
    return response.json({ status: 'ok' });
  } catch {
    return response.status(503).json({ status: 'unavailable' });
  }
});

app.get('/api/join', async (_request, response) => {
  response.json(await getJoinOptions(getDatabase()));
});

app.post('/api/join', express.json({ limit: '8kb' }), async (request, response) => {
  const result = await joinQueue(getDatabase(), request.body);
  response.status(result.status).json(result.body);
});

app.get('/api/status/:id', async (request, response) => {
  const status = await getQueueStatus(getDatabase(), request.params.id);
  if (!status) return response.status(404).json({ error: 'statusMissing' });
  return response.json(status);
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'not_found' });
});

app.use('/api', (error, _request, response, _next) => {
  if (error.status === 400 || error.status === 413) {
    return response.status(error.status).json({ error: 'invalidRequest' });
  }
  return response.status(503).json({ error: 'apiUnavailable' });
});

const staticDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const indexFile = fileURLToPath(new URL('../dist/index.html', import.meta.url));
if (existsSync(indexFile)) {
  app.use(express.static(staticDirectory));
  app.get(['/', '/join', '/status/:id', '/reception', '/barber/:name', '/display', '/admin'],
    (_request, response) => response.sendFile(indexFile));
}

app.use((_request, response) => {
  response.status(404).json({ error: 'not_found' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Salon API listening on port ${port}`);
});

function shutdown() {
  server.close(async () => {
    await closeDatabase();
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
