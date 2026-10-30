import React from 'react';
import { CategoryId } from '../types';
import { categories } from '../data/skills';
import { TEACHING_PORTALS } from '../data/resources';
import {
  Award,
  BookOpen,
  Layers,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Star,
  LayoutGrid,
  ExternalLink,
  BookMarked,
  Laptop,
  Tv,
  ShieldCheck,
  Wrench,
  SquareTerminal,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  counts: Record<CategoryId, number>;
  dimmed?: boolean;
}

const ICONS: Record<CategoryId, React.ReactNode> = {
  tools: <Wrench className="w-4 h-4 text-teal-600" />,
  agents: <SquareTerminal className="w-4 h-4 text-violet-600" />,
  top5: <Award className="w-4 h-4 text-amber-500" />,
  cat1: <BookOpen className="w-4 h-4 text-blue-600" />,
  cat2: <Layers className="w-4 h-4 text-emerald-600" />,
  cat3: <CheckCircle2 className="w-4 h-4 text-purple-600" />,
  cat4: <GraduationCap className="w-4 h-4 text-orange-600" />,
  cat5: <Sparkles className="w-4 h-4 text-rose-600" />,
  favorites: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
  all: <LayoutGrid className="w-4 h-4 text-slate-600" />,
};

const PORTAL_ICONS = [BookOpen, Laptop, Tv, ShieldCheck, Zap];

export const Sidebar: React.FC<SidebarProps> = ({ currentCategory, onSelectCategory, counts, dimmed }) => {
  return (
    <aside className="w-full md:w-64 lg:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 md:shrink-0 md:sticky md:top-0 md:self-start md:max-h-screen md:overflow-y-auto">
      <nav aria-label="技能分類" className="p-3 md:p-4 md:border-b border-slate-100">
        <div className="hidden md:flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-400 tracking-wider">工具與技能</span>
          <span className="text-xs text-slate-400 font-mono">{counts.tools + counts.agents} 工具 · {counts.all} 技能</span>
        </div>

        <ul className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible scrollbar-none -mx-3 px-3 md:mx-0 md:px-0">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.id && !dimmed;
            const count = counts[cat.id];
            return (
              <li key={cat.id} className={`shrink-0 md:shrink ${cat.id === 'agents' ? 'md:pb-2 md:mb-1 md:border-b md:border-slate-100' : ''}`}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full text-left px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-between gap-2.5 whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-700 bg-slate-100 md:bg-transparent hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 ${isActive ? '[&_svg]:text-white [&_svg]:fill-none' : ''}`} aria-hidden="true">
                      {ICONS[cat.id]}
                    </span>
                    <span className="md:leading-snug break-keep">{cat.name}</span>
                  </span>
                  {cat.id !== 'all' && (
                    <span
                      className={`text-[11px] min-w-6 text-center px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : cat.id === 'tools'
                            ? 'bg-teal-100 text-teal-800'
                            : cat.id === 'agents'
                              ? 'bg-violet-100 text-violet-800'
                            : cat.id === 'top5' || cat.id === 'favorites'
                              ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 教學資料庫 */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 hidden md:block">
        <p className="text-xs font-bold text-slate-600 tracking-wider flex items-center gap-1.5 mb-3 px-1">
          <BookMarked className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          必備教學資料庫
        </p>
        <ul className="space-y-1 text-xs text-slate-600">
          {TEACHING_PORTALS.map(({ title, url }, i) => {
            const Icon = PORTAL_ICONS[i] ?? BookOpen;
            return (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg hover:bg-white hover:text-blue-900 flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" aria-hidden="true" />
                  {title}
                </span>
                <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-600" aria-hidden="true" />
              </a>
            </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden md:block text-xs m-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100/60">
        <p className="font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
          <span aria-hidden="true">💡</span> 研習實戰小技巧
        </p>
        <p className="leading-relaxed text-blue-950/80">
          教學情境只要填一次，切換任何技能都會自動帶入，下次開啟網頁也會記得。按 <kbd className="px-1 py-0.5 rounded bg-white border border-blue-200 font-mono text-[10px]">/</kbd> 可快速搜尋技能。
        </p>
      </div>
    </aside>
  );
};
