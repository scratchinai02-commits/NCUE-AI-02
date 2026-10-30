import React from 'react';
import { Role } from '../types';
import { GraduationCap, ExternalLink, BookOpen, HelpCircle } from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenGuide: () => void;
}

const roles: { id: Role; emoji: string; label: string; short: string; active: string }[] = [
  { id: 'student', emoji: '👩‍🏫', label: '師培生', short: '師培生', active: 'bg-white text-blue-900' },
  { id: 'professor', emoji: '👨‍💼', label: '教授 / 輔導', short: '教授', active: 'bg-amber-400 text-slate-900' },
];

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange, onOpenGuide }) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md z-20 relative border-b border-blue-800/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
                <span className="hidden sm:inline">NCUE </span>未來教師 AI 力
              </h1>
              <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30 font-medium hidden lg:inline-block whitespace-nowrap">
                Skills 設計與教學創新
              </span>
            </div>
            <p className="text-xs text-blue-200/80 hidden md:block truncate">
              彰化師範大學 師資培育研習專用 · 108 課綱實戰教學技能
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            role="group"
            aria-label="使用身分（會改變 Prompt 的角色設定）"
            className="flex bg-black/30 p-1 rounded-xl border border-white/10"
          >
            {roles.map((r) => {
              const active = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRoleChange(r.id)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                    active ? `${r.active} shadow-md font-semibold` : 'text-blue-100 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <span aria-hidden="true" className="hidden sm:inline">
                    {r.emoji}
                  </span>
                  <span className="sm:hidden">{r.short}</span>
                  <span className="hidden sm:inline">{r.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="使用指引"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm transition-colors border border-white/10 flex items-center gap-1.5 whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4 text-blue-200" aria-hidden="true" />
            <span className="hidden sm:inline">使用指引</span>
          </button>

          <a
            href="https://www.naer.edu.tw/PageSyllabus?fid=52"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-white text-sm transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-emerald-300" aria-hidden="true" />
            <span>國教院 108 課綱</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
};
