import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { closeDatabase, databaseConfigured, getDatabase } from './db.js';
import { callNext, finishReceptionEntry, getJoinOptions, getQueueStatus, getReception, getTvDisplay, joinQueue } from './queue.js';
import { requireReception, sameOriginWrite, staffRouter } from './staff.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
if (process.env.RENDER) app.set('trust proxy', 1);
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

app.get('/api/display', async (_request, response) => {
  response.json(await getTvDisplay(getDatabase()));
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

const jsonBody = express.json({ limit: '8kb' });
app.use('/api/staff', jsonBody, staffRouter);
app.use('/api/reception', requireReception);
app.get('/api/reception', async (_request, response) => {
  response.json(await getReception(getDatabase()));
});
app.post('/api/reception/walk-ins', sameOriginWrite, jsonBody, async (request, response) => {
  const { status, body } = await joinQueue(getDatabase(), request.body, 'walk_in');
  response.status(status).json(status === 201 ? { token: body.token } : body);
});
app.post('/api/reception/barbers/:slug/call-next', sameOriginWrite, async (request, response) => {
  const { status, body } = await callNext(getDatabase(), request.params.slug);
  response.status(status).json(body);
});
app.post('/api/reception/entries/:token/:action', sameOriginWrite, async (request, response) => {
  const token = Number(request.params.token);
  const { action } = request.params;
  if (!Number.isSafeInteger(token) || token < 1 || !['cancel', 'no-show'].includes(action)) {
    return response.status(404).json({ error: 'not_found' });
  }
  const { status, body } = await finishReceptionEntry(getDatabase(), token, action);
  return response.status(status).json(body);
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
  app.get(['/', '/join', '/status/:id', '/reception', '/login', '/barber/:name', '/display', '/admin'],
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
