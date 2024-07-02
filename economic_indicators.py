import requests
import pandas as pd
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
import json
import os
import logging
from google.cloud import storage


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Google Cloud Storage 설정
BUCKET_NAME = 'graphic-theory-427008-n9.appspot.com'  # 자신의 버킷 이름으로 변경
CACHE_FILE = 'data_cache.json'
client = storage.Client()

def read_cache():
    try:
        bucket = client.get_bucket(BUCKET_NAME)
        blob = bucket.blob(CACHE_FILE)
        if blob.exists():
            data = blob.download_as_string()
            return json.loads(data)
        return {}
    except Exception as e:
        logger.error(f"Error reading cache from GCS: {e}")
        return {}

def write_cache(data):
    try:
        bucket = client.get_bucket(BUCKET_NAME)
        blob = bucket.blob(CACHE_FILE)
        blob.upload_from_string(json.dumps(data), content_type='application/json')
    except Exception as e:
        logger.error(f"Error writing cache to GCS: {e}")

def update_cache(data):
    try:
        cache = read_cache()
        cache.update(data)
        write_cache(cache)
    except Exception as e:
        logger.error(f"Error updating cache: {e}")


def fetch_kospi_pbr_data(start_date, end_date):
    url = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"
    payload = {
        'bld': 'dbms/MDC/STAT/standard/MDCSTAT00702',
        'locale': 'ko_KR',
        'searchType': 'P',
        'idxIndMidclssCd': '02',
        'trdDd': end_date,
        'tboxindTpCd_finder_equidx0_0': '코스피',
        'indTpCd': '1',
        'indTpCd2': '001',
        'codeNmindTpCd_finder_equidx0_0': '코스피',
        'param1indTpCd_finder_equidx0_0': '',
        'strtDd': start_date,
        'endDd': end_date,
        'csvxls_isNo': 'false'
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def create_dataframe_from_response(response_data):
    data = []
    for item in response_data['output']:
        try:
            date = item['TRD_DD']
            pbr = float(item['WT_STKPRC_NETASST_RTO'].replace(',', ''))
            data.append((date, pbr))
        except ValueError:
            logger.warning(f"Invalid data found: {item}")
            continue
    df = pd.DataFrame(data, columns=['Date', 'PBR'])
    df['Date'] = pd.to_datetime(df['Date'])
    df.sort_values(by='Date', inplace=True)
    return df

class NaverWebIo:
    headers = {"User-Agent": "Mozilla/5.0"}

    @staticmethod
    def fetch(ticker, count, timeframe='day'):
        url = "http://fchart.stock.naver.com/sise.nhn"
        params = {
            'symbol': ticker,
            'timeframe': timeframe,
            'count': count,
            'requestType': '0'
        }
        response = requests.get(url, headers=NaverWebIo.headers, params=params)
        response.raise_for_status()
        return response.text

def extract_prices(ticker, count=2000):
    xml_data = NaverWebIo.fetch(ticker, count, "day")
    root = ET.fromstring(xml_data)
    items = root.find('chartdata').findall('item')
    data = []
    for item in items:
        date, now, _, _, close, _ = item.get('data').split('|')
        data.append([date, now, close])
    df = pd.DataFrame(data, columns=['Date', 'Now', 'Close'])
    df['Date'] = pd.to_datetime(df['Date'])
    df['Close'] = df['Close'].astype(float)
    df.set_index('Date', inplace=True)
    return df

def calculate_disparity(prices, window):
    moving_average = prices.rolling(window=window).mean()
    disparity = (prices / moving_average) * 100
    return disparity.fillna(0).tolist()

def get_economic_indicators(fred_api_key, start_date, end_date):
    start_date_str = start_date.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')

    fred_indicators = {
        'nasdaq': 'NASDAQCOM',
        'sp500': 'SP500'
    }

    cache = read_cache()
    data = cache.get('economic_indicators', {'dates': []})
    
    if not data['dates'] or (datetime.strptime(data['dates'][-1], '%Y-%m-%d') < end_date - timedelta(days=1)):
        # Fetch data from FRED
        for key, fred_id in fred_indicators.items():
            try:
                response = requests.get(f'https://api.stlouisfed.org/fred/series/observations', params={
                    'api_key': fred_api_key,
                    'file_type': 'json',
                    'series_id': fred_id,
                    'observation_start': start_date_str,
                    'observation_end': end_date_str
                })
                response.raise_for_status()
                observations = response.json().get('observations', [])
                dates = [obs['date'] for obs in observations]
                values = [float(obs['value']) for obs in observations if obs['value'] != '.']
                if not data['dates']:
                    data['dates'] = dates
                data[key] = values
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching {key} data from FRED: {e}")

        # Fetch data from Naver API for KOSPI and KOSDAQ
        try:
            kospi_data = extract_prices('KOSPI', 3000)
            kosdaq_data = extract_prices('KOSDAQ', 3000)
            data['dates'] = kospi_data.index.strftime('%Y-%m-%d').tolist()
            data['kospi'] = kospi_data['Close'].tolist()
            data['kosdaq'] = kosdaq_data['Close'].tolist()

            # Calculate disparity indices
            kospi_close = kospi_data['Close']
            data['kospi_disparity_20'] = calculate_disparity(kospi_close, 20)
            data['kospi_disparity_60'] = calculate_disparity(kospi_close, 60)
            data['kospi_disparity_200'] = calculate_disparity(kospi_close, 200)
        except Exception as e:
            logger.error(f"Error fetching or calculating data from Naver: {e}")

        # Fetch KOSPI PBR data for the last 30 days
        try:
            today = datetime.today()
            start_date_30 = (today - timedelta(days=30)).strftime("%Y%m%d")
            end_date = today.strftime("%Y%m%d")
            
            response_data = fetch_kospi_pbr_data(start_date_30, end_date)
            logger.debug(f"Raw KOSPI PBR data: {response_data}")

            kospi_pbr_df = create_dataframe_from_response(response_data)
            logger.debug(f"KOSPI PBR DataFrame: {kospi_pbr_df}")

            data['kospi_pbr_dates'] = kospi_pbr_df['Date'].dt.strftime('%Y-%m-%d').tolist()
            data['kospi_pbr_values'] = kospi_pbr_df['PBR'].tolist()
            
            logger.info(f"KOSPI PBR Dates: {data['kospi_pbr_dates']}")
            logger.info(f"KOSPI PBR Values: {data['kospi_pbr_values']}")
            
        except Exception as e:
            logger.error(f"Error fetching KOSPI PBR data: {e}")

        # Update the cache
        update_cache({'economic_indicators': data})

    return data