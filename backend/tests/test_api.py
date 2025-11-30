"""
API 整合測試

測試所有 API 端點的功能
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

from main import app


client = TestClient(app)


class TestHealthCheck:
    """健康檢查測試"""

    def test_health_endpoint(self):
        """測試健康檢查端點"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_root_endpoint(self):
        """測試根路徑"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "docs" in data


class TestStockSearch:
    """股票搜尋測試"""

    def test_search_taiwan_stock(self):
        """測試搜尋台股"""
        response = client.get("/api/stocks/search?q=2330")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # 應該找到台積電
        symbols = [s["symbol"] for s in data]
        assert "2330.TW" in symbols

    def test_search_us_stock(self):
        """測試搜尋美股"""
        response = client.get("/api/stocks/search?q=AAPL")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_search_by_name(self):
        """測試用名稱搜尋"""
        response = client.get("/api/stocks/search?q=台積電")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_search_empty_query(self):
        """測試空查詢"""
        response = client.get("/api/stocks/search?q=")
        # 應該返回 422 驗證錯誤
        assert response.status_code == 422

    def test_search_result_format(self):
        """測試搜尋結果格式"""
        response = client.get("/api/stocks/search?q=QQQ")
        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            stock = data[0]
            assert "symbol" in stock
            assert "name" in stock
            assert "exchange" in stock


class TestStockInfo:
    """股票資訊測試"""

    @patch("api.routes.get_stock_info")
    def test_get_stock_info(self, mock_get_info):
        """測試取得股票資訊"""
        mock_get_info.return_value = {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "current_price": 150.0,
            "currency": "USD",
            "exchange": "NASDAQ",
        }

        response = client.get("/api/stocks/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert data["name"] == "Apple Inc."

    @patch("api.routes.get_stock_info")
    def test_stock_not_found(self, mock_get_info):
        """測試股票不存在"""
        mock_get_info.return_value = None

        response = client.get("/api/stocks/INVALID_SYMBOL")
        assert response.status_code == 404


class TestBacktest:
    """回測 API 測試"""

    def _create_mock_data(self, days=252):
        """建立模擬價格資料"""
        np.random.seed(42)
        dates = pd.date_range(start="2020-01-01", periods=days, freq="B")
        prices = 100 * np.cumprod(1 + np.random.normal(0.001, 0.02, days))
        return pd.DataFrame(
            {"Close": prices, "Open": prices * 0.99, "High": prices * 1.01, "Low": prices * 0.98},
            index=dates,
        )

    @patch("api.routes.get_stock_data")
    @patch("api.routes.get_stock_info")
    def test_backtest_lump_sum(self, mock_info, mock_data):
        """測試單筆投資回測"""
        mock_data.return_value = self._create_mock_data()
        mock_info.return_value = {"name": "Test Stock"}

        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "comparison" in data
        assert len(data["results"]) == 1

        result = data["results"][0]
        assert "total_return" in result
        assert "cagr" in result
        assert "max_drawdown" in result
        assert "volatility" in result
        assert "sharpe_ratio" in result
        assert "portfolio_history" in result

    @patch("api.routes.get_stock_data")
    @patch("api.routes.get_stock_info")
    def test_backtest_dca(self, mock_info, mock_data):
        """測試定期定額回測"""
        mock_data.return_value = self._create_mock_data()
        mock_info.return_value = {"name": "Test Stock"}

        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "dca",
                "investment": {"amount": 1000, "frequency": "monthly"},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["total_invested"] > 0

    @patch("api.routes.get_stock_data")
    @patch("api.routes.get_stock_info")
    def test_backtest_multiple_stocks(self, mock_info, mock_data):
        """測試多股票回測"""
        mock_data.return_value = self._create_mock_data()
        mock_info.return_value = {"name": "Test Stock"}

        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL", "GOOGL", "MSFT"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 3

        # 驗證比較結果
        comparison = data["comparison"]
        assert "best_performer" in comparison
        assert "highest_return" in comparison

    def test_backtest_invalid_date_range(self):
        """測試無效日期範圍"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020-12-31",
                "end_date": "2020-01-01",  # 結束日期早於起始日期
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 400
        assert "起始日期必須早於結束日期" in response.json()["detail"]

    def test_backtest_invalid_date_format(self):
        """測試無效日期格式"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020/01/01",  # 錯誤格式
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 422

    def test_backtest_empty_stocks(self):
        """測試空股票列表"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": [],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 422

    def test_backtest_invalid_amount(self):
        """測試無效投資金額"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": -1000},  # 負數金額
            },
        )

        assert response.status_code == 422

    def test_backtest_invalid_strategy(self):
        """測試無效投資策略"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "invalid_strategy",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 422

    @patch("api.routes.get_stock_data")
    def test_backtest_stock_not_found(self, mock_data):
        """測試股票資料找不到"""
        mock_data.return_value = None

        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["INVALID_SYMBOL"],
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 404


class TestAPIValidation:
    """API 驗證測試"""

    def test_too_many_stocks(self):
        """測試股票數量超過限制"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],  # 11 個
                "start_date": "2020-01-01",
                "end_date": "2020-12-31",
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 422

    def test_date_range_too_long(self):
        """測試日期範圍過長"""
        response = client.post(
            "/api/backtest",
            json={
                "stocks": ["AAPL"],
                "start_date": "2000-01-01",
                "end_date": "2025-12-31",  # 超過 20 年
                "strategy": "lump_sum",
                "investment": {"amount": 10000},
            },
        )

        assert response.status_code == 400
