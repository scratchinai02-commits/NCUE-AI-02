import type { AiStatus, Role } from '../types';

const ERROR_MARKER = '[[STREAM_ERROR]]';

/** 檢查後端是否存在且已設定金鑰；部署在純靜態主機（如 Firebase Hosting）時會回傳 unavailable。 */
export async function fetchAiStatus(): Promise<AiStatus> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch('/api/health', { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { available: false, model: '' };
    const data = await res.json();
    return { available: Boolean(data?.hasKey), model: String(data?.model || '') };
  } catch {
    return { available: false, model: '' };
  } finally {
    clearTimeout(timer);
  }
}

/** 串流生成：每收到一段文字就呼叫 onText(目前累積的全文)。 */
export async function streamGenerate(opts: {
  prompt: string;
  role: Role;
  signal: AbortSignal;
  onText: (fullText: string) => void;
}): Promise<string> {
  const res = await fetch('/api/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: opts.prompt, role: opts.role }),
    signal: opts.signal,
  });

  if (!res.ok) {
    let msg = '生成失敗，請確認網路，或複製 Prompt 至外部 AI 工具使用。';
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      if (res.status === 404) msg = '此網站目前沒有連接 AI 生成服務，請點「複製 Prompt」到外部 AI 使用。';
    }
    throw new Error(msg);
  }

  let full = '';
  if (!res.body) {
    full = await res.text();
  } else {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      const cut = full.indexOf(ERROR_MARKER);
      opts.onText(cut >= 0 ? full.slice(0, cut).trimEnd() : full);
    }
    full += decoder.decode();
  }

  const cut = full.indexOf(ERROR_MARKER);
  if (cut >= 0) {
    const partial = full.slice(0, cut).trimEnd();
    opts.onText(partial);
    const err = new Error(full.slice(cut + ERROR_MARKER.length).trim() || '生成過程中斷。');
    (err as Error & { partial?: string }).partial = partial;
    throw err;
  }
  opts.onText(full);
  return full;
}
