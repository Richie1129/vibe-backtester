from datetime import datetime
from typing import List
from api.models import PredictionResult, Signal, SignalType
from services.prediction.fundamental import FundamentalAnalyzer
from services.prediction.sentiment import SentimentAnalyzer

class PredictionOrchestrator:
    def __init__(self):
        self.fundamental = FundamentalAnalyzer()
        self.sentiment = SentimentAnalyzer()
        
    async def predict(self, symbol: str) -> PredictionResult:
        """
        執行綜合預測分析
        """
        # 1. 執行各項分析
        # TODO: Phase 2 改為 asyncio.gather 並行執行以提升效能
        fund_signal = self.fundamental.analyze(symbol)
        sent_signal = self.sentiment.analyze(symbol)
        
        signals = [fund_signal, sent_signal]
        
        # 2. 加權聚合 (Weighted Aggregation)
        # 策略：基本面為主 (60%)，消息面為輔 (40%)
        w_fund = 0.6
        w_sent = 0.4
        
        weighted_score = (fund_signal.score * w_fund) + (sent_signal.score * w_sent)
        
        # 確保分數在 -1.0 到 1.0 之間
        weighted_score = max(-1.0, min(1.0, weighted_score))
        
        # 3. 決定總體訊號
        # 門檻值可根據回測結果調整
        if weighted_score >= 0.25:
            overall_signal = SignalType.BULLISH
        elif weighted_score <= -0.25:
            overall_signal = SignalType.BEARISH
        else:
            overall_signal = SignalType.NEUTRAL
            
        return PredictionResult(
            symbol=symbol,
            timestamp=datetime.now().isoformat(),
            overall_signal=overall_signal,
            overall_score=round(weighted_score, 2),
            signals=signals
        )
