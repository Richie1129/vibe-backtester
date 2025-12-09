# AI 預測模組 - 架構與實作計畫

## 💀 核心哲學 (The Philosophy)
先別急著叫它「AI」。這本質上是**資料處理 (Data Processing)**。
大多數所謂的「AI 交易機器人」只是過度擬合 (Over-fitted) 的垃圾，賠錢速度比醉漢賭博還快。
我們不是要打造一個黑盒子，而是要建立一個**決策輔助系統 (Decision Support System)**。

**規則 #1：** 如果簡單的 `if (pe_ratio < 15)` 就能解決，絕對不要用神經網路。
**規則 #2：** 垃圾進，垃圾出 (Garbage In, Garbage Out)。資料來源 (yfinance, 新聞) 的品質遠比你的模型架構重要。

---

## 1. 資料結構 (核心) - ✅ 已完成

我們定義了清晰的資料合約，確保前後端與各個分析模組之間的溝通是強型別的。

```python
class SignalType(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"

class AnalysisSource(str, Enum):
    FUNDAMENTAL = "FUNDAMENTAL" # 基本面
    SENTIMENT = "SENTIMENT"     # 消息面/情緒面
    TECHNICAL = "TECHNICAL"     # 技術面 (待實作)
```

---

## 2. 系統架構 (Architecture)

```
backend/
└── services/
    ├── prediction/
    │   ├── orchestrator.py    # 指揮官。聚合 Fundamental, Sentiment, Technical 的結果。
    │   ├── fundamental.py     # ✅ 會計師。分析 PE, PB, ROE, 利潤率, 債務比。
    │   ├── sentiment.py       # ✅ 八卦王。使用 FinBERT 分析新聞情緒。
    │   └── technical.py       # 🚧 (待實作) 線仙。分析 RSI, MACD, SMA。
```

---

## 3. 實作路線圖 (Implementation Roadmap)

### ✅ 第一階段：基礎建設與基本面 (Completed)
*   **狀態:** 完成
*   **成果:**
    1.  Pydantic 模型建立完成。
    2.  `FundamentalAnalyzer` 實作完成，包含多因子評分 (PE, PB, ROE, Margins, Debt)。
    3.  API `GET /api/predict/{symbol}` 上線。

### ✅ 第二階段：智慧層與容器化 (Completed)
*   **狀態:** 完成
*   **成果:**
    1.  `SentimentAnalyzer` 整合 `FinBERT` (Hugging Face)，取代簡單關鍵字匹配。
    2.  解決 `yfinance` 資料結構變更導致的標題遺失問題。
    3.  **Docker化:** 建立 `Dockerfile` 與 `docker-compose.yaml`，支援 Hot-reload 開發。

### 🚧 第三階段：技術面分析 (Next Step)
*   **目標:** 補足分析的最後一塊拼圖——價格行為 (Price Action)。
*   **任務:**
    1.  建立 `TechnicalAnalyzer`。
    2.  實作指標：
        *   **趨勢:** SMA (20/50/200), EMA。
        *   **動能:** RSI (相對強弱指標)。
        *   **趨勢反轉:** MACD。
    3.  將技術面訊號整合進 `Orchestrator` 的加權計算中。

### 📅 第四階段：AI 策略回測 (The Real Test)
*   **目標:** 驗證我們的「AI」是否真的能賺錢，還是只是隨機漫步。
*   **任務:**
    1.  修改 `backtest_service.py`，新增 `AI_STRATEGY` 模式。
    2.  邏輯：
        *   當 `overall_signal` 為 `BULLISH` 且信心度 > 0.6 時 -> 買入/加碼。
        *   當 `overall_signal` 為 `BEARISH` 時 -> 賣出/減碼。
    3.  比較 AI 策略與 Buy & Hold (Lump Sum) 的績效差異。

### 🚀 第五階段：效能與生產環境優化
*   **目標:** 讓系統跑得更快、更穩。
*   **任務:**
    1.  **非同步執行:** 將 `Orchestrator` 中的序列執行改為 `asyncio.gather` 並行處理。
    2.  **快取層:** 引入 Redis 或簡單的 Memory Cache，避免對同一股票重複執行昂貴的 FinBERT 運算。
    3.  **CI/CD:** 自動化測試與部署流程。

---

## 4. 當前行動項目 (Action Items)

1.  **[High Priority]** 實作 `TechnicalAnalyzer` (RSI, MACD, SMA)。
2.  **[Medium Priority]** 更新 `Orchestrator` 以納入技術面權重。
3.  **[Low Priority]** 為前端添加技術指標圖表 (TradingView Lightweight Charts?)。
