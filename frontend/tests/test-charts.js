/**
 * Charts 模組測試
 */

describe('Charts 模組', function() {
    it('應該有 Charts 物件', function() {
        assert.ok(typeof Charts !== 'undefined', 'Charts 應該被定義');
    });

    it('應該有 COLORS 陣列', function() {
        assert.isArray(Charts.COLORS, 'COLORS 應該是陣列');
        assert.ok(Charts.COLORS.length > 0, 'COLORS 應該有元素');
    });

    it('COLORS 應該是有效的顏色值', function() {
        Charts.COLORS.forEach(function(color) {
            assert.ok(color.startsWith('#'), `顏色 ${color} 應該以 # 開頭`);
            assert.equal(color.length, 7, `顏色 ${color} 應該是 7 個字元`);
        });
    });

    it('應該有 getColor 函式', function() {
        assert.isFunction(Charts.getColor, 'getColor 應該是函式');
    });

    it('getColor 應該返回顏色', function() {
        const color = Charts.getColor(0);
        assert.isString(color, '應該返回字串');
        assert.ok(color.startsWith('#'), '應該返回 HEX 顏色');
    });

    it('getColor 應該循環使用顏色', function() {
        const color1 = Charts.getColor(0);
        const color2 = Charts.getColor(Charts.COLORS.length);
        assert.equal(color1, color2, '超出範圍應該循環使用顏色');
    });

    it('應該有 formatCurrency 函式', function() {
        assert.isFunction(Charts.formatCurrency, 'formatCurrency 應該是函式');
    });

    it('formatCurrency 應該格式化數字', function() {
        const result = Charts.formatCurrency(1000000);
        assert.isString(result, '應該返回字串');
        assert.ok(result.includes('1,000,000') || result.includes('1000000'), '應該包含格式化的數字');
    });

    it('formatCurrency 應該處理小數', function() {
        const result = Charts.formatCurrency(1234.56);
        assert.isString(result, '應該返回字串');
    });

    it('formatCurrency 應該處理負數', function() {
        const result = Charts.formatCurrency(-5000);
        assert.isString(result, '應該返回字串');
    });

    it('應該有 formatPercent 函式', function() {
        assert.isFunction(Charts.formatPercent, 'formatPercent 應該是函式');
    });

    it('formatPercent 應該格式化百分比', function() {
        const result = Charts.formatPercent(15.5);
        assert.equal(result, '15.50%', '應該返回正確的百分比格式');
    });

    it('formatPercent 應該處理負數', function() {
        const result = Charts.formatPercent(-8.25);
        assert.equal(result, '-8.25%', '應該返回負數百分比');
    });

    it('formatPercent 應該處理零', function() {
        const result = Charts.formatPercent(0);
        assert.equal(result, '0.00%', '應該返回 0.00%');
    });

    it('應該有 drawValueChart 函式', function() {
        assert.isFunction(Charts.drawValueChart, 'drawValueChart 應該是函式');
    });

    it('應該有 drawReturnChart 函式', function() {
        assert.isFunction(Charts.drawReturnChart, 'drawReturnChart 應該是函式');
    });

    it('應該有 drawRiskChart 函式', function() {
        assert.isFunction(Charts.drawRiskChart, 'drawRiskChart 應該是函式');
    });

    it('應該有 drawDrawdownChart 函式', function() {
        assert.isFunction(Charts.drawDrawdownChart, 'drawDrawdownChart 應該是函式');
    });

    it('應該有 drawAllCharts 函式', function() {
        assert.isFunction(Charts.drawAllCharts, 'drawAllCharts 應該是函式');
    });

    it('應該有 destroyAllCharts 函式', function() {
        assert.isFunction(Charts.destroyAllCharts, 'destroyAllCharts 應該是函式');
    });

    it('drawAllCharts 空結果不應該出錯', function() {
        // 這個測試確保空結果不會導致錯誤
        Charts.drawAllCharts([]);
        assert.true(true, '空結果不應該出錯');
    });

    it('drawAllCharts undefined 不應該出錯', function() {
        Charts.drawAllCharts(undefined);
        assert.true(true, 'undefined 不應該出錯');
    });

    it('destroyAllCharts 不應該出錯', function() {
        Charts.destroyAllCharts();
        assert.true(true, 'destroyAllCharts 不應該出錯');
    });
});
