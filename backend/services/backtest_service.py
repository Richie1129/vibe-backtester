"""
回測計算服務模組

提供投資策略回測功能：
- 單筆投資 (Lump Sum)
- 定期定額 (Dollar Cost Averaging)
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

from utils.calculations import (
    calculate_cagr,
    calculate_max_drawdown,
    calculate_volatility,
    calculate_sharpe_ratio,
    calculate_total_return,
    calculate_daily_returns,
)


def backtest_lump_sum(data: pd.DataFrame, amount: float) -> Dict:
    """
    單筆投資回測

    在起始日一次性投入全部金額

    Args:
        data: 股票歷史價格 DataFrame（需包含 'Close' 欄位）
        amount: 投資金額

    Returns:
        回測結果字典，包含：
        - final_value: 最終價值
        - total_return: 總報酬率（百分比）
        - cagr: 年化報酬率（百分比）
        - max_drawdown: 最大回撤（百分比）
        - volatility: 波動率（百分比）
        - sharpe_ratio: 夏普比率
        - total_invested: 總投入金額
        - portfolio_history: 投資組合價值歷史
    """
    if data is None or data.empty or amount <= 0:
        return _empty_result()

    # 取得收盤價序列
    prices = data["Close"]

    # 計算可購買股數（以第一天收盤價購買）
    initial_price = prices.iloc[0]
    shares = amount / initial_price

    # 計算每日投資組合價值
    portfolio_values = shares * prices

    # 計算日報酬率
    daily_returns = calculate_daily_returns(prices)

    # 計算各項指標
    final_value = portfolio_values.iloc[-1]
    total_return = calculate_total_return(amount, final_value)

    # 計算投資年數
    days = (prices.index[-1] - prices.index[0]).days
    years = days / 365.25

    cagr = calculate_cagr(amount, final_value, years) if years > 0 else 0
    max_drawdown = calculate_max_drawdown(portfolio_values)
    volatility = calculate_volatility(daily_returns)
    sharpe_ratio = calculate_sharpe_ratio(daily_returns)

    # 建立投資組合歷史紀錄
    portfolio_history = _build_portfolio_history(portfolio_values)

    return {
        "final_value": round(final_value, 2),
        "total_return": round(total_return * 100, 2),
        "cagr": round(cagr * 100, 2),
        "max_drawdown": round(max_drawdown * 100, 2),
        "volatility": round(volatility * 100, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "total_invested": round(amount, 2),
        "portfolio_history": portfolio_history,
    }


def backtest_dca(
    data: pd.DataFrame, monthly_amount: float, frequency: str = "monthly"
) -> Dict:
    """
    定期定額回測 (Dollar Cost Averaging)

    每月（或指定頻率）在第一個交易日投入固定金額

    Args:
        data: 股票歷史價格 DataFrame（需包含 'Close' 欄位）
        monthly_amount: 每期投入金額
        frequency: 投入頻率（"monthly" 或 "weekly"）

    Returns:
        回測結果字典（格式同 backtest_lump_sum）
    """
    if data is None or data.empty or monthly_amount <= 0:
        return _empty_result()

    prices = data["Close"]

    # 根據頻率取得投資日期
    if frequency == "weekly":
        # 取得每週第一個交易日
        investment_dates = prices.groupby(
            pd.Grouper(freq="W-MON")
        ).apply(lambda x: x.index[0] if len(x) > 0 else None)
        investment_dates = investment_dates.dropna()
    else:
        # 預設為每月第一個交易日
        investment_dates = prices.groupby(
            pd.Grouper(freq="MS")
        ).apply(lambda x: x.index[0] if len(x) > 0 else None)
        investment_dates = investment_dates.dropna()

    # 初始化
    total_shares = 0.0
    total_invested = 0.0
    investment_records = []

    # 執行定期定額投資
    for invest_date in investment_dates:
        if invest_date in prices.index:
            price = prices.loc[invest_date]
            shares_bought = monthly_amount / price
            total_shares += shares_bought
            total_invested += monthly_amount
            investment_records.append(
                {
                    "date": invest_date,
                    "price": price,
                    "shares_bought": shares_bought,
                    "total_shares": total_shares,
                    "invested": total_invested,
                }
            )

    if total_invested == 0:
        return _empty_result()

    # 計算每日投資組合價值
    # 需要追蹤每個時點的持股數量
    portfolio_values = _calculate_dca_portfolio_values(
        prices, investment_records, monthly_amount
    )

    # 計算日報酬率（從有投資之後開始計算）
    if len(investment_records) > 0:
        first_invest_date = investment_records[0]["date"]
        valid_prices = prices.loc[first_invest_date:]
        daily_returns = calculate_daily_returns(valid_prices)
    else:
        daily_returns = pd.Series([], dtype=float)

    # 計算各項指標
    final_value = portfolio_values.iloc[-1]
    total_return = calculate_total_return(total_invested, final_value)

    # 計算投資年數（從第一筆投資到最後一天）
    if len(investment_records) > 0:
        first_date = investment_records[0]["date"]
        last_date = prices.index[-1]
        days = (last_date - first_date).days
        years = days / 365.25
    else:
        years = 0

    cagr = calculate_cagr(total_invested, final_value, years) if years > 0 else 0
    max_drawdown = calculate_max_drawdown(portfolio_values)
    volatility = calculate_volatility(daily_returns)
    sharpe_ratio = calculate_sharpe_ratio(daily_returns)

    # 建立投資組合歷史紀錄
    portfolio_history = _build_portfolio_history(portfolio_values)

    return {
        "final_value": round(final_value, 2),
        "total_return": round(total_return * 100, 2),
        "cagr": round(cagr * 100, 2),
        "max_drawdown": round(max_drawdown * 100, 2),
        "volatility": round(volatility * 100, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "total_invested": round(total_invested, 2),
        "portfolio_history": portfolio_history,
    }


def _calculate_dca_portfolio_values(
    prices: pd.Series, investment_records: List[Dict], monthly_amount: float
) -> pd.Series:
    """
    計算定期定額投資的每日組合價值

    Args:
        prices: 價格序列
        investment_records: 投資紀錄列表
        monthly_amount: 每期投資金額

    Returns:
        每日投資組合價值序列
    """
    if not investment_records:
        return pd.Series([0.0] * len(prices), index=prices.index)

    # 建立持股數量的時間序列
    shares_series = pd.Series(0.0, index=prices.index)

    for record in investment_records:
        invest_date = record["date"]
        # 從投資日開始，持股數增加
        shares_series.loc[invest_date:] = record["total_shares"]

    # 計算每日組合價值
    portfolio_values = shares_series * prices

    return portfolio_values


def _build_portfolio_history(portfolio_values: pd.Series) -> List[Dict]:
    """
    建立投資組合歷史紀錄

    為了減少資料量，採樣輸出（每月一筆或總共不超過100筆）

    Args:
        portfolio_values: 投資組合價值序列

    Returns:
        歷史紀錄列表，每項包含 date 和 value
    """
    if len(portfolio_values) == 0:
        return []

    # 如果資料點少於100，全部輸出
    if len(portfolio_values) <= 100:
        return [
            {"date": date.strftime("%Y-%m-%d"), "value": round(value, 2)}
            for date, value in portfolio_values.items()
        ]

    # 否則，每月取最後一個交易日的資料
    monthly = portfolio_values.groupby(pd.Grouper(freq="ME")).last()

    # 確保包含第一天和最後一天
    history = [
        {
            "date": portfolio_values.index[0].strftime("%Y-%m-%d"),
            "value": round(portfolio_values.iloc[0], 2),
        }
    ]

    for date, value in monthly.items():
        if pd.notna(value):
            history.append(
                {"date": date.strftime("%Y-%m-%d"), "value": round(value, 2)}
            )

    # 確保最後一天有資料
    last_date = portfolio_values.index[-1].strftime("%Y-%m-%d")
    if history[-1]["date"] != last_date:
        history.append(
            {
                "date": last_date,
                "value": round(portfolio_values.iloc[-1], 2),
            }
        )

    return history


def _empty_result() -> Dict:
    """返回空的回測結果"""
    return {
        "final_value": 0.0,
        "total_return": 0.0,
        "cagr": 0.0,
        "max_drawdown": 0.0,
        "volatility": 0.0,
        "sharpe_ratio": 0.0,
        "total_invested": 0.0,
        "portfolio_history": [],
    }


def compare_results(results: List[Dict]) -> Dict:
    """
    比較多個回測結果

    Args:
        results: 回測結果列表

    Returns:
        比較摘要，包含最佳表現者、最高報酬、最低風險等
    """
    if not results:
        return {}

    valid_results = [r for r in results if r.get("total_return") is not None]

    if not valid_results:
        return {}

    # 找出最佳表現者（最高報酬）
    best_return = max(valid_results, key=lambda x: x.get("total_return", 0))

    # 找出最低風險（最小波動率，排除零值）
    results_with_volatility = [
        r for r in valid_results if r.get("volatility", 0) > 0
    ]
    lowest_risk = (
        min(results_with_volatility, key=lambda x: x.get("volatility", float("inf")))
        if results_with_volatility
        else None
    )

    # 找出最佳夏普比率
    best_sharpe = max(valid_results, key=lambda x: x.get("sharpe_ratio", 0))

    return {
        "best_performer": best_return.get("symbol"),
        "highest_return": best_return.get("total_return"),
        "lowest_risk": lowest_risk.get("symbol") if lowest_risk else None,
        "best_sharpe": best_sharpe.get("symbol"),
    }
