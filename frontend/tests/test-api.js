/**
 * API 模組測試
 */

describe('API 模組', function() {
    it('應該有 API 物件', function() {
        assert.ok(typeof API !== 'undefined', 'API 應該被定義');
    });

    it('應該有 searchStocks 函式', function() {
        assert.isFunction(API.searchStocks, 'searchStocks 應該是函式');
    });

    it('應該有 getStockInfo 函式', function() {
        assert.isFunction(API.getStockInfo, 'getStockInfo 應該是函式');
    });

    it('應該有 runBacktest 函式', function() {
        assert.isFunction(API.runBacktest, 'runBacktest 應該是函式');
    });

    it('應該有 checkHealth 函式', function() {
        assert.isFunction(API.checkHealth, 'checkHealth 應該是函式');
    });

    it('應該有 BASE_URL 屬性', function() {
        assert.isString(API.BASE_URL, 'BASE_URL 應該是字串');
        assert.ok(API.BASE_URL.includes('http'), 'BASE_URL 應該包含 http');
    });

    it('searchStocks 空查詢應返回空陣列', async function() {
        const result = await API.searchStocks('');
        assert.isArray(result, '應該返回陣列');
        assert.equal(result.length, 0, '空查詢應返回空陣列');
    });

    it('searchStocks 空白查詢應返回空陣列', async function() {
        const result = await API.searchStocks('   ');
        assert.isArray(result, '應該返回陣列');
        assert.equal(result.length, 0, '空白查詢應返回空陣列');
    });

    it('runBacktest 缺少 stocks 應拋出錯誤', async function() {
        await assert.rejects(
            API.runBacktest({
                start_date: '2020-01-01',
                end_date: '2024-12-31',
                strategy: 'lump_sum',
                investment: { amount: 10000 }
            }),
            '缺少 stocks 應拋出錯誤'
        );
    });

    it('runBacktest 空 stocks 陣列應拋出錯誤', async function() {
        await assert.rejects(
            API.runBacktest({
                stocks: [],
                start_date: '2020-01-01',
                end_date: '2024-12-31',
                strategy: 'lump_sum',
                investment: { amount: 10000 }
            }),
            '空 stocks 陣列應拋出錯誤'
        );
    });

    it('runBacktest 缺少日期應拋出錯誤', async function() {
        await assert.rejects(
            API.runBacktest({
                stocks: ['AAPL'],
                strategy: 'lump_sum',
                investment: { amount: 10000 }
            }),
            '缺少日期應拋出錯誤'
        );
    });

    it('runBacktest 投資金額為 0 應拋出錯誤', async function() {
        await assert.rejects(
            API.runBacktest({
                stocks: ['AAPL'],
                start_date: '2020-01-01',
                end_date: '2024-12-31',
                strategy: 'lump_sum',
                investment: { amount: 0 }
            }),
            '投資金額為 0 應拋出錯誤'
        );
    });

    it('runBacktest 投資金額為負數應拋出錯誤', async function() {
        await assert.rejects(
            API.runBacktest({
                stocks: ['AAPL'],
                start_date: '2020-01-01',
                end_date: '2024-12-31',
                strategy: 'lump_sum',
                investment: { amount: -1000 }
            }),
            '投資金額為負數應拋出錯誤'
        );
    });

    it('getStockInfo 無參數應拋出錯誤', async function() {
        await assert.rejects(
            API.getStockInfo(),
            '無參數應拋出錯誤'
        );
    });

    it('getStockInfo 空字串應拋出錯誤', async function() {
        await assert.rejects(
            API.getStockInfo(''),
            '空字串應拋出錯誤'
        );
    });
});
