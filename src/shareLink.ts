export const WORKER_BASE = 'https://koda-worker.akram82.workers.dev';

export function getShareUrl(id: string) {
  // هذا يبني رابط Pages + hash route
  return `https://hoglandet-teknik.github.io/KD/#/s/${encodeURIComponent(id)}`;
}

export function parseShareIdFromHash(hash: string): string | null {
  // أمثلة:
  // "#/s/abc" -> "abc"
  // "#/s/abc?x=1" -> "abc"
  const h = (hash || '').trim();
  const prefix = '#/s/';
  if (!h.startsWith(prefix)) return null;

  const rest = h.slice(prefix.length);
  const id = rest.split('?')[0].split('&')[0].trim();
  return id ? decodeURIComponent(id) : null;
}