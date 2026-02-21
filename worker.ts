interface Env {
  CODE_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/api/share') {
      if (method === 'POST') {
        try {
          const body = await request.json() as { code?: string };
          const code = body.code;

          if (!code || typeof code !== 'string' || code.trim() === '') {
            return new Response(JSON.stringify({ error: 'Invalid code' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Max size 50 KB
          if (new TextEncoder().encode(code).length > 50 * 1024) {
            return new Response(JSON.stringify({ error: 'Code too large (max 50KB)' }), {
              status: 413,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Generate short ID (8 chars)
          const id = crypto.randomUUID().substring(0, 8);

          // Store in KV (TTL 90 days)
          await env.CODE_KV.put(`code:${id}`, code, { expirationTtl: 90 * 24 * 60 * 60 });

          return new Response(JSON.stringify({ id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else if (method === 'GET') {
        const id = url.searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const code = await env.CODE_KV.get(`code:${id}`);
        if (!code) {
          return new Response(JSON.stringify({ error: 'not_found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
