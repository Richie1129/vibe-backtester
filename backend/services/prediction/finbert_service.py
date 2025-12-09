import torch
from transformers import BertTokenizer, BertForSequenceClassification, pipeline
from typing import List, Dict
import logging

# 設定 logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinBertService:
    _instance = None
    _model = None
    _tokenizer = None
    _pipeline = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FinBertService, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        """初始化 FinBERT 模型"""
        try:
            logger.info("Loading FinBERT model...")
            model_name = "ProsusAI/finbert"
            
            self._tokenizer = BertTokenizer.from_pretrained(model_name)
            self._model = BertForSequenceClassification.from_pretrained(model_name)
            
            # 建立 pipeline
            self._pipeline = pipeline(
                "sentiment-analysis", 
                model=self._model, 
                tokenizer=self._tokenizer,
                return_all_scores=True
            )
            logger.info("FinBERT model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load FinBERT model: {e}")
            raise

    def analyze_sentiment(self, texts: List[str]) -> List[Dict]:
        """
        分析文本列表的情緒
        
        Args:
            texts: 新聞標題列表
            
        Returns:
            List[Dict]: 每個文本的情緒分數 {'positive': 0.9, 'negative': 0.1, 'neutral': 0.0}
        """
        if not texts:
            return []
            
        try:
            # 批次處理
            results = self._pipeline(texts)
            
            # 格式化輸出
            formatted_results = []
            for res in results:
                # res 是一個 list of dicts [{'label': 'positive', 'score': 0.9}, ...]
                scores = {item['label']: item['score'] for item in res}
                formatted_results.append(scores)
                
            return formatted_results
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return []

# 單例模式存取點
def get_finbert_service():
    return FinBertService()
