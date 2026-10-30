import React from 'react';
import type { ToolDef, ToolId, ToolPlatform } from '../data/tools';
import {
  FlaskConical,
  FileText,
  Languages,
  ScanText,
  Quote,
  Lightbulb,
  PenLine,
  ChartColumn,
  Bot,
  Workflow,
  NotebookPen,
  Palette,
  Gamepad2,
  ClipboardCheck,
  Drama,
  Archive,
  Box,
  Vote,
  MessagesSquare,
  ChartScatter,
  ArrowUpRight,
  Sparkles,
  SquareTerminal,
} from 'lucide-react';

const ICONS: Record<ToolId, React.FC<{ className?: string }>> = {
  sandbox: FlaskConical,
  pdf: FileText,
  translate: Languages,
  ocr: ScanText,
  apa: Quote,
  research: Lightbulb,
  writing: PenLine,
  data: ChartColumn,
  tutor: Bot,
  workflow: Workflow,
  lesson: NotebookPen,
  visual: Palette,
  game: Gamepad2,
  assess: ClipboardCheck,
  classroom: Drama,
  revive: Archive,
  lesson3d: Box,
  liveclass: Vote,
  coursebot: MessagesSquare,
  analysis: ChartScatter,
};

const GROUP_STYLE = {
  common: { badge: 'bg-slate-100 text-slate-600', label: '共同常用' },
  professor: { badge: 'bg-amber-100 text-amber-900', label: '教授' },
  student: { badge: 'bg-blue-100 text-blue-900', label: '師培生' },
} as const;

/** 兩個工具箱的配色：Gemini 用青綠、Codex／Antigravity 用紫色 */
export const PLATFORM_STYLE: Record<
  ToolPlatform,
  { card: string; icon: string; title: string; tagline: string; meta: string; arrow: string; ring: string; footer: string }
> = {
  gemini: {
    card: 'hover:border-teal-300 focus-within:border-teal-400',
    icon: 'bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white',
    title: 'group-hover:text-teal-800',
    tagline: 'text-teal-800',
    meta: 'text-teal-600',
    arrow: 'group-hover:bg-teal-700',
    ring: 'focus-visible:after:ring-teal-700',
    footer: 'Gemini Canvas',
  },
  agent: {
    card: 'hover:border-violet-300 focus-within:border-violet-400',
    icon: 'bg-violet-50 text-violet-700 group-hover:bg-violet-700 group-hover:text-white',
    title: 'group-hover:text-violet-800',
    tagline: 'text-violet-800',
    meta: 'text-violet-600',
    arrow: 'group-hover:bg-violet-700',
    ring: 'focus-visible:after:ring-violet-700',
    footer: 'Codex／Antigravity',
  },
};

export const ToolIcon: React.FC<{ id: ToolId; className?: string }> = ({ id, className }) => {
  const Icon = ICONS[id];
  return <Icon className={className} aria-hidden="true" />;
};

interface ToolCardProps {
  tool: ToolDef;
  onOpen: (tool: ToolDef) => void;
  /** 已完成的步驟數 */
  progress?: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpen, progress = 0 }) => {
  const isAgent = tool.platform === 'agent';
  const st = PLATFORM_STYLE[tool.platform ?? 'gemini'];
  const MetaIcon = isAgent ? SquareTerminal : Sparkles;
  return (
    <article
      className={`relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-200 group flex flex-col h-full ${st.card}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${st.icon}`}>
          <ToolIcon id={tool.id} className="w-5 h-5" />
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded text-right ${GROUP_STYLE[tool.group].badge}`}>
          {isAgent ? GROUP_STYLE[tool.group].label : (tool.theme ?? GROUP_STYLE[tool.group].label)}
        </span>
      </div>

      <h3 className={`text-base sm:text-lg font-bold text-slate-900 mb-1 transition-colors ${st.title}`}>
        <button
          type="button"
          onClick={() => onOpen(tool)}
          className={`text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 ${st.ring}`}
        >
          {tool.title}
        </button>
      </h3>
      <p className={`text-sm font-medium mb-2 ${st.tagline}`}>{tool.tagline}</p>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">{tool.desc}</p>
      {tool.stack && <p className="text-[11px] font-mono text-slate-500 leading-relaxed -mt-1 mb-4">{tool.stack}</p>}

      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 flex-wrap">
          <MetaIcon className={`w-3 h-3 ${st.meta}`} aria-hidden="true" />
          {tool.steps.length} 步提示詞・{st.footer}
          {progress > 0 && (
            <span className={`ml-1 font-semibold ${progress >= tool.steps.length ? 'text-emerald-700' : st.tagline}`}>
              {progress >= tool.steps.length ? '✓ 已完成' : `已完成 ${progress}/${tool.steps.length}`}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-white transition-all ${st.arrow}`}
          aria-hidden="true"
        >
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </article>
  );
};
