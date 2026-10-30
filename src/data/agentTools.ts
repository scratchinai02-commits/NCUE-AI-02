/**
 * Codex / Antigravity 工具箱：每個專案是一組「在 Codex 或 Antigravity 依序貼上」的提示詞。
 * 和 Gemini 工具箱不同，這裡是在自己電腦的資料夾裡寫出完整的多檔案專案，
 * 每一步完成後 AI 會停下來等你確認，最後部署上線。
 * 第 1 步會自動附上 agentSpec()（工作規則），之後每步附上收尾要求，見 tools.ts 的 stepPrompt。
 */
import type { ToolDef, ToolGroup } from './tools';

export const AGENT_PROJECTS: ToolDef[] = [
  // ---------------------------------------------------------------------------
  // 共同：舊教材 AI 轉生
  // ---------------------------------------------------------------------------
  {
    id: 'revive',
    platform: 'agent',
    group: 'common',
    theme: 'AI Archive',
    title: '舊教材 AI 轉生',
    tagline: '盤點電腦裡的舊講義，變成可搜尋的互動教材網站',
    desc: '把資料夾裡多年累積的 PPT、Word、PDF 交給 AI 盤點、萃取成結構化資料，再整理成有摘要、重點與練習題的教學單元，生成可搜尋的互動教材網站並部署分享。',
    appName: '教材資料庫網站',
    stack: 'Node.js／Python 腳本・Gemini API・Vite・Firebase Hosting',
    prereq: ['舊教材複製一份到 materials/ 資料夾', 'Node.js 22、Python 3、Git', 'Gemini API 金鑰（第 3 步）'],
    steps: [
      {
        title: '盤點教材、建立專案骨架',
        prompt: `請在這個資料夾建立「舊教材 AI 轉生」專案：把我多年累積的教材（PPT、Word、PDF、圖片）整理成可搜尋的互動教材網站。

【這一步：盤點與骨架】
1. 我的舊教材放在 materials/ 資料夾（只能讀取，不要移動、改名或刪除任何原始檔）。
2. 寫盤點腳本 scripts/scan（Node.js 或 Python 擇一，說明理由），掃描 materials/ 產生 data/inventory.json 與 docs/inventory.md：檔名、路徑、類型、大小、修改日期、推測年份、推測科目與單元（從資料夾與檔名判斷）、內容雜湊（找出重複檔）。
3. docs/inventory.md 用表格統計：各類型數量、各年份數量、各科目數量、重複檔清單、無法讀取的檔案。
4. 建立網站骨架（Vite＋原生 JavaScript），首頁讀取 inventory.json 顯示教材總覽，可依科目、年份、類型篩選。`,
        check: 'docs/inventory.md 出現教材統計表；啟動網站可以看到教材總覽並篩選。',
      },
      {
        title: '萃取內容成結構化資料',
        prompt: `請加入「內容萃取」：
1. 寫 scripts/extract：讀取 PPTX、DOCX、PDF 的文字與圖片（PPTX 依投影片、PDF 依頁），輸出到 data/raw/<檔案代號>.json，保留原檔路徑與頁碼。
2. 舊的 .ppt／.doc 格式：電腦有 LibreOffice 就先轉成新格式；沒有就列在 docs/WORKLOG.md 的「待處理」清單。
3. 掃描型 PDF（沒有文字層）先標記為「需要 OCR」，下一步再處理。
4. 支援增量處理：已處理且沒有修改的檔案跳過；處理失敗的檔案記錄原因，不中斷整批。
5. 先挑 3 個不同類型的檔案試跑，把萃取結果的摘要給我看。`,
        check: 'data/raw/ 出現每份教材的文字內容 JSON，並標出需要 OCR 或轉檔的檔案。',
      },
      {
        title: '用 Gemini 整理成教學單元',
        prompt: `請加入「AI 整理」：
1. 寫 scripts/structure：把 data/raw 的內容送給 Gemini，用 responseSchema 產生 data/units/<代號>.json：{ title, subject, grade, unit, summary（100 字內）, keyConcepts[], learningObjectives[], sections[{ heading, content }], quiz[{ type, stem, options, answer, explanation }], sourceFile, sourcePages, notes }。
2. 標記「需要 OCR」的 PDF 與投影片中的圖片，改用 Gemini 讀圖辨識文字。
3. 系統指示：只根據原始教材整理，不要補充教材中沒有的知識；原文有明顯錯誤時寫在 notes 欄位。
4. 控制費用：先顯示預計處理幾份、大約多少 token，等我確認再整批執行；加入速率限制與失敗重試。
5. 內容高度相似的重複教材自動合併，保留最新版本，並在 notes 記錄合併來源。`,
        check: 'data/units/ 出現每個單元的摘要、重點概念與練習題，重複教材已合併。',
      },
      {
        title: '做成互動教材網站',
        prompt: `請把網站做成完整的互動教材：
1. 首頁：全文搜尋（標題、概念、內文）＋依科目／年級／單元篩選的卡片。
2. 單元頁：學習目標、重點概念、分段內容，並標示原始檔案與頁碼；可「列印成講義」。
3. 練習模式：單元練習題即時判分並顯示詳解；答錯的題目收進「我的錯題本」（localStorage）。
4. 教師工具：每個單元可匯出 Markdown／Word，題目可匯出成 Google 表單或 Kahoot 匯入用的 CSV。
5. 撰寫自動測試：檢查每個 units JSON 都符合格式、搜尋與判分邏輯的單元測試；用瀏覽器實際打開首頁與一個單元頁，截圖存到 docs/screenshots/。`,
        check: '網站可以搜尋教材、閱讀單元、做練習題並看到詳解；測試全部通過。',
      },
      {
        title: '部署與日後更新',
        prompt: `請完成部署與交接：
1. 網站建置成靜態檔，部署到 Firebase Hosting（需要登入 Firebase 時，告訴我要執行的指令，等我完成再繼續）。部署前檢查 data/ 裡沒有學生個資與 API 金鑰。
2. 加入 npm run update 指令：之後我把新教材放進 materials/，執行它就會依序盤點 → 萃取 → AI 整理 → 重新建置。
3. README.md 用老師看得懂的語言寫：如何新增教材、如何更新網站、如何修改單元內容、常見問題。
4. 在 docs/WORKLOG.md 寫交接摘要，讓下一位老師或另一個 AI 工具讀完就能接手。`,
        check: '得到一個公開網址；放入新教材後執行 npm run update 就會更新網站。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 師培生：3D 互動教材
  // ---------------------------------------------------------------------------
  {
    id: 'lesson3d',
    platform: 'agent',
    group: 'student',
    theme: 'AI Lesson 3D',
    title: '3D 互動教材工作坊',
    tagline: '把抽象概念做成可旋轉、可操作的 3D 網頁教材',
    desc: '用 Three.js 把一個單元（立體幾何、地球公轉、分子結構…）做成可旋轉、拖曳、調參數的 3D 互動教材，內建任務卡與闖關測驗，部署到 GitHub Pages，學生用手機掃 QR Code 就能操作。',
    appName: '3D 互動教材',
    stack: 'Vite・Three.js・GitHub Pages',
    prereq: ['想教的單元與 3 個學習目標', 'Node.js 22、Git', 'GitHub 帳號（第 5 步部署用）'],
    steps: [
      {
        title: '教學設計與 3D 骨架',
        prompt: `請在這個資料夾建立「3D 互動教材」網站。
單元：【請填：例如 國中數學 立體圖形的展開圖／國小自然 地球自轉與公轉】
對象：【請填：年級】

【這一步：教學設計＋3D 骨架】
1. 先寫 docs/DESIGN.md：3 個學習目標、學生常見的迷思概念、3～5 個「場景」（每個場景讓學生操作什麼、觀察什麼、回答什麼問題）。
2. 建立 Vite＋Three.js 專案（原生 JavaScript），完成第一個場景：可以用滑鼠或手指旋轉、縮放的 3D 物件，有燈光與地板格線；電腦版說明面板在右側，手機版在下方。
3. 幾何物件一律用程式（演算法）產生頂點與面，不使用外部 3D 模型或圖片，確保數值精確、可以調參數。
4. 效能：手機也要流暢（限制 devicePixelRatio、畫面沒有變化時暫停重繪）。`,
        check: 'docs/DESIGN.md 有學習目標與場景規劃；啟動後可以旋轉、縮放第一個 3D 場景。',
      },
      {
        title: '互動操作與參數',
        prompt: `請完成所有場景的互動：
1. 依 DESIGN.md 完成其餘場景，用上一頁／下一頁或場景選單切換，切換時鏡頭平滑移動。
2. 每個場景加入參數控制（滑桿或按鈕），例如邊長、角度、速度；3D 物件與畫面上的數值、公式即時同步。
3. 點選 3D 物件的部位會顯示名稱與說明；可切換「顯示／隱藏標示」。
4. 加入動畫播放（例如展開／摺合、公轉一圈），有播放、暫停與速度控制。`,
        check: '每個場景都能用滑桿調參數，3D 物件與數值同步變化，點物件會顯示說明。',
      },
      {
        title: '任務卡與闖關測驗',
        prompt: `請加入學習任務與測驗：
1. 每個場景有「任務卡」，例如「把角度調到 60°，觀察對面的邊有什麼變化」；學生完成操作後系統自動檢查並給回饋。
2. 每個場景最後有 2～3 題闖關題（選擇題、數值填答、在 3D 畫面中點選正確位置），答錯時給提示，並對應到 DESIGN.md 的迷思概念。
3. 進度與星星數存在 localStorage，首頁顯示每個場景的完成狀態；全部完成顯示徽章與學習摘要。
4. 教師模式（網址加上 ?teacher=1）：顯示所有答案與教學提示，可以直接投影上課。`,
        check: '每個場景都有任務與闖關題，完成後首頁顯示星星與徽章；加上 ?teacher=1 可看到答案。',
      },
      {
        title: '測試、無障礙與手機體驗',
        prompt: `請進行品質檢查並修正問題：
1. 撰寫單元測試：幾何計算（面積、體積、角度等）與判分邏輯，npm test 全部通過。
2. 用瀏覽器實際操作每個場景（電腦與手機尺寸），截圖存到 docs/screenshots/，修正版面跑掉或按鈕太小的地方。
3. 無障礙：所有按鈕可用鍵盤操作並有文字標籤；3D 畫面旁有文字說明，不只靠顏色辨識。
4. 不支援 WebGL 的裝置顯示友善提示與靜態示意圖。
5. 在 docs/WORKLOG.md 列出測試結果與已知限制。`,
        check: 'npm test 全部通過；docs/screenshots/ 有電腦與手機截圖，版面正常。',
      },
      {
        title: '部署到 GitHub Pages',
        prompt: `請完成部署：
1. 設定 Vite 的 base 路徑，加入 GitHub Actions 工作流程，推送到 main 就自動建置並部署到 GitHub Pages。
2. 如果還沒有 GitHub 遠端 repo，告訴我要執行的指令，等我完成登入再繼續。
3. 產生指向網站的 QR Code 圖檔（docs/qrcode.png），方便投影給學生掃描。
4. README.md 寫給老師看：換成其他單元要改哪些檔案、如何新增場景與題目、如何更新網站。`,
        check: '得到 GitHub Pages 網址與 QR Code，學生用手機掃描就能操作。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 師培生：課堂即時互動系統
  // ---------------------------------------------------------------------------
  {
    id: 'liveclass',
    platform: 'agent',
    group: 'student',
    theme: 'AI Classroom Live',
    title: '課堂即時互動系統',
    tagline: '學生掃 QR Code 加入，即時投票、搶答、文字雲',
    desc: '做出自己的課堂互動平台：老師開房間，學生用手機掃 QR Code 以暱稱加入，即時投票、搶答、文字雲與出場券；Gemini 幫你出題並歸納全班回答。使用 Firebase 即時同步並部署上線。',
    appName: '課堂即時互動系統',
    stack: 'Vite・Firebase（Firestore、Hosting）・Gemini API',
    prereq: ['Node.js 22、Git', 'Google 帳號（建立 Firebase 專案）', 'Gemini API 金鑰（第 3 步）'],
    steps: [
      {
        title: '老師開房、學生加入',
        prompt: `請在這個資料夾建立「課堂即時互動系統」：老師在課堂上開房間，學生用手機加入作答。

【這一步：架構與加入流程】
1. 技術：Vite＋原生 JavaScript＋Firebase（Firestore 即時同步、匿名登入、Hosting）。先用 Firebase Local Emulator 開發，暫時不需要建立真的 Firebase 專案。
2. 老師端 /teacher：建立房間，產生 6 位數房號與 QR Code，大螢幕顯示目前加入人數。
3. 學生端 /join：輸入房號（或掃 QR Code 直接進入），輸入暱稱（提醒不要用真實姓名）後進入等待畫面。
4. 把資料結構寫進 AGENTS.md：rooms/{roomId}、participants、activities、responses。
5. Firestore 安全規則：學生只能寫入自己的回答、看不到別人的身分；只有房主能修改房間與活動。`,
        check: '用兩個瀏覽器視窗測試：老師開房顯示 QR Code，學生輸入房號加入後，老師端人數即時增加。',
      },
      {
        title: '四種即時活動',
        prompt: `請加入四種課堂活動，老師按「發布」後，學生手機立即出現題目：
1. 即時投票：單選／複選，老師端顯示即時長條圖。
2. 搶答：可設定倒數秒數，顯示前 5 名作答者與作答秒數。
3. 文字雲：學生輸入關鍵詞，老師端即時更新（相同詞合併，老師可隱藏不當詞）。
4. 出場券：2～3 題簡答，老師端逐則查看並可標星號。
5. 老師端可「隱藏／公布結果」「結束活動」；學生端送出後顯示「已送出」並防止重複提交。`,
        check: '老師發布活動後，學生手機即時出現題目；學生作答後，老師端的圖表或文字雲即時更新。',
      },
      {
        title: 'Gemini 出題與歸納回答',
        prompt: `請加入 AI 功能（Gemini 金鑰只放在後端）：
1. 後端 API：Firebase Functions 或 Cloud Run 擇一，先用 3～5 行說明兩者的差異與費用，等我選擇再實作；只有房主可以呼叫。
2. AI 出題：老師輸入單元與年級，Gemini 用 responseSchema 產生投票題、搶答題與出場券題目，老師修改後再發布。
3. AI 歸納：出場券或文字雲結束後，一鍵請 Gemini 整理「已理解的重點」「常見迷思」「下一堂課建議」，不顯示個別學生暱稱。
4. 系統指示：不評論學生個人；若回答出現霸凌、自傷等內容，只私下提醒老師關心，不顯示在大螢幕。
5. 每個房間設定 AI 呼叫次數上限，避免額度被濫用。`,
        check: '老師輸入單元就能產生題目；活動結束後得到全班回答的 AI 歸納。',
      },
      {
        title: '安全規則與 40 人壓力測試',
        prompt: `請進行品質檢查：
1. 撰寫 Firestore 安全規則測試：學生不能修改別人的回答、不能修改房間，非房主不能呼叫 AI。
2. 寫模擬腳本：在 Emulator 中模擬 40 位學生同時加入、同時作答，確認老師端計數正確、沒有重複計票、畫面不卡頓。
3. 用瀏覽器測試手機與投影大螢幕的版面（老師端字要大、投影清楚），截圖存到 docs/screenshots/。
4. 斷線處理：學生網路中斷再回來，能回到同一個房間繼續作答。`,
        check: '安全規則測試與 40 人模擬全部通過；斷線重連能回到原本的房間。',
      },
      {
        title: '部署上線與資料清除',
        prompt: `請完成部署：
1. 建立真實的 Firebase 專案（告訴我在主控台要點哪裡、要執行哪些指令，等我完成登入再繼續）。
2. 部署 Hosting、Firestore 規則與後端 API；金鑰放在 Secret Manager（或 Functions secrets），不寫在程式碼裡。
3. 課後匯出：老師可以下載每個活動的結果 CSV。
4. 房間在 24 小時後自動刪除所有資料，保護學生隱私。
5. README.md 寫給老師：上課前怎麼開房、課堂中怎麼操作、課後怎麼匯出結果。`,
        check: '得到公開網址，上課時學生掃 QR Code 就能加入；課後可下載結果，24 小時後資料自動清除。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 教授：課程 AI 助教網站
  // ---------------------------------------------------------------------------
  {
    id: 'coursebot',
    platform: 'agent',
    group: 'professor',
    theme: 'AI Tutor RAG',
    title: '課程 AI 助教網站',
    tagline: '用你的講義當知識庫，學生隨時提問、附出處',
    desc: '把課程講義與常見問題做成知識庫，建立只根據教材回答、並附檔名與頁碼出處的 AI 助教網站；有蘇格拉底引導與考前練習模式、教師後台與問答品質評估，金鑰放在後端，部署到 Google Cloud Run。',
    appName: '課程 AI 助教',
    stack: 'Node.js（Express）・Gemini API・Docker・Cloud Run',
    prereq: ['課程講義放進 course/ 資料夾', 'Node.js 22、Git', 'Gemini API 金鑰、Google Cloud 專案（第 5 步部署用）'],
    steps: [
      {
        title: '專案骨架與知識庫',
        prompt: `請在這個資料夾建立「課程 AI 助教」網站：學生提問，AI 只根據我的課程教材回答並附上出處。
課程名稱：【請填：你的課程名稱】

【這一步：骨架與知識庫】
1. 技術：Node.js（Express）後端＋Vite 前端（React 或原生 JavaScript 擇一並說明理由）；Gemini 金鑰只放在後端的 .env。
2. 教材放在 course/ 資料夾（PDF、PPTX、DOCX、Markdown）。寫 scripts/ingest：擷取文字並保留檔名與頁碼，切成約 500 字的段落（前後重疊約 50 字），用 Gemini 的 embedding 模型產生向量（模型名稱放在 .env），存成 data/index.json，先不用資料庫。
3. 提供 npm run ingest 指令，重複執行時只處理新增或修改過的檔案。
4. 後端 /api/health 回傳索引中的文件數與段落數。`,
        check: '執行 npm run ingest 後產生 data/index.json，/api/health 顯示文件數與段落數。',
      },
      {
        title: '附出處的問答（RAG）',
        prompt: `請完成問答功能：
1. /api/ask：把問題轉成向量，找出最相關的 5 個段落，連同問題送給 Gemini，以串流方式回傳。
2. 系統指示：只根據提供的段落回答；找不到時回答「教材中沒有提到，建議詢問老師」；每個重點標註出處〔檔名 第 X 頁〕。
3. 前端聊天介面：對話泡泡、Markdown 排版，出處可以點開看原文段落；保留最近 10 輪對話脈絡。
4. 首頁顯示 6 個由教材自動產生的「常見問題」按鈕。`,
        check: '問教材裡有的內容，得到附出處的回答；問教材沒有的內容，回答「教材中沒有提到」。',
      },
      {
        title: '教學模式與教師後台',
        prompt: `請加入教學功能：
1. 三種模式：「直接解答」「蘇格拉底引導（先反問、不直接給答案）」「考前練習（依章節出題並批改）」，教師可設定學生能使用哪些模式。
2. 教師後台 /admin（以 Google 登入或密碼保護）：匿名問題紀錄、熱門問題排行、「找不到答案」的問題清單；教師可補充標準答案並加入知識庫。
3. 每週摘要：學生最常問的 5 個概念與可能的學習困難，可下載 Markdown。
4. 防濫用：每位使用者每小時提問上限、問題長度上限；婉拒與課程無關或要求代寫作業的請求。`,
        check: '可以切換三種模式；教師後台看得到熱門問題，補充的標準答案會被 AI 引用。',
      },
      {
        title: '問答品質評估與測試',
        prompt: `請建立品質評估：
1. 建立 eval/questions.json：20 題測試問題（15 題教材內、5 題教材外）。寫 npm run eval 自動執行並檢查：是否附出處、教材外問題是否拒答、回答是否與標準答案一致（請 Gemini 依評分標準打分）。
2. 結果輸出成 docs/eval-report.md（正確率、引用率、拒答正確率）；依結果調整切段大小與系統指示，再跑一次並比較前後差異。
3. 撰寫單元測試：切段、檢索排序、速率限制；用瀏覽器實際測試手機與電腦版面並截圖。`,
        check: 'npm run eval 產生評估報告，正確率與引用率有具體數字，並記錄調整前後的差異。',
      },
      {
        title: '部署到 Cloud Run',
        prompt: `請完成部署：
1. 撰寫 Dockerfile 與 .dockerignore：.env 與 course/ 原始教材不要放進映像檔（data/index.json 可以）。
2. 部署到 Google Cloud Run（區域 asia-east1），金鑰放在 Secret Manager。需要我登入 gcloud 或啟用 API 時，列出指令等我完成再繼續。
3. 設定最大執行個體數與預算提醒，避免費用失控。
4. README.md 寫給老師：如何更新教材（npm run ingest 後重新部署）、如何使用後台、每月費用估算。`,
        check: '得到 Cloud Run 公開網址；學生可以提問，前端程式碼中找不到金鑰。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 教授：研究資料分析管線
  // ---------------------------------------------------------------------------
  {
    id: 'analysis',
    platform: 'agent',
    group: 'professor',
    theme: 'AI Research Data',
    title: '研究資料分析管線',
    tagline: '問卷資料一鍵清理、統計，產出 APA 表格與報告',
    desc: '把問卷或前後測資料放進資料夾，建立可重複執行的 Python 分析流程：資料檢查與清理、信度與因素分析、t 檢定／ANOVA／相關與迴歸，自動產出 APA 7 表格、圖表與 Word 結果報告，每個分析決策都留下紀錄。',
    appName: '研究資料分析管線',
    stack: 'Python・pandas・statsmodels・pingouin・python-docx',
    prereq: ['去識別化的問卷或前後測資料（CSV／Excel）放進 data/raw/', 'Python 3.11 以上、Git', '研究問題與量表題目對照表（codebook）'],
    steps: [
      {
        title: '專案結構與資料檢查',
        prompt: `請在這個資料夾建立「研究資料分析管線」，用 Python 分析我的研究資料。
研究題目：【請填】
研究問題：【請填：RQ1、RQ2…】

【這一步：結構與資料檢查】
1. 原始資料放在 data/raw/（只讀取，不修改）。建立 Python 虛擬環境與 requirements.txt（pandas、numpy、scipy、statsmodels、pingouin、matplotlib、python-docx）。
2. 資料夾結構：data/raw、data/clean、scripts、outputs/tables、outputs/figures、reports，寫進 AGENTS.md。
3. 寫 scripts/01_check.py，產生 reports/data_check.md：樣本數、各欄位型態、缺失值比例、超出量表範圍的值、重複填答、作答時間過短或連續選同一個選項（疑似亂填）。
4. 偵測可能的個資欄位（姓名、學號、Email、電話），提醒我並在後續步驟中排除。
5. 請我提供 codebook（題號、構面、反向題、量尺），或從資料推測後讓我確認。`,
        check: 'reports/data_check.md 列出樣本數、缺失值與可疑填答，並提醒可能的個資欄位。',
      },
      {
        title: '資料清理與信效度',
        prompt: `請依 codebook 完成資料清理與量表檢核：
1. scripts/02_clean.py：反向題轉換、刪除或標記無效樣本（規則寫在 config.yaml，報告中說明刪除了幾筆、原因為何）、計算構面分數，輸出到 data/clean/。
2. scripts/03_reliability.py：各構面的 Cronbach's α 與 McDonald's ω、刪題後 α、校正後題總相關。
3. 樣本數足夠時進行因素分析，報告 KMO、Bartlett 球形檢定與因素負荷量。
4. 所有結果存成 outputs/tables/*.csv，並另存 APA 7 格式的 Word 表格。`,
        check: 'data/clean/ 出現清理後資料；信度表列出各構面 α 與 ω，並說明刪除樣本的原因。',
      },
      {
        title: '推論統計與圖表',
        prompt: `請依研究問題完成推論統計：
1. 先檢查前提假設（常態性、變異數同質性），依結果選擇有母數或無母數方法，並記錄選擇理由。
2. 依研究問題執行：描述統計、獨立／相依樣本 t 檢定、單因子 ANOVA（含事後比較）、相關、多元迴歸；有前後測時加做共變數分析（若適用）。
3. 每個檢定都報告效果量（Cohen's d、η²、R²）與 95% 信賴區間。
4. 圖表：箱形圖、前後測變化圖、相關熱圖，存到 outputs/figures/（300 dpi PNG，中文字型正確顯示）。
5. 提供 python run_all.py，一個指令從原始資料重跑到最後。`,
        check: 'python run_all.py 從頭重跑得到一致的結果，outputs/ 有 APA 表格與高解析度圖表。',
      },
      {
        title: '自動產生結果報告',
        prompt: `請產生研究結果報告：
1. scripts/report.py：把表格與圖表組成 reports/結果報告.docx（中文標楷體、英數 Times New Roman，APA 7 表格格式，圖表有編號與標題）。
2. 用 Gemini 依統計結果撰寫「研究結果」段落草稿：只能根據輸出的數字，以 APA 格式報告統計量，例如 t(58) = 2.31, p = .024, d = 0.60。
3. 寫檢查腳本：比對草稿中的每個數字都能在 outputs/tables 找到，對不上的數字標紅提醒。
4. 另外輸出 reports/方法與分析流程.md，說明每個步驟的處理方式，方便撰寫論文的研究方法章節。`,
        check: '得到 Word 結果報告，文中的統計數字都能對應到表格，沒有對不上的數字。',
      },
      {
        title: '測試、可重現與封存',
        prompt: `請完成品質檢查與交接：
1. 撰寫測試：自行產生一組已知答案的模擬資料，驗證 α、t 檢定、效果量等計算正確（與 scipy／pingouin 的結果比對）。
2. 固定套件版本與隨機種子，確保在另一台電腦執行 run_all.py 得到相同結果。
3. 建立 reports/分析紀錄.md：日期、資料版本（檔案雜湊）、刪除樣本的規則與所有分析決策，供審稿或口試時查核。
4. README.md 寫給研究助理：放入新資料 → 執行 → 取得報告，並提醒資料去識別化與研究倫理（IRB）規範。
5. 準備可公開的分析程式碼封存版本（不含原始資料），方便日後放上 OSF 或 GitHub。`,
        check: '測試全部通過；依 README 在另一台電腦操作，也能重現相同的結果與報告。',
      },
    ],
  },
];

/** 依身分排序：自己的場域在前，共同其次 */
export function agentProjectsFor(role: 'student' | 'professor'): ToolDef[] {
  const order: ToolGroup[] = role === 'professor' ? ['professor', 'common', 'student'] : ['student', 'common', 'professor'];
  return [...AGENT_PROJECTS].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}
