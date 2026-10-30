import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Role, CategoryId, Skill, TeachingContext, AiStatus } from './types';
import { skillsData, categories } from './data/skills';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SkillCard } from './components/SkillCard';
import { SkillModal, SkillDraft } from './components/SkillModal';
import { QuickGuideModal } from './components/QuickGuideModal';
import { ToolCard } from './components/ToolCard';
import { ToolGuide } from './components/ToolGuide';
import { TOOLS, TOOL_GROUPS, GEMINI_URL, toolsInGroup, toolGuideMarkdown, ToolDef, ToolGroup } from './data/tools';
import { markdownToDocx } from './lib/docx';
import { BANNER_IMAGE_URL } from './components/HeroBanner';
import { fetchAiStatus } from './lib/api';
import { loadJSON, saveJSON, downloadFile } from './lib/utils';
import { Search, X, Award, ArrowRight, Star } from 'lucide-react';

const initialContext: TeachingContext = {
  stage: '',
  subject: '',
  topic: '',
  pedagogies: [],
  pedagogyCustom: '',
  assessments: [],
  assessmentCustom: '',
  extra: '',
};

const STORAGE = {
  favorites: 'ncue_ai_favorites',
  context: 'ncue_ai_context',
  role: 'ncue_ai_role',
  toolProgress: 'ncue_tool_progress',
};

const skillCategories = categories.filter((c) => !['all', 'favorites', 'top5', 'tools'].includes(c.id));
const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '教學模組';

/** 搜尋計分：標題 > 標籤 / 編號 > 說明 > Prompt 內文；多個關鍵字需全部命中 */
function searchScore(skill: Skill, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    let s = 0;
    if (/^\d{1,2}$/.test(term)) s = skill.id === term.padStart(2, '0') ? 5 : 0; // 純數字＝技能編號
    else if (skill.title.toLowerCase().includes(term)) s = 4;
    else if (skill.tags?.some((t) => t.toLowerCase().includes(term))) s = 3;
    else if (skill.desc.toLowerCase().includes(term)) s = 2;
    else if (skill.prompt.toLowerCase().includes(term)) s = 1;
    if (!s) return 0;
    total += s;
  }
  return total;
}

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>(() => (loadJSON<Role>(STORAGE.role, 'student') === 'professor' ? 'professor' : 'student'));
  const [currentCategory, setCurrentCategory] = useState<CategoryId>('top5');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => loadJSON<string[]>(STORAGE.favorites, []));
  const [teachingContext, setTeachingContext] = useState<TeachingContext>(() => ({
    ...initialContext,
    ...loadJSON<Partial<TeachingContext>>(STORAGE.context, {}),
  }));
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);
  const [toolProgress, setToolProgress] = useState<Record<string, number[]>>(() => loadJSON(STORAGE.toolProgress, {}));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SkillDraft>>({});
  const [bannerFailed, setBannerFailed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveJSON(STORAGE.favorites, favorites), [favorites]);
  useEffect(() => saveJSON(STORAGE.role, currentRole), [currentRole]);
  useEffect(() => saveJSON(STORAGE.toolProgress, toolProgress), [toolProgress]);
  useEffect(() => {
    const t = window.setTimeout(() => saveJSON(STORAGE.context, teachingContext), 300);
    return () => window.clearTimeout(t);
  }, [teachingContext]);

  useEffect(() => {
    fetchAiStatus().then(setAiStatus);
  }, []);

  // 按「/」快速聚焦搜尋框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && !activeSkill && !activeTool && !isGuideOpen && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeSkill, activeTool, isGuideOpen]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const updateTeachingContext = useCallback((updates: Partial<TeachingContext>) => {
    setTeachingContext((prev) => ({ ...prev, ...updates }));
  }, []);
  const resetTeachingContext = useCallback(() => setTeachingContext(initialContext), []);
  const closeSkill = useCallback(() => setActiveSkill(null), []);
  const saveDraft = useCallback((id: string, patch: SkillDraft) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);
  const closeTool = useCallback(() => setActiveTool(null), []);
  const toggleToolStep = useCallback((id: string, step: number) => {
    setToolProgress((prev) => {
      const cur = prev[id] || [];
      return { ...prev, [id]: cur.includes(step) ? cur.filter((x) => x !== step) : [...cur, step] };
    });
  }, []);

  /** 下載全部工具的提示詞講義（研習用） */
  const downloadAllTools = () => {
    const order: ToolGroup[] = ['common', 'professor', 'student'];
    const md = [
      `每個工具都是一組提示詞：開啟 Gemini（${GEMINI_URL}），在輸入框下方的「工具」選 Canvas，依序貼上各步驟的提示詞，就能生成屬於自己的 AI 工具。`,
      ...order.flatMap((g) => {
        const meta = TOOL_GROUPS.find((x) => x.id === g)!;
        return [`# ${meta.title}：${meta.subtitle}`, ...toolsInGroup(g).map((t) => toolGuideMarkdown(t, 2))];
      }),
    ].join('\n\n');
    downloadFile('NCUE_AI_工具箱_全部提示詞.docx', markdownToDocx(md, 'AI 工具箱：Gemini Canvas 提示詞講義', 'NCUE 未來教師 AI 力・彰化師範大學'));
  };

  const openSkillById = (id: string) => {
    const s = skillsData.find((x) => x.id === id);
    if (s) {
      setIsGuideOpen(false);
      setActiveSkill(s);
    }
  };

  const selectCategory = (id: CategoryId) => {
    setSearchQuery('');
    setCurrentCategory(id);
  };

  const counts = useMemo(() => {
    const c = { all: skillsData.length, top5: 0, favorites: favorites.length, tools: TOOLS.length } as Record<CategoryId, number>;
    for (const cat of skillCategories) c[cat.id] = 0;
    for (const s of skillsData) {
      c[s.cat]++;
      if (s.top) c.top5++;
    }
    return c;
  }, [favorites]);

  const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const isSearching = terms.length > 0;

  const visibleSkills = useMemo(() => {
    if (isSearching) {
      return skillsData
        .map((s) => ({ s, score: searchScore(s, terms) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id))
        .map((x) => x.s);
    }
    switch (currentCategory) {
      case 'tools':
        return [];
      case 'top5':
        return skillsData.filter((s) => s.top);
      case 'favorites':
        return skillsData.filter((s) => favorites.includes(s.id));
      case 'all':
        return skillsData;
      default:
        return skillsData.filter((s) => s.cat === currentCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, searchQuery, favorites]);

  const matchedTools = useMemo(
    () => (isSearching ? TOOLS.filter((t) => terms.every((term) => `${t.title}${t.tagline}${t.desc}${t.theme ?? ''}`.toLowerCase().includes(term))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchQuery],
  );
  const showTools = currentCategory === 'tools' && !isSearching;

  const activeCategoryMeta = categories.find((c) => c.id === currentCategory) || categories[0];

  const renderCard = (skill: Skill) => (
    <SkillCard
      key={skill.id}
      skill={skill}
      isFavorite={favorites.includes(skill.id)}
      onToggleFavorite={toggleFavorite}
      onOpen={setActiveSkill}
      categoryName={categoryName(skill.cat)}
      hasOutput={Boolean(drafts[skill.id]?.output)}
    />
  );

  const grid = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-blue-900 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow"
      >
        跳到技能列表
      </a>

      <Header currentRole={currentRole} onRoleChange={setCurrentRole} onOpenGuide={() => setIsGuideOpen(true)} />

      {!bannerFailed && (
        <div className="w-full bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <img
              src={BANNER_IMAGE_URL}
              alt="NCUE 未來教師 AI 力：Skills 設計與教學創新"
              onError={() => setBannerFailed(true)}
              decoding="async"
              className="w-full h-auto rounded-2xl shadow-xl border border-blue-500/25"
            />
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        <Sidebar currentCategory={currentCategory} onSelectCategory={selectCategory} counts={counts} dimmed={isSearching} />

        <main id="main" className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {isSearching ? `搜尋「${searchQuery.trim()}」` : activeCategoryMeta.name}
                </h2>
                <span
                  className={`shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                    showTools ? 'bg-teal-100 text-teal-900' : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {showTools
                    ? `${TOOLS.length} 個工具`
                    : isSearching
                      ? `${visibleSkills.length + matchedTools.length} 個結果`
                      : `${visibleSkills.length} 個技能`}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {isSearching ? '搜尋範圍：AI 工具箱與全部技能（名稱、標籤、說明與 Prompt 內文）' : activeCategoryMeta.description}
              </p>
            </div>

            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
                placeholder="搜尋技能、課綱、標籤…（按 / ）"
                aria-label="搜尋技能"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all shadow-xs [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜尋"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {currentCategory === 'top5' && !isSearching && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-amber-300" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">師資培育研習必修 Top 5 核心技能</h3>
                  <p className="text-xs text-blue-200/90">教案生成、數位互動、差異化分層、15 分鐘試教演練與 ORID 反思日誌</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectCategory('all')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors whitespace-nowrap text-white border border-white/20 flex items-center gap-1"
              >
                瀏覽全部 {skillsData.length} 個技能 <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {matchedTools.length > 0 && (
            <section aria-label="符合的 AI 工具" className="mb-8">
              <h3 className="text-sm font-bold text-teal-800 mb-3">AI 工具</h3>
              <div className={grid}>
                {matchedTools.map((t) => (
                  <ToolCard key={t.id} tool={t} onOpen={setActiveTool} progress={toolProgress[t.id]?.length || 0} />
                ))}
              </div>
              {visibleSkills.length > 0 && <h3 className="text-sm font-bold text-blue-900 mt-8 -mb-1">教學技能</h3>}
            </section>
          )}

          {showTools ? (
            <div className="space-y-10">
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-800 to-teal-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <ol className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm">
                  <li><span className="font-bold text-teal-200">1</span>　開啟 Gemini，工具選 Canvas</li>
                  <li><span className="font-bold text-teal-200">2</span>　依序貼上每一步提示詞</li>
                  <li><span className="font-bold text-teal-200">3</span>　生成工具，分享連結</li>
                </ol>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={GEMINI_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-white text-teal-900 hover:bg-teal-50 whitespace-nowrap"
                  >
                    開啟 Gemini
                  </a>
                  <button
                    type="button"
                    onClick={downloadAllTools}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 whitespace-nowrap"
                  >
                    下載全部提示詞講義（Word）
                  </button>
                </div>
              </div>
              {(currentRole === 'professor' ? ['professor', 'common', 'student'] : ['student', 'common', 'professor']).map((gid) => {
                const g = TOOL_GROUPS.find((x) => x.id === gid)!;
                const mine = (gid === 'professor' && currentRole === 'professor') || (gid === 'student' && currentRole === 'student');
                return (
                  <section key={g.id} aria-labelledby={`tools-${g.id}`} className="space-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2 border-b border-slate-200">
                      <h3 id={`tools-${g.id}`} className={`text-lg font-bold ${gid === 'professor' ? 'text-amber-900' : gid === 'student' ? 'text-blue-900' : 'text-teal-800'}`}>
                        {g.title}
                      </h3>
                      <span className="text-sm text-slate-500">{g.subtitle}</span>
                      {mine && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">你目前的身分</span>
                      )}
                    </div>
                    <div className={grid}>
                      {toolsInGroup(g.id as ToolGroup).map((t) => (
                        <ToolCard key={t.id} tool={t} onOpen={setActiveTool} progress={toolProgress[t.id]?.length || 0} />
                      ))}
                    </div>
                  </section>
                );
              })}
              <p className="text-xs text-slate-500 leading-relaxed">
                提示詞的完成進度記在這台裝置的瀏覽器中。Gemini Canvas 需要 Google 帳號；用學校帳號時，若看不到 Canvas，請改用個人帳號或洽學校管理員。
              </p>
            </div>
          ) : visibleSkills.length === 0 ? (
            matchedTools.length > 0 ? null : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                {currentCategory === 'favorites' && !isSearching ? <Star className="w-6 h-6" /> : <Search className="w-6 h-6" />}
              </div>
              {currentCategory === 'favorites' && !isSearching ? (
                <>
                  <h3 className="text-base font-bold text-slate-800 mb-1">還沒有收藏的技能</h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-4">點技能卡右上角的星號，就會出現在這裡。</p>
                  <button
                    type="button"
                    onClick={() => selectCategory('all')}
                    className="px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
                  >
                    瀏覽全部技能
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-slate-800 mb-1">找不到相符的技能</h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-4">換個關鍵字試試，例如「教案」、「評量」、「Rubric」或技能編號「12」。</p>
                  <button
                    type="button"
                    onClick={() => selectCategory('top5')}
                    className="px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
                  >
                    清除搜尋
                  </button>
                </>
              )}
            </div>
            )
          ) : currentCategory === 'all' && !isSearching ? (
            <div className="space-y-10">
              {skillCategories.map((cat) => {
                const catSkills = visibleSkills.filter((s) => s.cat === cat.id);
                if (!catSkills.length) return null;
                return (
                  <section key={cat.id} aria-labelledby={`sec-${cat.id}`} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                      <h3 id={`sec-${cat.id}`} className="text-lg font-bold text-blue-900">
                        {cat.name}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                        {catSkills.length} 個技能
                      </span>
                    </div>
                    <div className={grid}>{catSkills.map(renderCard)}</div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className={grid}>{visibleSkills.map(renderCard)}</div>
          )}

          <footer className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
            <span>國立彰化師範大學 師資培育與教學中心 · NCUE Future Teacher AI Skills</span>
            <span>108 課綱素養導向 · 生成式 AI 教學輔助應用</span>
          </footer>
        </main>
      </div>

      {activeSkill && (
        <SkillModal
          key={activeSkill.id}
          skill={activeSkill}
          currentRole={currentRole}
          onClose={closeSkill}
          context={teachingContext}
          onUpdateContext={updateTeachingContext}
          onResetContext={resetTeachingContext}
          aiStatus={aiStatus}
          draft={drafts[activeSkill.id] || {}}
          onSaveDraft={saveDraft}
        />
      )}

      {activeTool && (
        <ToolGuide
          key={activeTool.id}
          tool={activeTool}
          done={toolProgress[activeTool.id] || []}
          onToggleDone={toggleToolStep}
          onClose={closeTool}
        />
      )}

      <QuickGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} onOpenSkill={openSkillById} />
    </div>
  );
}
