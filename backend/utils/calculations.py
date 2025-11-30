"""
財務指標計算工具模組

提供回測所需的各種財務指標計算函式：
- CAGR (年化報酬率)
- Maximum Drawdown (最大回撤)
- Volatility (波動率)
- Sharpe Ratio (夏普比率)
- Total Return (總報酬率)
"""
import pandas as pd
import numpy as np
from typing import Union


def calculate_total_return(initial_value: float, final_value: float) -> float:
    """
    計算總報酬率

    Args:
        initial_value: 初始投資金額
        final_value: 最終價值

    Returns:
        總報酬率（小數形式，如 0.5 代表 50%）
    """
    if initial_value <= 0:
        return 0.0
    return (final_value - initial_value) / initial_value


def calculate_cagr(initial_value: float, final_value: float, years: float) -> float:
    """
    計算年化報酬率 (Compound Annual Growth Rate)

    公式: CAGR = (final_value / initial_value) ^ (1 / years) - 1

    Args:
        initial_value: 初始投資金額
        final_value: 最終價值
        years: 投資年數

    Returns:
        年化報酬率（小數形式，如 0.15 代表 15%）
    """
    if years <= 0 or initial_value <= 0:
        return 0.0

    if final_value <= 0:
        return -1.0  # 完全虧損

    return (final_value / initial_value) ** (1 / years) - 1


def calculate_max_drawdown(portfolio_values: pd.Series) -> float:
    """
    計算最大回撤 (Maximum Drawdown)

    最大回撤是從峰值到谷底的最大跌幅百分比

    公式: MDD = min((current_value - peak_value) / peak_value)

    Args:
        portfolio_values: 投資組合價值的時間序列

    Returns:
        最大回撤（負數，如 -0.2 代表 -20%）
    """
    if len(portfolio_values) == 0:
        return 0.0

    # 計算累積最大值（峰值）
    peak = portfolio_values.expanding(min_periods=1).max()

    # 計算每個時點的回撤
    drawdown = (portfolio_values - peak) / peak

    # 返回最大回撤（最小值，因為是負數）
    max_dd = drawdown.min()

    return max_dd if max_dd < 0 else 0.0


def calculate_volatility(returns: pd.Series) -> float:
    """
    計算年化波動率 (Annualized Volatility)

    公式: Volatility = std(daily_returns) * sqrt(252)

    Args:
        returns: 日報酬率序列

    Returns:
        年化波動率（小數形式，如 0.2 代表 20%）
    """
    if len(returns) == 0:
        return 0.0

    daily_std = returns.std()

    # 處理 NaN 或極小值（避免浮點數精度問題）
    if pd.isna(daily_std) or daily_std < 1e-10:
        return 0.0

    # 年化：乘以交易日數的平方根（252個交易日）
    return daily_std * np.sqrt(252)


def calculate_sharpe_ratio(
    returns: pd.Series, risk_free_rate: float = 0.02
) -> float:
    """
    計算夏普比率 (Sharpe Ratio)

    衡量每單位風險所獲得的超額報酬

    公式: Sharpe = (portfolio_return - risk_free_rate) / portfolio_volatility

    Args:
        returns: 日報酬率序列
        risk_free_rate: 無風險利率（年化，預設 2%）

    Returns:
        夏普比率
    """
    if len(returns) == 0:
        return 0.0

    volatility = calculate_volatility(returns)

    if volatility == 0 or pd.isna(volatility):
        return 0.0

    # 計算年化報酬率
    annual_return = returns.mean() * 252

    # 計算超額報酬
    excess_return = annual_return - risk_free_rate

    return excess_return / volatility


def calculate_daily_returns(prices: pd.Series) -> pd.Series:
    """
    從價格序列計算日報酬率

    Args:
        prices: 價格序列

    Returns:
        日報酬率序列
    """
    if len(prices) < 2:
        return pd.Series([], dtype=float)

    return prices.pct_change().dropna()
