import asyncio
import sys
import os

# Ensure we can import from current directory
sys.path.append(os.getcwd())

from services.prediction.orchestrator import PredictionOrchestrator

async def main():
    try:
        orchestrator = PredictionOrchestrator()
        print("Analyzing AAPL (Apple Inc.)...")
        result = await orchestrator.predict("AAPL")
        # model_dump_json is for Pydantic v2
        print(result.model_dump_json(indent=2))
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
