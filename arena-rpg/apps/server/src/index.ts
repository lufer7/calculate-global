import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 8787);
// Behind a reverse proxy set TRUST_PROXY=1 and make sure the proxy itself has access logs OFF.
const trustProxy = process.env.TRUST_PROXY === '1';

const app = createApp({
  clientKey: (c) =>
    (trustProxy ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ??
    getConnInfo(c).remote.address ??
    'unknown',
});

serve({ fetch: app.fetch, port }, () => {
  // Startup message only – the server never logs requests.
  console.log(`arena server listening on :${port}`);
});
