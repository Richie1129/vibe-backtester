/**
 * API 呼叫模組
 *
 * 封裝所有與後端 API 的通訊
 */

const API = (function() {
    'use strict';

    // API 基礎 URL（可透過環境變數覆寫）
    const BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

    // 請求超時時間（毫秒）
    const TIMEOUT = 60000;

    /**
     * 發送 HTTP 請求的通用方法
     * @param {string} url - 請求 URL
     * @param {Object} options - fetch 選項
     * @returns {Promise<Object>} - JSON 回應
     */
    async function request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.detail || `HTTP ${response.status} 錯誤`);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('請求超時，請稍後再試');
            }

            if (error.message === 'Failed to fetch') {
                throw new Error('無法連線到伺服器，請確認後端服務是否啟動');
            }

            throw error;
        }
    }

    /**
     * 搜尋股票
     * @param {string} query - 搜尋關鍵字
     * @returns {Promise<Array>} - 股票列表
     */
    async function searchStocks(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const encodedQuery = encodeURIComponent(query.trim());
        return await request(`${BASE_URL}/stocks/search?q=${encodedQuery}`);
    }

    /**
     * 取得股票資訊
     * @param {string} symbol - 股票代碼
     * @returns {Promise<Object>} - 股票資訊
     */
    async function getStockInfo(symbol) {
        if (!symbol) {
            throw new Error('請提供股票代碼');
        }

        return await request(`${BASE_URL}/stocks/${encodeURIComponent(symbol)}`);
    }

    /**
     * 執行回測
     * @param {Object} params - 回測參數
     * @param {Array<string>} params.stocks - 股票代碼列表
     * @param {string} params.start_date - 起始日期
     * @param {string} params.end_date - 結束日期
     * @param {string} params.strategy - 投資策略
     * @param {Object} params.investment - 投資設定
     * @returns {Promise<Object>} - 回測結果
     */
    async function runBacktest(params) {
        // 參數驗證
        if (!params.stocks || params.stocks.length === 0) {
            throw new Error('請至少選擇一個投資標的');
        }

        if (!params.start_date || !params.end_date) {
            throw new Error('請設定起始與結束日期');
        }

        if (!params.investment || !params.investment.amount || params.investment.amount <= 0) {
            throw new Error('請設定有效的投資金額');
        }

        return await request(`${BASE_URL}/backtest`, {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * 檢查 API 健康狀態
     * @returns {Promise<Object>} - 健康狀態
     */
    async function checkHealth() {
        return await request(`${BASE_URL}/health`);
    }

    /**
     * 執行 AI 預測分析
     * @param {string} symbol - 股票代碼
     * @returns {Promise<Object>} - 預測結果
     */
    async function predictStock(symbol) {
        return request(`${BASE_URL}/predict/${symbol}`);
    }

    // 公開介面
    return {
        searchStocks,
        getStockInfo,
        runBacktest,
        predictStock,
        checkHealth,
    };
})();

// 匯出給測試使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
