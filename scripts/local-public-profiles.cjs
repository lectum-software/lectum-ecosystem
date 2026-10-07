const crypto = require('node:crypto');

const prefix = '/api/private/directory/psychologists';
const publicOrigin = 'https://api.lectum.com.br';
const alias = id => 'c' + crypto.createHash('sha256').update(`lectum-public-local:user:${id}`).digest('hex').slice(0, 24);
const queryKeys = new Set(['page', 'limit', 'search', 'gender', 'modality', 'specialty', 'service', 'approach', 'language', 'target_audience', 'state', 'city', 'race_color', 'religion', 'more_experienced', 'verified', 'available_today', 'social_value', 'accepts_insurance', 'discount_first_session']);

// Explicitly installed by the isolated local launcher, never by the product server.
function createPublicProfilePreview({ ownUserIds, cors, registerMedia, allowVideo, fetchPublic = fetch, env = process.env }) {
  if (env.NODE_ENV !== 'development' || env.PORT !== '3001' || !ownUserIds?.length) throw Error('Local preview only');
  const own = new Set(ownUserIds);
  const profiles = new Map();
  const readonlyIds = new Set();
  const postIds = new Set();
  const cache = new Map();
  let discovery;

  function rememberProfile(id) {
    if (!/^[a-z0-9]{8,64}$/i.test(id) || own.has(id) || own.has(alias(id))) return;
    profiles.set(alias(id), id);
    readonlyIds.add(alias(id));
    readonlyIds.add(id);
  }

  async function read(pathname, search = '') {
    const key = pathname + search;
    const existing = cache.get(key);
    if (existing && existing.until > Date.now()) return existing.value;
    // The caller cannot choose an origin, method, headers, cookies or redirects.
    const response = await fetchPublic(publicOrigin + key, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) });
    const value = { status: response.status, body: response.ok ? await response.json() : null };
    if (!response.ok) await response.body?.cancel();
    if (response.ok) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { until: Date.now() + 60000, value });
    }
    return value;
  }

  async function discover() {
    if (!discovery) discovery = (async () => {
      let page = 1;
      do {
        const result = await read(prefix, `?limit=30&page=${page}`);
        if (result.status !== 200) throw Error('Public directory unavailable');
        for (const profile of result.body.data.data) rememberProfile(profile.id);
        if (page >= result.body.data.pages) break;
      } while (++page <= 10);
    })().catch(error => { discovery = null; throw error; });
    await discovery;
  }

  function rewrite(value, key = '') {
    if (typeof value === 'string') {
      const video = value.match(/^\/api\/(?:private|public)\/video-assets\/([a-z0-9_-]{8,64})\/playback$/i);
      if (video) { allowVideo(video[1]); return value; }
      if (value.startsWith(`${publicOrigin}/public/files/`)) return registerMedia(value, Date.now() + 3600000, 'api.lectum.com.br');
      if (value.startsWith('/public/files/')) return registerMedia(publicOrigin + value, Date.now() + 3600000, 'api.lectum.com.br');
      if ((key === 'id' || key === 'author_id') && profiles.has(alias(value))) return alias(value);
      return value;
    }
    if (Array.isArray(value)) return value.map(item => rewrite(item));
    if (!value || typeof value !== 'object') return value;
    if (value.role === 'psicologo' && value.id) rememberProfile(value.id);
    if (value.id && /^[a-z0-9]{20,32}$/i.test(value.id) && !own.has(value.id)) readonlyIds.add(value.id);
    if (value.id && value.community && value.title !== undefined) postIds.add(value.id);
    const result = Object.fromEntries(Object.entries(value).map(([name, item]) => [name, rewrite(item, name)]));
    if ('whatsapp_url' in result) result.whatsapp_url = null;
    if ('whatsapp_available' in result) result.whatsapp_available = false;
    if ('favorited' in result) result.favorited = false;
    if ('followed' in result) result.followed = false;
    if ('crp' in result && 'specialties' in result) result.read_only = true;
    if (result.role === 'psicologo') result.read_only = true;
    return result;
  }

  function send(response, status, body, head = false) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(head ? undefined : JSON.stringify(body));
  }

  return async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost:3001');
    const segments = url.pathname.split('/');
    const directory = url.pathname.match(/^\/api\/private\/directory\/psychologists(?:\/([a-z0-9]{8,64})(?:\/(posts|reviews|[a-z-]+))?)?\/?$/i);
    const post = url.pathname.match(/^\/api\/private\/posts\/([a-z0-9]{8,64})(?:\/replies(?:\/[a-z0-9]{8,64}\/thread)?)?$/i);
    if (directory?.[1] && own.has(directory[1])) return false;
    const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (!directory && !(post && postIds.has(post[1])) && (isRead || !segments.some(id => readonlyIds.has(id)))) return false;
    if (!cors(request, response)) return true;
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return true; }
    if (!isRead) {
      send(response, 403, { status: 403, success: false, code: 'public_preview_read_only', error: 'Perfil público em modo somente leitura no ambiente local.' });
      return true;
    }
    try {
      let pathname;
      if (directory) {
        if (directory[2] && !['posts', 'reviews'].includes(directory[2])) {
          send(response, 404, { status: 404, success: false, error: 'Não encontrado' }); return true;
        }
        if (directory[1]) {
          await discover();
          const source = profiles.get(directory[1]);
          if (!source) return false;
          pathname = `${prefix}/${source}${directory[2] ? `/${directory[2]}` : ''}`;
        } else pathname = prefix;
      } else pathname = url.pathname;
      const query = new URLSearchParams();
      for (const [key, value] of url.searchParams) if (queryKeys.has(key) && value.length <= 200) query.append(key, value);
      const remote = await read(pathname, query.size ? `?${query}` : '');
      if (directory && !directory[1] && remote.status === 200) for (const item of remote.body.data.data) rememberProfile(item.id);
      const body = remote.body ? rewrite(remote.body) : { status: remote.status, success: false, error: 'Perfil público indisponível.' };
      send(response, remote.status, body, request.method === 'HEAD');
    } catch {
      send(response, 502, { status: 502, success: false, error: 'Não foi possível consultar o perfil público. Tente novamente.' });
    }
    return true;
  };
}

module.exports = { createPublicProfilePreview, alias };
