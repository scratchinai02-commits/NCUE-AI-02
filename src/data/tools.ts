/**
 * AI 工具箱：學生與教授最常用的 5 個工具。
 * 這個檔案前端（介面、複製指令）與後端（server.ts 系統指令、檔案檢查）共用，請勿引入瀏覽器專用的套件。
 */

export type ToolId = 'sandbox' | 'pdf' | 'translate' | 'ocr' | 'apa';

export interface ToolOption {
  id: string;
  label: string;
  choices: string[];
}

export interface ToolFileSpec {
  /** <input accept> */
  accept: string;
  /** 後端允許的 MIME 類型 */
  mimes: string[];
  maxMB: number;
  label: string;
  hint: string;
  required: boolean;
}

export interface ToolDef {
  id: ToolId;
  title: string;
  tagline: string;
  desc: string;
  audience: string;
  file?: ToolFileSpec;
  text: { label: string; placeholder: string; required: boolean };
  options?: ToolOption[];
  /** 快速帶入的範例文字 */
  quick?: string[];
  /** 得到第一個回答後的追問建議 */
  followUps: string[];
  runLabel: string;
}

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

export const TOOLS: ToolDef[] = [
  {
    id: 'sandbox',
    title: 'Gemini 沙盒',
    tagline: '自由對話、測試你寫的 Prompt',
    desc: '像在 Gemini 官網一樣自由提問，可附加 PDF 或圖片並連續追問。適合測試自己寫的 Prompt、腦力激盪，或請 AI 修改文字。',
    audience: '師培生・教授',
    file: {
      accept: '.pdf,.png,.jpg,.jpeg,.webp,.heic,.txt',
      mimes: ['application/pdf', 'text/plain', ...IMAGE_MIMES],
      maxMB: 15,
      label: '附加檔案（選填）',
      hint: 'PDF、圖片或純文字，上限 15 MB',
      required: false,
    },
    text: { label: '你的問題或 Prompt', placeholder: '輸入任何問題，或貼上你想測試的 Prompt…', required: true },
    options: [{ id: 'style', label: '回答風格', choices: ['一般', '精簡條列', '教學示範（附例子）', '蘇格拉底式提問（只引導不給答案）'] }],
    quick: [
      '幫我想 5 個國中數學課的破冰提問，每個附上預期學生反應。',
      '把下面這段文字改寫成國小五年級看得懂的版本：\n\n',
      '檢查下面這段文字的錯字、語病與標點，並列出修改前後對照：\n\n',
      '請扮演嚴格的教甄口試委員，針對我的教學理念追問 3 個問題，每次只問一題：\n\n我的教學理念是：',
    ],
    followUps: ['再精簡一點', '改成表格呈現', '舉一個課堂實例'],
    runLabel: '送出',
  },
  {
    id: 'pdf',
    title: 'PDF 文件助理',
    tagline: '上傳講義、論文、公文，摘要與問答',
    desc: '上傳 PDF 後，AI 只根據文件內容做重點摘要、章節大綱、出理解測驗或回答你的問題，並盡量標註頁碼。掃描檔也能讀。',
    audience: '師培生・教授',
    file: {
      accept: '.pdf',
      mimes: ['application/pdf'],
      maxMB: 15,
      label: '上傳 PDF',
      hint: '文字型或掃描型 PDF，上限 15 MB',
      required: true,
    },
    text: { label: '想問的問題或補充要求（選填）', placeholder: '例如：這篇研究的樣本是誰？研究限制有哪些？', required: false },
    options: [
      {
        id: 'task',
        label: '任務',
        choices: ['重點摘要', '逐章節大綱', '出 10 題理解測驗（附解答）', '整理成上課用的重點講義', '只回答我的問題'],
      },
    ],
    followUps: ['用 3 句話講給學生聽', '列出文中的關鍵名詞與定義', '這份文件對教學現場有什麼啟示？'],
    runLabel: '開始分析',
  },
  {
    id: 'translate',
    title: '沉浸式翻譯',
    tagline: '原文與譯文逐段對照',
    desc: '貼上文字或上傳 PDF／圖片，產出逐段對照的雙語譯文。可翻成英、日、韓，也支援越南語、印尼語，方便寫給新住民家長的通知。',
    audience: '師培生・教授',
    file: {
      accept: '.pdf,.png,.jpg,.jpeg,.webp,.heic',
      mimes: ['application/pdf', ...IMAGE_MIMES],
      maxMB: 15,
      label: '上傳 PDF 或圖片（選填）',
      hint: '也可以只在下方貼上文字；上限 15 MB',
      required: false,
    },
    text: { label: '要翻譯的文字', placeholder: '貼上論文段落、英文教材、家長通知單…（已上傳檔案則可留空）', required: false },
    options: [
      { id: 'lang', label: '翻成', choices: ['繁體中文（臺灣）', 'English', '日本語', '한국어', 'Tiếng Việt（越南語）', 'Bahasa Indonesia（印尼語）'] },
      { id: 'layout', label: '呈現方式', choices: ['逐段對照（原文＋譯文）', '左右對照表格', '只要譯文'] },
      { id: 'tone', label: '語氣', choices: ['忠實學術', '一般自然', '給家長的親切口吻'] },
    ],
    followUps: ['列出專有名詞中英對照表', '把譯文改得更口語', '依內容出 5 題閱讀理解題'],
    runLabel: '開始翻譯',
  },
  {
    id: 'ocr',
    title: '圖片文字辨識',
    tagline: '板書、手寫筆記、學習單照片轉文字',
    desc: '拍下黑板、白板、手寫筆記或紙本學習單，轉成可以編輯的文字或表格。看不清楚的地方會標示出來，不會亂猜。',
    audience: '師培生・教授',
    file: {
      accept: '.png,.jpg,.jpeg,.webp,.heic,.pdf',
      mimes: [...IMAGE_MIMES, 'application/pdf'],
      maxMB: 10,
      label: '上傳照片或掃描檔',
      hint: 'JPG、PNG、HEIC 或 PDF，上限 10 MB',
      required: true,
    },
    text: { label: '補充說明（選填）', placeholder: '例如：這是國二理化「浮力」的板書', required: false },
    options: [
      { id: 'format', label: '輸出方式', choices: ['照原樣轉成文字', '整理成條列筆記', '表格內容轉成表格', '轉成可編輯的學習單'] },
      { id: 'fix', label: '錯字處理', choices: ['保留原文不修改', '校正明顯錯字並標示'] },
    ],
    followUps: ['整理成 3 個重點', '依內容出 5 題小考', '翻成英文'],
    runLabel: '開始辨識',
  },
  {
    id: 'apa',
    title: 'APA 7 引用格式',
    tagline: '整理參考文獻與文內引用',
    desc: '貼上雜亂的書目資料（或上傳論文首頁、書名頁），整理成 APA 第 7 版參考文獻與文內引用。缺少的資訊會標示出來，不會自己編。',
    audience: '師培生・教授',
    file: {
      accept: '.pdf,.png,.jpg,.jpeg,.webp',
      mimes: ['application/pdf', ...IMAGE_MIMES],
      maxMB: 10,
      label: '上傳論文首頁或書名頁（選填）',
      hint: 'PDF 或圖片，上限 10 MB',
      required: false,
    },
    text: {
      label: '文獻資料（可多筆，格式亂也沒關係）',
      placeholder: '例如：\n王小明 2021 差異化教學對國中生數學學習成效之影響 教育研究集刊 67卷2期 頁1-35\nTomlinson, C. A. The differentiated classroom 2nd ed ASCD 2014',
      required: false,
    },
    options: [
      { id: 'output', label: '輸出內容', choices: ['參考文獻列表', '參考文獻＋文內引用範例'] },
      { id: 'order', label: '排序', choices: ['依 APA 規則排序（中文在前、英文在後）', '保持我輸入的順序'] },
    ],
    followUps: ['哪幾筆資訊不完整？', '轉成 BibTeX 格式', '依出版年由新到舊排序'],
    runLabel: '整理格式',
  },
];

export const TOOL_IDS = TOOLS.map((t) => t.id);

const BASE_SYSTEM =
  '你是協助台灣師資培育的教學與研究助理，服務對象是師培生與大學教授。除非使用者要求其他語言，一律使用臺灣繁體中文與臺灣教育現場用語，並以 Markdown（標題、條列、表格）輸出。不確定的事實、課綱代碼、文獻資訊請標註「（請查證）」，不可杜撰。';

export const TOOL_SYSTEM: Record<ToolId, string> = {
  sandbox: BASE_SYSTEM,
  pdf: `${BASE_SYSTEM}使用者會上傳 PDF：所有回答都必須根據該文件內容，文件沒有提到的請明說「文件未提及」，引用內容時盡量標註頁碼（例如：p.3）。`,
  translate: `${BASE_SYSTEM}你同時是專業譯者：譯文須忠實、通順、符合目標語言的習慣，不可增刪原意，不可省略段落。專有名詞第一次出現時，以括號保留原文。`,
  ocr: `${BASE_SYSTEM}你負責辨識圖片或掃描檔中的文字：逐字辨識，看不清楚或無法確定的字以【?】標示，絕不猜測補寫。數學式以 LaTeX 或一般文字表示。`,
  apa: `${BASE_SYSTEM}你熟悉 APA 第 7 版格式（含中文文獻慣例：作者全名、（年）、書名或期刊名、卷（期）、頁碼）。使用者沒提供的資訊不可自行補上，請以【缺：出版年】這類方式標示；可能有誤的資訊在該筆後註記「（請查證）」。`,
};

export interface ToolInput {
  text: string;
  options: Record<string, string>;
  fileName?: string;
}

export function defaultOptions(tool: ToolDef): Record<string, string> {
  return Object.fromEntries((tool.options || []).map((o) => [o.id, o.choices[0]]));
}

/** 第一則訊息（送給 AI 的完整指令）。也用於「複製指令」到外部 AI。 */
export function buildToolPrompt(id: ToolId, input: ToolInput): string {
  const text = input.text.trim();
  const o = input.options;
  const file = input.fileName ? `（已附上檔案：${input.fileName}）` : '';

  switch (id) {
    case 'sandbox': {
      const style = o.style && o.style !== '一般' ? `【回答風格】${o.style}\n\n` : '';
      return `${style}${file ? file + '\n\n' : ''}${text}`;
    }
    case 'pdf': {
      const task = o.task || '重點摘要';
      const taskText: Record<string, string> = {
        重點摘要: '請整理這份 PDF 的重點摘要：先用 3 句話說明全文主旨，再條列 5–8 個重點（附頁碼），最後列出值得注意的數據或結論。',
        逐章節大綱: '請依這份 PDF 的章節順序，整理成階層式大綱（章 → 節 → 重點），每個重點附頁碼。',
        '出 10 題理解測驗（附解答）': '請根據這份 PDF 出 10 題理解測驗（7 題單選、3 題簡答），題目涵蓋不同章節；全部題目後另列解答與出處頁碼。',
        整理成上課用的重點講義: '請把這份 PDF 整理成一份上課用的重點講義：學習目標、核心概念（附簡短說明與例子）、重點整理表格、課後思考題 3 題。',
        只回答我的問題: '請只根據這份 PDF 回答我下面的問題。',
      };
      return `${file}${taskText[task] || taskText['重點摘要']}${text ? `\n\n我的問題／補充要求：${text}` : ''}`;
    }
    case 'translate': {
      const lang = o.lang || '繁體中文（臺灣）';
      const layout = o.layout || '逐段對照（原文＋譯文）';
      const tone = o.tone || '忠實學術';
      const layoutText: Record<string, string> = {
        '逐段對照（原文＋譯文）':
          '請用「沉浸式翻譯」格式輸出：每一段先以 Markdown 引用（開頭加「> 」）呈現原文，下一段緊接著是譯文；依原文順序逐段處理，不要合併或省略段落。標題保持標題格式。',
        左右對照表格: '請用兩欄 Markdown 表格輸出，左欄「原文」、右欄「譯文」，每一列放一段（長段落可拆成句子），依原文順序。',
        只要譯文: '只輸出譯文，保持原本的段落與標題結構。',
      };
      return [
        `請把${input.fileName ? '附上的檔案' : '下面的文字'}翻譯成「${lang}」，語氣：${tone}。`,
        layoutText[layout] || layoutText['逐段對照（原文＋譯文）'],
        '最後附上「專有名詞對照」小表格（原文／譯名），若沒有專有名詞可省略。',
        text ? `【要翻譯的文字】\n"""\n${text}\n"""` : file,
      ]
        .filter(Boolean)
        .join('\n\n');
    }
    case 'ocr': {
      const format = o.format || '照原樣轉成文字';
      const fix = o.fix || '保留原文不修改';
      const formatText: Record<string, string> = {
        照原樣轉成文字: '請把內容逐字轉成文字，盡量保留原本的分行、編號與版面順序。',
        整理成條列筆記: '請先辨識全部文字，再整理成有標題的條列式筆記（保留所有重點，不要自行增加內容）。',
        表格內容轉成表格: '請把圖中的表格轉成 Markdown 表格；表格以外的文字照原樣放在表格前後。',
        轉成可編輯的學習單: '請把內容轉成可編輯的學習單格式：保留題號與題目，作答處以「＿＿＿＿」表示。',
      };
      return [
        `${file}請辨識這份圖片／掃描檔中的文字。`,
        formatText[format] || formatText['照原樣轉成文字'],
        fix === '校正明顯錯字並標示' ? '遇到明顯錯字請校正，並以（原：○○）標示原本的寫法。' : '不要修改原文，錯字也照原樣保留。',
        '看不清楚的字以【?】標示。最後用一行說明辨識信心（高／中／低）與需要人工確認的地方。',
        text ? `補充說明：${text}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'apa': {
      const output = o.output || '參考文獻列表';
      const order = o.order || '依 APA 規則排序（中文在前、英文在後）';
      const rules = [
        `輸出「參考文獻」列表，${order === '保持我輸入的順序' ? '保持我輸入的順序' : '依 APA 規則排序：中文文獻依作者姓氏筆畫、英文文獻依姓氏字母，中文在前、英文在後'}。`,
        output === '參考文獻＋文內引用範例' ? '每筆附上文內引用範例（括號式與敘述式各一）。' : '',
        '斜體部分用 Markdown 斜體（*書名*）表示。缺少的資訊以【缺：○○】標示，不可自行補上。',
        '最後用表格列出每筆的檢查結果：完整／缺少哪些資訊／需要查證的地方。',
      ].filter(Boolean);
      return [
        `${file}請把${input.fileName && !text ? '附上檔案中的文獻' : '下面的文獻資料'}整理成 APA 第 7 版格式。`,
        ...rules.map((r, i) => `${i + 1}. ${r}`),
        text ? `\n【文獻資料】\n"""\n${text}\n"""` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
  }
}

/** 第一則訊息在對話紀錄中顯示的精簡版本 */
export function summarizeToolInput(tool: ToolDef, input: ToolInput): string {
  const opts = (tool.options || []).map((o) => `${o.label}：${input.options[o.id]}`).join('・');
  const parts = [input.fileName ? `📎 ${input.fileName}` : '', opts, input.text.trim()];
  return parts.filter(Boolean).join('\n');
}

/** 檢查是否可以送出；回傳錯誤訊息或 null */
export function validateToolInput(tool: ToolDef, input: ToolInput): string | null {
  if (tool.file?.required && !input.fileName) return `請先${tool.file.label}。`;
  if (tool.text.required && !input.text.trim()) return `請輸入${tool.text.label}。`;
  if ((tool.id === 'translate' || tool.id === 'apa') && !input.text.trim() && !input.fileName) {
    return tool.id === 'translate' ? '請貼上要翻譯的文字，或上傳檔案。' : '請貼上文獻資料，或上傳論文首頁。';
  }
  return null;
}
