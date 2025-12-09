import asyncio
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.prediction.orchestrator import PredictionOrchestrator

async def main():
    orchestrator = PredictionOrchestrator()
    symbol = "AAPL"
    print(f"Predicting for {symbol}...")
    try:
        result = await orchestrator.predict(symbol)
        print("\nPrediction Result:")
        print(f"Symbol: {result.symbol}")
        print(f"Overall Signal: {result.overall_signal}")
        print(f"Overall Score: {result.overall_score}")
        print("\nDetailed Signals:")
        for signal in result.signals:
            print(f"- Source: {signal.source}")
            print(f"  Type: {signal.signal_type}")
            print(f"  Score: {signal.score}")
            print(f"  Reason: {signal.reason}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
