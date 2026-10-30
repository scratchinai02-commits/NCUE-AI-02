import React, { useEffect, useRef, useState } from 'react';
import type { AiStatus } from '../types';
import { buildToolPrompt, defaultOptions, summarizeToolInput, validateToolInput, type ToolDef } from '../data/tools';
import { streamTool, type ChatMessage, type UploadedFile } from '../lib/api';
import { copyRich, copyText, downloadFile, safeFilename } from '../lib/utils';
import { markdownToDocx } from '../lib/docx';
import { useDialog } from '../lib/useDialog';
import { Markdown } from './Markdown';
import { ToolIcon } from './ToolCard';
import { X, Upload, Copy, Check, FileText, Square, Send, RotateCcw, Info, Lock, Loader2, ExternalLink, TriangleAlert } from 'lucide-react';

export interface ToolMessage extends ChatMessage {
  /** 對話紀錄中顯示的文字（第一則是完整指令，顯示精簡版） */
  display?: string;
}

export interface ToolDraft {
  messages?: ToolMessage[];
  file?: UploadedFile | null;
  text?: string;
  options?: Record<string, string>;
}

interface ToolModalProps {
  tool: ToolDef;
  aiStatus: AiStatus | null;
  draft: ToolDraft;
  onSaveDraft: (id: string, draft: ToolDraft) => void;
  onClose: () => void;
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  txt: 'text/plain',
};

function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm bg-white focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none';

export const ToolModal: React.FC<ToolModalProps> = ({ tool, aiStatus, draft, onSaveDraft, onClose }) => {
  const dialogRef = useDialog<HTMLDivElement>(true, onClose);
  const rightColRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<UploadedFile | null>(draft.file ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [text, setText] = useState(draft.text ?? '');
  const [options, setOptions] = useState<Record<string, string>>({ ...defaultOptions(tool), ...draft.options });
  const [messages, setMessages] = useState<ToolMessage[]>(draft.messages ?? []);
  const [streaming, setStreaming] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const latest = useRef<ToolDraft>({});
  latest.current = { messages, file, text, options };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      onSaveDraft(tool.id, { ...latest.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id]);

  // 生成中自動捲到最新內容（使用者往上捲時不打擾）
  const nearBottom = useRef(true);
  useEffect(() => {
    const el = rightColRef.current;
    if (el && nearBottom.current && window.matchMedia('(min-width: 1024px)').matches) el.scrollTop = el.scrollHeight;
  }, [streaming, messages.length]);

  const canGenerate = Boolean(aiStatus?.available);
  const input = { text, options, fileName: file?.name };
  const firstPrompt = buildToolPrompt(tool.id, input);

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2500);
  };

  // ---------------------------------------------------------------------------
  // 檔案
  // ---------------------------------------------------------------------------
  const acceptFile = async (f: File | undefined) => {
    if (!f || !tool.file) return;
    setFileError(null);
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = f.type && tool.file.mimes.includes(f.type) ? f.type : EXT_MIME[ext];
    if (!mimeType || !tool.file.mimes.includes(mimeType)) {
      setFileError(`不支援這個檔案類型。請上傳：${tool.file.hint}`);
      return;
    }
    if (f.size > tool.file.maxMB * 1024 * 1024) {
      setFileError(`檔案 ${fmtSize(f.size)}，超過上限 ${tool.file.maxMB} MB。`);
      return;
    }
    try {
      const data = await readFileBase64(f);
      setFile({ name: f.name, mimeType, size: f.size, data });
      setFormError(null);
    } catch {
      setFileError('讀取檔案失敗，請再試一次。');
    }
  };

  // ---------------------------------------------------------------------------
  // 生成
  // ---------------------------------------------------------------------------
  const send = async (msgs: ToolMessage[]) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMessages(msgs);
    setStreaming('');
    setError(null);
    setIsGenerating(true);
    nearBottom.current = true;
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => rightColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    let partial = '';
    try {
      const full = await streamTool({
        tool: tool.id,
        messages: msgs.map(({ role, text: t }) => ({ role, text: t })),
        file,
        signal: ctrl.signal,
        onText: (t) => {
          partial = t;
          setStreaming(t);
        },
      });
      setMessages([...msgs, { role: 'model', text: full }]);
    } catch (err) {
      if (partial.trim()) setMessages([...msgs, { role: 'model', text: partial + (ctrl.signal.aborted ? '\n\n（已停止生成）' : '') }]);
      if (!ctrl.signal.aborted) setError((err as Error).message || '生成失敗，請稍後再試。');
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setStreaming('');
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    if (isGenerating) {
      abortRef.current?.abort();
      return;
    }
    const problem = validateToolInput(tool, input);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    send([{ role: 'user', text: firstPrompt, display: summarizeToolInput(tool, input) }]);
  };

  const handleFollowUp = (q = followUp) => {
    const t = q.trim();
    if (!t || isGenerating) return;
    setFollowUp('');
    send([...messages, { role: 'user', text: t }]);
  };

  const handleRetry = () => {
    if (messages.length && messages[messages.length - 1].role === 'user') send(messages);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStreaming('');
  };

  const handleCopyPrompt = async () => {
    if (await copyText(firstPrompt)) flash('prompt');
  };

  const outputHtml = (idx: number) =>
    document.querySelector(`[data-msg="${tool.id}-${idx}"] .md-body`)?.innerHTML ?? '';

  const baseName = `NCUE_AI_${safeFilename(tool.title)}`;
  const answerNo = (idx: number) => messages.slice(0, idx + 1).filter((m) => m.role === 'model').length;
  const hasConversation = messages.length > 0;
  const lastIsUser = hasConversation && messages[messages.length - 1].role === 'user';

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  const startButton = (compact = false) =>
    canGenerate ? (
      <button
        type="button"
        onClick={handleStart}
        className={`${
          isGenerating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
          compact ? 'flex-1' : 'w-full'
        }`}
      >
        {isGenerating ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            停止生成
          </>
        ) : (
          <>
            <ToolIcon id={tool.id} className="w-4 h-4" />
            {hasConversation ? `${tool.runLabel}（新對話）` : tool.runLabel}
          </>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={handleCopyPrompt}
        className={`text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap ${
          copied === 'prompt' ? 'bg-emerald-600 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'
        } ${compact ? 'flex-1' : 'w-full'}`}
      >
        {copied === 'prompt' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
        {copied === 'prompt' ? '已複製指令！' : '複製指令'}
      </button>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-modal-title"
        tabIndex={-1}
        className="bg-white w-full max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col h-dvh sm:h-[92dvh] relative overflow-hidden sm:border border-slate-200 outline-none"
      >
        {/* Top bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center" aria-hidden="true">
              <ToolIcon id={tool.id} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="tool-modal-title" className="text-base sm:text-xl font-bold text-slate-900 truncate">
                {tool.title}
              </h2>
              <p className="text-xs text-slate-500 truncate">{tool.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="關閉"
            className="shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors rounded-xl w-9 h-9 flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-row">
          {/* Left: 設定 */}
          <div className="w-full lg:w-5/12 lg:border-r border-slate-200 p-4 sm:p-6 lg:overflow-y-auto bg-slate-50/60 flex flex-col gap-4">
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">{tool.desc}</p>

            {tool.file && (
              <section className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-800 mb-2">
                  {tool.file.label}
                  {tool.file.required && <span className="text-rose-500"> *</span>}
                </p>
                {file ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
                    <FileText className="w-5 h-5 text-teal-700 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{fmtSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="移除檔案"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      acceptFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`w-full rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center gap-1.5 transition-colors ${
                      dragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-500 hover:bg-teal-50/40'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-teal-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-800">點此選擇檔案，或拖曳到這裡</span>
                    <span className="text-xs text-slate-500">{tool.file.hint}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={tool.file.accept}
                  className="hidden"
                  onChange={(e) => {
                    acceptFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {fileError && <p className="mt-2 text-xs text-rose-600">{fileError}</p>}
              </section>
            )}

            {tool.options && tool.options.length > 0 && (
              <section className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                {tool.options.map((o) => (
                  <fieldset key={o.id}>
                    <legend className="text-xs font-semibold text-slate-700 mb-1.5">{o.label}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {o.choices.map((c) => {
                        const on = options[o.id] === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setOptions((prev) => ({ ...prev, [o.id]: c }))}
                            className={`text-xs sm:text-[13px] px-2.5 py-1 rounded-lg border transition-all ${
                              on
                                ? 'bg-teal-700 text-white border-teal-700 font-medium'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-teal-700 hover:text-teal-800'
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </section>
            )}

            <section className="bg-white p-4 rounded-xl border border-slate-200">
              <label htmlFor="tool-text" className="text-sm font-bold text-slate-800 block mb-2">
                {tool.text.label}
                {tool.text.required && <span className="text-rose-500"> *</span>}
              </label>
              {tool.quick && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tool.quick.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setText(q)}
                      className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-600 border border-slate-200 text-left max-w-full truncate"
                    >
                      {q.split('\n')[0].replace(/[：:]$/, '')}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                id="tool-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart();
                }}
                placeholder={tool.text.placeholder}
                className={`${inputCls} resize-y min-h-32 leading-relaxed`}
              />
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" aria-hidden="true" />
                請勿上傳含學生姓名、學號等個資的檔案。
              </p>
            </section>

            {formError && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                {formError}
              </p>
            )}

            <div className="hidden lg:block">{startButton()}</div>
            {!canGenerate && aiStatus !== null && (
              <p className="text-xs text-slate-600 leading-relaxed">
                此網站目前未連接 AI 服務。請按「複製指令」，到{' '}
                <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  Gemini 官網
                </a>{' '}
                貼上{tool.file ? '，並在那裡上傳同一個檔案' : ''}。
              </p>
            )}
          </div>

          {/* Right: 對話 */}
          <div
            ref={rightColRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="w-full lg:w-7/12 p-4 sm:p-6 flex flex-col bg-white lg:overflow-y-auto scroll-mt-2 border-t lg:border-t-0 border-slate-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">對話紀錄</h3>
              {hasConversation && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  清除重來
                </button>
              )}
            </div>

            {!hasConversation && !isGenerating ? (
              <div className="flex-1 min-h-[40dvh] rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center">
                <span className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3" aria-hidden="true">
                  <ToolIcon id={tool.id} className="w-6 h-6" />
                </span>
                <p className="text-sm font-medium text-slate-700">
                  {aiStatus === null
                    ? '正在確認 AI 服務…'
                    : canGenerate
                      ? `在左側${tool.file ? '上傳檔案、' : ''}設定好後，按「${tool.runLabel}」。`
                      : '此網站未連接 AI 服務，請用「複製指令」到外部 AI 使用。'}
                </p>
                <p className="text-xs text-slate-500 mt-1">回答出來後可以繼續追問，也能下載成 Word。</p>
              </div>
            ) : (
              <ol className="flex flex-col gap-4" aria-live="polite" aria-busy={isGenerating}>
                {messages.map((m, idx) =>
                  m.role === 'user' ? (
                    <li key={idx} className="self-end max-w-[90%] rounded-2xl rounded-br-md bg-teal-700 text-white px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                      {m.display ?? m.text}
                    </li>
                  ) : (
                    <li key={idx} data-msg={`${tool.id}-${idx}`} className="rounded-2xl border border-slate-200 bg-white">
                      <div className="p-4 sm:p-5">
                        <Markdown text={m.text} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            if (await copyRich(outputHtml(idx), m.text)) flash(`c${idx}`);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                            copied === `c${idx}` ? 'bg-emerald-600 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'
                          }`}
                        >
                          {copied === `c${idx}` ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                          {copied === `c${idx}` ? '已複製' : '複製'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(
                              `${baseName}_${answerNo(idx)}.docx`,
                              markdownToDocx(m.text, tool.title, `${new Date().toLocaleDateString('zh-TW')} · NCUE 未來教師 AI 力`),
                            )
                          }
                          className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Word
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFile(`${baseName}_${answerNo(idx)}.md`, new Blob([m.text], { type: 'text/markdown;charset=utf-8' }))}
                          className="px-2 py-1 rounded-lg font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                          MD
                        </button>
                      </div>
                    </li>
                  ),
                )}

                {isGenerating && (
                  <li className="rounded-2xl border border-indigo-200 bg-white p-4 sm:p-5">
                    {streaming ? (
                      <Markdown text={streaming} className="typing-caret" />
                    ) : (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" aria-hidden="true" />
                        {file && messages.length <= 1 ? '正在讀取檔案並思考…' : '思考中…'}
                      </p>
                    )}
                  </li>
                )}
              </ol>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                <p className="text-sm text-amber-950 leading-relaxed flex-1">{error}</p>
                <div className="flex gap-2 shrink-0">
                  {lastIsUser && (
                    <button type="button" onClick={handleRetry} className="bg-white border border-amber-300 text-amber-900 text-xs font-semibold px-3 py-2 rounded-lg">
                      重試
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    {copied === 'prompt' ? '已複製！' : '複製指令'}
                  </button>
                </div>
              </div>
            )}

            {/* 追問 */}
            {hasConversation && canGenerate && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tool.followUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleFollowUp(q)}
                      className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    aria-label="繼續追問"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleFollowUp();
                      }
                    }}
                    rows={2}
                    placeholder="繼續追問…（Enter 送出，Shift+Enter 換行）"
                    className={`${inputCls} resize-none leading-relaxed`}
                  />
                  <button
                    type="button"
                    onClick={() => (isGenerating ? abortRef.current?.abort() : handleFollowUp())}
                    aria-label={isGenerating ? '停止生成' : '送出追問'}
                    className={`shrink-0 w-11 h-11 rounded-xl text-white flex items-center justify-center ${
                      isGenerating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-700 hover:bg-teal-800'
                    }`}
                  >
                    {isGenerating ? <Square className="w-4 h-4 fill-current" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}

            {!canGenerate && aiStatus !== null && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>複製指令後前往：</span>
                {[
                  ['Gemini', 'https://gemini.google.com/app'],
                  ['ChatGPT', 'https://chatgpt.com/'],
                  ['Claude', 'https://claude.ai/new'],
                ].map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCopyPrompt}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium flex items-center gap-1"
                  >
                    {name}
                    <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 手機底部操作列 */}
        <div className="lg:hidden shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {startButton(true)}
        </div>
      </div>
    </div>
  );
};
