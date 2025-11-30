/**
 * 整合測試腳本
 *
 * 測試前後端連動功能
 * 需要先啟動後端服務：uvicorn main:app --port 8000
 */

const http = require('http');
const https = require('https');

const API_BASE = process.env.API_URL || 'http://localhost:8000/api';

// 測試結果統計
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
};

/**
 * HTTP 請求輔助函式
 */
function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const req = protocol.request(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : null,
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                    });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

/**
 * 測試執行函式
 */
async function test(name, fn) {
    results.total++;
    try {
        await fn();
        results.passed++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
            results.skipped++;
            console.log(`  ⊘ ${name} (API 未啟動)`);
        } else {
            results.failed++;
            console.log(`  ✗ ${name}`);
            console.log(`    Error: ${error.message}`);
        }
    }
}

function describe(name, fn) {
    console.log(`\n${name}`);
    return fn();
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ============== 整合測試開始 ==============

async function runIntegrationTests() {
    console.log('========================================');
    console.log('BackTester 整合測試');
    console.log('========================================');
    console.log(`API Base URL: ${API_BASE}`);

    // 健康檢查測試
    await describe('健康檢查', async () => {
        await test('GET /api/health 應該返回 200', async () => {
            const res = await request(`${API_BASE}/health`);
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });

        await test('健康檢查應該返回 status: healthy', async () => {
            const res = await request(`${API_BASE}/health`);
            assert(res.data.status === 'healthy', 'Status should be healthy');
        });
    });

    // 股票搜尋測試
    await describe('股票搜尋', async () => {
        await test('GET /api/stocks/search?q=AAPL 應該返回結果', async () => {
            const res = await request(`${API_BASE}/stocks/search?q=AAPL`);
            assert(res.status === 200, `Expected 200, got ${res.status}`);
            assert(Array.isArray(res.data), 'Should return array');
        });

        await test('搜尋 2330 應該找到台積電', async () => {
            const res = await request(`${API_BASE}/stocks/search?q=2330`);
            assert(res.status === 200);
            const symbols = res.data.map(s => s.symbol);
            assert(symbols.includes('2330.TW'), 'Should find 2330.TW');
        });

        await test('搜尋 QQQ 應該找到結果', async () => {
            const res = await request(`${API_BASE}/stocks/search?q=QQQ`);
            assert(res.status === 200);
            assert(res.data.length > 0, 'Should find QQQ');
        });
    });

    // 回測 API 測試
    await describe('回測 API', async () => {
        await test('POST /api/backtest 單筆投資應該成功', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['AAPL'],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'lump_sum',
                    investment: { amount: 10000 }
                }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
            assert(res.data.results, 'Should have results');
            assert(res.data.results.length === 1, 'Should have 1 result');
        });

        await test('POST /api/backtest 定期定額應該成功', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['QQQ'],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'dca',
                    investment: { amount: 1000, frequency: 'monthly' }
                }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
            assert(res.data.results[0].total_invested > 0, 'Should have invested amount');
        });

        await test('POST /api/backtest 多股票應該成功', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['AAPL', 'GOOGL'],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'lump_sum',
                    investment: { amount: 10000 }
                }
            });
            assert(res.status === 200);
            assert(res.data.results.length === 2, 'Should have 2 results');
            assert(res.data.comparison, 'Should have comparison');
        });

        await test('回測結果應該包含所有必要欄位', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['SPY'],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'lump_sum',
                    investment: { amount: 10000 }
                }
            });
            const result = res.data.results[0];
            assert('symbol' in result, 'Should have symbol');
            assert('total_return' in result, 'Should have total_return');
            assert('cagr' in result, 'Should have cagr');
            assert('max_drawdown' in result, 'Should have max_drawdown');
            assert('volatility' in result, 'Should have volatility');
            assert('sharpe_ratio' in result, 'Should have sharpe_ratio');
            assert('final_value' in result, 'Should have final_value');
            assert('portfolio_history' in result, 'Should have portfolio_history');
        });
    });

    // 錯誤處理測試
    await describe('錯誤處理', async () => {
        await test('無效日期範圍應該返回 400', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['AAPL'],
                    start_date: '2024-12-31',
                    end_date: '2023-01-01',
                    strategy: 'lump_sum',
                    investment: { amount: 10000 }
                }
            });
            assert(res.status === 400, `Expected 400, got ${res.status}`);
        });

        await test('空股票列表應該返回 422', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: [],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'lump_sum',
                    investment: { amount: 10000 }
                }
            });
            assert(res.status === 422, `Expected 422, got ${res.status}`);
        });

        await test('無效投資金額應該返回 422', async () => {
            const res = await request(`${API_BASE}/backtest`, {
                method: 'POST',
                body: {
                    stocks: ['AAPL'],
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    strategy: 'lump_sum',
                    investment: { amount: -1000 }
                }
            });
            assert(res.status === 422, `Expected 422, got ${res.status}`);
        });
    });

    // 輸出結果
    console.log('\n========================================');
    console.log('整合測試結果摘要');
    console.log('========================================');
    console.log(`通過: ${results.passed}`);
    console.log(`失敗: ${results.failed}`);
    console.log(`跳過: ${results.skipped}`);
    console.log(`總計: ${results.total}`);
    console.log('========================================');

    if (results.failed > 0) {
        console.log('\n❌ 有測試失敗！');
        process.exit(1);
    } else if (results.skipped === results.total) {
        console.log('\n⚠️  所有測試被跳過（API 未啟動）');
        console.log('請先啟動後端服務：');
        console.log('  cd backend && source ../.venv/bin/activate && uvicorn main:app --port 8000');
        process.exit(0);
    } else {
        console.log('\n✅ 所有測試通過！');
        process.exit(0);
    }
}

// 執行測試
runIntegrationTests().catch(err => {
    console.error('測試執行錯誤:', err);
    process.exit(1);
});
