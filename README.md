# NCUE 未來教師 AI 力：Skills 設計與教學創新

專為彰化師範大學師培生與教授設計的 AI 教學實戰工具箱。30 個教學技能（教案、素養評量、差異化教學、試教演練、教學反思、行動研究…）各附一段專業 Prompt，填一次教學情境就能組合出完整提示詞，一鍵複製到 ChatGPT / Claude / Gemini，或在站內用 Gemini 即時生成。

## 主要功能

- **情境填一次、全站共用**：教育階段、科目、單元、教學法、評量型態會自動帶入每個技能，並記在瀏覽器中，下次開啟仍在。
- **可直接修改 Prompt**：右側 Prompt 可編輯；改過後可一鍵「還原自動組合」。
- **附加素材**：可貼上學生作答、前後測數據、文獻摘要等（第 17、23、24、26、27、29、30 號技能特別建議提供）。
- **即時生成（串流）**：文字逐段出現，可隨時停止；成果以標題、表格排版顯示。
- **帶走成果**：複製到 Word / Google 文件會保留表格格式，也可下載 Word（.doc）或 Markdown。
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
