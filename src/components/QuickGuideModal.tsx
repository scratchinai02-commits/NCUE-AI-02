import React from 'react';
import { X, GraduationCap, CheckCircle2, ShieldCheck, Sparkles, Route } from 'lucide-react';
import { skillsData } from '../data/skills';
import { useDialog } from '../lib/useDialog';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSkill: (id: string) => void;
}

const studentPath = [
  ['01', '課綱解讀', '將課綱條目轉化為 3–5 個具體可評量目標。'],
  ['02', '教案生成', '融入特定教學法（如 PBL 或合作學習）。'],
  ['12', '差異化教學', '為班級程度落差設計分層鷹架。'],
  ['16', 'Rubric 規準', '制定客觀明確的表現評量向度。'],
  ['19', '試教演練', '模擬 15 分鐘教甄板書與評審追問。'],
];
const professorPath = [
  ['03', 'TPACK 架構', '審視師培生科技融入是否流於表面。'],
  ['06', 'UbD 逆向設計', '引導師培生以終為始檢視評量證據。'],
  ['15', '誘答選項', '分析師培生命題之鑑別度與迷思概念。'],
  ['22', '教學觀課', '設計入班觀課與議課的專業觀察焦點表。'],
  ['25', '行動研究', '指導教學現場實務研究與發表。'],
];

const steps = [
  ['選身分', '右上角切換「師培生／教授」，Prompt 的角色與結尾提醒會跟著改變。'],
  ['填情境', '教育階段、科目、單元、教學法只要填一次（或套用範例），所有技能共用，下次開啟也會記得。'],
  ['看 Prompt', '右側即時組合完整 Prompt，可直接修改文字；需要時在「附加素材」貼上學生作答或數據。'],
  ['複製或生成', '一鍵複製到 ChatGPT／Claude／Gemini，或在本站即時生成（需站方設定 API 金鑰）。'],
  ['帶走成果', '生成結果可複製（貼到 Word 保留表格格式）、下載 Word（.docx）或 Markdown 檔。'],
];

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose, onOpenSkill }) => {
  const ref = useDialog<HTMLDivElement>(isOpen, onClose);
  if (!isOpen) return null;

  const PathList = ({ items }: { items: string[][] }) => (
    <ol className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
      {items.map(([id, name, desc], i) => (
        <li key={id} className="flex gap-2">
          <span className="text-slate-400 tabular-nums">{i + 1}.</span>
          <span>
            <button
              type="button"
              onClick={() => onOpenSkill(id)}
              className="font-bold text-blue-900 hover:underline underline-offset-2"
            >
              Skill {id} {name}
            </button>
            ：{desc}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden border border-slate-200 outline-none"
      >
        <div className="px-5 sm:px-6 py-4 flex justify-between items-center gap-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <GraduationCap className="w-5 h-5 text-blue-200 shrink-0" aria-hidden="true" />
            <h2 id="guide-title" className="text-base sm:text-lg font-bold truncate">
              彰師大師培 AI 實戰工具箱 · 使用指引
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉使用指引"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed">
          <section>
            <h3 className="font-bold text-blue-900 text-base mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
              為什麼設計這套工具箱？
            </h3>
            <p className="text-slate-600">
              因應 108 課綱核心素養導向與教育部中小學數位教學指引，師培生在準備集中實習、教檢與教師甄試時，常面臨「不知道如何精確向 AI 下提示詞」或「生成的教案脫離台灣課綱結構」等痛點。本工具箱將 {skillsData.length} 個高頻教學實戰場景模組化，一鍵組合兼顧「學習表現」、「核心素養」與「具體評量」的專業 Prompt。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-blue-900 text-base mb-3 flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-600" aria-hidden="true" />
              五步驟上手
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {steps.map(([title, desc], i) => (
                <li key={title} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-blue-700 mb-0.5">STEP {i + 1}</span>
                  <span className="block font-bold text-slate-900 text-sm mb-1">{title}</span>
                  <span className="block text-xs text-slate-600 leading-relaxed">{desc}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="p-4 rounded-xl border border-teal-200 bg-teal-50/60">
            <h3 className="font-bold text-teal-900 mb-1.5">AI 工具箱（側欄最上方，共 15 個）</h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-1.5">
              每個工具都是一組提示詞：開啟 Gemini、在「工具」選 Canvas，依序貼上 3 個步驟，就能生成一個屬於自己的 AI 工具，並分享連結給學生或同事。
            </p>
            <ul className="text-xs text-slate-700 leading-relaxed space-y-1">
              <li>
                <strong>共同常用</strong>：Prompt 實驗室、PDF 文件助理、PDF 沉浸式翻譯、板書與手寫辨識、APA 7 引用格式。
              </li>
              <li>
                <strong>教授場域</strong>：研究發想助理、學術寫作潤飾台、研究資料分析台、課程專屬 AI 助教（RAG）、批次回饋工作流（Agent）。
              </li>
              <li>
                <strong>師培生場域</strong>：AI 備課速成、教學圖像工作室、課堂遊戲產生器、出題與錯誤診斷、班級經營模擬器。
              </li>
            </ul>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">👩‍🏫</span> 師培生推薦通關路徑
              </h3>
              <PathList items={studentPath} />
            </section>
            <section className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <span aria-hidden="true">👨‍💼</span> 教授與輔導教師路徑
              </h3>
              <PathList items={professorPath} />
            </section>
          </div>

          <section className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              AI 教學倫理三大實踐原則
            </h3>
            <ul className="space-y-1.5 text-xs text-emerald-950">
              {[
                ['保護學生隱私', '切勿將學生的真實姓名、學號、特殊身分或敏感健康資訊輸入提示詞或附加素材中，請以代號取代。'],
                ['教師專業把關', 'AI 生成的試題、課綱代碼或教案可能存在事實幻覺，教師務必以自身學科專業核實修訂。'],
                ['透明揭露原則', '在撰寫教案或教材時，標註使用 AI 輔助之工具與指令，落實負責任的數位素養。'],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>{t}</strong>：{d}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            我知道了，開始實戰
          </button>
        </div>
      </div>
    </div>
  );
};
