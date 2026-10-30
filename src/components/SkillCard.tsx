import React from 'react';
import { Skill } from '../types';
import { Star, ArrowUpRight, Sparkles } from 'lucide-react';

interface SkillCardProps {
  skill: Skill;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (skill: Skill) => void;
  categoryName: string;
  hasOutput?: boolean;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, isFavorite, onToggleFavorite, onOpen, categoryName, hasOutput }) => {
  return (
    <article className="relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-200 focus-within:border-blue-300 transition-all duration-200 group flex flex-col h-full">
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 text-xs text-slate-500">
          <span className="shrink-0 font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
            {skill.id}
          </span>
          {skill.top && (
            <span className="shrink-0 text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">必學</span>
          )}
          <span className="truncate">{categoryName}</span>
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(skill.id)}
          aria-label={isFavorite ? `取消收藏「${skill.title}」` : `收藏「${skill.title}」`}
          aria-pressed={isFavorite}
          className={`relative z-10 shrink-0 p-1.5 -m-1 rounded-lg transition-colors ${
            isFavorite ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
          }`}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Title — 整張卡片的點擊區（stretched button，鍵盤可操作） */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-900 transition-colors">
        <button
          type="button"
          onClick={() => onOpen(skill)}
          className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-blue-800"
        >
          {skill.title}
        </button>
      </h3>

      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">{skill.desc}</p>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-[11px] text-slate-500">
          {hasOutput ? (
            <span className="flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              已有生成成果
            </span>
          ) : (
            skill.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-100">
                {tag}
              </span>
            ))
          )}
        </div>
        <span
          className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-900 group-hover:text-white transition-all"
          aria-hidden="true"
        >
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </article>
  );
};
