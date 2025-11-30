# CLAUDE.md - BackTester 技術文件

這份文件提供 BackTester 專案的詳細技術資訊，供開發者與 Claude AI 助手參考。

## 專案概述

**專案名稱**: BackTester - 投資回測系統
**專案目標**: 建立一個簡單易用的投資回測工具，讓使用者能夠比較不同投資標的的歷史績效
**主要使用者**: 個人投資者、理財新手、投資愛好者

## 技術棧

### Backend
- **語言**: Python 3.8+
- **Web 框架**: FastAPI 0.104+
- **資料來源**: yfinance
- **資料處理**: pandas, numpy
- **ASGI Server**: uvicorn
- **其他**: python-dotenv, pydantic

### Frontend
- **HTML5 + CSS3**
- **Bootstrap 5.3+**: UI 框架
- **jQuery 3.7+**: JavaScript 函式庫
- **Chart.js 4.0+**: 圖表繪製

### 開發工具
- **版本控制**: Git
- **Python 環境管理**: uv（虛擬環境目錄：`.venv`）
- **API 測試**: FastAPI 自動生成的 Swagger UI
- **瀏覽器**: Chrome DevTools

## 專案結構

```
vibe-backtester/
│
├── backend/                      # FastAPI 後端
│   ├── main.py                   # 應用程式進入點
│   ├── requirements.txt          # Python 依賴套件
│   │
│   ├── api/                      # API 層
│   │   ├── __init__.py
│   │   ├── routes.py            # 路由定義
│   │   └── models.py            # Pydantic 資料模型
│   │
│   ├── services/                 # 業務邏輯層
│   │   ├── __init__.py
│   │   ├── data_service.py      # 股票資料取得
│   │   └── backtest_service.py  # 回測計算邏輯
│   │
│   └── utils/                    # 工具函式
│       ├── __init__.py
│       └── calculations.py      # 財務指標計算
│
├── frontend/                     # 前端
│   ├── index.html               # 主頁面
│   │
│   ├── css/
│   │   └── style.css           # 自訂樣式
│   │
│   ├── js/
│   │   ├── app.js              # 主應用邏輯
│   │   ├── api.js              # API 呼叫封裝
│   │   └── charts.js           # 圖表繪製
│   │
│   └── assets/
│       └── images/
│
├── PLAN.md                      # 實作計畫
├── README.md                    # 使用者文件
├── CLAUDE.md                    # 本文件
└── .gitignore

```

## 核心功能設計

### 1. 股票資料取得 (`data_service.py`)

#### 功能
- 從 Yahoo Finance 取得股票歷史價格
- 支援全球主要市場（美股、台股、港股等）
- 快取機制減少 API 呼叫

#### 關鍵函式
```python
def get_stock_data(symbol: str, start_date: str, end_date: str) -> pd.DataFrame
def search_stock(query: str) -> List[Dict]
def get_stock_info(symbol: str) -> Dict
```

#### 實作重點
- 使用 `yfinance.download()` 取得歷史資料
- 錯誤處理：股票代碼不存在、日期範圍無效
- 資料驗證：確保返回的資料完整性

#### yfinance 使用範例
```python
import yfinance as yf

# 取得台積電歷史資料
ticker = yf.Ticker("2330.TW")
hist = ticker.history(start="2020-01-01", end="2024-12-31")

# hist 包含欄位: Open, High, Low, Close, Volume
```

### 2. 回測計算引擎 (`backtest_service.py`)

#### 支援的投資策略

**A. 單筆投資 (Lump Sum)**
```python
def backtest_lump_sum(data: pd.DataFrame, amount: float) -> Dict:
    """
    計算單筆投資報酬

    參數:
        data: 股票歷史價格 DataFrame (index=日期, columns=[Close])
        amount: 投資金額

    返回:
        {
            'final_value': 最終價值,
            'total_return': 總報酬率,
            'cagr': 年化報酬率,
            'max_drawdown': 最大回撤,
            'volatility': 波動率,
            'sharpe_ratio': 夏普比率,
            'portfolio_history': 投資組合價值歷史
        }

    邏輯:
        1. 計算可購買股數 = amount / data.iloc[0]['Close']
        2. 計算每日價值 = shares * data['Close']
        3. 計算各項指標
    """
```

**B. 定期定額 (Dollar Cost Averaging)**
```python
def backtest_dca(data: pd.DataFrame, monthly_amount: float) -> Dict:
    """
    計算定期定額投資報酬

    參數:
        data: 股票歷史價格 DataFrame
        monthly_amount: 每月投資金額

    返回:
        與 backtest_lump_sum 相同

    邏輯:
        1. 取得每月第一個交易日
        2. 在該日以收盤價購買: shares += monthly_amount / price
        3. 計算每日價值 = total_shares * daily_price
        4. 累積總投入金額
        5. 計算報酬率 = (final_value - total_invested) / total_invested
    """
```

#### 財務指標計算

**年化報酬率 (CAGR - Compound Annual Growth Rate)**
```python
def calculate_cagr(initial_value: float, final_value: float, years: float) -> float:
    """
    CAGR = (final_value / initial_value) ^ (1 / years) - 1
    """
    return (final_value / initial_value) ** (1 / years) - 1
```

**最大回撤 (Maximum Drawdown)**
```python
def calculate_max_drawdown(portfolio_values: pd.Series) -> float:
    """
    MDD = min((current_value - peak_value) / peak_value)

    邏輯:
        1. 計算累積最大值 (running maximum)
        2. 計算每日回撤 = (當前值 - 累積最大值) / 累積最大值
        3. 返回最小值（最大跌幅）
    """
    peak = portfolio_values.expanding(min_periods=1).max()
    drawdown = (portfolio_values - peak) / peak
    return drawdown.min()
```

**波動率 (Volatility)**
```python
def calculate_volatility(returns: pd.Series) -> float:
    """
    年化波動率 = std(daily_returns) * sqrt(252)

    252 = 每年交易日數
    """
    return returns.std() * (252 ** 0.5)
```

**夏普比率 (Sharpe Ratio)**
```python
def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    """
    Sharpe Ratio = (portfolio_return - risk_free_rate) / portfolio_volatility

    risk_free_rate: 無風險利率（預設 2%）
    """
    excess_return = returns.mean() * 252 - risk_free_rate
    volatility = calculate_volatility(returns)
    return excess_return / volatility if volatility > 0 else 0
```

### 3. API 設計

#### 端點規格

**A. 搜尋股票**
```
GET /api/stocks/search?q={query}

Query Parameters:
  - q: 搜尋關鍵字（股票代碼或名稱）

Response: 200 OK
[
  {
    "symbol": "2330.TW",
    "name": "Taiwan Semiconductor Manufacturing Company Limited",
    "exchange": "TWO"
  }
]

錯誤處理:
  - 400: 缺少 query 參數
  - 500: 內部伺服器錯誤
```

**B. 執行回測**
```
POST /api/backtest

Request Body:
{
  "stocks": ["2330.TW", "0050.TW", "QQQ"],
  "start_date": "2020-01-01",
  "end_date": "2024-12-31",
  "strategy": "dca",              # lump_sum | dca
  "investment": {
    "amount": 10000,               # 單筆金額或每月投入
    "frequency": "monthly"         # monthly (DCA only)
  }
}

Response: 200 OK
{
  "results": [
    {
      "symbol": "2330.TW",
      "name": "TSMC",
      "total_return": 85.5,         # 總報酬率 (%)
      "cagr": 16.5,                 # 年化報酬率 (%)
      "max_drawdown": -28.3,        # 最大回撤 (%)
      "volatility": 22.1,           # 波動率 (%)
      "sharpe_ratio": 0.75,
      "final_value": 185000,
      "total_invested": 100000,
      "portfolio_history": [        # 投資組合價值歷史
        {"date": "2020-01-01", "value": 100000},
        {"date": "2020-02-01", "value": 95000},
        ...
      ]
    }
  ],
  "comparison": {
    "best_performer": "QQQ",
    "highest_return": 120.5,
    "lowest_risk": "0050.TW",
    "best_sharpe": "QQQ"
  }
}

錯誤處理:
  - 400: 請求參數錯誤（日期格式、缺少欄位等）
  - 404: 股票代碼不存在
  - 422: 資料驗證失敗
  - 500: 計算過程錯誤
```

**C. 取得股票資訊**
```
GET /api/stocks/{symbol}

Response: 200 OK
{
  "symbol": "2330.TW",
  "name": "Taiwan Semiconductor Manufacturing Company Limited",
  "current_price": 580.0,
  "currency": "TWD",
  "market": "Taiwan"
}

錯誤處理:
  - 404: 股票不存在
```

#### CORS 設定
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Frontend 架構

#### 頁面結構 (`index.html`)

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <!-- Bootstrap CSS -->
    <!-- Custom CSS -->
</head>
<body>
    <!-- 導航列 -->
    <nav class="navbar">...</nav>

    <!-- 主要內容 -->
    <div class="container">
        <!-- 1. 專案說明區 -->
        <section id="intro">...</section>

        <!-- 2. 標的選擇區 -->
        <section id="stock-selection">
            <div class="card">
                <input id="stock-search" />
                <div id="selected-stocks"></div>
                <div id="quick-add-buttons">
                    <button data-symbol="2330.TW">台積電</button>
                    <button data-symbol="0050.TW">0050</button>
                    <button data-symbol="QQQ">QQQ</button>
                </div>
            </div>
        </section>

        <!-- 3. 參數設定區 -->
        <section id="parameters">
            <div class="card">
                <form id="backtest-form">
                    <input type="date" id="start-date" />
                    <input type="date" id="end-date" />
                    <select id="strategy">
                        <option value="lump_sum">單筆投資</option>
                        <option value="dca">定期定額</option>
                    </select>
                    <input type="number" id="amount" />
                    <div id="frequency-group" style="display:none">
                        <select id="frequency">
                            <option value="monthly">每月</option>
                        </select>
                    </div>
                    <button type="submit">開始回測</button>
                </form>
            </div>
        </section>

        <!-- 4. 結果顯示區 -->
        <section id="results" style="display:none">
            <div class="card">
                <table id="results-table"></table>
            </div>
            <div class="card">
                <canvas id="value-chart"></canvas>
            </div>
            <div class="card">
                <canvas id="return-chart"></canvas>
            </div>
        </section>
    </div>

    <!-- Bootstrap JS -->
    <!-- jQuery -->
    <!-- Chart.js -->
    <!-- Custom JS -->
</body>
</html>
```

#### JavaScript 模組

**A. API 呼叫模組 (`api.js`)**
```javascript
const API_BASE = 'http://localhost:8000/api';

const API = {
    searchStocks: async (query) => {
        const response = await fetch(`${API_BASE}/stocks/search?q=${query}`);
        return await response.json();
    },

    runBacktest: async (params) => {
        const response = await fetch(`${API_BASE}/backtest`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(params)
        });
        if (!response.ok) throw new Error('回測失敗');
        return await response.json();
    },

    getStockInfo: async (symbol) => {
        const response = await fetch(`${API_BASE}/stocks/${symbol}`);
        return await response.json();
    }
};
```

**B. 主應用邏輯 (`app.js`)**
```javascript
$(document).ready(function() {
    let selectedStocks = [];

    // 搜尋股票（防抖）
    let searchTimeout;
    $('#stock-search').on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = $(this).val();
            if (query.length > 0) {
                const results = await API.searchStocks(query);
                displaySearchResults(results);
            }
        }, 300);
    });

    // 快速新增按鈕
    $('.quick-add-btn').click(function() {
        const symbol = $(this).data('symbol');
        addStock(symbol);
    });

    // 策略變更時顯示/隱藏頻率選項
    $('#strategy').change(function() {
        if ($(this).val() === 'dca') {
            $('#frequency-group').show();
        } else {
            $('#frequency-group').hide();
        }
    });

    // 表單提交
    $('#backtest-form').submit(async function(e) {
        e.preventDefault();

        // 顯示 loading
        showLoading();

        try {
            const params = {
                stocks: selectedStocks,
                start_date: $('#start-date').val(),
                end_date: $('#end-date').val(),
                strategy: $('#strategy').val(),
                investment: {
                    amount: parseFloat($('#amount').val()),
                    frequency: $('#frequency').val()
                }
            };

            const results = await API.runBacktest(params);
            displayResults(results);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });

    // 顯示結果
    function displayResults(data) {
        // 更新表格
        updateResultsTable(data.results);

        // 繪製圖表
        drawValueChart(data.results);
        drawReturnChart(data.results);

        // 顯示結果區
        $('#results').show();

        // 平滑捲動到結果區
        $('html, body').animate({
            scrollTop: $('#results').offset().top
        }, 500);
    }
});
```

**C. 圖表繪製 (`charts.js`)**
```javascript
function drawValueChart(results) {
    const ctx = document.getElementById('value-chart').getContext('2d');

    const datasets = results.map((result, index) => ({
        label: result.symbol,
        data: result.portfolio_history.map(h => ({
            x: h.date,
            y: h.value
        })),
        borderColor: COLORS[index],
        fill: false
    }));

    new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '投資組合價值走勢'
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

function drawReturnChart(results) {
    const ctx = document.getElementById('return-chart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.map(r => r.symbol),
            datasets: [{
                label: '總報酬率 (%)',
                data: results.map(r => r.total_return),
                backgroundColor: results.map((_, i) => COLORS[i])
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '報酬率比較'
                }
            }
        }
    });
}
```

## 資料流程

### 完整回測流程

```
使用者輸入
    ↓
前端驗證
    ↓
發送 POST /api/backtest
    ↓
Backend 接收請求
    ↓
驗證參數 (Pydantic models)
    ↓
呼叫 data_service.get_stock_data() 取得歷史資料
    ↓
呼叫 backtest_service 執行計算
    ↓
計算財務指標
    ↓
組裝回應資料
    ↓
返回 JSON
    ↓
前端接收資料
    ↓
更新表格與圖表
    ↓
顯示結果給使用者
```

## 錯誤處理策略

### Backend

```python
from fastapi import HTTPException

# 股票不存在
if data is None or len(data) == 0:
    raise HTTPException(status_code=404, detail=f"找不到股票 {symbol}")

# 日期範圍無效
if start_date >= end_date:
    raise HTTPException(status_code=400, detail="起始日期必須早於結束日期")

# 資料不足
if len(data) < 30:
    raise HTTPException(status_code=400, detail="資料點數不足，請選擇更長的時間範圍")
```

### Frontend

```javascript
try {
    const results = await API.runBacktest(params);
    displayResults(results);
} catch (error) {
    let message = '回測失敗，請稍後再試';

    if (error.response) {
        // API 錯誤回應
        message = error.response.data.detail || message;
    } else if (error.request) {
        // 網路錯誤
        message = '無法連線到伺服器';
    }

    // 顯示友善錯誤訊息
    $('#error-modal .message').text(message);
    $('#error-modal').modal('show');
}
```

## 效能優化

### 1. Backend 快取

```python
from functools import lru_cache
from datetime import datetime, timedelta

# 快取股票資料 1 小時
@lru_cache(maxsize=100)
def get_stock_data_cached(symbol: str, start_date: str, end_date: str):
    return get_stock_data(symbol, start_date, end_date)
```

### 2. 批次請求

```python
# 同時取得多個股票資料
async def get_multiple_stocks(symbols: List[str], start: str, end: str):
    tasks = [get_stock_data_async(s, start, end) for s in symbols]
    return await asyncio.gather(*tasks)
```

### 3. 前端防抖

```javascript
// 搜尋輸入防抖
let searchTimeout;
$('#stock-search').on('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch($(this).val());
    }, 300);  // 300ms 延遲
});
```

## 測試建議

### Backend 測試

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_backtest_lump_sum():
    response = client.post("/api/backtest", json={
        "stocks": ["AAPL"],
        "start_date": "2020-01-01",
        "end_date": "2024-12-31",
        "strategy": "lump_sum",
        "investment": {"amount": 10000}
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1

def test_invalid_stock():
    response = client.post("/api/backtest", json={
        "stocks": ["INVALID_SYMBOL"],
        "start_date": "2020-01-01",
        "end_date": "2024-12-31",
        "strategy": "lump_sum",
        "investment": {"amount": 10000}
    })
    assert response.status_code == 404
```

### Frontend 測試

使用瀏覽器開發者工具：
1. Network tab 檢查 API 呼叫
2. Console 檢查 JavaScript 錯誤
3. 測試不同螢幕尺寸的響應式設計

## 部署考量

### 開發環境

**重要**: 本專案使用 `uv` 進行 Python 環境管理。在安裝或使用任何套件之前，必須先啟用虛擬環境。

```bash
# Backend
cd backend

# 啟用虛擬環境（每次開新終端機都要執行）
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安裝依賴套件（使用 uv）
uv pip install -r requirements.txt

# 啟動開發伺服器
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
python -m http.server 8080
```

**注意事項**:
- 虛擬環境目錄為 `.venv`（不是 `venv`）
- 使用 `uv pip install` 而非 `pip install` 以獲得更快的安裝速度
- 若尚未建立環境，可使用 `uv venv` 建立

### 生產環境建議

- **Backend**: 使用 Gunicorn + Uvicorn workers
- **Frontend**: Nginx 靜態檔案服務
- **HTTPS**: Let's Encrypt SSL 憑證
- **監控**: 設定日誌與錯誤追蹤

## 常見開發問題

### 1. CORS 錯誤
確保 FastAPI 正確設定 CORS middleware，允許前端的 origin。

### 2. 台股資料抓取失敗
台股代碼必須加上 `.TW` 或 `.TWO` 後綴。

### 3. 日期範圍問題
不同市場的交易日曆不同，需處理週末與假日。

### 4. yfinance 限制
Yahoo Finance API 有速率限制，頻繁請求可能被暫時封鎖。

## 擴充功能建議

### Phase 2
- 配息再投入選項
- 支援加密貨幣
- 價值平均法策略
- 風險指標儀表板

### Phase 3
- 使用者帳號系統
- 儲存回測歷史
- 分享回測結果
- 投資組合追蹤

### Phase 4
- 投資組合優化（效率前緣）
- 自動再平衡策略
- 機器學習預測（僅供參考）
- 社群分享功能

## 開發檢查清單

- [ ] Backend 專案結構建立
- [ ] 安裝必要套件
- [ ] 實作 data_service.py
- [ ] 實作 backtest_service.py
- [ ] 實作 calculations.py
- [ ] 定義 API routes 與 models
- [ ] 測試 API 端點
- [ ] Frontend HTML 結構建立
- [ ] Bootstrap 樣式套用
- [ ] 實作 api.js
- [ ] 實作 app.js
- [ ] 實作 charts.js
- [ ] 測試前後端整合
- [ ] 錯誤處理完善
- [ ] 使用者體驗優化
- [ ] 文件完善

## 參考資源

### 官方文件
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [yfinance Documentation](https://pypi.org/project/yfinance/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)

### 財務知識
- CAGR 計算方式
- 夏普比率定義
- 投資組合理論
- 風險管理指標

---

**本文件持續更新中**

最後更新：2025-01-XX
版本：1.0
