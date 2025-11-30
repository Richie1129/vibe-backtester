"""
API 路由定義

提供以下端點：
- GET /api/stocks/search - 搜尋股票
- GET /api/stocks/{symbol} - 取得股票資訊
- POST /api/backtest - 執行回測
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import date

from api.models import (
    StockInfo,
    StockDetail,
    BacktestRequest,
    BacktestResponse,
    BacktestResult,
    BacktestComparison,
    PortfolioHistoryEntry,
    HealthResponse,
)
from services.data_service import (
    search_stock,
    get_stock_info,
    get_stock_data,
)
from services.backtest_service import (
    backtest_lump_sum,
    backtest_dca,
    compare_results,
)


router = APIRouter(prefix="/api", tags=["API"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康檢查端點"""
    return HealthResponse()


@router.get("/stocks/search", response_model=List[StockInfo])
async def search_stocks(
    q: str = Query(..., min_length=1, description="搜尋關鍵字")
):
    """
    搜尋股票

    根據股票代碼或名稱進行搜尋
    """
    results = search_stock(q)
    return [StockInfo(**r) for r in results]


@router.get("/stocks/{symbol}", response_model=StockDetail)
async def get_stock(symbol: str):
    """
    取得股票資訊

    根據股票代碼取得詳細資訊
    """
    info = get_stock_info(symbol.upper())

    if not info:
        raise HTTPException(status_code=404, detail=f"找不到股票 {symbol}")

    return StockDetail(
        symbol=info.get("symbol", symbol),
        name=info.get("name", symbol),
        current_price=info.get("current_price"),
        currency=info.get("currency", "USD"),
        exchange=info.get("exchange", "Unknown"),
    )


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    執行回測

    支援單筆投資 (lump_sum) 和定期定額 (dca) 兩種策略
    """
    # 驗證日期範圍
    start = date.fromisoformat(request.start_date)
    end = date.fromisoformat(request.end_date)

    if start >= end:
        raise HTTPException(status_code=400, detail="起始日期必須早於結束日期")

    # 驗證日期範圍不超過 20 年
    if (end - start).days > 365 * 20:
        raise HTTPException(status_code=400, detail="日期範圍不能超過 20 年")

    results = []
    errors = []

    for symbol in request.stocks:
        # 取得股票資料
        data = get_stock_data(symbol, request.start_date, request.end_date)

        if data is None or data.empty:
            errors.append(f"找不到股票 {symbol} 的資料")
            continue

        # 資料點數檢查
        if len(data) < 5:
            errors.append(f"股票 {symbol} 的資料點數不足")
            continue

        # 取得股票名稱
        stock_info = get_stock_info(symbol)
        stock_name = stock_info.get("name", symbol) if stock_info else symbol

        # 執行回測
        if request.strategy == "lump_sum":
            backtest_result = backtest_lump_sum(data, request.investment.amount)
        else:  # dca
            backtest_result = backtest_dca(
                data, request.investment.amount, request.investment.frequency
            )

        # 組裝結果
        backtest_result["symbol"] = symbol
        backtest_result["name"] = stock_name

        # 轉換 portfolio_history
        portfolio_history = [
            PortfolioHistoryEntry(date=h["date"], value=h["value"])
            for h in backtest_result.get("portfolio_history", [])
        ]

        results.append(
            BacktestResult(
                symbol=symbol,
                name=stock_name,
                total_return=backtest_result["total_return"],
                cagr=backtest_result["cagr"],
                max_drawdown=backtest_result["max_drawdown"],
                volatility=backtest_result["volatility"],
                sharpe_ratio=backtest_result["sharpe_ratio"],
                final_value=backtest_result["final_value"],
                total_invested=backtest_result["total_invested"],
                portfolio_history=portfolio_history,
            )
        )

    # 如果所有股票都失敗
    if not results:
        error_msg = "無法取得任何股票資料"
        if errors:
            error_msg = "; ".join(errors)
        raise HTTPException(status_code=404, detail=error_msg)

    # 比較結果
    comparison_data = compare_results([r.model_dump() for r in results])
    comparison = BacktestComparison(
        best_performer=comparison_data.get("best_performer"),
        highest_return=comparison_data.get("highest_return"),
        lowest_risk=comparison_data.get("lowest_risk"),
        best_sharpe=comparison_data.get("best_sharpe"),
    )

    return BacktestResponse(results=results, comparison=comparison)
