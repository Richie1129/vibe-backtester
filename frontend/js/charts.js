/**
 * 圖表繪製模組
 *
 * 使用 Chart.js 繪製各種圖表
 */

const Charts = (function() {
    'use strict';

    // 預設顏色調色盤
    const COLORS = [
        '#0d6efd', // Primary Blue
        '#198754', // Success Green
        '#dc3545', // Danger Red
        '#ffc107', // Warning Yellow
        '#0dcaf0', // Info Cyan
        '#6f42c1', // Purple
        '#fd7e14', // Orange
        '#20c997', // Teal
        '#6c757d', // Gray
        '#d63384', // Pink
    ];

    // 儲存圖表實例以便更新或銷毀
    let chartInstances = {
        value: null,
        return: null,
        risk: null,
        drawdown: null,
    };

    /**
     * 取得顏色
     * @param {number} index - 顏色索引
     * @returns {string} - 顏色值
     */
    function getColor(index) {
        return COLORS[index % COLORS.length];
    }

    /**
     * 取得半透明顏色
     * @param {number} index - 顏色索引
     * @param {number} alpha - 透明度
     * @returns {string} - RGBA 顏色值
     */
    function getColorWithAlpha(index, alpha = 0.2) {
        const color = getColor(index);
        // 將 HEX 轉換為 RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * 格式化數字為貨幣格式
     * @param {number} value - 數值
     * @returns {string} - 格式化後的字串
     */
    function formatCurrency(value) {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }

    /**
     * 格式化百分比
     * @param {number} value - 數值
     * @returns {string} - 格式化後的字串
     */
    function formatPercent(value) {
        return value.toFixed(2) + '%';
    }

    /**
     * 銷毀指定圖表
     * @param {string} chartName - 圖表名稱
     */
    function destroyChart(chartName) {
        if (chartInstances[chartName]) {
            chartInstances[chartName].destroy();
            chartInstances[chartName] = null;
        }
    }

    /**
     * 銷毀所有圖表
     */
    function destroyAllCharts() {
        Object.keys(chartInstances).forEach(destroyChart);
    }

    /**
     * 繪製投資組合價值走勢圖
     * @param {Array} results - 回測結果陣列
     */
    function drawValueChart(results) {
        const ctx = document.getElementById('value-chart');
        if (!ctx) return;

        destroyChart('value');

        const datasets = results.map((result, index) => ({
            label: `${result.symbol} ${result.name ? '(' + result.name + ')' : ''}`,
            data: result.portfolio_history.map(h => ({
                x: h.date,
                y: h.value,
            })),
            borderColor: getColor(index),
            backgroundColor: getColorWithAlpha(index, 0.1),
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
        }));

        chartInstances.value = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: false,
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'yyyy/MM',
                            },
                        },
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            },
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                        },
                    },
                },
            },
        });
    }

    /**
     * 繪製報酬率比較圖（長條圖）
     * @param {Array} results - 回測結果陣列
     */
    function drawReturnChart(results) {
        const ctx = document.getElementById('return-chart');
        if (!ctx) return;

        destroyChart('return');

        const labels = results.map(r => r.symbol);
        const data = results.map(r => r.total_return);
        const colors = results.map((_, i) => data[i] >= 0 ? '#198754' : '#dc3545');

        chartInstances.return = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '總報酬率 (%)',
                    data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `報酬率: ${formatPercent(context.parsed.x)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                        },
                        ticks: {
                            callback: function(value) {
                                return formatPercent(value);
                            },
                        },
                    },
                    y: {
                        grid: {
                            display: false,
                        },
                    },
                },
            },
        });
    }

    /**
     * 繪製風險指標雷達圖
     * @param {Array} results - 回測結果陣列
     */
    function drawRiskChart(results) {
        const ctx = document.getElementById('risk-chart');
        if (!ctx) return;

        destroyChart('risk');

        // 正規化數據以便在雷達圖上顯示
        const maxReturn = Math.max(...results.map(r => Math.abs(r.total_return)));
        const maxCAGR = Math.max(...results.map(r => Math.abs(r.cagr)));
        const maxVolatility = Math.max(...results.map(r => r.volatility));
        const maxSharpe = Math.max(...results.map(r => Math.abs(r.sharpe_ratio)));

        const datasets = results.map((result, index) => ({
            label: result.symbol,
            data: [
                maxReturn > 0 ? (result.total_return / maxReturn) * 100 : 0,
                maxCAGR > 0 ? (result.cagr / maxCAGR) * 100 : 0,
                maxVolatility > 0 ? (1 - result.volatility / maxVolatility) * 100 : 100, // 反轉：波動越低越好
                maxSharpe > 0 ? (result.sharpe_ratio / maxSharpe) * 100 : 0,
            ],
            borderColor: getColor(index),
            backgroundColor: getColorWithAlpha(index, 0.2),
            borderWidth: 2,
            pointBackgroundColor: getColor(index),
        }));

        chartInstances.risk = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['總報酬率', '年化報酬率', '穩定性', '夏普比率'],
                datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                        },
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            display: false,
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)',
                        },
                    },
                },
            },
        });
    }

    /**
     * 繪製最大回撤比較圖
     * @param {Array} results - 回測結果陣列
     */
    function drawDrawdownChart(results) {
        const ctx = document.getElementById('drawdown-chart');
        if (!ctx) return;

        destroyChart('drawdown');

        const labels = results.map(r => r.symbol);
        const data = results.map(r => Math.abs(r.max_drawdown));

        chartInstances.drawdown = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '最大回撤 (%)',
                    data,
                    backgroundColor: results.map((_, i) => getColorWithAlpha(i, 0.7)),
                    borderColor: results.map((_, i) => getColor(i)),
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: true,
                        text: '最大回撤比較（數值越小風險越低）',
                        font: {
                            size: 12,
                            weight: 'normal',
                        },
                        color: '#6c757d',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `最大回撤: -${formatPercent(context.parsed.y)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '-' + formatPercent(value);
                            },
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                        },
                    },
                },
            },
        });
    }

    /**
     * 繪製所有圖表
     * @param {Array} results - 回測結果陣列
     */
    function drawAllCharts(results) {
        if (!results || results.length === 0) {
            console.warn('No results to draw charts');
            return;
        }

        drawValueChart(results);
        drawReturnChart(results);
        drawRiskChart(results);
        drawDrawdownChart(results);
    }

    // 公開 API
    return {
        drawValueChart,
        drawReturnChart,
        drawRiskChart,
        drawDrawdownChart,
        drawAllCharts,
        destroyAllCharts,
        getColor,
        formatCurrency,
        formatPercent,
        COLORS,
    };
})();

// 匯出給測試使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
}
