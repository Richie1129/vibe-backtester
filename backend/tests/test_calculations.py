"""
財務指標計算模組的單元測試
TDD: 先撰寫測試，再實作功能
"""
import pytest
import pandas as pd
import numpy as np
from utils.calculations import (
    calculate_cagr,
    calculate_max_drawdown,
    calculate_volatility,
    calculate_sharpe_ratio,
    calculate_total_return,
)


class TestCalculateCAGR:
    """年化報酬率 (CAGR) 計算測試"""

    def test_positive_return(self):
        """測試正報酬情況"""
        # 初始 10000，5年後變成 20000，CAGR 約 14.87%
        result = calculate_cagr(initial_value=10000, final_value=20000, years=5)
        assert pytest.approx(result, rel=0.01) == 0.1487

    def test_negative_return(self):
        """測試負報酬情況"""
        # 初始 10000，3年後變成 8000，CAGR 約 -7.17%
        result = calculate_cagr(initial_value=10000, final_value=8000, years=3)
        assert pytest.approx(result, rel=0.01) == -0.0717

    def test_zero_years(self):
        """測試年數為零的邊界情況"""
        # 應該返回 0 或處理錯誤
        result = calculate_cagr(initial_value=10000, final_value=12000, years=0)
        assert result == 0.0

    def test_one_year(self):
        """測試一年的情況"""
        # 初始 10000，1年後變成 11000，CAGR = 10%
        result = calculate_cagr(initial_value=10000, final_value=11000, years=1)
        assert pytest.approx(result, rel=0.001) == 0.10

    def test_fractional_years(self):
        """測試非整數年份"""
        # 初始 10000，1.5年後變成 12000
        result = calculate_cagr(initial_value=10000, final_value=12000, years=1.5)
        expected = (12000 / 10000) ** (1 / 1.5) - 1
        assert pytest.approx(result, rel=0.001) == expected


class TestCalculateMaxDrawdown:
    """最大回撤 (Maximum Drawdown) 計算測試"""

    def test_simple_drawdown(self):
        """測試簡單的回撤情況"""
        # 價值從 100 漲到 150，然後跌到 120，再漲到 180
        # 最大回撤發生在 150 -> 120，為 -20%
        values = pd.Series([100, 120, 150, 130, 120, 140, 180])
        result = calculate_max_drawdown(values)
        assert pytest.approx(result, rel=0.01) == -0.20

    def test_no_drawdown(self):
        """測試持續上漲無回撤"""
        values = pd.Series([100, 110, 120, 130, 140])
        result = calculate_max_drawdown(values)
        assert result == 0.0

    def test_continuous_decline(self):
        """測試持續下跌"""
        # 從 100 跌到 50，最大回撤 -50%
        values = pd.Series([100, 90, 80, 70, 60, 50])
        result = calculate_max_drawdown(values)
        assert pytest.approx(result, rel=0.01) == -0.50

    def test_recovery_after_drawdown(self):
        """測試回撤後恢復"""
        # 100 -> 80 -> 120，最大回撤為 -20%
        values = pd.Series([100, 80, 90, 100, 110, 120])
        result = calculate_max_drawdown(values)
        assert pytest.approx(result, rel=0.01) == -0.20


class TestCalculateVolatility:
    """波動率 (Volatility) 計算測試"""

    def test_zero_volatility(self):
        """測試零波動率（每日報酬相同）"""
        returns = pd.Series([0.01, 0.01, 0.01, 0.01, 0.01])
        result = calculate_volatility(returns)
        assert pytest.approx(result, abs=0.001) == 0.0

    def test_known_volatility(self):
        """測試已知波動率的資料"""
        # 使用固定標準差的資料
        np.random.seed(42)
        daily_std = 0.02  # 2% 日波動
        returns = pd.Series(np.random.normal(0, daily_std, 252))
        result = calculate_volatility(returns)
        # 年化波動率應約為 daily_std * sqrt(252) ≈ 31.7%
        expected = daily_std * np.sqrt(252)
        assert pytest.approx(result, rel=0.15) == expected

    def test_empty_series(self):
        """測試空序列"""
        returns = pd.Series([], dtype=float)
        result = calculate_volatility(returns)
        assert result == 0.0 or np.isnan(result) or result is None


class TestCalculateSharpeRatio:
    """夏普比率 (Sharpe Ratio) 計算測試"""

    def test_positive_sharpe(self):
        """測試正夏普比率"""
        # 平均日報酬 0.1%，日波動 1%
        np.random.seed(42)
        returns = pd.Series(np.random.normal(0.001, 0.01, 252))
        result = calculate_sharpe_ratio(returns, risk_free_rate=0.02)
        # 夏普比率應為正值
        assert result > 0

    def test_negative_sharpe(self):
        """測試負夏普比率"""
        # 平均日報酬 -0.1%，日波動 1%
        np.random.seed(42)
        returns = pd.Series(np.random.normal(-0.001, 0.01, 252))
        result = calculate_sharpe_ratio(returns, risk_free_rate=0.02)
        # 夏普比率應為負值
        assert result < 0

    def test_zero_volatility_sharpe(self):
        """測試零波動時的夏普比率"""
        # 每日報酬都一樣，波動率為零
        returns = pd.Series([0.001] * 252)
        result = calculate_sharpe_ratio(returns, risk_free_rate=0.02)
        # 應該返回 0 避免除以零錯誤
        assert result == 0.0

    def test_custom_risk_free_rate(self):
        """測試自訂無風險利率"""
        np.random.seed(42)
        returns = pd.Series(np.random.normal(0.001, 0.01, 252))
        result_low = calculate_sharpe_ratio(returns, risk_free_rate=0.01)
        result_high = calculate_sharpe_ratio(returns, risk_free_rate=0.05)
        # 較高的無風險利率應該導致較低的夏普比率
        assert result_low > result_high


class TestCalculateTotalReturn:
    """總報酬率計算測試"""

    def test_positive_return(self):
        """測試正報酬"""
        result = calculate_total_return(initial_value=10000, final_value=15000)
        assert pytest.approx(result, rel=0.001) == 0.50  # 50%

    def test_negative_return(self):
        """測試負報酬"""
        result = calculate_total_return(initial_value=10000, final_value=8000)
        assert pytest.approx(result, rel=0.001) == -0.20  # -20%

    def test_zero_return(self):
        """測試零報酬"""
        result = calculate_total_return(initial_value=10000, final_value=10000)
        assert result == 0.0

    def test_double_return(self):
        """測試翻倍"""
        result = calculate_total_return(initial_value=10000, final_value=20000)
        assert pytest.approx(result, rel=0.001) == 1.0  # 100%
