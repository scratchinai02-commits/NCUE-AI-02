import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Skill, Role, TeachingContext, AiStatus } from '../types';
import { scenarioPresets, pedagogyOptions, assessmentOptions, stageOptions, commonSubjects } from '../data/presets';
import { buildPrompt, contextCompleteness } from '../lib/prompt';
import { streamGenerate } from '../lib/api';
import { copyRich, copyText, downloadFile, safeFilename } from '../lib/utils';
import { markdownToDocx } from '../lib/docx';
import { useDialog } from '../lib/useDialog';
import { Markdown } from './Markdown';
import {
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Sliders,
  Terminal,
  BookmarkCheck,
  Loader2,
  FileDown,
  FileText,
  Info,
  Square,
  Paperclip,
  Lock,
  TriangleAlert,
  Pencil,
} from 'lucide-react';

export interface SkillDraft {
  output?: string;
  material?: string;
  customPrompt?: string | null;
}

interface SkillModalProps {
  skill: Skill;
  currentRole: Role;
  onClose: () => void;
  context: TeachingContext;
  onUpdateContext: (context: Partial<TeachingContext>) => void;
  onResetContext: () => void;
  aiStatus: AiStatus | null;
  draft: SkillDraft;
  onSaveDraft: (id: string, patch: SkillDraft) => void;
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm bg-white focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none';
const chipCls = (on: boolean) =>
  `text-xs sm:text-[13px] px-2.5 py-1 rounded-lg border transition-all ${
    on
      ? 'bg-blue-900 text-white border-blue-900 shadow-xs font-medium'
      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-900 hover:text-blue-900'
  }`;

const EXTERNAL_AI = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Claude', url: 'https://claude.ai/new' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
];

export const SkillModal: React.FC<SkillModalProps> = ({
  skill,
  currentRole,
  onClose,
  context,
  onUpdateContext,
  onResetContext,
  aiStatus,
  draft,
  onSaveDraft,
}) => {
  const dialogRef = useDialog<HTMLDivElement>(true, onClose);
  const rightColRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const [material, setMaterial] = useState(draft.material ?? '');
  const [customPrompt, setCustomPrompt] = useState<string | null>(draft.customPrompt ?? null);
  const [output, setOutput] = useState(draft.output ?? '');
  const [activeTab, setActiveTab] = useState<'prompt' | 'output'>(draft.output ? 'output' : 'prompt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<'prompt' | 'output' | null>(null);
  const [showMaterial, setShowMaterial] = useState(Boolean(skill.materialHint || draft.material));

  const abortRef = useRef<AbortController | null>(null);
  const latest = useRef({ output, material, customPrompt });
  latest.current = { output, material, customPrompt };

  // 關閉時：停止生成並保存草稿（成果、素材、手動修改的 Prompt）
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      onSaveDraft(skill.id, { ...latest.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id]);

  const autoPrompt = useMemo(
    () => buildPrompt(currentRole, context, skill, material),
    [currentRole, context, skill, material],
  );
  const finalPrompt = customPrompt ?? autoPrompt;
  const completeness = contextCompleteness(context);

  const activePresetId = scenarioPresets.find(
    (p) => p.stage === context.stage && p.subject === context.subject && p.topic === context.topic,
  )?.id;

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const applyPreset = (presetId: string) => {
    const p = scenarioPresets.find((x) => x.id === presetId);
    if (!p) return;
    onUpdateContext({
      stage: p.stage,
      subject: p.subject,
      topic: p.topic,
      pedagogies: p.pedagogies,
      assessments: p.assessments,
      extra: p.extra,
      pedagogyCustom: '',
      assessmentCustom: '',
    });
  };

  const flashCopied = (what: 'prompt' | 'output') => {
    setCopied(what);
    window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 2500);
  };

  const handleCopyPrompt = async () => {
    if (await copyText(finalPrompt)) flashCopied('prompt');
  };

  const handleCopyOutput = async () => {
    if (!output) return;
    const html = outputRef.current?.innerHTML ?? '';
    if (await copyRich(html, output)) flashCopied('output');
  };

  const baseName = `NCUE_AI_${skill.id}_${safeFilename(skill.title)}`;

  const handleDownloadWord = () => {
    if (!output) return;
    const subtitle = `${currentRole === 'student' ? '師培生視角' : '教授／指導視角'} · ${new Date().toLocaleDateString('zh-TW')} · NCUE 未來教師 AI 力`;
    downloadFile(`${baseName}.docx`, markdownToDocx(output, skill.title, subtitle));
  };

  const handleDownloadMd = (what: 'prompt' | 'output') => {
    const text = what === 'output' ? output : finalPrompt;
    downloadFile(`${baseName}${what === 'prompt' ? '_Prompt' : ''}.md`, new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  };

  const handleGenerate = async () => {
    if (isGenerating) {
      abortRef.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsGenerating(true);
    setErrorMessage(null);
    setOutput('');
    setActiveTab('output');
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => rightColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    try {
      await streamGenerate({ prompt: finalPrompt, role: currentRole, signal: ctrl.signal, onText: setOutput });
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setErrorMessage((err as Error).message || '生成失敗，請確認網路或複製至外部 AI 工具使用。');
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const canGenerate = Boolean(aiStatus?.available);
  const modelLabel = aiStatus?.model
    ? aiStatus.model.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Gemini';

  // ---------------------------------------------------------------------------
  // UI 片段
  // ---------------------------------------------------------------------------
  const renderGenerateButton = (compact = false) =>
    canGenerate ? (
      <button
        type="button"
        onClick={handleGenerate}
        className={`${
          isGenerating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
          compact ? 'flex-1' : ''
        }`}
      >
        {isGenerating ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            停止生成
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
            {output ? '重新生成' : '即時 AI 生成'}
          </>
        )}
      </button>
    ) : null;

  const renderCopyPromptButton = (compact = false) => (
    <button
      type="button"
      onClick={handleCopyPrompt}
      className={`text-sm font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap ${
        copied === 'prompt' ? 'bg-emerald-600 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'
      } ${compact ? 'flex-1' : ''}`}
    >
      {copied === 'prompt' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
      {copied === 'prompt' ? '已複製！' : '複製 Prompt'}
    </button>
  );

  const MaterialSection = (
    <section
      className={`bg-white p-4 sm:p-5 rounded-xl border shadow-xs ${skill.materialHint ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <label htmlFor="material" className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-blue-600" aria-hidden="true" />
          附加素材
          <span className="font-normal text-slate-400 text-xs">（選填）</span>
        </label>
        {skill.materialHint && (
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
            此技能建議提供
          </span>
        )}
      </div>
      <textarea
        id="material"
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        placeholder={skill.materialHint || '可貼上學生作答、課堂紀錄、數據或文獻摘要，AI 會以此為依據。'}
        className={`${inputCls} resize-y min-h-24 leading-relaxed`}
      />
      <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
        <Lock className="w-3 h-3" aria-hidden="true" />
        請以代號取代學生姓名、學號等個資。
      </p>
    </section>
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
        aria-labelledby="skill-modal-title"
        tabIndex={-1}
        className="bg-white w-full max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col h-dvh sm:h-[92dvh] relative overflow-hidden sm:border border-slate-200 outline-none"
      >
        {/* Top bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="shrink-0 text-xs sm:text-sm font-bold text-white bg-blue-900 px-2.5 py-1 rounded-lg font-mono">
              {skill.id}
            </span>
            <h2 id="skill-modal-title" className="text-base sm:text-xl font-bold text-slate-900 truncate">
              {skill.title}
            </h2>
            <span
              className={`hidden sm:inline-block shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                currentRole === 'student' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {currentRole === 'student' ? '👩‍🏫 師培生視角' : '👨‍💼 教授 / 指導視角'}
            </span>
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

        {/* Body：手機整體捲動；桌機左右各自捲動 */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-row">
          {/* Left: 情境設定 */}
          <div className="w-full lg:w-5/12 lg:border-r border-slate-200 p-4 sm:p-6 lg:overflow-y-auto bg-slate-50/60 flex flex-col gap-4 sm:gap-5">
            <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-blue-900 tracking-wider mb-1.5">技能說明</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{skill.desc}</p>
              {skill.links && skill.links.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-blue-900 tracking-wider mb-2">相關資源</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-100 hover:bg-blue-100 font-medium transition-colors"
                      >
                        {link.title}
                        <ExternalLink className="w-3 h-3 opacity-70" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {skill.video && (
                <div className="mt-3 rounded-lg overflow-hidden bg-slate-900 relative w-full pb-[56.25%]">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={skill.video}
                    title={`${skill.title} 示範影片`}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </section>

            {skill.materialHint && MaterialSection}

            {/* STEP 1 */}
            <section className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  STEP 1　設定教學情境
                  <span className="text-[11px] font-medium text-slate-400 ml-1">
                    {completeness.filled}/{completeness.total}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={onResetContext}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  清空
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  快速套用研習範例
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {scenarioPresets.map((preset) => {
                    const on = preset.id === activePresetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => applyPreset(preset.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors border font-medium text-left ${
                          on
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ctx-stage" className="text-xs font-semibold text-slate-700 block mb-1">
                    教育階段
                  </label>
                  <select
                    id="ctx-stage"
                    value={context.stage}
                    onChange={(e) => onUpdateContext({ stage: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">請選擇</option>
                    {stageOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ctx-subject" className="text-xs font-semibold text-slate-700 block mb-1">
                    任教科目
                  </label>
                  <input
                    id="ctx-subject"
                    type="text"
                    value={context.subject}
                    onChange={(e) => onUpdateContext({ subject: e.target.value })}
                    placeholder="例如：國中數學、高中英文"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1 -mt-2">
                {commonSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => onUpdateContext({ subject: sub })}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      context.subject === sub
                        ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="ctx-topic" className="text-xs font-semibold text-slate-700 block mb-1">
                  單元 / 教學主題 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ctx-topic"
                  type="text"
                  value={context.topic}
                  onChange={(e) => onUpdateContext({ topic: e.target.value })}
                  placeholder="例如：畢氏定理的應用、光合作用與呼吸作用"
                  className={inputCls}
                />
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 mb-1.5">預計採用教學法（可多選）</legend>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pedagogyOptions.map((ped) => {
                    const on = context.pedagogies.includes(ped);
                    return (
                      <button
                        key={ped}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onUpdateContext({ pedagogies: toggleIn(context.pedagogies, ped) })}
                        className={chipCls(on)}
                      >
                        {ped}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  aria-label="其他自訂教學法"
                  value={context.pedagogyCustom}
                  onChange={(e) => onUpdateContext({ pedagogyCustom: e.target.value })}
                  placeholder="其他教學法（自填）"
                  className={`${inputCls} py-1.5 bg-slate-50/60`}
                />
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 mb-1.5">預期評量 / 作業型態（可多選）</legend>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assessmentOptions.map((asm) => {
                    const on = context.assessments.includes(asm);
                    return (
                      <button
                        key={asm}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onUpdateContext({ assessments: toggleIn(context.assessments, asm) })}
                        className={chipCls(on)}
                      >
                        {asm}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  aria-label="其他自訂評量型態"
                  value={context.assessmentCustom}
                  onChange={(e) => onUpdateContext({ assessmentCustom: e.target.value })}
                  placeholder="其他評量型態（自填）"
                  className={`${inputCls} py-1.5 bg-slate-50/60`}
                />
              </fieldset>

              <div>
                <label htmlFor="ctx-extra" className="text-xs font-semibold text-slate-700 block mb-1">
                  學生狀況與特殊需求（選填）
                </label>
                <textarea
                  id="ctx-extra"
                  value={context.extra}
                  onChange={(e) => onUpdateContext({ extra: e.target.value })}
                  placeholder="例如：班上有雙峰學習落差、需融入 SDGs 議題、需提供具體評量規準表格…"
                  className={`${inputCls} resize-y min-h-20 leading-relaxed`}
                />
              </div>
            </section>

            {!skill.materialHint &&
              (showMaterial ? (
                MaterialSection
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMaterial(true)}
                  className="text-sm text-blue-800 hover:text-blue-950 font-medium flex items-center gap-1.5 self-start px-1"
                >
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  ＋ 加入附加素材（學生作答、數據、文獻…）
                </button>
              ))}
          </div>

          {/* Right: Prompt 與生成成果 */}
          <div
            ref={rightColRef}
            className="w-full lg:w-7/12 p-4 sm:p-6 flex flex-col bg-white lg:overflow-y-auto scroll-mt-2 border-t lg:border-t-0 border-slate-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
              <div role="tablist" aria-label="檢視" className="flex bg-slate-200/80 p-1 rounded-xl self-start">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'prompt'}
                  onClick={() => setActiveTab('prompt')}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'prompt' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Terminal className="w-4 h-4" aria-hidden="true" />
                  STEP 2　Prompt
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'output'}
                  onClick={() => setActiveTab('output')}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'output' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  AI 成果
                  {(output || isGenerating) && (
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${isGenerating ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2">
                {renderGenerateButton()}
                {activeTab === 'prompt' ? (
                  <>
                    {renderCopyPromptButton()}
                    <button
                      type="button"
                      onClick={() => handleDownloadMd('prompt')}
                      title="下載 Prompt（.md）"
                      aria-label="下載 Prompt"
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 shadow-xs transition-colors"
                    >
                      <FileDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Display */}
            <div className="lg:flex-1 lg:min-h-0 relative rounded-xl border border-slate-300 bg-white flex flex-col shadow-inner overflow-hidden">
              {activeTab === 'prompt' ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-mono">
                      {finalPrompt.length} 字 · 情境 {completeness.filled}/{completeness.total}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Pencil className="w-3 h-3" aria-hidden="true" />
                      可直接修改文字
                    </span>
                  </div>
                  {customPrompt !== null ? (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                      <span>你已手動修改 Prompt，左側情境的變更不會自動套入。</span>
                      <button
                        type="button"
                        onClick={() => setCustomPrompt(null)}
                        className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-950"
                      >
                        還原自動組合
                      </button>
                    </div>
                  ) : !completeness.hasTopic ? (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      尚未填寫「單元主題」，AI 會自行假設。建議先套用範例或填寫左側情境。
                    </div>
                  ) : null}
                  <textarea
                    aria-label="Prompt 內容（可編輯）"
                    value={finalPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    spellCheck={false}
                    className="flex-1 w-full min-h-[55dvh] lg:min-h-0 p-4 text-sm font-mono text-slate-800 resize-none outline-none leading-relaxed bg-white selection:bg-blue-200"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="bg-slate-100/80 px-3 sm:px-4 py-2 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {isGenerating ? `${modelLabel} 生成中…` : output ? `${modelLabel} 生成結果` : 'AI 生成成果'}
                      </span>
                      {output && <span className="text-slate-400 font-mono shrink-0">· {output.length} 字</span>}
                    </span>
                    {output && !isGenerating && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyOutput}
                          title="複製成果（貼到 Word／Google 文件會保留標題與表格）"
                          className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                            copied === 'output' ? 'bg-emerald-600 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'
                          }`}
                        >
                          {copied === 'output' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                          {copied === 'output' ? '已複製' : '複製'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadWord}
                          title="下載 Word 檔"
                          className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Word
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadMd('output')}
                          title="下載 Markdown 檔"
                          aria-label="下載 Markdown 檔"
                          className="px-2 py-1 rounded-lg font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                          MD
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-h-[40dvh] lg:min-h-0 overflow-y-auto" aria-live="polite" aria-busy={isGenerating}>
                    {output ? (
                      <div className="p-4 sm:p-5">
                        <Markdown ref={outputRef} text={output} className={isGenerating ? 'typing-caret' : ''} />
                      </div>
                    ) : isGenerating ? (
                      <div className="h-full min-h-[40dvh] flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" aria-hidden="true" />
                        <p className="text-sm font-semibold text-slate-800">正在依據 108 課綱與情境規劃生成中…</p>
                        <p className="text-xs text-slate-400 mt-1">文字會逐段出現，可隨時按「停止生成」</p>
                      </div>
                    ) : !errorMessage ? (
                      <div className="h-full min-h-[40dvh] flex flex-col items-center justify-center p-8 text-center">
                        <Sparkles className="w-10 h-10 text-slate-200 mb-2" aria-hidden="true" />
                        <p className="text-sm font-medium text-slate-600">尚未進行即時生成</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                          {aiStatus === null
                            ? '正在確認 AI 生成服務…'
                            : canGenerate
                              ? '按「即時 AI 生成」在本站預覽成果，或「複製 Prompt」貼到外部 AI。'
                              : '此網站目前未連接 AI 生成服務。請按「複製 Prompt」，再到下方的 ChatGPT、Claude 或 Gemini 貼上使用。'}
                        </p>
                      </div>
                    ) : null}

                    {errorMessage && (
                      <div className="m-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center gap-3">
                        <Info className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                        <p className="text-sm text-amber-950 leading-relaxed flex-1">{errorMessage}</p>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="shrink-0 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          {copied === 'prompt' ? '已複製！' : '複製 Prompt'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 外部 AI */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                點下方按鈕會自動複製 Prompt 並開啟，貼上（Ctrl / ⌘ + V）即可：
              </span>
              <div className="flex items-center gap-2">
                {EXTERNAL_AI.map((t) => (
                  <a
                    key={t.name}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCopyPrompt}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium transition-colors flex items-center gap-1"
                  >
                    {t.name}
                    <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 手機底部操作列 */}
        <div className="lg:hidden shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {renderCopyPromptButton(true)}
          {canGenerate ? (
            renderGenerateButton(true)
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTab('prompt');
                rightColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex-1 text-sm font-semibold px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white"
            >
              檢視 Prompt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
