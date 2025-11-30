"""
回測服務模組的單元測試
"""
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from services.backtest_service import (
    backtest_lump_sum,
    backtest_dca,
    compare_results,
    _empty_result,
)


def create_mock_price_data(
    start_price: float = 100,
    days: int = 252,
    daily_return: float = 0.001,
    volatility: float = 0.02,
    start_date: str = "2020-01-01",
) -> pd.DataFrame:
    """
    建立模擬價格資料

    Args:
        start_price: 起始價格
        days: 天數
        daily_return: 平均日報酬率
        volatility: 日波動率
        start_date: 起始日期

    Returns:
        模擬價格 DataFrame
    """
    np.random.seed(42)
    dates = pd.date_range(start=start_date, periods=days, freq="B")  # 只取交易日
    returns = np.random.normal(daily_return, volatility, days)
    prices = start_price * np.cumprod(1 + returns)

    df = pd.DataFrame(
        {
            "Open": prices * 0.99,
            "High": prices * 1.01,
            "Low": prices * 0.98,
            "Close": prices,
            "Volume": np.random.randint(1000000, 10000000, days),
        },
        index=dates,
    )
    return df


class TestBacktestLumpSum:
    """單筆投資回測測試"""

    def test_basic_lump_sum(self):
        """測試基本單筆投資"""
        data = create_mock_price_data(start_price=100, days=252)
        result = backtest_lump_sum(data, amount=10000)

        assert "final_value" in result
        assert "total_return" in result
        assert "cagr" in result
        assert "max_drawdown" in result
        assert "volatility" in result
        assert "sharpe_ratio" in result
        assert "portfolio_history" in result
        assert result["total_invested"] == 10000

    def test_positive_return(self):
        """測試正報酬情況"""
        # 建立持續上漲的價格資料
        data = create_mock_price_data(
            start_price=100, days=252, daily_return=0.002, volatility=0.01
        )
        result = backtest_lump_sum(data, amount=10000)

        assert result["final_value"] > 10000
        assert result["total_return"] > 0
        assert result["cagr"] > 0

    def test_negative_return(self):
        """測試負報酬情況"""
        # 建立持續下跌的價格資料
        data = create_mock_price_data(
            start_price=100, days=252, daily_return=-0.002, volatility=0.01
        )
        result = backtest_lump_sum(data, amount=10000)

        assert result["final_value"] < 10000
        assert result["total_return"] < 0

    def test_empty_data(self):
        """測試空資料"""
        result = backtest_lump_sum(pd.DataFrame(), amount=10000)
        assert result == _empty_result()

    def test_zero_amount(self):
        """測試零投資金額"""
        data = create_mock_price_data()
        result = backtest_lump_sum(data, amount=0)
        assert result == _empty_result()

    def test_portfolio_history_format(self):
        """測試投資組合歷史紀錄格式"""
        data = create_mock_price_data(days=30)
        result = backtest_lump_sum(data, amount=10000)

        assert len(result["portfolio_history"]) > 0
        first_entry = result["portfolio_history"][0]
        assert "date" in first_entry
        assert "value" in first_entry

    def test_max_drawdown_calculation(self):
        """測試最大回撤計算"""
        data = create_mock_price_data(days=252, volatility=0.03)
        result = backtest_lump_sum(data, amount=10000)

        # 最大回撤應該是負數或零
        assert result["max_drawdown"] <= 0


class TestBacktestDCA:
    """定期定額回測測試"""

    def test_basic_dca(self):
        """測試基本定期定額"""
        data = create_mock_price_data(start_price=100, days=252)
        result = backtest_dca(data, monthly_amount=1000)

        assert "final_value" in result
        assert "total_return" in result
        assert "total_invested" in result
        assert result["total_invested"] > 0

    def test_dca_multiple_investments(self):
        """測試多次投資"""
        # 一年的資料應該有約12次投資
        data = create_mock_price_data(days=252)
        result = backtest_dca(data, monthly_amount=1000)

        # 總投入應該約為 12 * 1000 = 12000
        assert 10000 <= result["total_invested"] <= 14000

    def test_dca_vs_lump_sum(self):
        """比較定期定額與單筆投資"""
        data = create_mock_price_data(days=252, daily_return=0.001)

        # 單筆投資 12000 元
        lump_sum_result = backtest_lump_sum(data, amount=12000)

        # 定期定額每月 1000 元
        dca_result = backtest_dca(data, monthly_amount=1000)

        # 兩者都應該有正報酬
        assert lump_sum_result["final_value"] > 0
        assert dca_result["final_value"] > 0

    def test_dca_empty_data(self):
        """測試空資料"""
        result = backtest_dca(pd.DataFrame(), monthly_amount=1000)
        assert result == _empty_result()

    def test_dca_weekly_frequency(self):
        """測試週投資頻率"""
        data = create_mock_price_data(days=100)
        result = backtest_dca(data, monthly_amount=250, frequency="weekly")

        # 週投資應該有更多次投資
        assert result["total_invested"] > 0

    def test_dca_short_period(self):
        """測試短期間（少於一個月）"""
        data = create_mock_price_data(days=20)
        result = backtest_dca(data, monthly_amount=1000)

        # 應該至少有一次投資
        assert result["total_invested"] >= 1000


class TestCompareResults:
    """回測結果比較測試"""

    def test_compare_multiple_results(self):
        """測試比較多個結果"""
        results = [
            {
                "symbol": "AAPL",
                "total_return": 50,
                "volatility": 20,
                "sharpe_ratio": 1.5,
            },
            {
                "symbol": "GOOGL",
                "total_return": 30,
                "volatility": 15,
                "sharpe_ratio": 1.2,
            },
            {
                "symbol": "MSFT",
                "total_return": 40,
                "volatility": 18,
                "sharpe_ratio": 1.8,
            },
        ]

        comparison = compare_results(results)

        assert comparison["best_performer"] == "AAPL"
        assert comparison["highest_return"] == 50
        assert comparison["lowest_risk"] == "GOOGL"
        assert comparison["best_sharpe"] == "MSFT"

    def test_compare_empty_results(self):
        """測試空結果列表"""
        comparison = compare_results([])
        assert comparison == {}

    def test_compare_single_result(self):
        """測試單一結果"""
        results = [
            {
                "symbol": "AAPL",
                "total_return": 50,
                "volatility": 20,
                "sharpe_ratio": 1.5,
            },
        ]

        comparison = compare_results(results)
        assert comparison["best_performer"] == "AAPL"


class TestIntegration:
    """整合測試"""

    def test_full_backtest_workflow(self):
        """測試完整回測流程"""
        # 建立模擬資料
        data = create_mock_price_data(
            start_price=100, days=504, daily_return=0.0005, volatility=0.015
        )

        # 執行單筆投資回測
        lump_sum = backtest_lump_sum(data, amount=100000)

        # 執行定期定額回測
        dca = backtest_dca(data, monthly_amount=5000)

        # 驗證結果
        assert lump_sum["final_value"] > 0
        assert dca["final_value"] > 0

        # 驗證歷史紀錄
        assert len(lump_sum["portfolio_history"]) > 0
        assert len(dca["portfolio_history"]) > 0

    def test_metrics_consistency(self):
        """測試指標計算的一致性"""
        data = create_mock_price_data(days=252)
        result = backtest_lump_sum(data, amount=10000)

        # 如果總報酬為正，最終價值應大於初始投資
        if result["total_return"] > 0:
            assert result["final_value"] > result["total_invested"]

        # 如果總報酬為負，最終價值應小於初始投資
        if result["total_return"] < 0:
            assert result["final_value"] < result["total_invested"]
