import yfinance as yf
import json

def inspect_news(symbol):
    print(f"Fetching news for {symbol}...")
    ticker = yf.Ticker(symbol)
    news = ticker.news
    
    if not news:
        print("No news found.")
        return

    print(f"Found {len(news)} news items.")
    if len(news) > 0:
        print("First item structure:")
        print(json.dumps(news[0], indent=2))
        
        print("\nChecking keys for first 3 items:")
        for i, item in enumerate(news[:3]):
            print(f"Item {i}: Title='{item.get('title')}', Link='{item.get('link')}'")

if __name__ == "__main__":
    inspect_news("AAPL")
