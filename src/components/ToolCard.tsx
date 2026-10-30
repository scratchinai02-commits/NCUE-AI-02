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
  Upload,
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

/** 將 accept 副檔名轉成簡短說明，例如「PDF・圖片」 */
function fileTypes(accept: string) {
  const names: Record<string, string> = { '.pdf': 'PDF', '.txt': '文字檔', '.csv': 'CSV' };
  const labels = accept.split(',').map((e) => names[e] ?? '圖片');
  return [...new Set(labels)].join('・');
}

export const ToolIcon: React.FC<{ id: ToolId; className?: string }> = ({ id, className }) => {
  const Icon = ICONS[id];
  return <Icon className={className} aria-hidden="true" />;
};

interface ToolCardProps {
  tool: ToolDef;
  onOpen: (tool: ToolDef) => void;
  hasConversation?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpen, hasConversation }) => {
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
        {hasConversation ? (
          <span className="text-emerald-700 font-medium">有進行中的對話</span>
        ) : tool.file ? (
          <span className="flex items-center gap-1">
            <Upload className="w-3 h-3" aria-hidden="true" />
            {tool.file.required ? '需上傳' : '可上傳'} {fileTypes(tool.file.accept)}
          </span>
        ) : (
          <span>輸入文字即可</span>
        )}
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
