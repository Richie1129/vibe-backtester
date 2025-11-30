/**
 * BackTester 主應用程式
 *
 * 處理使用者互動與資料流程
 */

const App = (function() {
    'use strict';

    // 應用程式狀態
    const state = {
        selectedStocks: [],
        searchResults: [],
        selectedSearchIndex: -1,
        lastBacktestResults: null,
    };

    // DOM 元素快取
    const elements = {};

    /**
     * 初始化應用程式
     */
    function init() {
        cacheElements();
        bindEvents();
        setDefaultDates();
        updateUI();

        // 檢查 API 連線狀態
        checkAPIHealth();
    }

    /**
     * 快取 DOM 元素
     */
    function cacheElements() {
        elements.stockSearch = $('#stock-search');
        elements.searchResults = $('#search-results');
        elements.addStockBtn = $('#add-stock-btn');
        elements.selectedStocks = $('#selected-stocks');
        elements.noStocksMessage = $('#no-stocks-message');
        elements.quickAddBtns = $('.quick-add-btn');
        elements.backtestForm = $('#backtest-form');
        elements.startDate = $('#start-date');
        elements.endDate = $('#end-date');
        elements.strategy = $('#strategy');
        elements.amount = $('#amount');
        elements.amountLabel = $('#amount-label');
        elements.amountHint = $('#amount-hint');
        elements.frequency = $('#frequency');
        elements.frequencyGroup = $('#frequency-group');
        elements.runBacktestBtn = $('#run-backtest-btn');
        elements.resetBtn = $('#reset-btn');
        elements.loadingOverlay = $('#loading-overlay');
        elements.resultsSection = $('#results');
        elements.resultsTbody = $('#results-tbody');
        elements.exportBtn = $('#export-btn');
        elements.errorModal = $('#error-modal');
        elements.errorMessage = $('#error-message');
    }

    /**
     * 綁定事件處理器
     */
    function bindEvents() {
        // 股票搜尋（防抖）
        let searchTimeout;
        elements.stockSearch.on('input', function() {
            clearTimeout(searchTimeout);
            const query = $(this).val().trim();

            if (query.length === 0) {
                hideSearchResults();
                return;
            }

            searchTimeout = setTimeout(async () => {
                await searchStocks(query);
            }, 300);
        });

        // 搜尋框取得焦點時，如果有內容則顯示結果
        elements.stockSearch.on('focus', function() {
            if (state.searchResults.length > 0) {
                showSearchResults();
            }
        });

        // 點擊其他地方關閉搜尋結果
        $(document).on('click', function(e) {
            if (!$(e.target).closest('#stock-search, #search-results').length) {
                hideSearchResults();
            }
        });

        // 鍵盤導航搜尋結果
        elements.stockSearch.on('keydown', function(e) {
            if (state.searchResults.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navigateSearchResults(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navigateSearchResults(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (state.selectedSearchIndex >= 0) {
                        selectSearchResult(state.searchResults[state.selectedSearchIndex]);
                    }
                    break;
                case 'Escape':
                    hideSearchResults();
                    break;
            }
        });

        // 新增股票按鈕
        elements.addStockBtn.on('click', function() {
            if (state.selectedSearchIndex >= 0) {
                selectSearchResult(state.searchResults[state.selectedSearchIndex]);
            }
        });

        // 快速新增按鈕
        elements.quickAddBtns.on('click', function() {
            const symbol = $(this).data('symbol');
            const name = $(this).data('name');
            addStock({ symbol, name });
        });

        // 移除已選股票
        elements.selectedStocks.on('click', '.remove-btn', function() {
            const symbol = $(this).closest('.stock-tag').data('symbol');
            removeStock(symbol);
        });

        // 策略變更
        elements.strategy.on('change', function() {
            updateStrategyUI($(this).val());
        });

        // 表單提交
        elements.backtestForm.on('submit', async function(e) {
            e.preventDefault();
            await runBacktest();
        });

        // 重設按鈕
        elements.resetBtn.on('click', function() {
            resetForm();
        });

        // 匯出按鈕
        elements.exportBtn.on('click', function() {
            exportResults();
        });
    }

    /**
     * 設定預設日期
     */
    function setDefaultDates() {
        const today = new Date();
        const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());

        elements.endDate.val(formatDate(today));
        elements.startDate.val(formatDate(fiveYearsAgo));
    }

    /**
     * 格式化日期為 YYYY-MM-DD
     */
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * 搜尋股票
     */
    async function searchStocks(query) {
        try {
            const results = await API.searchStocks(query);
            state.searchResults = results;
            state.selectedSearchIndex = results.length > 0 ? 0 : -1;
            renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            state.searchResults = [];
            hideSearchResults();
        }
    }

    /**
     * 渲染搜尋結果
     */
    function renderSearchResults(results) {
        if (results.length === 0) {
            elements.searchResults.html('<div class="search-result-item text-muted">找不到符合的股票</div>');
            showSearchResults();
            return;
        }

        const html = results.map((stock, index) => `
            <div class="search-result-item ${index === state.selectedSearchIndex ? 'active' : ''}"
                 data-index="${index}">
                <span class="symbol">${stock.symbol}</span>
                <span class="name">${stock.name}</span>
                <span class="exchange">${stock.exchange}</span>
            </div>
        `).join('');

        elements.searchResults.html(html);

        // 綁定點擊事件
        elements.searchResults.find('.search-result-item').on('click', function() {
            const index = $(this).data('index');
            if (index !== undefined) {
                selectSearchResult(results[index]);
            }
        });

        showSearchResults();
    }

    /**
     * 導航搜尋結果
     */
    function navigateSearchResults(direction) {
        const newIndex = state.selectedSearchIndex + direction;
        if (newIndex >= 0 && newIndex < state.searchResults.length) {
            state.selectedSearchIndex = newIndex;
            updateSearchResultsHighlight();
        }
    }

    /**
     * 更新搜尋結果高亮
     */
    function updateSearchResultsHighlight() {
        elements.searchResults.find('.search-result-item').removeClass('active');
        elements.searchResults.find(`.search-result-item[data-index="${state.selectedSearchIndex}"]`).addClass('active');
    }

    /**
     * 選擇搜尋結果
     */
    function selectSearchResult(stock) {
        addStock(stock);
        elements.stockSearch.val('');
        hideSearchResults();
        state.searchResults = [];
        state.selectedSearchIndex = -1;
    }

    /**
     * 顯示搜尋結果
     */
    function showSearchResults() {
        elements.searchResults.addClass('show');
        elements.addStockBtn.prop('disabled', state.selectedSearchIndex < 0);
    }

    /**
     * 隱藏搜尋結果
     */
    function hideSearchResults() {
        elements.searchResults.removeClass('show');
        elements.addStockBtn.prop('disabled', true);
    }

    /**
     * 新增股票
     */
    function addStock(stock) {
        // 檢查是否已存在
        if (state.selectedStocks.find(s => s.symbol === stock.symbol)) {
            showError(`${stock.symbol} 已經在列表中`);
            return;
        }

        // 最多 10 個標的
        if (state.selectedStocks.length >= 10) {
            showError('最多只能選擇 10 個標的');
            return;
        }

        state.selectedStocks.push(stock);
        updateSelectedStocksUI();
        updateQuickAddButtons();
        updateRunButton();
    }

    /**
     * 移除股票
     */
    function removeStock(symbol) {
        state.selectedStocks = state.selectedStocks.filter(s => s.symbol !== symbol);
        updateSelectedStocksUI();
        updateQuickAddButtons();
        updateRunButton();
    }

    /**
     * 更新已選股票 UI
     */
    function updateSelectedStocksUI() {
        if (state.selectedStocks.length === 0) {
            elements.selectedStocks.html('<span class="text-muted" id="no-stocks-message">尚未選擇任何標的</span>');
            return;
        }

        const html = state.selectedStocks.map(stock => `
            <span class="stock-tag fade-in" data-symbol="${stock.symbol}">
                <span class="symbol">${stock.symbol}</span>
                <span class="name">${stock.name || ''}</span>
                <button type="button" class="remove-btn" title="移除">
                    <i class="bi bi-x-circle"></i>
                </button>
            </span>
        `).join('');

        elements.selectedStocks.html(html);
    }

    /**
     * 更新快速新增按鈕狀態
     */
    function updateQuickAddButtons() {
        elements.quickAddBtns.each(function() {
            const symbol = $(this).data('symbol');
            const isAdded = state.selectedStocks.some(s => s.symbol === symbol);
            $(this).toggleClass('added', isAdded);
            $(this).toggleClass('btn-outline-secondary', !isAdded);
            if (isAdded) {
                $(this).html('<i class="bi bi-check-circle me-1"></i>' + $(this).text().trim());
            } else {
                $(this).text($(this).text().replace(/^.*?(?=[A-Za-z0-9])/, ''));
            }
        });
    }

    /**
     * 更新執行按鈕狀態
     */
    function updateRunButton() {
        const canRun = state.selectedStocks.length > 0;
        elements.runBacktestBtn.prop('disabled', !canRun);
    }

    /**
     * 更新策略 UI
     */
    function updateStrategyUI(strategy) {
        if (strategy === 'dca') {
            elements.frequencyGroup.show();
            elements.amountLabel.text('每期投入金額');
            elements.amountHint.text('每期（月/週）固定投入的金額');
            elements.amount.val(10000);
        } else {
            elements.frequencyGroup.hide();
            elements.amountLabel.text('投資金額');
            elements.amountHint.text('單筆投入的總金額');
            elements.amount.val(100000);
        }
    }

    /**
     * 執行回測
     */
    async function runBacktest() {
        const params = {
            stocks: state.selectedStocks.map(s => s.symbol),
            start_date: elements.startDate.val(),
            end_date: elements.endDate.val(),
            strategy: elements.strategy.val(),
            investment: {
                amount: parseFloat(elements.amount.val()),
                frequency: elements.frequency.val(),
            },
        };

        // 驗證
        if (!validateParams(params)) {
            return;
        }

        showLoading();

        try {
            const results = await API.runBacktest(params);
            state.lastBacktestResults = results;
            displayResults(results);
        } catch (error) {
            showError(error.message || '回測失敗，請稍後再試');
        } finally {
            hideLoading();
        }
    }

    /**
     * 驗證參數
     */
    function validateParams(params) {
        if (params.stocks.length === 0) {
            showError('請至少選擇一個投資標的');
            return false;
        }

        if (!params.start_date || !params.end_date) {
            showError('請設定起始與結束日期');
            return false;
        }

        const startDate = new Date(params.start_date);
        const endDate = new Date(params.end_date);

        if (startDate >= endDate) {
            showError('起始日期必須早於結束日期');
            return false;
        }

        if (params.investment.amount <= 0) {
            showError('投資金額必須大於 0');
            return false;
        }

        return true;
    }

    /**
     * 顯示結果
     */
    function displayResults(data) {
        // 更新摘要卡片
        updateSummaryCards(data.comparison);

        // 更新結果表格
        updateResultsTable(data.results);

        // 繪製圖表
        Charts.drawAllCharts(data.results);

        // 顯示結果區域
        elements.resultsSection.show();

        // 平滑捲動到結果區
        $('html, body').animate({
            scrollTop: elements.resultsSection.offset().top - 80,
        }, 500);
    }

    /**
     * 更新摘要卡片
     */
    function updateSummaryCards(comparison) {
        $('#best-performer').text(comparison.best_performer || '-');
        $('#highest-return').text(comparison.highest_return ? Charts.formatPercent(comparison.highest_return) : '-');
        $('#lowest-risk').text(comparison.lowest_risk || '-');
        $('#best-sharpe').text(comparison.best_sharpe || '-');
    }

    /**
     * 更新結果表格
     */
    function updateResultsTable(results) {
        const html = results.map(r => `
            <tr>
                <td>
                    <strong>${r.symbol}</strong>
                    <small class="text-muted d-block">${r.name || ''}</small>
                </td>
                <td class="text-end">${Charts.formatCurrency(r.total_invested)}</td>
                <td class="text-end">${Charts.formatCurrency(r.final_value)}</td>
                <td class="text-end ${r.total_return >= 0 ? 'return-positive' : 'return-negative'}">
                    ${r.total_return >= 0 ? '+' : ''}${Charts.formatPercent(r.total_return)}
                </td>
                <td class="text-end ${r.cagr >= 0 ? 'return-positive' : 'return-negative'}">
                    ${r.cagr >= 0 ? '+' : ''}${Charts.formatPercent(r.cagr)}
                </td>
                <td class="text-end text-danger">${Charts.formatPercent(r.max_drawdown)}</td>
                <td class="text-end">${Charts.formatPercent(r.volatility)}</td>
                <td class="text-end">${r.sharpe_ratio.toFixed(2)}</td>
            </tr>
        `).join('');

        elements.resultsTbody.html(html);
    }

    /**
     * 匯出結果
     */
    function exportResults() {
        if (!state.lastBacktestResults) {
            showError('沒有可匯出的結果');
            return;
        }

        const results = state.lastBacktestResults.results;
        const headers = ['標的', '名稱', '總投入', '最終價值', '總報酬率(%)', '年化報酬率(%)', '最大回撤(%)', '波動率(%)', '夏普比率'];
        const rows = results.map(r => [
            r.symbol,
            r.name || '',
            r.total_invested,
            r.final_value,
            r.total_return,
            r.cagr,
            r.max_drawdown,
            r.volatility,
            r.sharpe_ratio,
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backtest_results_${formatDate(new Date())}.csv`;
        link.click();
    }

    /**
     * 重設表單
     */
    function resetForm() {
        state.selectedStocks = [];
        state.lastBacktestResults = null;

        updateSelectedStocksUI();
        updateQuickAddButtons();
        updateRunButton();
        setDefaultDates();
        elements.strategy.val('lump_sum').trigger('change');
        elements.resultsSection.hide();
        Charts.destroyAllCharts();
    }

    /**
     * 顯示 Loading
     */
    function showLoading() {
        elements.loadingOverlay.show();
    }

    /**
     * 隱藏 Loading
     */
    function hideLoading() {
        elements.loadingOverlay.hide();
    }

    /**
     * 顯示錯誤訊息
     */
    function showError(message) {
        elements.errorMessage.text(message);
        const modal = new bootstrap.Modal(elements.errorModal[0]);
        modal.show();
    }

    /**
     * 更新 UI 狀態
     */
    function updateUI() {
        updateSelectedStocksUI();
        updateQuickAddButtons();
        updateRunButton();
        updateStrategyUI(elements.strategy.val());
    }

    /**
     * 檢查 API 健康狀態
     */
    async function checkAPIHealth() {
        try {
            await API.checkHealth();
            console.log('API connection successful');
        } catch (error) {
            console.warn('API health check failed:', error.message);
            // 不顯示錯誤，讓使用者在執行回測時才看到錯誤
        }
    }

    // DOM Ready 時初始化
    $(document).ready(init);

    // 公開 API（供測試使用）
    return {
        init,
        state,
        addStock,
        removeStock,
        validateParams,
        formatDate,
    };
})();

// 匯出給測試使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
