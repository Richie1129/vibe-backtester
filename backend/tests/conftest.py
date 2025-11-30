"""
Pytest 配置檔案

設定測試環境
"""
import sys
import os

# 將 backend 目錄加入 Python 路徑
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
