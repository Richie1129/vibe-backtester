# BackTester 投資回測系統 - 實作計畫

## 專案概述

BackTester 是一個投資回測系統，讓使用者能夠驗證不同投資標的的歷史績效表現。
透過數據回測，回答「投資台積電好」、「0050 比較穩」、「QQQ 才是王道」等問題。

## 技術架構

### Backend (Python + FastAPI)
- **框架**: FastAPI
- **數據來源**: yfinance (Yahoo Finance API)
- **資料處理**: pandas, numpy
- **位置**: `backend/` 目錄

### Frontend (Bootstrap 5 + jQuery)
- **UI 框架**: Bootstrap 5
- **JavaScript**: jQuery
- **圖表**: Chart.js
- **位置**: `frontend/` 目錄

---

## 階段一：Backend 基礎建設

### 1.1 專案結構設置
```
backend/
├── main.py                 # FastAPI 應用主程式
├── requirements.txt        # Python 套件依賴
├── api/
│   ├── __init__.py
│   ├── routes.py          # API 路由定義
│   └── models.py          # Pydantic 資料模型
├── services/
│   ├── __init__.py
│   ├── data_service.py    # 股票數據取得服務
│   └── backtest_service.py # 回測計算邏輯
└── utils/
    ├── __init__.py
    └── calculations.py    # 財務指標計算工具
```

### 1.2 核心功能模組

#### A. 數據取得服務 (`data_service.py`)
- 搜尋股票代碼
- 取得歷史價格數據
- 支援的標的：
  - 美股 (AAPL, TSLA, QQQ, SPY 等)
  - 台股 (2330.TW, 0050.TW 等)
  - 其他主要市場

#### B. 回測計算服務 (`backtest_service.py`)
- **投資策略**:
  - 單筆投資 (Lump Sum)
  - 定期定額 (Dollar Cost Averaging)
  - 定期定股 (Share-based DCA)

- **計算指標**:
  - 總報酬率 (Total Return)
  - 年化報酬率 (CAGR)
  - 最大回撤 (Maximum Drawdown)
  - 波動率 (Volatility)
  - 夏普比率 (Sharpe Ratio)
  - 勝率 (Win Rate)

#### C. API 端點設計

```python
# 1. 搜尋股票
GET /api/stocks/search?q={query}
Response: [
  {
    "symbol": "2330.TW",
    "name": "台積電",
    "exchange": "TWO"
  }
]

# 2. 執行回測
POST /api/backtest
Request: {
  "stocks": ["2330.TW", "0050.TW", "QQQ"],
  "start_date": "2020-01-01",
  "end_date": "2024-12-31",
  "strategy": "dca",  # lump_sum | dca | dca_shares
  "investment": {
    "amount": 10000,     # 單筆金額或每月投入
    "frequency": "monthly"  # monthly | weekly (for DCA)
  }
}
Response: {
  "results": [
    {
      "symbol": "2330.TW",
      "total_return": 150.5,
      "cagr": 28.5,
      "max_drawdown": -25.3,
      "volatility": 18.2,
      "sharpe_ratio": 1.56,
      "final_value": 250000,
      "total_invested": 100000,
      "price_history": [...],
      "portfolio_value_history": [...]
    }
  ],
  "comparison": {
    "best_performer": "QQQ",
    "lowest_risk": "0050.TW"
  }
}

# 3. 取得股票資訊
GET /api/stocks/{symbol}
Response: {
  "symbol": "2330.TW",
  "name": "台積電",
  "current_price": 580.0,
  "currency": "TWD"
}
```

---

## 階段二：Frontend 使用者介面

### 2.1 專案結構
```
frontend/
├── index.html              # 主頁面
├── css/
│   └── style.css          # 自訂樣式
├── js/
│   ├── app.js             # 主要應用邏輯
│   ├── api.js             # API 呼叫封裝
│   └── charts.js          # 圖表繪製
└── assets/
    └── images/
```

### 2.2 頁面設計

#### 主要區塊
1. **標題與說明區**
   - 專案名稱與 Logo
   - 簡短使用說明

2. **投資標的選擇區**
   - 搜尋框（支援模糊搜尋）
   - 已選標的列表（可移除）
   - 建議標的快速新增按鈕（台積電、0050、QQQ 等）

3. **回測參數設定區**
   - 起始日期選擇器
   - 結束日期選擇器
   - 投資策略選擇（單選）
     - 單筆投資
     - 定期定額
   - 投資金額輸入
   - 投資頻率選擇（定期定額才顯示）

4. **執行與結果區**
   - 執行回測按鈕
   - Loading 狀態提示
   - 結果表格（各標的比較）
   - 績效圖表
     - 投資組合價值走勢圖（折線圖）
     - 報酬率比較圖（長條圖）
     - 風險指標雷達圖

### 2.3 互動功能（jQuery）

```javascript
// 功能清單
- 動態新增/移除投資標的
- 股票代碼即時搜尋
- 表單驗證
- API 呼叫與錯誤處理
- 結果動畫呈現
- 響應式圖表更新
- 匯出結果（CSV/PNG）
```

### 2.4 UI/UX 設計原則
- 使用 Bootstrap 5 的 Grid 系統實現響應式佈局
- Card 組件呈現各區塊
- Form 組件處理輸入
- Table 組件展示結果
- Modal 處理錯誤訊息
- Spinner 顯示載入狀態

---

## 階段三：核心功能實作細節

### 3.1 定期定額回測邏輯

```python
def backtest_dca(symbol, start_date, end_date, monthly_amount):
    """
    定期定額回測

    流程：
    1. 取得每月第一個交易日的收盤價
    2. 計算可購買股數 = monthly_amount / price
    3. 累積總股數
    4. 計算每日投資組合價值 = 總股數 × 當日收盤價
    5. 計算報酬率 = (最終價值 - 總投入) / 總投入
    """
    # 實作詳見 backend/services/backtest_service.py
```

### 3.2 財務指標計算

```python
# 年化報酬率 (CAGR)
CAGR = (final_value / initial_value) ^ (1 / years) - 1

# 最大回撤 (MDD)
MDD = min((current_value - peak_value) / peak_value)

# 夏普比率 (Sharpe Ratio)
Sharpe = (portfolio_return - risk_free_rate) / portfolio_volatility

# 波動率 (Volatility)
Volatility = std(daily_returns) * sqrt(252)
```

### 3.3 資料快取機制
- 使用記憶體快取減少 API 呼叫
- 相同標的與日期範圍的資料可重複使用
- 快取時效：1 小時

---

## 階段四：測試與優化

### 4.1 測試項目
- API 端點測試
- 回測計算邏輯驗證
- 前端表單驗證測試
- 不同投資策略結果比對
- 邊界條件測試（無效日期、標的不存在等）

### 4.2 效能優化
- 批次取得多個標的數據
- 前端防抖處理搜尋輸入
- 結果分頁顯示
- 圖表延遲載入

### 4.3 錯誤處理
- API 錯誤回應標準化
- 前端友善錯誤訊息
- 網路錯誤重試機制

---

## 階段五：部署與文件

### 5.1 部署準備
```bash
# Backend 啟動
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend 啟動
cd frontend
# 使用任何靜態伺服器，例如：
python -m http.server 8080
```

### 5.2 環境變數設定
```env
# .env
CORS_ORIGINS=http://localhost:8080
CACHE_EXPIRY=3600
```

### 5.3 文件完善
- README.md：專案說明、安裝指南、使用方式
- CLAUDE.md：技術細節、架構說明、開發指引
- API 文件：FastAPI 自動生成 (/docs)

---

## 預期成果

### 功能展示範例
使用者可以輸入：
- 標的：台積電(2330.TW)、0050(0050.TW)、QQQ
- 期間：2020-01-01 至 2024-12-31
- 策略：每月定期定額 1 萬元

系統會回傳：
- 台積電最終價值：185 萬元（報酬率 +85%）
- 0050 最終價值：120 萬元（報酬率 +20%）
- QQQ 最終價值：220 萬元（報酬率 +120%）
- 結論：QQQ 表現最佳，但波動較大

### 視覺化呈現
- 三條折線圖顯示投資組合價值隨時間變化
- 長條圖比較最終報酬率
- 表格詳列各項財務指標

---

## 開發時程估計

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 1 | Backend 基礎設置 | 2 小時 |
| 2 | 數據服務開發 | 3 小時 |
| 3 | 回測邏輯實作 | 4 小時 |
| 4 | API 端點開發 | 2 小時 |
| 5 | Frontend 頁面架構 | 2 小時 |
| 6 | 互動功能實作 | 3 小時 |
| 7 | 圖表整合 | 2 小時 |
| 8 | 測試與除錯 | 2 小時 |
| **總計** | | **20 小時** |

---

## 未來擴充功能

1. **更多投資策略**
   - 價值平均法 (Value Averaging)
   - 再平衡策略 (Rebalancing)
   - 網格交易 (Grid Trading)

2. **進階指標**
   - Alpha、Beta 計算
   - Sortino Ratio
   - Calmar Ratio

3. **組合優化**
   - 效率前緣 (Efficient Frontier)
   - 風險平價 (Risk Parity)

4. **資料匯出**
   - PDF 報告生成
   - Excel 匯出

5. **使用者系統**
   - 儲存回測記錄
   - 自訂投資組合追蹤

---

## 技術選型理由

### 為何選擇 FastAPI？
- 高效能、現代化的 Python Web 框架
- 自動生成 API 文件
- 原生支援非同步處理
- 型別檢查與資料驗證

### 為何使用 yfinance？
- 免費取得全球股市數據
- 簡單易用的 API
- 支援台股、美股等多個市場
- 社群活躍、文件完整

### 為何選擇 Bootstrap + jQuery？
- Bootstrap 5 提供現成的響應式組件
- jQuery 簡化 DOM 操作與 AJAX 呼叫
- 學習曲線平緩
- 快速開發原型

---

## 注意事項

1. **資料準確性**
   - Yahoo Finance 資料可能有延遲或錯誤
   - 台股資料需加上 `.TW` 後綴
   - 回測結果僅供參考，不構成投資建議

2. **CORS 設定**
   - Backend 需正確設定 CORS 允許 Frontend 存取

3. **日期處理**
   - 需考慮不同市場的交易日曆
   - 週末、假日無交易資料

4. **除錯提示**
   - 若股票代碼找不到，檢查後綴是否正確
   - 日期範圍過短可能導致數據不足
   - 定期定額需至少 3 個月數據才有意義

---

## 結語

這份計畫提供了完整的 BackTester 系統開發藍圖，從架構設計、功能規劃到實作細節都有詳細說明。
按照此計畫執行，可以建立一個功能完整、使用者友善的投資回測系統。

開發過程中可能遇到的問題：
- 數據來源限制
- 計算邏輯複雜度
- 前端視覺化效能

解決方向：
- 實作錯誤處理與降級方案
- 模組化設計，逐步驗證
- 使用 CDN 加速資源載入

祝開發順利！
