import React, { useState } from 'react';
import { GEMINI_URL, ALT_MODEL, stepPrompt, type ToolDef } from '../data/tools';
import { copyText, downloadFile, safeFilename } from '../lib/utils';
import { markdownToDocx } from '../lib/docx';
import { useDialog } from '../lib/useDialog';
import { ToolIcon } from './ToolCard';
import { X, Copy, Check, ExternalLink, FileText, RotateCcw, CircleCheck, Circle, Sparkles, Share2, HelpCircle } from 'lucide-react';

interface ToolGuideProps {
  tool: ToolDef;
  done: number[];
  onToggleDone: (toolId: string, step: number) => void;
  onClose: () => void;
}

const HOW_TO = [
  { title: '開啟 Gemini', text: '到 gemini.google.com，輸入框下方「工具」選 Canvas。' },
  { title: '依序貼上提示詞', text: '每一步等 Canvas 完成、在右側預覽試用後，再貼下一步。' },
  { title: '分享你的工具', text: 'Canvas 右上角「分享」產生連結，給學生或同事使用。' },
];

const FAQ = [
  ['沒有出現右側的 App 預覽？', '確認輸入框下方有選「Canvas」。也可以對 Gemini 說：「請在 Canvas 顯示這個 App」。'],
  ['畫面出現錯誤訊息或按了沒反應？', '把錯誤訊息複製給 Gemini：「出現這個錯誤：……，請修正並保留所有功能。」'],
  ['呼叫 AI 失敗（403、404）？', `用 App 右上角的模型選單切換模型，或對 Gemini 說：「把模型換成 ${ALT_MODEL}」。`],
  ['結果不是我要的？', '直接用白話告訴 Gemini 要改哪裡，例如「按鈕放大一點」「結果改成表格」。改壞了可以在 Canvas 上方切回之前的版本。'],
  ['想放到自己的網站？', 'Canvas 右上角切到「程式碼」，複製後存成 .html。在 Canvas 以外使用時，需要自己的 Gemini API 金鑰。'],
];

export const ToolGuide: React.FC<ToolGuideProps> = ({ tool, done, onToggleDone, onClose }) => {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const defaults = tool.steps.map((_, i) => stepPrompt(tool, i));
  const [prompts, setPrompts] = useState<string[]>(defaults);
  const [copied, setCopied] = useState<number | null>(null);

  const copy = async (i: number) => {
    if (await copyText(prompts[i])) {
      setCopied(i);
      window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 2500);
    }
  };

  const guideMarkdown = () =>
    [
      tool.desc,
      `**做法**：開啟 Gemini（${GEMINI_URL}），在輸入框下方的「工具」選 **Canvas**，依序貼上以下 ${tool.steps.length} 個步驟的提示詞。每一步等 Canvas 完成並試用後，再貼下一步。完成後按 Canvas 右上角「分享」產生連結。`,
      ...tool.steps.flatMap((s, i) => [`## 步驟 ${i + 1}：${s.title}`, '```', prompts[i], '```', `**完成後應該看到**：${s.check}`]),
    ].join('\n\n');

  const baseName = `NCUE_AI_工具_${safeFilename(tool.title)}`;
  const progress = done.length;

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
            <span className="shrink-0 w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center" aria-hidden="true">
              <ToolIcon id={tool.id} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="tool-guide-title" className="text-base sm:text-xl font-bold text-slate-900 truncate">
                {tool.title}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {tool.theme ? `${tool.theme}・` : ''}
                {tool.steps.length} 步提示詞・在 Gemini Canvas 生成「{tool.appName}」
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
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {HOW_TO.map((h, i) => (
                <li key={h.title} className="rounded-xl bg-teal-50/70 border border-teal-100 p-3">
                  <span className="block text-[11px] font-bold text-teal-700">{i + 1}</span>
                  <span className="block text-sm font-bold text-slate-900">{h.title}</span>
                  <span className="block text-xs text-slate-600 leading-relaxed mt-0.5">{h.text}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <a
                href={GEMINI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                開啟 Gemini
                <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    `${baseName}.docx`,
                    markdownToDocx(guideMarkdown(), `${tool.title}（Gemini Canvas 提示詞）`, 'NCUE 未來教師 AI 力・Gemini 工具箱'),
                  )
                }
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
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${(progress / tool.steps.length) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              已完成 {progress}／{tool.steps.length}
            </span>
          </div>

          {/* 步驟 */}
          <ol className="space-y-4">
            {tool.steps.map((s, i) => {
              const isDone = done.includes(i);
              const edited = prompts[i] !== defaults[i];
              return (
                <li key={i} className={`bg-white rounded-2xl border p-4 sm:p-5 ${isDone ? 'border-teal-300' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="flex items-center gap-2.5 font-bold text-slate-900">
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full text-sm flex items-center justify-center ${
                          isDone ? 'bg-teal-600 text-white' : 'bg-slate-900 text-white'
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
                        isDone ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
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
                    className="w-full border border-slate-300 rounded-xl p-3 text-[13px] leading-relaxed text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-700 focus:border-transparent outline-none resize-y font-mono"
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
                      {copied === i ? '已複製，到 Gemini 貼上' : `複製步驟 ${i + 1}`}
                    </button>
                    {i === 0 && (
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
                    <strong className="text-teal-800">完成後應該看到：</strong>
                    {s.check}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* 完成後 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-teal-700" aria-hidden="true" />
              完成後
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              在 Canvas 右上角按「分享」建立公開連結，學生或同事打開就能使用（使用自己的 Gemini 額度）。想繼續改良，就在同一個對話用白話告訴 Gemini 要改什麼。
            </p>
          </section>

          {/* 常見問題 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-teal-700" aria-hidden="true" />
              常見問題
            </h3>
            <div className="divide-y divide-slate-100">
              {FAQ.map(([q, a]) => (
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
            <p className="mt-3 text-[11px] text-slate-500">請勿上傳含學生姓名、學號等個資的檔案；AI 產生的內容請自行查證後再使用。</p>
          </section>
        </div>
      </div>
    </div>
  );
};
