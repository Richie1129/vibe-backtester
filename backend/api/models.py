"""
Pydantic 資料模型

定義 API 請求與回應的資料結構
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from datetime import date


# ============== 股票相關模型 ==============


class StockInfo(BaseModel):
    """股票基本資訊"""

    symbol: str = Field(..., description="股票代碼")
    name: str = Field(..., description="股票名稱")
    exchange: str = Field(default="Unknown", description="交易所")


class StockDetail(BaseModel):
    """股票詳細資訊"""

    symbol: str = Field(..., description="股票代碼")
    name: str = Field(..., description="股票名稱")
    current_price: Optional[float] = Field(None, description="目前股價")
    currency: str = Field(default="USD", description="幣別")
    exchange: str = Field(default="Unknown", description="交易所")


# ============== 回測相關模型 ==============


class InvestmentConfig(BaseModel):
    """投資設定"""

    amount: float = Field(..., gt=0, description="投資金額")
    frequency: Literal["monthly", "weekly"] = Field(
        default="monthly", description="投資頻率（僅 DCA 使用）"
    )


class BacktestRequest(BaseModel):
    """回測請求"""

    stocks: List[str] = Field(
        ..., min_length=1, max_length=10, description="股票代碼列表"
    )
    start_date: str = Field(..., description="起始日期 (YYYY-MM-DD)")
    end_date: str = Field(..., description="結束日期 (YYYY-MM-DD)")
    strategy: Literal["lump_sum", "dca"] = Field(..., description="投資策略")
    investment: InvestmentConfig = Field(..., description="投資設定")

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """驗證日期格式"""
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError(f"日期格式錯誤，請使用 YYYY-MM-DD 格式: {v}")
        return v

    @field_validator("stocks")
    @classmethod
    def validate_stocks(cls, v: List[str]) -> List[str]:
        """驗證股票代碼"""
        # 移除空白並轉大寫
        cleaned = [s.strip().upper() for s in v if s.strip()]
        if not cleaned:
            raise ValueError("至少需要一個股票代碼")
        return cleaned


class PortfolioHistoryEntry(BaseModel):
    """投資組合歷史紀錄項目"""

    date: str = Field(..., description="日期")
    value: float = Field(..., description="價值")


class BacktestResult(BaseModel):
    """單一股票的回測結果"""

    symbol: str = Field(..., description="股票代碼")
    name: str = Field(default="", description="股票名稱")
    total_return: float = Field(..., description="總報酬率 (%)")
    cagr: float = Field(..., description="年化報酬率 (%)")
    max_drawdown: float = Field(..., description="最大回撤 (%)")
    volatility: float = Field(..., description="波動率 (%)")
    sharpe_ratio: float = Field(..., description="夏普比率")
    final_value: float = Field(..., description="最終價值")
    total_invested: float = Field(..., description="總投入金額")
    portfolio_history: List[PortfolioHistoryEntry] = Field(
        default_factory=list, description="投資組合價值歷史"
    )


class BacktestComparison(BaseModel):
    """回測結果比較摘要"""

    best_performer: Optional[str] = Field(None, description="最佳表現者")
    highest_return: Optional[float] = Field(None, description="最高報酬率")
    lowest_risk: Optional[str] = Field(None, description="最低風險者")
    best_sharpe: Optional[str] = Field(None, description="最佳夏普比率者")


class BacktestResponse(BaseModel):
    """回測回應"""

    results: List[BacktestResult] = Field(..., description="各股票回測結果")
    comparison: BacktestComparison = Field(..., description="比較摘要")


# ============== 錯誤回應模型 ==============


class ErrorResponse(BaseModel):
    """錯誤回應"""

    detail: str = Field(..., description="錯誤訊息")


# ============== 健康檢查模型 ==============


class HealthResponse(BaseModel):
    """健康檢查回應"""

    status: str = Field(default="healthy", description="服務狀態")
    message: str = Field(default="BackTester API is running", description="訊息")
