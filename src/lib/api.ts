import type { AiStatus, Role } from '../types';
import type { ToolId } from '../data/tools';

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

/** POST 後以串流讀取文字；每收到一段就呼叫 onText(目前累積的全文)。 */
async function streamPost(url: string, body: unknown, signal: AbortSignal, onText: (fullText: string) => void): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let msg = '生成失敗，請確認網路，或複製到外部 AI 工具使用。';
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      if (res.status === 404) msg = '此網站目前沒有連接 AI 生成服務，請點「複製」到外部 AI 使用。';
      if (res.status === 413) msg = '內容或檔案太大，請縮小後再試。';
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
      onText(cut >= 0 ? full.slice(0, cut).trimEnd() : full);
    }
    full += decoder.decode();
  }

  const cut = full.indexOf(ERROR_MARKER);
  if (cut >= 0) {
    const partial = full.slice(0, cut).trimEnd();
    onText(partial);
    throw new Error(full.slice(cut + ERROR_MARKER.length).trim() || '生成過程中斷。');
  }
  onText(full);
  return full;
}

/** 技能：串流生成 */
export function streamGenerate(opts: { prompt: string; role: Role; signal: AbortSignal; onText: (fullText: string) => void }) {
  return streamPost('/api/generate-stream', { prompt: opts.prompt, role: opts.role }, opts.signal, opts.onText);
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  /** base64（不含 data: 前綴） */
  data: string;
}

/** AI 工具箱：串流生成（可附檔、可追問） */
export function streamTool(opts: {
  tool: ToolId;
  messages: ChatMessage[];
  file: UploadedFile | null;
  signal: AbortSignal;
  onText: (fullText: string) => void;
}) {
  const file = opts.file ? { name: opts.file.name, mimeType: opts.file.mimeType, data: opts.file.data } : undefined;
  return streamPost('/api/tool-stream', { tool: opts.tool, messages: opts.messages, file }, opts.signal, opts.onText);
}
