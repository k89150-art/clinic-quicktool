# 門診快速助手 Clinic QuickTool

門診快速助手是一款可離線使用的 Responsive Web App / PWA，協助診所與門診工作人員在數秒內完成：

- 慢性病連續處方箋三次領藥日期計算，以及提前、準時、延後領藥後的下一次日期。
- 代謝症候群五項判定與防治計畫收案初判。
- DM、Early CKD 與 DKD 收案初判。

本工具為快速輔助判斷工具。

實際收案仍應以健保署、國民健康署最新規定、VPN／收案系統資格及院所實際作業規範為準。

## Privacy model

- 全部邏輯皆在瀏覽器 Client-side 執行。
- 不輸入姓名、身分證字號、病歷號、電話、地址或病人清單。
- 不使用後端、資料庫、Analytics、第三方 API 或錯誤追蹤服務。
- 資料只存在 React state；重新整理或關閉頁面後即清除。
- 本工具是計算／判斷工具，不是 HIS 或病人管理系統。

## Clinical rule versions

- DM／CKD／DKD：衛生福利部中央健康保險署，115/04/01。
- 代謝症候群：衛生福利部國民健康署，115 年版。

規則版本集中於 `src/config/clinicalRuleVersion.ts`。各領域規則為不依賴 React 的 pure functions，便於逐條測試與未來更新。

> TODO: requires clinical rule confirmation — HDL「相關藥物治療」的正式涵蓋藥品、DM「最近 90 天於該院所診斷」與就醫次數的實際 VPN 欄位對應，以及各方案行政排除條件，仍應由院所依主管機關正式文件確認。

## Development setup

需求：Node.js 20 或更新版本（建議 Node.js 22）。

```bash
npm install
npm run dev
```

Vite 開發伺服器預設使用 `http://localhost:5173`。

## Testing

```bash
npm test
```

測試涵蓋慢箋月底、閏年、跨年、時區安全的本地日曆日期，以及代謝、DM、CKD、DKD 的主要門檻與資料不足情境。

## Build

```bash
npm run build
npm run preview
```

正式輸出位於 `dist/`，不應提交 Git。

## PWA

`vite-plugin-pwa` 產生 manifest 與 service worker，快取核心靜態資源。支援 Chrome、Edge、Android 與 iPhone Safari 的主畫面安裝體驗；更新採 `autoUpdate`。

## GitHub Pages

推送至 `main` 後，`.github/workflows/deploy-pages.yml` 依序執行：

1. `npm ci`
2. `npm test`
3. `npm run build`
4. 上傳並部署 `dist/`

測試或建置失敗時不會部署。GitHub Actions 環境會自動將 Vite base 設為 `/clinic-quicktool/`；正式網址格式為：

```text
https://<username>.github.io/clinic-quicktool/
```

Repository 的 Settings → Pages → Source 請選擇 GitHub Actions。

## Project architecture

```text
src/
├─ config/clinicalRuleVersion.ts
├─ features/
│  ├─ prescription/domain/
│  │  ├─ prescriptionTypes.ts
│  │  ├─ prescriptionRules.ts
│  │  └─ prescriptionRules.test.ts
│  └─ eligibility/domain/
│     ├─ eligibilityTypes.ts
│     ├─ metabolicTypes.ts
│     ├─ metabolicRules.ts
│     ├─ diabetesRules.ts
│     ├─ ckdRules.ts
│     ├─ dkdRules.ts
│     └─ *.test.ts
├─ App.tsx
└─ index.css
```

UI 只收集輸入、呼叫規則引擎並呈現結果。臨床邏輯不寫在 React 元件內。

## Future Tauri desktop packaging

目前沒有原生 Windows 程式。由於規則引擎無瀏覽器或 React 相依，且沒有後端，未來可在不改寫臨床邏輯的前提下用 Tauri 包裝正式建置輸出。

## Branch convention

- `feature/...`
- `fix/...`
- `refactor/...`
