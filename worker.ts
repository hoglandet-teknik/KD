export interface Env {
  CODE_KV: KVNamespace;
}

function corsHeaders(origin: string | null) {
  const allowed = new Set([
    "http://localhost:3000",
    "https://hoglandet-teknik.github.io",
  ]);

  const o =
    origin && allowed.has(origin)
      ? origin
      : "https://hoglandet-teknik.github.io";

  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // =========================
    // POST /api/share
    // =========================
    if (url.pathname === "/api/share" && request.method === "POST") {
      const body = await request.json();
      const code = body?.code;

      if (!code) {
        return new Response(
          JSON.stringify({ error: "No code provided" }),
          { status: 400, headers: corsHeaders(origin) }
        );
      }

      const id = crypto.randomUUID();

      await env.CODE_KV.put(id, code, {
        expirationTtl: 120 * 24 * 60 * 60, // 4 months
      });

      return new Response(
        JSON.stringify({ id }),
        { headers: corsHeaders(origin) }
      );
    }

    // =========================
    // GET /api/share?id=...
    // =========================
    if (url.pathname === "/api/share" && request.method === "GET") {
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing id" }),
          { status: 400, headers: corsHeaders(origin) }
        );
      }

      const code = await env.CODE_KV.get(id);

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Not found" }),
          { status: 404, headers: corsHeaders(origin) }
        );
      }

      return new Response(
        JSON.stringify({ code }),
        { headers: corsHeaders(origin) }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders(origin) }
    );
  },
};