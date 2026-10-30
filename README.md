# NCUE 未來教師 AI 力：Skills 設計與教學創新

專為彰化師範大學師培生與教授設計的 AI 教學實戰工具箱。15 組 Gemini Canvas 工具提示詞、5 個 Codex / Antigravity 進階專案，加上 30 個教學技能（教案、素養評量、差異化教學、試教演練、教學反思、行動研究…）各附一段專業 Prompt，填一次教學情境就能組合出完整提示詞，一鍵複製到 ChatGPT / Claude / Gemini，或在站內用 Gemini 即時生成。

## 主要功能

- **Gemini 工具箱（15 組 Gemini Canvas 提示詞）**：每個工具是 3 步提示詞，在 Gemini 的 Canvas 依序貼上，就能生成屬於自己的 AI 工具（單一 HTML App）並分享連結。提示詞可修改、可標記完成進度，也能下載成 Word 講義（單一工具或全部 15 個）。內容在 `src/data/tools.ts`。
  - 共同常用：Prompt 實驗室、PDF 文件助理、PDF 沉浸式翻譯、板書與手寫辨識、APA 7 引用格式
  - 教授場域（AI 從工具走向研究與知識創造）：研究發想助理、學術寫作潤飾台、研究資料分析台、課程專屬 AI 助教（RAG）、批次回饋工作流（Agent）
  - 師培生場域（AI 從工具走向未來教師的教學能力）：AI 備課速成、教學圖像工作室、課堂遊戲產生器、出題與錯誤診斷、班級經營模擬器
- **Codex / Antigravity 工具箱（5 個進階專案）**：用 Codex 或 Antigravity 開啟電腦裡的資料夾，依序貼上 5 步提示詞，AI 會分階段寫出完整的多檔案專案、測試並部署上線。第 1 步會附上工作規則：建立 `AGENTS.md` 與 `docs/WORKLOG.md`、每步 git commit、做完一步就停下來等確認，換工具時貼「接手提示詞」即可從中斷處繼續。內容在 `src/data/agentTools.ts`。
  - 舊教材 AI 轉生（共同）、3D 互動教材工作坊、課堂即時互動系統（師培生）、課程 AI 助教網站、研究資料分析管線（教授）
- **情境填一次、全站共用**：教育階段、科目、單元、教學法、評量型態會自動帶入每個技能，並記在瀏覽器中，下次開啟仍在。
- **可直接修改 Prompt**：右側 Prompt 可編輯；改過後可一鍵「還原自動組合」。
- **附加素材**：可貼上學生作答、前後測數據、文獻摘要等（第 17、23、24、26、27、29、30 號技能特別建議提供）。
- **即時生成（串流）**：文字逐段出現，可隨時停止；成果以標題、表格排版顯示。
- **帶走成果**：複製到 Word / Google 文件會保留表格格式，也可下載 Word（.docx，Google 文件、Pages 也能開）或 Markdown。
- **師培生／教授兩種視角**：切換身分會改變 Prompt 的角色設定與結尾提醒。
- **全域搜尋**：搜尋技能名稱、標籤、說明與 Prompt 內文；輸入數字可直接找技能編號；按 `/` 快速搜尋。
- 手機版、鍵盤操作與螢幕閱讀器皆可使用。

## 本機執行

需要 Node.js 22 以上（Vite 8 的需求）。

```bash
npm install
cp .env.example .env.local   # 填入 GEMINI_API_KEY（不填也能用，只是沒有站內生成）
npm run dev                  # http://localhost:3000
```

## 部署

**含站內 AI 生成（Cloud Run / 任何 Node 主機 / Google AI Studio）**

```bash
npm run build
NODE_ENV=production GEMINI_API_KEY=你的金鑰 npm start
```

可用的環境變數請見 `.env.example`（模型名稱、每個 IP 的生成次數限制、Prompt 長度上限）。

**Google Cloud Run（從 GitHub 持續部署）**

1. Cloud Run →「部署容器」→「服務」→ 選「從存放區持續部署」→「設定 Cloud Build」。
2. 存放區供應商選 GitHub，依畫面授權並安裝 Google Cloud Build GitHub App，選擇本 repo。
3. 分支填 `^main$`，建置類型選「Dockerfile」（路徑 `/Dockerfile`）。
4. 驗證選「允許未經驗證的叫用」（公開網站）。
5. 在「容器、變數與密鑰」新增 `GEMINI_API_KEY`（建議從 Secret Manager 參照）。
6. 建立後，之後每次推送到 main 都會自動重新部署。

**純靜態主機（Firebase Hosting、GitHub Pages…）**

`npm run build` 後上傳 `dist/` 即可。網站偵測不到後端時，會自動隱藏「即時 AI 生成」，只保留「複製 Prompt」功能。

## 修改或新增技能

技能內容都在 `src/data/skills.ts`：

| 欄位 | 說明 |
|---|---|
| `id` / `cat` / `title` / `desc` | 編號、分類、名稱、卡片說明 |
| `prompt` | 任務指令（情境、素材、輸出要求會自動組合在前後） |
| `top` | 設為 `true` 會出現在「必學 Top 5」 |
| `materialHint` | 有填時，彈窗會顯示「附加素材」欄位並提示要貼什麼 |
| `links` / `tags` / `video` | 相關連結、搜尋標籤、示範影片（YouTube embed 網址） |

Prompt 的組合邏輯（角色開場、情境、共通輸出要求）在 `src/lib/prompt.ts`；範例情境在 `src/data/presets.ts`。

## 隱私提醒

請勿在情境或附加素材中輸入學生真實姓名、學號或敏感資訊，請以代號取代。

---

原始專案由 Google AI Studio 建立：https://ai.studio/apps/af64e1dc-e104-4509-889d-08875f91eb34
