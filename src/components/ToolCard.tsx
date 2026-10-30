import React from 'react';
import type { ToolDef, ToolId } from '../data/tools';
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
  ArrowUpRight,
  Sparkles,
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
};

const GROUP_STYLE = {
  common: { badge: 'bg-slate-100 text-slate-600', label: '共同常用' },
  professor: { badge: 'bg-amber-100 text-amber-900', label: '教授' },
  student: { badge: 'bg-blue-100 text-blue-900', label: '師培生' },
} as const;

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
  return (
    <article className="relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-teal-300 focus-within:border-teal-400 transition-all duration-200 group flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors">
          <ToolIcon id={tool.id} className="w-5 h-5" />
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded text-right ${GROUP_STYLE[tool.group].badge}`}>
          {tool.theme ?? GROUP_STYLE[tool.group].label}
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-teal-800 transition-colors">
        <button
          type="button"
          onClick={() => onOpen(tool)}
          className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-teal-700"
        >
          {tool.title}
        </button>
      </h3>
      <p className="text-sm font-medium text-teal-800 mb-2">{tool.tagline}</p>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">{tool.desc}</p>

      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-teal-600" aria-hidden="true" />
          {tool.steps.length} 步提示詞・Gemini Canvas
          {progress > 0 && (
            <span className={`ml-1 font-semibold ${progress >= tool.steps.length ? 'text-emerald-700' : 'text-teal-700'}`}>
              {progress >= tool.steps.length ? '✓ 已完成' : `已完成 ${progress}/${tool.steps.length}`}
            </span>
          )}
        </span>
        <span
          className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-700 group-hover:text-white transition-all"
          aria-hidden="true"
        >
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </article>
  );
};
