import { createHandler, readConfig } from './livekit.mjs';
import { readElevenLabsConfig } from './elevenlabs.mjs';

// Cloud demo: conversation access only. Never mount a local vault or start its sync.
export function createVercelDemo(env = process.env, options = {}) {
  const origins = new Set();
  for (const value of [env.APP_ORIGIN, ...[env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`)]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && value === url.origin) origins.add(value);
    } catch { /* Invalid configuration must not authorize an origin. */ }
  }
  const handlers = new Map([...origins].map(origin => [origin, createHandler(
    // Public demo starts without a code; an explicit false restores the gate.
    readConfig({ ...env, APP_ORIGIN: origin, AGENT_OPEN_ACCESS: env.AGENT_OPEN_ACCESS ?? 'true' }),
    { agentConfig: readElevenLabsConfig(env), tutorConfig: readElevenLabsConfig(env, 'intern'), ...options },
  )]));
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(body));
  };
  return async (req, res) => {
    let path = (req.url || '').split('?')[0];
    if (path === '/api/demo') {
      const route = req.query?.route ?? new URL(req.url, 'https://internal.invalid').searchParams.get('route');
      if (typeof route !== 'string') return json(res, 404, { error: 'not_found' });
      path = '/api/' + route;
      req.url = path;
    }
    if (path === '/api/vault/status' && req.method === 'GET')
      return json(res, 200, { configured: false, canImport: false });
    if (path.startsWith('/api/vault/'))
      return json(res, 503, { error: 'vault_disabled' });
    if (!/^\/api\/elevenlabs\/(?:tutor\/)?(?:status|availability|session)$/.test(path))
      return json(res, 404, { error: 'not_found' });
    if (!handlers.size) return json(res, 503, { error: 'origin_not_configured' });
    const origin = req.headers.origin;
    if ((origin && !handlers.has(origin)) || req.headers['sec-fetch-site'] === 'cross-site')
      return json(res, 403, { error: 'origin_not_allowed' });
    // GET status requests can omit Origin; session POSTs must match an allowed one.
    const handler = handlers.get(origin) || handlers.values().next().value;
    return handler(req, res);
  };
}
