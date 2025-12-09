import yfinance as yf
import json

def inspect_stock(symbol):
    ticker = yf.Ticker(symbol)
    info = ticker.info
    # Print keys that might be useful for fundamental analysis
    useful_keys = [
        'trailingPE', 'forwardPE', 'pegRatio', 'priceToBook', 
        'returnOnEquity', 'returnOnAssets', 'profitMargins', 
        'operatingMargins', 'debtToEquity', 'currentRatio', 
        'quickRatio', 'dividendYield', 'beta', 'trailingEps', 'forwardEps'
    ]
    
    print(f"--- {symbol} Fundamental Data ---")
    for key in useful_keys:
        print(f"{key}: {info.get(key)}")

if __name__ == "__main__":
    inspect_stock("AAPL")
    inspect_stock("NVDA")
