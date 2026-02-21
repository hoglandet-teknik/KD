import { WORKER_BASE } from './shareLink';

export type SharedPayload = {
  code: string;
  // إذا عندك لاحقاً: language, title, createdAt ... الخ
};

export async function loadSharedPayload(id: string): Promise<SharedPayload> {
  const res = await fetch(`${WORKER_BASE}/api/share/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load shared payload (${res.status}): ${text}`);
  }

  return await res.json();
}