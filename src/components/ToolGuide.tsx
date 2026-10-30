import React, { useState } from 'react';
import { GEMINI_URL, ALT_MODEL, CODEX_URL, ANTIGRAVITY_URL, HANDOFF_PROMPT, stepPrompt, howToText, type ToolDef, type ToolPlatform } from '../data/tools';
import { copyText, downloadFile, safeFilename } from '../lib/utils';
import { markdownToDocx } from '../lib/docx';
import { useDialog } from '../lib/useDialog';
import { ToolIcon } from './ToolCard';
import { X, Copy, Check, ExternalLink, FileText, RotateCcw, CircleCheck, Circle, Sparkles, Share2, HelpCircle, SquareTerminal, Download, ListChecks, ArrowRightLeft } from 'lucide-react';

interface ToolGuideProps {
  tool: ToolDef;
  done: number[];
  onToggleDone: (toolId: string, step: number) => void;
  onClose: () => void;
}

const GEMINI_HOW_TO = [
  { title: '開啟 Gemini', text: '到 gemini.google.com，輸入框下方「工具」選 Canvas。' },
  { title: '依序貼上提示詞', text: '每一步等 Canvas 完成、在右側預覽試用後，再貼下一步。' },
  { title: '分享你的工具', text: 'Canvas 右上角「分享」產生連結，給學生或同事使用。' },
];

const AGENT_HOW_TO = [
  { title: '準備資料夾', text: '建立一個新資料夾（需要素材就先放進去），用 Codex 或 Antigravity 開啟它。' },
  { title: '依序貼上提示詞', text: '每一步 AI 做完會停下來；先照它說的方式試用，沒問題再貼下一步。' },
  { title: '部署與交接', text: '最後一步部署上線，並寫好 README 與工作紀錄，換工具或換人都能接手。' },
];

const AGENT_FAQ = [
  ['Codex 和 Antigravity 要選哪一個？', 'Codex 是 OpenAI 的程式代理，用 ChatGPT 帳號登入，有桌面 App、CLI 與 VS Code 擴充；Antigravity 是 Google 的代理式開發環境，用 Google 帳號登入，有免費額度。兩邊的提示詞通用，用你手邊有的即可。'],
  ['額度用完、想換另一個工具或隔天繼續？', '用另一個工具開啟同一個資料夾，先貼下方的「接手提示詞」，它會讀 AGENTS.md 與 docs/WORKLOG.md，從中斷的地方繼續。'],
  ['AI 要執行指令或安裝套件，要按允許嗎？', '先看清楚它要做什麼：安裝專案套件（npm install、pip install）、執行測試通常沒問題；要刪除檔案、動到資料夾以外的地方或輸入密碼時，先問清楚再允許。'],
  ['出現錯誤，或結果跟預期不一樣？', '把錯誤訊息或截圖貼給 AI，例如：「執行 npm run dev 出現這個錯誤：……，請修正並說明原因。」改壞了可以請它「退回上一個 commit」。'],
  ['電腦沒有 Node.js 或 Python？', '貼上第 1 步後，AI 會先檢查環境並告訴你缺什麼、怎麼安裝。學校電腦若不能安裝軟體，請洽資訊人員。'],
  ['部署會產生費用嗎？', 'GitHub Pages 免費；Firebase 與 Cloud Run 有免費額度，超過才計費。提示詞要求 AI 在需要付費服務或登入帳號時先停下來問你，並設定用量上限與預算提醒。'],
];

const GEMINI_FAQ = [
  ['沒有出現右側的 App 預覽？', '確認輸入框下方有選「Canvas」。也可以對 Gemini 說：「請在 Canvas 顯示這個 App」。'],
  ['畫面出現錯誤訊息或按了沒反應？', '把錯誤訊息複製給 Gemini：「出現這個錯誤：……，請修正並保留所有功能。」'],
  ['呼叫 AI 失敗（403、404）？', `用 App 右上角的模型選單切換模型，或對 Gemini 說：「把模型換成 ${ALT_MODEL}」。`],
  ['結果不是我要的？', '直接用白話告訴 Gemini 要改哪裡，例如「按鈕放大一點」「結果改成表格」。改壞了可以在 Canvas 上方切回之前的版本。'],
  ['想放到自己的網站？', 'Canvas 右上角切到「程式碼」，複製後存成 .html。在 Canvas 以外使用時，需要自己的 Gemini API 金鑰。'],
];

/** 兩個工具箱的文字與配色 */
const UI = {
  gemini: {
    howTo: GEMINI_HOW_TO,
    faq: GEMINI_FAQ,
    subtitle: (t: ToolDef) => `${t.steps.length} 步提示詞・在 Gemini Canvas 生成「${t.appName}」`,
    copied: '已複製，到 Gemini 貼上',
    docSubtitle: 'NCUE 未來教師 AI 力・Gemini 工具箱',
    docSuffix: 'Gemini Canvas 提示詞',
    after:
      '在 Canvas 右上角按「分享」建立公開連結，學生或同事打開就能使用（使用自己的 Gemini 額度）。想繼續改良，就在同一個對話用白話告訴 Gemini 要改什麼。',
    privacy: '請勿上傳含學生姓名、學號等個資的檔案；AI 產生的內容請自行查證後再使用。',
    soft: 'bg-teal-50 text-teal-700',
    tile: 'bg-teal-50/70 border-teal-100',
    num: 'text-teal-700',
    primary: 'bg-teal-700 hover:bg-teal-800',
    bar: 'bg-teal-600',
    doneBorder: 'border-teal-300',
    doneDot: 'bg-teal-600',
    doneBtn: 'bg-teal-50 text-teal-800 border-teal-200',
    ring: 'focus:ring-teal-700',
    strong: 'text-teal-800',
    icon: 'text-teal-700',
  },
  agent: {
    howTo: AGENT_HOW_TO,
    faq: AGENT_FAQ,
    subtitle: (t: ToolDef) => `${t.steps.length} 步提示詞・在 Codex／Antigravity 建立「${t.appName}」專案`,
    copied: '已複製，到 Codex／Antigravity 貼上',
    docSubtitle: 'NCUE 未來教師 AI 力・Codex / Antigravity 工具箱',
    docSuffix: 'Codex／Antigravity 提示詞',
    after:
      '最後你會得到一個公開網址（或可一鍵重跑的分析流程）、寫給老師看的 README，以及記錄每一步的 docs/WORKLOG.md。想繼續擴充，就在同一個資料夾用白話告訴 AI 要加什麼；換工具、換電腦或隔天繼續時，先貼下面的接手提示詞。',
    privacy: '請勿把含學生姓名、學號等個資的檔案放進專案資料夾；AI 寫的程式與產生的內容請自行測試、查證後再使用。',
    soft: 'bg-violet-50 text-violet-700',
    tile: 'bg-violet-50/70 border-violet-100',
    num: 'text-violet-700',
    primary: 'bg-violet-700 hover:bg-violet-800',
    bar: 'bg-violet-600',
    doneBorder: 'border-violet-300',
    doneDot: 'bg-violet-600',
    doneBtn: 'bg-violet-50 text-violet-800 border-violet-200',
    ring: 'focus:ring-violet-700',
    strong: 'text-violet-800',
    icon: 'text-violet-700',
  },
} satisfies Record<ToolPlatform, unknown>;

export const ToolGuide: React.FC<ToolGuideProps> = ({ tool, done, onToggleDone, onClose }) => {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const platform: ToolPlatform = tool.platform ?? 'gemini';
  const isAgent = platform === 'agent';
  const ui = UI[platform];
  const defaults = tool.steps.map((_, i) => stepPrompt(tool, i));
  const [prompts, setPrompts] = useState<string[]>(defaults);
  const [copied, setCopied] = useState<number | 'handoff' | null>(null);

  const copyValue = async (key: number | 'handoff', text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2500);
    }
  };
  const copy = (i: number) => copyValue(i, prompts[i]);

  const guideMarkdown = () =>
    [
      tool.desc,
      howToText(tool),
      ...tool.steps.flatMap((s, i) => [`## 步驟 ${i + 1}：${s.title}`, '```', prompts[i], '```', `**完成後應該看到**：${s.check}`]),
    ].join('\n\n');

  const baseName = `NCUE_AI_${isAgent ? '專案' : '工具'}_${safeFilename(tool.title)}`;
  const progress = done.length;
  const hasBlanks = defaults[0]?.includes('【請填');

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-guide-title"
        tabIndex={-1}
        className="bg-white w-full max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col h-dvh sm:h-auto sm:max-h-[92dvh] overflow-hidden sm:border border-slate-200 outline-none"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${ui.soft}`} aria-hidden="true">
              <ToolIcon id={tool.id} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="tool-guide-title" className="text-base sm:text-xl font-bold text-slate-900 truncate">
                {tool.title}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {tool.theme ? `${tool.theme}・` : ''}
                {ui.subtitle(tool)}
              </p>
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

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60">
          {/* 說明與做法 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{tool.desc}</p>
            {isAgent && (tool.stack || tool.prereq?.length) && (
              <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {tool.stack && (
                  <>
                    <dt className="font-semibold text-slate-900">技術與部署</dt>
                    <dd className="text-slate-600 font-mono text-[13px]">{tool.stack}</dd>
                  </>
                )}
                {tool.prereq?.length ? (
                  <>
                    <dt className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <ListChecks className={`w-4 h-4 ${ui.icon}`} aria-hidden="true" />
                      開始前準備
                    </dt>
                    <dd>
                      <ul className="flex flex-wrap gap-1.5">
                        {tool.prereq.map((p) => (
                          <li key={p} className="text-xs text-slate-700 bg-slate-100 rounded-lg px-2 py-1">
                            {p}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </>
                ) : null}
              </dl>
            )}
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ui.howTo.map((h, i) => (
                <li key={h.title} className={`rounded-xl border p-3 ${ui.tile}`}>
                  <span className={`block text-[11px] font-bold ${ui.num}`}>{i + 1}</span>
                  <span className="block text-sm font-bold text-slate-900">{h.title}</span>
                  <span className="block text-xs text-slate-600 leading-relaxed mt-0.5">{h.text}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {isAgent ? (
                <>
                  <a
                    href={CODEX_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 ${ui.primary}`}
                  >
                    <SquareTerminal className="w-4 h-4" aria-hidden="true" />
                    開啟 Codex
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
                  </a>
                  <a
                    href={ANTIGRAVITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    下載 Antigravity
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  </a>
                </>
              ) : (
                <a
                  href={GEMINI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 ${ui.primary}`}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  開啟 Gemini
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={() => downloadFile(`${baseName}.docx`, markdownToDocx(guideMarkdown(), `${tool.title}（${ui.docSuffix}）`, ui.docSubtitle))}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                下載講義（Word）
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(`${baseName}.md`, new Blob([`# ${tool.title}\n\n${guideMarkdown()}`], { type: 'text/markdown;charset=utf-8' }))
                }
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold"
              >
                MD
              </button>
            </div>
          </section>

          {/* 進度 */}
          <div className="flex items-center gap-3" aria-label={`已完成 ${progress}／${tool.steps.length} 步`}>
            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full transition-all ${ui.bar}`} style={{ width: `${(progress / tool.steps.length) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              已完成 {progress}／{tool.steps.length}
            </span>
          </div>

          {hasBlanks && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
              第 1 步提示詞裡的【請填：…】請先改成你的內容（可直接在框內修改），再複製貼上。
            </p>
          )}

          {/* 步驟 */}
          <ol className="space-y-4">
            {tool.steps.map((s, i) => {
              const isDone = done.includes(i);
              const edited = prompts[i] !== defaults[i];
              return (
                <li key={i} className={`bg-white rounded-2xl border p-4 sm:p-5 ${isDone ? ui.doneBorder : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="flex items-center gap-2.5 font-bold text-slate-900">
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full text-sm flex items-center justify-center text-white ${
                          isDone ? ui.doneDot : 'bg-slate-900'
                        }`}
                      >
                        {i + 1}
                      </span>
                      {s.title}
                    </h3>
                    <button
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => onToggleDone(tool.id, i)}
                      className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                        isDone ? ui.doneBtn : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {isDone ? <CircleCheck className="w-3.5 h-3.5" aria-hidden="true" /> : <Circle className="w-3.5 h-3.5" aria-hidden="true" />}
                      {isDone ? '已完成' : '標記完成'}
                    </button>
                  </div>

                  <textarea
                    aria-label={`步驟 ${i + 1} 提示詞（可修改）`}
                    value={prompts[i]}
                    onChange={(e) => setPrompts((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                    spellCheck={false}
                    rows={i === 0 ? 14 : 8}
                    className={`w-full border border-slate-300 rounded-xl p-3 text-[13px] leading-relaxed text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:border-transparent outline-none resize-y font-mono ${ui.ring}`}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copy(i)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${
                        copied === i ? 'bg-emerald-600 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'
                      }`}
                    >
                      {copied === i ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                      {copied === i ? ui.copied : `複製步驟 ${i + 1}`}
                    </button>
                    {i === 0 && !isAgent && (
                      <a
                        href={GEMINI_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => copy(0)}
                        className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                      >
                        複製並開啟 Gemini
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      </a>
                    )}
                    {edited && (
                      <button
                        type="button"
                        onClick={() => setPrompts((prev) => prev.map((p, j) => (j === i ? defaults[i] : p)))}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        還原
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                    <strong className={ui.strong}>完成後應該看到：</strong>
                    {s.check}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* 完成後 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Share2 className={`w-4 h-4 ${ui.icon}`} aria-hidden="true" />
              完成後
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{ui.after}</p>
          </section>

          {/* 接手提示詞（Codex ↔ Antigravity） */}
          {isAgent && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                <ArrowRightLeft className={`w-4 h-4 ${ui.icon}`} aria-hidden="true" />
                接手提示詞
              </h3>
              <p className="text-xs text-slate-500 mb-2">換工具（Codex ↔ Antigravity）、換電腦或隔天繼續時，打開同一個資料夾先貼這段。</p>
              <p className="text-[13px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono">{HANDOFF_PROMPT}</p>
              <button
                type="button"
                onClick={() => copyValue('handoff', HANDOFF_PROMPT)}
                className={`mt-2 px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${
                  copied === 'handoff' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {copied === 'handoff' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied === 'handoff' ? '已複製' : '複製接手提示詞'}
              </button>
            </section>
          )}

          {/* 常見問題 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <HelpCircle className={`w-4 h-4 ${ui.icon}`} aria-hidden="true" />
              常見問題
            </h3>
            <div className="divide-y divide-slate-100">
              {ui.faq.map(([q, a]) => (
                <details key={q} className="py-2 group">
                  <summary className="text-sm font-medium text-slate-800 cursor-pointer list-none flex justify-between gap-2">
                    {q}
                    <span className="text-slate-400 group-open:rotate-45 transition-transform" aria-hidden="true">
                      ＋
                    </span>
                  </summary>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{a}</p>
                </details>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{ui.privacy}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
