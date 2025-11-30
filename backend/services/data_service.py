"""
股票資料服務模組

提供從 Yahoo Finance 取得股票資料的功能：
- 搜尋股票
- 取得歷史價格
- 取得股票資訊
"""
import yfinance as yf
import pandas as pd
from typing import List, Dict, Optional
from functools import lru_cache
from datetime import datetime, timedelta


def get_stock_data(
    symbol: str, start_date: str, end_date: str
) -> Optional[pd.DataFrame]:
    """
    取得股票歷史價格資料

    Args:
        symbol: 股票代碼（如 "2330.TW", "AAPL", "QQQ"）
        start_date: 起始日期（格式 "YYYY-MM-DD"）
        end_date: 結束日期（格式 "YYYY-MM-DD"）

    Returns:
        包含 Open, High, Low, Close, Volume 欄位的 DataFrame
        若無資料則返回 None
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date)

        if hist.empty:
            return None

        # 確保索引是日期格式，並移除時區資訊
        hist.index = pd.to_datetime(hist.index).tz_localize(None)

        # 只保留需要的欄位
        columns_to_keep = ["Open", "High", "Low", "Close", "Volume"]
        available_columns = [col for col in columns_to_keep if col in hist.columns]

        return hist[available_columns]

    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None


def search_stock(query: str) -> List[Dict]:
    """
    搜尋股票代碼

    由於 yfinance 不直接支援搜尋功能，此函式提供常用股票的快速對應

    Args:
        query: 搜尋關鍵字（股票代碼或名稱）

    Returns:
        符合的股票列表，每項包含 symbol, name, exchange
    """
    # 預定義的常用股票清單
    stock_list = [
        # 台股
        {"symbol": "2330.TW", "name": "台積電", "exchange": "TWSE"},
        {"symbol": "2317.TW", "name": "鴻海", "exchange": "TWSE"},
        {"symbol": "2454.TW", "name": "聯發科", "exchange": "TWSE"},
        {"symbol": "2308.TW", "name": "台達電", "exchange": "TWSE"},
        {"symbol": "2881.TW", "name": "富邦金", "exchange": "TWSE"},
        {"symbol": "2882.TW", "name": "國泰金", "exchange": "TWSE"},
        {"symbol": "2412.TW", "name": "中華電", "exchange": "TWSE"},
        {"symbol": "0050.TW", "name": "元大台灣50", "exchange": "TWSE"},
        {"symbol": "0056.TW", "name": "元大高股息", "exchange": "TWSE"},
        {"symbol": "006208.TW", "name": "富邦台50", "exchange": "TWSE"},
        # 美股 ETF
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "exchange": "NYSE"},
        {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "exchange": "NYSE"},
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "exchange": "NYSE"},
        {"symbol": "VT", "name": "Vanguard Total World Stock ETF", "exchange": "NYSE"},
        {"symbol": "VGT", "name": "Vanguard Information Technology ETF", "exchange": "NYSE"},
        {"symbol": "ARKK", "name": "ARK Innovation ETF", "exchange": "NYSE"},
        # 美股個股
        {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "exchange": "NASDAQ"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "exchange": "NASDAQ"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "exchange": "NASDAQ"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "exchange": "NASDAQ"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "exchange": "NASDAQ"},
        {"symbol": "TSM", "name": "Taiwan Semiconductor (ADR)", "exchange": "NYSE"},
    ]

    query_lower = query.lower()
    results = []

    for stock in stock_list:
        if (
            query_lower in stock["symbol"].lower()
            or query_lower in stock["name"].lower()
        ):
            results.append(stock)

    # 如果預定義清單中找不到，嘗試從 yfinance 取得資訊
    if not results and len(query) >= 1:
        info = get_stock_info(query.upper())
        if info and info.get("name"):
            results.append(
                {
                    "symbol": query.upper(),
                    "name": info.get("name", query.upper()),
                    "exchange": info.get("exchange", "Unknown"),
                }
            )

    return results


def get_stock_info(symbol: str) -> Optional[Dict]:
    """
    取得股票基本資訊

    Args:
        symbol: 股票代碼

    Returns:
        包含 symbol, name, current_price, currency, market 的字典
        若無資料則返回 None
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if not info or info.get("regularMarketPrice") is None:
            # 嘗試取得歷史資料來確認股票存在
            hist = ticker.history(period="1d")
            if hist.empty:
                return None

            return {
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "current_price": hist["Close"].iloc[-1] if not hist.empty else None,
                "currency": info.get("currency", "USD"),
                "exchange": info.get("exchange", "Unknown"),
            }

        return {
            "symbol": symbol,
            "name": info.get("shortName") or info.get("longName") or symbol,
            "current_price": info.get("regularMarketPrice")
            or info.get("currentPrice"),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "Unknown"),
        }

    except Exception as e:
        print(f"Error fetching info for {symbol}: {e}")
        return None


@lru_cache(maxsize=100)
def get_stock_data_cached(
    symbol: str, start_date: str, end_date: str
) -> Optional[pd.DataFrame]:
    """
    取得股票歷史價格資料（帶快取）

    使用 LRU 快取減少重複的 API 呼叫

    Args:
        symbol: 股票代碼
        start_date: 起始日期
        end_date: 結束日期

    Returns:
        股票歷史價格 DataFrame
    """
    return get_stock_data(symbol, start_date, end_date)


def validate_symbol(symbol: str) -> bool:
    """
    驗證股票代碼是否有效

    Args:
        symbol: 股票代碼

    Returns:
        True 如果股票代碼有效，否則 False
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")
        return not hist.empty
    except Exception:
        return False


def get_multiple_stocks_data(
    symbols: List[str], start_date: str, end_date: str
) -> Dict[str, Optional[pd.DataFrame]]:
    """
    批次取得多個股票的歷史資料

    Args:
        symbols: 股票代碼列表
        start_date: 起始日期
        end_date: 結束日期

    Returns:
        字典，key 為股票代碼，value 為對應的 DataFrame
    """
    results = {}
    for symbol in symbols:
        results[symbol] = get_stock_data(symbol, start_date, end_date)
    return results
