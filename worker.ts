// worker.ts (add this CORS helper + use it in your /api/share routes)

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function corsHeaders(origin: string | null) {
  // اسمح فقط لأصولك (عدّلها إذا احتجت)
  const allowed = new Set([
    "http://localhost:3000",
    "https://hoglandet-teknik.github.io",
  ]);

  const o = origin && allowed.has(origin) ? origin : "https://hoglandet-teknik.github.io";

  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const origin = request.headers.get("Origin");

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // ... منطق API حقك هنا (GET/POST)
    // وبعد ما تبني response:
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

    // ألحق CORS headers على أي رد
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(origin))) h.set(k, v);

    return new Response(res.body, { status: res.status, headers: h });
  },
};