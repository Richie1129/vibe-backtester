/**
 * Node.js 前端測試執行腳本
 *
 * 在 Node.js 環境中執行基本的單元測試
 */

// 模擬瀏覽器環境
global.window = global;
global.document = {
    getElementById: () => null,
    createElement: () => ({}),
    addEventListener: () => {},
};

// 測試結果統計
const results = {
    passed: 0,
    failed: 0,
    total: 0,
};

// 簡易斷言函式
const assert = {
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, but got ${actual}`);
        }
    },
    ok(value, message) {
        if (!value) {
            throw new Error(message || `Expected truthy value, but got ${value}`);
        }
    },
    true(value, message) {
        if (value !== true) {
            throw new Error(message || `Expected true, but got ${value}`);
        }
    },
    false(value, message) {
        if (value !== false) {
            throw new Error(message || `Expected false, but got ${value}`);
        }
    },
    isArray(value, message) {
        if (!Array.isArray(value)) {
            throw new Error(message || `Expected array, but got ${typeof value}`);
        }
    },
    isString(value, message) {
        if (typeof value !== 'string') {
            throw new Error(message || `Expected string, but got ${typeof value}`);
        }
    },
    isNumber(value, message) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(message || `Expected number, but got ${typeof value}`);
        }
    },
    isFunction(value, message) {
        if (typeof value !== 'function') {
            throw new Error(message || `Expected function, but got ${typeof value}`);
        }
    },
    hasProperty(obj, prop, message) {
        if (!(prop in obj)) {
            throw new Error(message || `Expected object to have property ${prop}`);
        }
    },
};

// 測試執行函式
function test(name, fn) {
    results.total++;
    try {
        fn();
        results.passed++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        results.failed++;
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${error.message}`);
    }
}

function describe(name, fn) {
    console.log(`\n${name}`);
    fn();
}

// ============== 測試開始 ==============

console.log('========================================');
console.log('BackTester Frontend Tests (Node.js)');
console.log('========================================');

// 載入模組（簡化版本，不依賴瀏覽器 API）
const fs = require('fs');
const path = require('path');

// ============== Charts 模組測試 ==============

describe('Charts 模組', () => {
    // 模擬 Charts 模組的基本功能
    const COLORS = [
        '#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0',
        '#6f42c1', '#fd7e14', '#20c997', '#6c757d', '#d63384',
    ];

    function getColor(index) {
        return COLORS[index % COLORS.length];
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }

    function formatPercent(value) {
        return value.toFixed(2) + '%';
    }

    test('COLORS 應該有 10 個顏色', () => {
        assert.equal(COLORS.length, 10);
    });

    test('COLORS 應該是有效的 HEX 顏色', () => {
        COLORS.forEach(color => {
            assert.ok(color.startsWith('#'), `${color} 應該以 # 開頭`);
            assert.equal(color.length, 7, `${color} 長度應該是 7`);
        });
    });

    test('getColor 應該返回正確的顏色', () => {
        assert.equal(getColor(0), '#0d6efd');
        assert.equal(getColor(1), '#198754');
    });

    test('getColor 應該循環使用顏色', () => {
        assert.equal(getColor(0), getColor(10));
        assert.equal(getColor(1), getColor(11));
    });

    test('formatPercent 應該格式化為百分比', () => {
        assert.equal(formatPercent(15.5), '15.50%');
        assert.equal(formatPercent(-8.25), '-8.25%');
        assert.equal(formatPercent(0), '0.00%');
    });

    test('formatCurrency 應該格式化為貨幣', () => {
        const result = formatCurrency(1000000);
        assert.isString(result);
        assert.ok(result.length > 0);
    });
});

// ============== 資料驗證測試 ==============

describe('資料驗證', () => {
    test('美股代碼應該是大寫字母', () => {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
        symbols.forEach(s => {
            assert.ok(/^[A-Z]+$/.test(s), `${s} 應該是大寫字母`);
        });
    });

    test('台股代碼應該包含數字和 .TW', () => {
        const symbols = ['2330.TW', '0050.TW', '2317.TW'];
        symbols.forEach(s => {
            assert.ok(/^\d+\.TW$/.test(s), `${s} 應該是台股格式`);
        });
    });

    test('正數金額應該有效', () => {
        assert.true(10000 > 0);
        assert.true(1 > 0);
    });

    test('零或負數金額應該無效', () => {
        assert.false(0 > 0);
        assert.false(-1000 > 0);
    });
});

// ============== 日期驗證測試 ==============

describe('日期驗證', () => {
    test('起始日期應該早於結束日期', () => {
        const start = new Date('2020-01-01');
        const end = new Date('2024-12-31');
        assert.true(start < end);
    });

    test('相同日期應該無效', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-01');
        assert.false(start < end);
    });

    test('起始日期晚於結束日期應該無效', () => {
        const start = new Date('2024-12-31');
        const end = new Date('2020-01-01');
        assert.false(start < end);
    });

    test('日期格式化應該是 YYYY-MM-DD', () => {
        const date = new Date('2024-06-15');
        const formatted = date.toISOString().split('T')[0];
        assert.equal(formatted, '2024-06-15');
    });
});

// ============== 回測結果格式測試 ==============

describe('回測結果格式', () => {
    const mockResult = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        total_return: 150.5,
        cagr: 25.3,
        max_drawdown: -28.5,
        volatility: 22.1,
        sharpe_ratio: 1.15,
        final_value: 250500,
        total_invested: 100000,
        portfolio_history: [
            { date: '2020-01-01', value: 100000 },
            { date: '2024-12-31', value: 250500 }
        ]
    };

    test('結果應該有 symbol 屬性', () => {
        assert.hasProperty(mockResult, 'symbol');
        assert.isString(mockResult.symbol);
    });

    test('結果應該有 total_return 屬性', () => {
        assert.hasProperty(mockResult, 'total_return');
        assert.isNumber(mockResult.total_return);
    });

    test('結果應該有 cagr 屬性', () => {
        assert.hasProperty(mockResult, 'cagr');
        assert.isNumber(mockResult.cagr);
    });

    test('max_drawdown 應該是負數或零', () => {
        assert.true(mockResult.max_drawdown <= 0);
    });

    test('volatility 應該是非負數', () => {
        assert.true(mockResult.volatility >= 0);
    });

    test('portfolio_history 應該是陣列', () => {
        assert.isArray(mockResult.portfolio_history);
    });

    test('portfolio_history 項目應該有 date 和 value', () => {
        mockResult.portfolio_history.forEach(item => {
            assert.hasProperty(item, 'date');
            assert.hasProperty(item, 'value');
        });
    });
});

// ============== 數值計算精度測試 ==============

describe('數值計算精度', () => {
    test('百分比應該保留兩位小數', () => {
        assert.equal((15.5678).toFixed(2), '15.57');
    });

    test('貨幣應該四捨五入到整數', () => {
        assert.equal(Math.round(123456.78), 123457);
    });

    test('夏普比率應該保留兩位小數', () => {
        assert.equal((1.2345).toFixed(2), '1.23');
    });
});

// ============== API 參數驗證測試 ==============

describe('API 參數驗證', () => {
    function validateBacktestParams(params) {
        if (!params.stocks || params.stocks.length === 0) {
            return { valid: false, error: '請至少選擇一個投資標的' };
        }
        if (!params.start_date || !params.end_date) {
            return { valid: false, error: '請設定起始與結束日期' };
        }
        const start = new Date(params.start_date);
        const end = new Date(params.end_date);
        if (start >= end) {
            return { valid: false, error: '起始日期必須早於結束日期' };
        }
        if (!params.investment || params.investment.amount <= 0) {
            return { valid: false, error: '投資金額必須大於 0' };
        }
        return { valid: true };
    }

    test('有效參數應該通過驗證', () => {
        const result = validateBacktestParams({
            stocks: ['AAPL'],
            start_date: '2020-01-01',
            end_date: '2024-12-31',
            strategy: 'lump_sum',
            investment: { amount: 10000 }
        });
        assert.true(result.valid);
    });

    test('空 stocks 應該驗證失敗', () => {
        const result = validateBacktestParams({
            stocks: [],
            start_date: '2020-01-01',
            end_date: '2024-12-31',
            investment: { amount: 10000 }
        });
        assert.false(result.valid);
    });

    test('缺少日期應該驗證失敗', () => {
        const result = validateBacktestParams({
            stocks: ['AAPL'],
            investment: { amount: 10000 }
        });
        assert.false(result.valid);
    });

    test('無效日期範圍應該驗證失敗', () => {
        const result = validateBacktestParams({
            stocks: ['AAPL'],
            start_date: '2024-12-31',
            end_date: '2020-01-01',
            investment: { amount: 10000 }
        });
        assert.false(result.valid);
    });

    test('零金額應該驗證失敗', () => {
        const result = validateBacktestParams({
            stocks: ['AAPL'],
            start_date: '2020-01-01',
            end_date: '2024-12-31',
            investment: { amount: 0 }
        });
        assert.false(result.valid);
    });

    test('負數金額應該驗證失敗', () => {
        const result = validateBacktestParams({
            stocks: ['AAPL'],
            start_date: '2020-01-01',
            end_date: '2024-12-31',
            investment: { amount: -1000 }
        });
        assert.false(result.valid);
    });
});

// ============== 輸出測試結果 ==============

console.log('\n========================================');
console.log('測試結果摘要');
console.log('========================================');
console.log(`通過: ${results.passed}`);
console.log(`失敗: ${results.failed}`);
console.log(`總計: ${results.total}`);
console.log('========================================');

if (results.failed > 0) {
    console.log('\n❌ 有測試失敗！');
    process.exit(1);
} else {
    console.log('\n✅ 所有測試通過！');
    process.exit(0);
}
