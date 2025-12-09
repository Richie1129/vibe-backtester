from api.models import Signal, SignalType, AnalysisSource, NewsItem
import yfinance as yf
from services.prediction.finbert_service import get_finbert_service

class SentimentAnalyzer:
    def analyze(self, symbol: str) -> Signal:
        try:
            ticker = yf.Ticker(symbol)
            # yfinance 的 news 屬性通常返回最近的新聞列表
            news = ticker.news
            
            if not news:
                return Signal(
                    source=AnalysisSource.SENTIMENT,
                    signal_type=SignalType.NEUTRAL,
                    score=0.0,
                    confidence=0.0,
                    reason="無近期新聞數據"
                )
            
            # Phase 2: FinBERT 分析
            max_news_to_analyze = 5
            news_items = news[:max_news_to_analyze]
            
            # yfinance news structure changed. It seems to be nested in 'content' now.
            # Or sometimes it's flat. We need to handle both.
            titles = []
            urls = []
            
            for item in news_items:
                # Try to get title from 'content' dict if it exists, otherwise from item directly
                content = item.get('content', {})
                if isinstance(content, dict) and 'title' in content:
                    title = content.get('title', '')
                    # Try to find url in clickThroughUrl
                    url_obj = content.get('clickThroughUrl')
                    url = url_obj.get('url') if url_obj else '#'
                else:
                    title = item.get('title', '')
                    url = item.get('link', '#')
                
                titles.append(title)
                urls.append(url)
            
            # 取得 FinBERT 服務實例並分析
            finbert = get_finbert_service()
            sentiment_scores = finbert.analyze_sentiment(titles)
            
            total_score = 0.0
            evidence = []
            news_items_data = []
            
            for i, scores in enumerate(sentiment_scores):
                # FinBERT 輸出: positive, negative, neutral
                # 轉換為 -1 到 1 的分數
                # Score = P(positive) - P(negative)
                item_score = scores.get('positive', 0) - scores.get('negative', 0)
                total_score += item_score
                
                # Determine label for this specific news item
                if item_score > 0.2:
                    label = "利多"
                elif item_score < -0.2:
                    label = "利空"
                else:
                    label = "中性"

                news_items_data.append(NewsItem(
                    title=titles[i],
                    url=urls[i],
                    sentiment_label=label,
                    sentiment_score=round(item_score, 2)
                ))
                
                # 收集顯著證據 (絕對值 > 0.5)
                if abs(item_score) > 0.5:
                    sentiment_label = "利多" if item_score > 0 else "利空"
                    # 截斷標題以保持簡潔
                    short_title = titles[i][:30] + "..." if len(titles[i]) > 30 else titles[i]
                    evidence.append(f"{sentiment_label}: {short_title} ({item_score:.2f})")
            
            # 計算平均分數
            avg_score = total_score / len(sentiment_scores) if sentiment_scores else 0.0
            
            # 限制分數範圍
            avg_score = max(-1.0, min(1.0, avg_score))
            
            # 決定訊號
            if avg_score >= 0.15: # 降低門檻，因為平均值通常較低
                signal_type = SignalType.BULLISH
            elif avg_score <= -0.15:
                signal_type = SignalType.BEARISH
            else:
                signal_type = SignalType.NEUTRAL
            
            reason_str = f"FinBERT 分析 {len(sentiment_scores)} 則新聞"
            if evidence:
                reason_str += ": " + " | ".join(evidence[:2]) # 只顯示前 2 個最強證據
            else:
                reason_str += " (情緒中性)"

            return Signal(
                source=AnalysisSource.SENTIMENT,
                signal_type=signal_type,
                score=round(avg_score, 2),
                confidence=0.85, # FinBERT 模型信心較高
                reason=reason_str,
                news_items=news_items_data
            )
            
        except Exception as e:
            return Signal(
                source=AnalysisSource.SENTIMENT,
                signal_type=SignalType.NEUTRAL,
                score=0.0,
                confidence=0.0,
                reason=f"消息面分析失敗: {str(e)}"
            )
