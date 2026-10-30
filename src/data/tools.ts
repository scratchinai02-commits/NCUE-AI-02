/**
 * AI 工具箱：共同常用 5 個＋教授場域 5 個＋師培生場域 5 個。
 * 這個檔案前端（介面、複製指令）與後端（server.ts 系統指令、檔案檢查）共用，請勿引入瀏覽器專用的套件。
 */

export type ToolId =
  // 共同常用
  | 'sandbox'
  | 'pdf'
  | 'translate'
  | 'ocr'
  | 'apa'
  // 教授場域：AI 從工具走向研究與知識創造
  | 'research'
  | 'writing'
  | 'data'
  | 'tutor'
  | 'workflow'
  // 師培生場域：AI 從工具走向未來教師的教學能力
  | 'lesson'
  | 'visual'
  | 'game'
  | 'assess'
  | 'classroom';

export type ToolGroup = 'common' | 'professor' | 'student';

export const TOOL_GROUPS: { id: ToolGroup; title: string; subtitle: string }[] = [
  { id: 'common', title: '共同常用', subtitle: '上傳檔案、翻譯、辨識與引用，師生都用得到' },
  { id: 'professor', title: '教授場域', subtitle: 'AI 從工具走向研究與知識創造' },
  { id: 'student', title: '師培生場域', subtitle: 'AI 從工具走向未來教師的教學能力' },
];

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
  group: ToolGroup;
  /** 對應講座主題，例如 AI Research、AI Lesson */
  theme?: string;
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
const PDF_OR_IMAGE = ['application/pdf', ...IMAGE_MIMES];

export const TOOLS: ToolDef[] = [
  {
    id: 'sandbox',
    title: 'Gemini 沙盒',
    tagline: '自由對話、測試你寫的 Prompt',
    desc: '像在 Gemini 官網一樣自由提問，可附加 PDF 或圖片並連續追問。適合測試自己寫的 Prompt、腦力激盪，或請 AI 修改文字。',
    group: 'common',
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
    group: 'common',
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
    group: 'common',
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
    group: 'common',
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
    group: 'common',
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
  // ---------------------------------------------------------------------------
  // 教授場域
  // ---------------------------------------------------------------------------
  {
    id: 'research',
    group: 'professor',
    theme: 'AI Research・跨域研究',
    title: '研究發想助理',
    tagline: '找研究缺口、研究問題與跨域方向',
    desc: '輸入你關心的教學現象或研究興趣，整理出研究缺口、研究問題、研究設計與跨域切入點，並給出中英文檢索關鍵詞。不會捏造文獻。',
    text: {
      label: '你的研究興趣或想解決的教學現象',
      placeholder: '例如：我想了解生成式 AI 的即時回饋，是否能改善國中生的寫作修改行為。',
      required: true,
    },
    options: [
      { id: 'approach', label: '研究取向', choices: ['還沒決定', '量化', '質性', '混合方法', '行動研究', '設計本位研究'] },
      { id: 'cross', label: '跨域結合', choices: ['不需要', '學習科學／認知心理', '資訊科技／AI', '社會學／教育政策', '神經科學', '設計／藝術'] },
    ],
    followUps: ['把第 1 個研究問題寫成研究計畫大綱', '列出可用的研究工具與量表類型', '這個題目適合投哪類期刊？'],
    runLabel: '開始發想',
  },
  {
    id: 'writing',
    group: 'professor',
    theme: '學術寫作輔助',
    title: '學術寫作潤飾',
    tagline: '論文段落潤飾、中英摘要、審查意見回覆',
    desc: '貼上論文段落或審查意見，依你選的程度潤飾、改寫或撰寫摘要，並附「原句／修改／理由」對照表。不改變原意、不加引用。',
    file: {
      accept: '.pdf,.txt',
      mimes: ['application/pdf', 'text/plain'],
      maxMB: 10,
      label: '上傳文稿（選填）',
      hint: 'PDF 或純文字，上限 10 MB',
      required: false,
    },
    text: { label: '要處理的段落或審查意見', placeholder: '貼上論文段落；回覆審查意見時，請把意見與你的原文一起貼上。', required: false },
    options: [
      { id: 'task', label: '任務', choices: ['學術潤飾（中文）', 'English academic polishing', '撰寫中英文摘要', '回覆審查意見', '精簡字數（保留論點）'] },
      { id: 'level', label: '修改程度', choices: ['輕度：只修語病', '中度：調整句構', '深度：重寫段落'] },
    ],
    followUps: ['再精簡 20%', '改成更正式的學術語氣', '列出審查委員可能質疑的地方'],
    runLabel: '開始潤飾',
  },
  {
    id: 'data',
    group: 'professor',
    theme: '研究資料分析',
    title: '研究資料分析',
    tagline: '數據解讀、統計方法建議、結果段落撰寫',
    desc: '貼上或上傳 CSV 資料、問卷結果或訪談逐字稿，解讀趨勢、建議統計方法、撰寫 APA 格式結果段落，或做質性主題編碼。',
    file: {
      accept: '.csv,.txt,.pdf',
      mimes: ['text/csv', 'text/plain', 'application/pdf'],
      maxMB: 10,
      label: '上傳資料（選填）',
      hint: 'CSV、純文字或 PDF',
      required: false,
    },
    text: {
      label: '資料或研究設計說明',
      placeholder: '可直接從 Excel 複製貼上（請以代號取代學生姓名）\n例：組別　前測　後測\n實驗組　62　78…',
      required: false,
    },
    options: [
      { id: 'goal', label: '分析目的', choices: ['描述統計與趨勢解讀', '建議適合的統計方法', '撰寫結果段落（APA 格式）', '質性資料主題分析（編碼）'] },
    ],
    followUps: ['用表格整理描述統計', '這個結果在教學上的意涵是什麼？', '提供 R 或 Python 分析程式碼'],
    runLabel: '開始分析',
  },
  {
    id: 'tutor',
    group: 'professor',
    theme: 'RAG・專屬知識庫',
    title: '專屬 AI 助教建置',
    tagline: '把課程資料變成 Gem／GPT／NotebookLM 助教',
    desc: '上傳課程大綱或講義，產出可直接貼上的助教系統指令、知識庫資料整理方式、學術誠信護欄與測試題，幫你建立課程專屬的 AI 助教。',
    file: {
      accept: '.pdf,.txt',
      mimes: ['application/pdf', 'text/plain'],
      maxMB: 15,
      label: '上傳課程大綱或講義（選填）',
      hint: 'PDF 或純文字，上限 15 MB',
      required: false,
    },
    text: {
      label: '課程名稱與助教要做的事',
      placeholder: '例如：教育心理學（大二必修）。希望助教能解釋課程概念、出練習題，但不能直接替學生寫作業。',
      required: true,
    },
    options: [
      { id: 'platform', label: '建置平台', choices: ['Gemini Gem', 'ChatGPT 自訂 GPT', 'NotebookLM', '通用（不限平台）'] },
      { id: 'style', label: '助教風格', choices: ['蘇格拉底式引導', '直接解說＋例子', '出題練習教練'] },
    ],
    followUps: ['把系統指令改成英文版', '加入防止代寫作業的規則', '寫一頁給學生的使用說明'],
    runLabel: '產生助教設定',
  },
  {
    id: 'workflow',
    group: 'professor',
    theme: 'AI Agent・教學研究自動化',
    title: 'AI 工作流自動化',
    tagline: '把重複的研究與行政工作交給 AI',
    desc: '描述一件你常重複做的事，拆解成 AI 工作流程：哪些步驟交給 AI、哪些保留人工判斷，附每一步的 Prompt；需要時直接給 Google Apps Script 程式碼。',
    text: {
      label: '描述一個你常重複做的工作',
      placeholder: '例如：每週收 60 位學生的反思作業（Google 表單），整理重點、給個別回饋並登記成績。',
      required: true,
    },
    options: [
      { id: 'stack', label: '偏好工具', choices: ['Google Workspace（Apps Script）', 'Microsoft 365（Power Automate）', '只用 Gemini／ChatGPT 對話', '不確定，請建議'] },
      { id: 'skill', label: '程式能力', choices: ['完全不會寫程式', '會一點', '可以自己寫程式'] },
    ],
    followUps: ['程式碼加上詳細中文註解', '加入錯誤處理與 Email 通知', '改成每週自動執行'],
    runLabel: '設計工作流',
  },

  // ---------------------------------------------------------------------------
  // 師培生場域
  // ---------------------------------------------------------------------------
  {
    id: 'lesson',
    group: 'student',
    theme: 'AI Lesson',
    title: 'AI 備課速成',
    tagline: '上傳課本頁面，一次產出教案、簡報大綱、學習單',
    desc: '拍下課本或教師手冊頁面（或只輸入單元名稱），一次產出 45 分鐘教案、簡報大綱與學習單，適合實習與試教前快速備課。',
    file: {
      accept: '.pdf,.png,.jpg,.jpeg,.webp,.heic',
      mimes: PDF_OR_IMAGE,
      maxMB: 10,
      label: '上傳課本頁面（選填）',
      hint: '照片或 PDF，上限 10 MB',
      required: false,
    },
    text: { label: '單元名稱或教學重點', placeholder: '例如：國一數學「一元一次方程式」第 1 節：認識等量公理', required: true },
    options: [
      { id: 'grade', label: '年級', choices: ['國小低年級', '國小中年級', '國小高年級', '國中', '高中'] },
      { id: 'periods', label: '節數', choices: ['1 節', '2 節', '3 節'] },
      { id: 'output', label: '產出', choices: ['教案＋簡報大綱＋學習單', '只要教案', '只要學習單'] },
    ],
    followUps: ['把學習單改成差異化三個版本', '加入一個小組合作活動', '產生 5 題課堂即時檢核題'],
    runLabel: '開始備課',
  },
  {
    id: 'visual',
    group: 'student',
    theme: 'AI Visual',
    title: '教學圖像與影音',
    tagline: 'AI 生圖提示詞、資訊圖表、短影片分鏡',
    desc: '輸入要教的概念，產出可直接貼到 Gemini、ChatGPT、Canva 的生圖提示詞、資訊圖表版面、簡報配色，或 30 秒教學短影片分鏡，並附科學正確性檢查。',
    text: { label: '要呈現的概念', placeholder: '例如：光合作用的原料與產物', required: true },
    options: [
      { id: 'output', label: '產出', choices: ['教學插圖（AI 生圖提示詞）', '資訊圖表版面', '簡報封面與配色', '30 秒教學短影片分鏡'] },
      { id: 'style', label: '風格', choices: ['扁平插畫', '手繪筆記', '寫實照片', '卡通角色'] },
      { id: 'audience', label: '對象', choices: ['國小', '國中', '高中', '大學'] },
    ],
    followUps: ['換成另一種風格', '給我英文版生圖提示詞', '檢查內容有沒有科學錯誤'],
    runLabel: '開始設計',
  },
  {
    id: 'game',
    group: 'student',
    theme: 'AI Game',
    title: '課堂遊戲產生器',
    tagline: '闖關、卡牌、Kahoot 題組，或 HTML 網頁小遊戲',
    desc: '輸入單元與學習目標，設計課堂遊戲：實體闖關與卡牌、Kahoot／Quizizz 題組，或直接產出可存成 .html 打開就能玩的網頁小遊戲。',
    text: { label: '單元與學習目標', placeholder: '例如：國二理化「浮力」：學生能判斷物體在水中的浮沉，並說明原因。', required: true },
    options: [
      { id: 'format', label: '形式', choices: ['實體闖關／卡牌遊戲', 'Kahoot／Quizizz 題組', '單一 HTML 網頁小遊戲'] },
      { id: 'time', label: '時間', choices: ['10 分鐘', '20 分鐘', '一整節課'] },
      { id: 'mode', label: '進行方式', choices: ['個人', '2–4 人小組', '全班對抗'] },
    ],
    followUps: ['增加難度分級', '換成另一個單元的題目', '加入計分排行榜（HTML 版）'],
    runLabel: '產生遊戲',
  },
  {
    id: 'assess',
    group: 'student',
    theme: 'AI Assessment',
    title: '出題與錯誤診斷',
    tagline: '自動出題與解析，或上傳學生作答找出迷思',
    desc: '依單元出小考與詳解、改寫成素養題，或上傳學生作答照片，分析錯誤類型、背後的迷思概念與補救建議。',
    file: {
      accept: '.pdf,.png,.jpg,.jpeg,.webp,.heic',
      mimes: PDF_OR_IMAGE,
      maxMB: 10,
      label: '上傳考卷或學生作答（選填）',
      hint: '照片或 PDF，上限 10 MB；請遮住學生姓名',
      required: false,
    },
    text: { label: '單元，或貼上題目／學生作答', placeholder: '例如：國一數學「正負數的加減」', required: false },
    options: [
      { id: 'task', label: '任務', choices: ['出一份小考（含解析）', '分析學生錯誤並給補救建議', '把題目改寫成素養題', '依布魯姆層次出題'] },
      { id: 'count', label: '題數', choices: ['5 題', '10 題', '20 題'] },
    ],
    followUps: ['轉成 Google 表單可貼上的格式', '產生同概念的補救練習 3 題', '做一份評分規準 Rubric'],
    runLabel: '開始',
  },
  {
    id: 'classroom',
    group: 'student',
    theme: 'AI Teaching Agent',
    title: '班級經營模擬器',
    tagline: 'AI 扮演學生或家長，練習處理課堂狀況',
    desc: 'AI 扮演上課滑手機、起衝突、拒絕發言的學生或來電的家長，你用打字回應，練習真實情境的應對；結束時給你總評與建議話術。',
    text: { label: '補充情境（選填）', placeholder: '例如：國二，第 7 節，剛考完段考，全班很浮躁', required: false },
    options: [
      { id: 'scene', label: '情境', choices: ['學生上課滑手機', '小組成員起衝突', '學生拒絕發言', '學生頂嘴挑釁', '家長來電抱怨成績'] },
      { id: 'grade', label: '年級', choices: ['國小', '國中', '高中'] },
      { id: 'feedback', label: '回饋方式', choices: ['每回合給提示', '結束才總評'] },
    ],
    followUps: ['結束，請給我總評', '換一個更難處理的學生', '示範一次理想的處理方式'],
    runLabel: '開始模擬',
  },
];

export const TOOL_IDS = TOOLS.map((t) => t.id);

export const toolsInGroup = (g: ToolGroup) => TOOLS.filter((t) => t.group === g);

const BASE_SYSTEM =
  '你是協助台灣師資培育的教學與研究助理，服務對象是師培生與大學教授。除非使用者要求其他語言，一律使用臺灣繁體中文與臺灣教育現場用語，並以 Markdown（標題、條列、表格）輸出。不確定的事實、課綱代碼、文獻資訊請標註「（請查證）」，不可杜撰。';

export const TOOL_SYSTEM: Record<ToolId, string> = {
  sandbox: BASE_SYSTEM,
  pdf: `${BASE_SYSTEM}使用者會上傳 PDF：所有回答都必須根據該文件內容，文件沒有提到的請明說「文件未提及」，引用內容時盡量標註頁碼（例如：p.3）。`,
  translate: `${BASE_SYSTEM}你同時是專業譯者：譯文須忠實、通順、符合目標語言的習慣，不可增刪原意，不可省略段落。專有名詞第一次出現時，以括號保留原文。`,
  ocr: `${BASE_SYSTEM}你負責辨識圖片或掃描檔中的文字：逐字辨識，看不清楚或無法確定的字以【?】標示，絕不猜測補寫。數學式以 LaTeX 或一般文字表示。`,
  research: `${BASE_SYSTEM}你是資深教育研究方法顧問。可以建議研究方向與檢索關鍵詞，但絕不可列出具體的作者、年份、篇名或期刊卷期，除非使用者提供；需要文獻支持之處以「（待補文獻）」標示。`,
  writing: `${BASE_SYSTEM}你是學術編輯。修改時不可改變作者原意、不可新增未提供的引用或數據；英文潤飾以學術英文為準。`,
  data: `${BASE_SYSTEM}你是教育統計與質性研究顧問。所有計算請列出公式或步驟，數值結果提醒使用者以 SPSS、R 或 Excel 重新計算確認；不可捏造資料中沒有的數值。`,
  tutor: `${BASE_SYSTEM}你熟悉 Gemini Gem、ChatGPT 自訂 GPT 與 NotebookLM 的設定方式，以及 RAG（檢索增強生成）知識庫的資料整理原則，重視學術誠信與學生隱私。`,
  workflow: `${BASE_SYSTEM}你是教育行政與研究流程自動化顧問，熟悉 Google Apps Script、Power Automate 與生成式 AI。提供的程式碼必須完整可執行並附中文註解；涉及學生個資時提醒權限與隱私設定。`,
  lesson: `${BASE_SYSTEM}你是資深教學輔導教師，熟悉 108 課綱與台灣各版本教科書的教學節奏。若使用者上傳課本頁面，教學內容必須以頁面內容為準。`,
  visual: `${BASE_SYSTEM}你是教學視覺設計師與 AI 生圖提示詞專家，重視內容的科學正確性與適齡性；提示詞不得包含真實人物、品牌或受著作權保護的角色。`,
  game: `${BASE_SYSTEM}你是遊戲化教學設計師。遊戲機制必須緊扣學習目標，並照顧程度較弱的學生。產出 HTML 時，必須是單一檔案、不依賴任何外部資源、手機與電腦都能操作。`,
  assess: `${BASE_SYSTEM}你是評量與學習診斷專家，熟悉素養導向評量與布魯姆認知層次。解析必須正確，若答案有爭議請標示。分析學生作答時不得推測或評論學生身分與家庭背景。`,
  classroom: `${BASE_SYSTEM}你是班級經營訓練教練，負責扮演情境中的學生或家長，讓師培生練習應對。角色要真實，但不得出現人身攻擊、暴力、自我傷害等不適當內容；若師培生的回應可能傷害學生，請立即以教練身分提醒。`,
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
    case 'research': {
      const approach = o.approach || '還沒決定';
      const cross = o.cross || '不需要';
      return [
        `我的研究興趣：${text}`,
        `研究取向：${approach}${cross !== '不需要' ? `；希望結合：${cross}` : ''}`,
        '請依序產出：',
        '1. 研究背景與重要性（3 點）',
        '2. 可能的研究缺口 3 個（說明為何是缺口；需要文獻支持之處標「（待補文獻）」，不要列出具體文獻）',
        '3. 研究問題 3 組（每組一個主問題＋2 個子問題）',
        `4. 對應的研究設計表格：研究對象、方法（${approach === '還沒決定' ? '請建議最適合的取向' : approach}）、資料蒐集工具、分析方式`,
        cross !== '不需要' ? `5. 與「${cross}」跨域結合的切入點與可合作的系所` : '5. 可延伸的跨領域合作方向（1–2 個）',
        '6. 可行性與風險評估（時間、樣本、倫理）',
        '7. 建議檢索關鍵詞（中英文）與資料庫（如 ERIC、華藝、臺灣博碩士論文知識加值系統）',
      ].join('\n');
    }
    case 'writing': {
      const task = o.task || '學術潤飾（中文）';
      const level = o.level || '中度：調整句構';
      const taskText: Record<string, string> = {
        '學術潤飾（中文）': '請潤飾成通順、精確的中文學術寫作。先給修改後全文，再用表格列出「原句／修改後／修改理由」。',
        'English academic polishing':
          'Please polish the text into clear academic English. Give the revised text first, then a table of "Original / Revised / Reason" (reasons may be in Traditional Chinese).',
        撰寫中英文摘要: '請根據內容撰寫中文摘要（300–500 字）與英文 Abstract（150–250 words），並各附 3–5 個關鍵詞。',
        回覆審查意見: '請逐條回覆審查意見：用表格列出「審查意見／回應說明／修改處（頁碼或段落）」，語氣誠懇專業；需要我補資料或做決定的地方請標示。',
        '精簡字數（保留論點）': '請在保留所有論點與數據的前提下精簡約 30% 字數，並標示刪去了哪些內容。',
      };
      return [
        file,
        taskText[task] || taskText['學術潤飾（中文）'],
        task !== '撰寫中英文摘要' && task !== '回覆審查意見' ? `修改程度：${level}。` : '',
        '不要改變原意，不要新增任何未提供的引用、數據或結論。',
        text ? `\n【原文】\n"""\n${text}\n"""` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'data': {
      const goal = o.goal || '描述統計與趨勢解讀';
      const goalText: Record<string, string> = {
        描述統計與趨勢解讀: '請整理描述統計（平均數、標準差、最小／最大值、人數）並解讀主要趨勢與異常值，用表格呈現。',
        建議適合的統計方法: '請判斷資料型態與研究設計，建議最適合的統計檢定（說明前提假設、為何適合、替代方案），並列出在 SPSS／R 的操作步驟。',
        '撰寫結果段落（APA 格式）': '請撰寫符合 APA 第 7 版的結果段落（含統計量的報告格式），無法由資料計算的數值以「＿＿」留空。',
        '質性資料主題分析（編碼）': '請進行主題分析：初始編碼 → 歸納主題 → 每個主題附 2–3 句代表性引文，並用表格整理「主題／定義／代表引文／出現次數」。',
      };
      return [
        file,
        goalText[goal] || goalText['描述統計與趨勢解讀'],
        '計算請列出步驟；不可捏造資料中沒有的數值；最後提醒需以統計軟體再次確認。',
        text ? `\n【資料／研究設計】\n"""\n${text}\n"""` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'tutor': {
      const platform = o.platform || 'Gemini Gem';
      const style = o.style || '蘇格拉底式引導';
      return [
        `${file}請幫我在「${platform}」建立一個課程專屬 AI 助教，風格：${style}。`,
        `課程與需求：${text}`,
        '請依序產出：',
        '1. 系統指令（放在一個程式碼區塊，可直接貼上平台）：角色、任務、回答方式、引用課程資料的規則、不知道時怎麼回答',
        '2. 知識庫（RAG）資料準備：應上傳哪些檔案、如何切分與命名、多久更新一次',
        '3. 護欄：學術誠信（不代寫作業）、隱私、超出課程範圍時的處理',
        '4. 10 個測試問題與預期的理想回應方式（表格）',
        `5. 在「${platform}」的設定步驟`,
        '6. 學期中評估助教成效的 3 個指標',
      ].join('\n');
    }
    case 'workflow': {
      const stack = o.stack || '不確定，請建議';
      const skill = o.skill || '完全不會寫程式';
      return [
        `我想自動化這件工作：${text}`,
        `偏好工具：${stack}；我的程式能力：${skill}。`,
        '請依序產出：',
        '1. 任務拆解：條列每個步驟（輸入 → 處理 → 輸出）',
        '2. 分工表：哪些步驟交給 AI、哪些保留人工判斷，以及理由',
        '3. 每個 AI 步驟可直接使用的 Prompt 範本',
        stack.includes('Apps Script') || stack.includes('不確定')
          ? '4. 若適合用 Google Apps Script：提供完整可執行的程式碼（附中文註解）與安裝步驟（從開啟編輯器到設定觸發條件）'
          : '4. 在所選工具中的具體設定步驟',
        '5. 預估每週可節省的時間',
        '6. 風險與注意事項：個資、錯誤檢查、學術誠信',
      ].join('\n');
    }
    case 'lesson': {
      const grade = o.grade || '國中';
      const periods = o.periods || '1 節';
      const output = o.output || '教案＋簡報大綱＋學習單';
      const parts: string[] = [];
      if (output !== '只要學習單')
        parts.push(`教案（${periods}，每節 45 分鐘）：學習目標（對應核心素養）、學生先備知識、教學流程表（時間／教師活動／學生活動／評量）`);
      if (output === '教案＋簡報大綱＋學習單') parts.push('簡報大綱：每頁標題、重點文字、建議圖像、教師提問');
      if (output !== '只要教案') parts.push('學習單：情境引導、由淺入深 3 層問題、動手任務、自我檢核，作答處以「＿＿＿」表示');
      return [
        `${file}請幫我備課：${grade}，${text}。${input.fileName ? '教學內容請以附上的課本頁面為準。' : ''}`,
        '請產出：',
        ...parts.map((p, i) => `${i + 1}. ${p}`),
        '最後列出這個單元學生常見的 3 個迷思概念與教師提醒。',
      ].join('\n');
    }
    case 'visual': {
      const output = o.output || '教學插圖（AI 生圖提示詞）';
      const style = o.style || '扁平插畫';
      const audience = o.audience || '國中';
      const outText: Record<string, string> = {
        '教學插圖（AI 生圖提示詞）':
          '請提供 3 組生圖提示詞（中文＋英文），分別適用 Gemini（Imagen）、ChatGPT、Canva Magic Media；每組附構圖說明與要避免的內容（negative prompt）。',
        資訊圖表版面: '請設計一張資訊圖表：版面分區（用表格描述格線）、每區的標題與精簡文字、建議圖示、配色（附色碼）。',
        簡報封面與配色:
          '請設計簡報封面與整份簡報的視覺規範：標題文案 3 個選項、配色（主色／輔色／強調色，附色碼）、字體建議、版面描述，以及封面圖的生圖提示詞。',
        '30 秒教學短影片分鏡': '請設計 30 秒教學短影片分鏡表：秒數／畫面／旁白／字幕／音效，並附封面縮圖的生圖提示詞。',
      };
      return [
        `要呈現的概念：${text}（對象：${audience}，風格：${style}）`,
        outText[output] || outText['教學插圖（AI 生圖提示詞）'],
        '最後附「科學正確性檢查清單」：畫面中容易畫錯或誤導的地方。',
      ].join('\n');
    }
    case 'game': {
      const format = o.format || '實體闖關／卡牌遊戲';
      const time = o.time || '20 分鐘';
      const mode = o.mode || '2–4 人小組';
      const formatText: Record<string, string> = {
        '實體闖關／卡牌遊戲':
          '請設計實體遊戲：世界觀與角色、遊戲規則、3 個關卡（各對應一個學習重點）、需要的教具清單（可直接列印的卡牌內容用表格列出）、計分與求助機制。',
        'Kahoot／Quizizz 題組': '請產出 Kahoot／Quizizz 題組：題目由淺入深，每題 4 個選項、正確答案、作答秒數建議與解析，並以表格輸出方便匯入。',
        '單一 HTML 網頁小遊戲':
          '請產出一個完整的單一 HTML 網頁小遊戲（HTML、CSS、JavaScript 全在一個檔案，不使用任何外部資源），手機與電腦都能操作，有開始畫面、計分與結束回饋。程式碼放在一個 html 程式碼區塊；區塊前用 3 個步驟說明如何存成 .html 檔並用瀏覽器開啟。',
      };
      return [
        `單元與學習目標：${text}`,
        `遊戲時間：${time}；進行方式：${mode}。`,
        formatText[format] || formatText['實體闖關／卡牌遊戲'],
        '最後附 3 個遊戲結束後的「反思解密」提問，把遊戲經驗連回學科概念。',
      ].join('\n');
    }
    case 'assess': {
      const task = o.task || '出一份小考（含解析）';
      const count = o.count || '10 題';
      const taskText: Record<string, string> = {
        '出一份小考（含解析）': `請出一份 ${count} 的小考：題型混合（選擇、填充、簡答），由淺入深。全部題目後另列答案與詳解（考點、解題步驟、容易錯的地方）。`,
        分析學生錯誤並給補救建議:
          '請分析學生的作答：用表格列出「題號／錯誤內容／錯誤類型（概念、計算、審題、表達）／背後的迷思概念／補救建議」，最後給教師一段 3 分鐘的補救教學建議。',
        把題目改寫成素養題: `請把題目改寫成 ${count} 的素養導向題組：真實生活情境、圖表或短文資料、多層次子題，附評分指標。`,
        依布魯姆層次出題: `請依布魯姆修訂版六個認知層次出題（共 ${count}），每題標示層次，並附參考答案。`,
      };
      return [file, `單元／題目／作答內容：${text || '（見附件）'}`, taskText[task] || taskText['出一份小考（含解析）']]
        .filter(Boolean)
        .join('\n');
    }
    case 'classroom': {
      const scene = o.scene || '學生上課滑手機';
      const grade = o.grade || '國中';
      const feedback = o.feedback || '每回合給提示';
      const who = scene.startsWith('家長') ? '家長' : '學生';
      return [
        `請和我進行班級經營角色扮演。情境：${grade}，${scene}。${text ? `補充：${text}。` : ''}`,
        `你扮演情境中的${who}，我扮演老師。規則：`,
        `1. 先用 2–3 句描述場景，接著以${who}的身分說出第一句話，然後停下來等我回應。`,
        `2. 之後每次我回應，你就以${who}的身分自然回應（反應要真實，會依我的處理方式改變態度）。`,
        feedback === '每回合給提示' ? '3. 每次角色回應後，另起一行以「🧭 教練提示：」給我一句簡短建議。' : '3. 過程中不要跳出角色給建議。',
        '4. 當我輸入「結束」或要求總評時，跳出角色，用表格總評：做得好的地方、可以改進的地方、建議話術（2–3 句）、相關的正向管教原則。',
      ].join('\n');
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
  const needOne: Partial<Record<ToolId, string>> = {
    translate: '請貼上要翻譯的文字，或上傳檔案。',
    apa: '請貼上文獻資料，或上傳論文首頁。',
    writing: '請貼上要處理的段落，或上傳文稿。',
    data: '請貼上資料，或上傳 CSV／PDF。',
    assess: '請輸入單元、貼上題目，或上傳學生作答。',
  };
  const missing = needOne[tool.id];
  if (missing && !input.text.trim() && !input.fileName) return missing;
  return null;
}
