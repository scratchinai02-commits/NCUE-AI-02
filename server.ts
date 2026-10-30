import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { TOOLS, TOOL_SYSTEM, type ToolId } from './src/data/tools';

dotenv.config();

// ---------------------------------------------------------------------------
// 設定（皆可用環境變數覆寫）
// ---------------------------------------------------------------------------
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS) || 12000;
const MAX_CHAT_CHARS = 80000; // 工具對話（含追問、內嵌的文字檔）總字數上限
const MAX_CHAT_TURNS = 30;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 40; // 每個 IP 在時間窗內可生成次數
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000;

// 系統指令固定在伺服器端，前端只能選角色或工具，避免 API 被當成任意用途的免費代理。
const SYSTEM_INSTRUCTIONS = {
  student:
    '你是一位台灣資深師資培育輔導教授與教學卓越獲獎教師。請以 108 課綱精神與標準教育術語，針對師培生的教案、評量與試教需求，輸出結構清晰、條理分明、具體可落地的臺灣繁體中文範例。不確定的課綱代碼、法規或文獻請標註「請查證」，不可杜撰。',
  professor:
    '你是一位高等教育師資培育審查委員與教學設計專家。請站在大學師培教授的高度，提供具備理論深度（如 TPACK、UbD、Bloom、ORID）、評量規準嚴謹度與教學示範價值的臺灣繁體中文成果。不確定的課綱代碼、法規或文獻請標註「請查證」，不可杜撰。',
} as const;
type Role = keyof typeof SYSTEM_INSTRUCTIONS;

const app = express();
app.set('trust proxy', 1); // Cloud Run / 反向代理後方取得真實 IP（只信任一層，避免偽造 X-Forwarded-For 繞過限制）

// 一般 API 只收小型 JSON；工具端點需要接收檔案（base64），另外放寬
const smallJson = express.json({ limit: '100kb' });
const fileJson = express.json({ limit: '25mb' });
app.use((req: Request, res: Response, next: NextFunction) => (req.path === '/api/tool-stream' ? fileJson(req, res, next) : smallJson(req, res, next)));

// ---------------------------------------------------------------------------
// 簡易 IP 頻率限制（記憶體內，單一執行個體適用）
// ---------------------------------------------------------------------------
const hits = new Map<string, number[]>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const waitMin = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 60000);
    return res.status(429).json({
      error: `使用次數較多，請約 ${waitMin} 分鐘後再試；或點「複製」到 ChatGPT、Claude、Gemini 貼上使用。`,
    });
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  next();
}

// ---------------------------------------------------------------------------
// 共用：建立 client、錯誤訊息、串流輸出
// ---------------------------------------------------------------------------
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

const NO_KEY_MSG = '系統目前未設定 GEMINI_API_KEY。您仍可點擊「複製」，前往 ChatGPT、Claude 或 Gemini 貼上使用！';

function friendlyError(error: unknown): string {
  const rawMsg = (error as { message?: string })?.message || '';
  if (/ACCOUNT_STATE_INVALID|deleted or disabled|UNAUTHENTICATED|API key not valid|PERMISSION_DENIED/i.test(rawMsg)) {
    return '目前環境之 API 金鑰憑證尚未啟動或受限。建議點擊「複製」，直接在 ChatGPT、Claude 或 Gemini 貼上即可獲得完整成果！';
  }
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(rawMsg)) {
    return 'AI 服務今日額度已滿或請求過於頻繁，請稍後再試，或複製到外部 AI 使用。';
  }
  if (/INVALID_ARGUMENT|unsupported|mime/i.test(rawMsg)) {
    return 'AI 無法讀取這個檔案，請確認檔案沒有加密或損毀，或換成 PDF／JPG／PNG 再試。';
  }
  return 'AI 生成服務目前無法直接連線。請點擊「複製」，前往 ChatGPT、Claude 或 Google Gemini 貼上使用！';
}

type Contents = { role: 'user' | 'model'; parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] }[] | string;

async function pipeStream(res: Response, contents: Contents, systemInstruction: string, label: string) {
  const ai = getClient();
  if (!ai) return res.status(503).json({ error: NO_KEY_MSG });

  let clientGone = false;
  res.on('close', () => {
    clientGone = true;
  });

  try {
    const stream = await ai.models.generateContentStream({ model: MODEL, contents, config: { systemInstruction } });

    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    for await (const chunk of stream) {
      if (clientGone) break; // 使用者按下「停止」或關閉視窗
      const text = chunk.text;
      if (text) res.write(text);
    }
    res.end();
  } catch (error) {
    console.error(`Error in ${label}:`, error);
    if (!res.headersSent) {
      return res.status(500).json({ error: friendlyError(error) });
    }
    // 已開始串流：以標記行告知前端
    res.write(`\n\n[[STREAM_ERROR]] ${friendlyError(error)}`);
    res.end();
  }
}

function parseSkillRequest(req: Request): { prompt: string; role: Role } | { error: string; status: number } {
  const { prompt, role } = req.body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { error: '請提供提示詞 (Prompt)', status: 400 };
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `提示詞過長（上限 ${MAX_PROMPT_CHARS} 字），請精簡附加素材後再試。`, status: 413 };
  }
  return { prompt, role: role === 'professor' ? 'professor' : 'student' };
}

// ---------------------------------------------------------------------------
// API：技能一次性生成（保留相容）
// ---------------------------------------------------------------------------
app.post('/api/generate', rateLimit, async (req, res) => {
  const parsed = parseSkillRequest(req);
  if ('error' in parsed) return res.status(parsed.status).json({ error: parsed.error });

  const ai = getClient();
  if (!ai) return res.status(503).json({ error: NO_KEY_MSG });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: parsed.prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTIONS[parsed.role] },
    });
    return res.json({ text: response.text || '' });
  } catch (error) {
    console.error('Error in /api/generate:', error);
    return res.status(500).json({ error: friendlyError(error) });
  }
});

// ---------------------------------------------------------------------------
// API：技能串流生成（前端逐字顯示，使用者可中途停止）
// ---------------------------------------------------------------------------
app.post('/api/generate-stream', rateLimit, async (req, res) => {
  const parsed = parseSkillRequest(req);
  if ('error' in parsed) return res.status(parsed.status).json({ error: parsed.error });
  return pipeStream(res, parsed.prompt, SYSTEM_INSTRUCTIONS[parsed.role], '/api/generate-stream');
});

// ---------------------------------------------------------------------------
// API：AI 工具箱（可附檔、可追問）
// body: { tool, messages: [{role:'user'|'model', text}], file?: {name, mimeType, data(base64)} }
// ---------------------------------------------------------------------------
app.post('/api/tool-stream', rateLimit, async (req, res) => {
  const { tool, messages, file } = req.body ?? {};
  const def = TOOLS.find((t) => t.id === tool);
  if (!def) return res.status(400).json({ error: '未知的工具。' });

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_CHAT_TURNS) {
    return res.status(400).json({ error: '對話內容不正確，請重新開始。' });
  }
  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string' || !m.text.trim()) {
      return res.status(400).json({ error: '對話內容不正確，請重新開始。' });
    }
    total += m.text.length;
  }
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: '對話內容不正確，請重新開始。' });
  }
  if (total > MAX_CHAT_CHARS) {
    return res.status(413).json({ error: '對話太長了，請按「清除重來」開始新的對話。' });
  }

  let filePart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (file) {
    if (!def.file) return res.status(400).json({ error: '這個工具不需要上傳檔案。' });
    const { mimeType, data } = file;
    if (typeof mimeType !== 'string' || !def.file.mimes.includes(mimeType)) {
      return res.status(415).json({ error: `不支援這個檔案類型，請上傳：${def.file.hint}` });
    }
    if (typeof data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 1000))) {
      return res.status(400).json({ error: '檔案內容不正確，請重新上傳。' });
    }
    if ((data.length * 3) / 4 > def.file.maxMB * 1024 * 1024) {
      return res.status(413).json({ error: `檔案太大（上限 ${def.file.maxMB} MB）。` });
    }
    filePart = { inlineData: { mimeType, data } };
  } else if (def.file?.required) {
    return res.status(400).json({ error: `請先${def.file.label}。` });
  }

  const contents: Contents = messages.map((m: { role: 'user' | 'model'; text: string }, i: number) => ({
    role: m.role,
    parts: i === 0 && filePart ? [filePart, { text: m.text }] : [{ text: m.text }],
  }));

  return pipeStream(res, contents, TOOL_SYSTEM[def.id as ToolId], '/api/tool-stream');
});

// Health check：前端據此決定是否顯示「即時 AI 生成」
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL,
  });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (model: ${MODEL})`);
  });
}

startServer();
