import yfinance as yf
from api.models import Signal, SignalType, AnalysisSource

class FundamentalAnalyzer:
    def analyze(self, symbol: str) -> Signal:
        try:
            ticker = yf.Ticker(symbol)
            # info 屬性會觸發 API 請求
            info = ticker.info
            
            # 簡單的價值投資規則 (Graham-like) + 獲利能力 + 財務健康
            # 注意：有些股票可能沒有這些欄位，需做防呆
            pe_ratio = info.get('trailingPE')
            pb_ratio = info.get('priceToBook')
            roe = info.get('returnOnEquity')
            profit_margins = info.get('profitMargins')
            debt_to_equity = info.get('debtToEquity')
            current_ratio = info.get('currentRatio')
            
            score = 0.0
            reasons = []
            
            # 1. PE 評分 (權重調整)
            if pe_ratio is not None:
                if 0 < pe_ratio < 15:
                    score += 0.3
                    reasons.append(f"低本益比 ({pe_ratio:.2f})")
                elif 15 <= pe_ratio <= 25:
                    score += 0.1
                    reasons.append(f"合理本益比 ({pe_ratio:.2f})")
                elif pe_ratio > 40: # 科技股容忍度較高
                    score -= 0.2
                    reasons.append(f"高本益比 ({pe_ratio:.2f})")
            
            # 2. PB 評分
            if pb_ratio is not None:
                if 0 < pb_ratio < 1.5:
                    score += 0.2
                    reasons.append(f"低股價淨值比 ({pb_ratio:.2f})")
                elif pb_ratio > 10: # 科技股 PB 通常較高
                    score -= 0.1
                    reasons.append(f"高股價淨值比 ({pb_ratio:.2f})")
                
            # 3. ROE 評分 (獲利能力核心)
            if roe is not None:
                if roe > 0.20: # 提高標準
                    score += 0.3
                    reasons.append(f"極佳 ROE ({roe:.2%})")
                elif roe > 0.15:
                    score += 0.15
                    reasons.append(f"優良 ROE ({roe:.2%})")
                elif roe < 0:
                    score -= 0.3
                    reasons.append(f"負 ROE ({roe:.2%})")

            # 4. 淨利率 (Profit Margins)
            if profit_margins is not None:
                if profit_margins > 0.20:
                    score += 0.2
                    reasons.append(f"高淨利率 ({profit_margins:.2%})")
                elif profit_margins < 0.05:
                    score -= 0.1
                    reasons.append(f"低淨利率 ({profit_margins:.2%})")

            # 5. 負債比 (Debt to Equity)
            if debt_to_equity is not None:
                if debt_to_equity < 50:
                    score += 0.1
                    reasons.append(f"低負債比 ({debt_to_equity:.2f}%)")
                elif debt_to_equity > 200:
                    score -= 0.1
                    reasons.append(f"高負債比 ({debt_to_equity:.2f}%)")

            # 6. 流動比 (Current Ratio) - 短期償債能力
            if current_ratio is not None:
                if current_ratio > 1.5:
                    score += 0.1
                    reasons.append(f"流動性佳 ({current_ratio:.2f})")
                elif current_ratio < 1.0:
                    score -= 0.1
                    reasons.append(f"流動性偏低 ({current_ratio:.2f})")
            
            # 限制分數範圍 -1.0 ~ 1.0
            score = max(-1.0, min(1.0, score))
            
            # 決定訊號類型
            if score >= 0.25:
                signal_type = SignalType.BULLISH
            elif score <= -0.25:
                signal_type = SignalType.BEARISH
            else:
                signal_type = SignalType.NEUTRAL
                
            reason_str = " | ".join(reasons) if reasons else "基本面數據平平或缺乏數據"
            
            return Signal(
                source=AnalysisSource.FUNDAMENTAL,
                signal_type=signal_type,
                score=round(score, 2),
                confidence=0.8, # 財報數據相對可靠
                reason=reason_str
            )
            
        except Exception as e:
            # Log error properly in production
            return Signal(
                source=AnalysisSource.FUNDAMENTAL,
                signal_type=SignalType.NEUTRAL,
                score=0.0,
                confidence=0.0,
                reason=f"基本面分析失敗: {str(e)}"
            )
