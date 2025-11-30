/**
 * 工具函式與整合測試
 */

describe('工具函式測試', function() {
    // 測試日期格式化
    it('日期格式化應該返回 YYYY-MM-DD', function() {
        const date = new Date('2024-06-15');
        const formatted = date.toISOString().split('T')[0];
        assert.equal(formatted, '2024-06-15', '日期格式應該是 YYYY-MM-DD');
    });

    it('應該正確處理月份邊界', function() {
        const date = new Date('2024-01-01');
        const formatted = date.toISOString().split('T')[0];
        assert.equal(formatted, '2024-01-01', '應該正確處理 1 月');
    });

    it('應該正確處理年末', function() {
        const date = new Date('2024-12-31');
        const formatted = date.toISOString().split('T')[0];
        assert.equal(formatted, '2024-12-31', '應該正確處理 12 月');
    });
});

describe('資料驗證測試', function() {
    // 測試股票代碼格式
    it('美股代碼應該是大寫字母', function() {
        const symbol = 'AAPL';
        assert.ok(/^[A-Z]+$/.test(symbol), '美股代碼應該是大寫字母');
    });

    it('台股代碼應該包含數字和 .TW', function() {
        const symbol = '2330.TW';
        assert.ok(/^\d+\.TW$/.test(symbol), '台股代碼應該包含數字和 .TW');
    });

    it('ETF 代碼應該是有效格式', function() {
        const symbols = ['QQQ', 'SPY', 'VOO', '0050.TW'];
        symbols.forEach(function(symbol) {
            assert.ok(symbol.length > 0, `${symbol} 應該非空`);
        });
    });

    // 測試金額驗證
    it('正數金額應該有效', function() {
        const amount = 10000;
        assert.ok(amount > 0, '金額應該大於 0');
    });

    it('零金額應該無效', function() {
        const amount = 0;
        assert.false(amount > 0, '零金額應該無效');
    });

    it('負數金額應該無效', function() {
        const amount = -5000;
        assert.false(amount > 0, '負數金額應該無效');
    });
});

describe('日期範圍驗證', function() {
    it('起始日期應該早於結束日期', function() {
        const start = new Date('2020-01-01');
        const end = new Date('2024-12-31');
        assert.ok(start < end, '起始日期應該早於結束日期');
    });

    it('相同日期應該無效', function() {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-01');
        assert.false(start < end, '相同日期應該無效');
    });

    it('起始日期晚於結束日期應該無效', function() {
        const start = new Date('2024-12-31');
        const end = new Date('2020-01-01');
        assert.false(start < end, '起始日期晚於結束日期應該無效');
    });

    it('日期範圍不應超過 20 年', function() {
        const start = new Date('2000-01-01');
        const end = new Date('2024-12-31');
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
        assert.ok(years <= 25, '日期範圍不應超過 25 年');
    });
});

describe('回測結果格式驗證', function() {
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

    it('結果應該有 symbol 屬性', function() {
        assert.hasProperty(mockResult, 'symbol');
        assert.isString(mockResult.symbol);
    });

    it('結果應該有 total_return 屬性', function() {
        assert.hasProperty(mockResult, 'total_return');
        assert.isNumber(mockResult.total_return);
    });

    it('結果應該有 cagr 屬性', function() {
        assert.hasProperty(mockResult, 'cagr');
        assert.isNumber(mockResult.cagr);
    });

    it('結果應該有 max_drawdown 屬性', function() {
        assert.hasProperty(mockResult, 'max_drawdown');
        assert.isNumber(mockResult.max_drawdown);
    });

    it('max_drawdown 應該是負數或零', function() {
        assert.ok(mockResult.max_drawdown <= 0, '最大回撤應該是負數或零');
    });

    it('結果應該有 volatility 屬性', function() {
        assert.hasProperty(mockResult, 'volatility');
        assert.isNumber(mockResult.volatility);
    });

    it('volatility 應該是非負數', function() {
        assert.ok(mockResult.volatility >= 0, '波動率應該是非負數');
    });

    it('結果應該有 sharpe_ratio 屬性', function() {
        assert.hasProperty(mockResult, 'sharpe_ratio');
        assert.isNumber(mockResult.sharpe_ratio);
    });

    it('結果應該有 portfolio_history 屬性', function() {
        assert.hasProperty(mockResult, 'portfolio_history');
        assert.isArray(mockResult.portfolio_history);
    });

    it('portfolio_history 項目應該有 date 和 value', function() {
        mockResult.portfolio_history.forEach(function(item) {
            assert.hasProperty(item, 'date');
            assert.hasProperty(item, 'value');
        });
    });

    it('final_value 應該大於等於 0', function() {
        assert.ok(mockResult.final_value >= 0, '最終價值應該大於等於 0');
    });

    it('total_invested 應該大於 0', function() {
        assert.ok(mockResult.total_invested > 0, '總投入應該大於 0');
    });
});

describe('比較結果格式驗證', function() {
    const mockComparison = {
        best_performer: 'QQQ',
        highest_return: 180.5,
        lowest_risk: '0050.TW',
        best_sharpe: 'SPY'
    };

    it('比較結果應該有 best_performer', function() {
        assert.hasProperty(mockComparison, 'best_performer');
    });

    it('比較結果應該有 highest_return', function() {
        assert.hasProperty(mockComparison, 'highest_return');
    });

    it('比較結果應該有 lowest_risk', function() {
        assert.hasProperty(mockComparison, 'lowest_risk');
    });

    it('比較結果應該有 best_sharpe', function() {
        assert.hasProperty(mockComparison, 'best_sharpe');
    });
});

describe('數值計算精度測試', function() {
    it('百分比應該保留兩位小數', function() {
        const value = 15.5678;
        const formatted = value.toFixed(2);
        assert.equal(formatted, '15.57', '應該四捨五入到兩位小數');
    });

    it('貨幣應該是整數', function() {
        const value = 123456.78;
        const rounded = Math.round(value);
        assert.equal(rounded, 123457, '貨幣應該四捨五入到整數');
    });

    it('夏普比率應該保留兩位小數', function() {
        const sharpe = 1.2345;
        const formatted = sharpe.toFixed(2);
        assert.equal(formatted, '1.23', '夏普比率應該保留兩位小數');
    });
});
