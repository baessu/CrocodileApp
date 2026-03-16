# 자산 관리 대시보드 (Assets Dashboard)

주식, 부동산 등 자산을 추적하고 경제 지표와 함께 시각화하는 웹 대시보드.

## 기술 스택

Python 3.11 | Flask | SQLAlchemy | Supabase | yfinance | pykrx | pandas | Google Cloud | Gunicorn

## 빠른 시작

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # DB, API 키 설정
python main.py
```

## 주요 기능

- 주식/ETF 실시간 시세 조회 (yfinance, pykrx)
- 자산/부채 목록 관리 및 순자산 추적
- 경제 지표 대시보드 (금리, 환율 등)
- 은퇴 계산기 및 예산 관리
- Flask-Login 기반 사용자 인증

## 상태

Active | Google Cloud 배포
