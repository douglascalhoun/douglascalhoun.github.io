export function corsHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...extra
  };
}

export function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(headers)
  });
}

export function handleOptions(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  return null;
}

export function readUserId(req, body = {}) {
  const header = req.headers.get('x-user-id');
  const fromBody = body.userId;
  const fromUrl = new URL(req.url).searchParams.get('userId');
  return String(header || fromBody || fromUrl || '').trim().slice(0, 120);
}
