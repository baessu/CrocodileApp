import csv
import secrets
import yfinance as yf
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, jsonify, g
#from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required, logout_user, current_user
from flask_migrate import Migrate
#from models import db, User, AssetType, UserAsset, UserLiability, Snapshot
from auth import auth as auth_blueprint
import requests
import pandas as pd
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from models import User



load_dotenv()
app = Flask(__name__)
#db = SQLAlchemy()

# 안전한 SECRET_KEY 생성 및 설정
app.config['SECRET_KEY'] = secrets.token_hex(24)
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=1)  # 세션 유지 시간을 7일로 설정
#app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
# app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url,supabase_key)

# db.init_app(app)
#migrate = Migrate(app, supabase)

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.init_app(app)

@app.before_request
def before_request():
    user_id = request.headers.get('user_id')
    if user_id:
        user = supabase.auth.user()
        g.user = user

@login_manager.user_loader
def load_user(user_id):
    response = supabase.table('user').select('*').eq('id', user_id).execute()
    if response.data:
        return User(response.data[0])
    return None

app.register_blueprint(auth_blueprint)




@app.template_filter('format_currency')
def format_currency(value):
    return f"{value:,.0f}"

@app.template_filter('asset_nature_ko')
def asset_nature_ko(nature):
    nature_dict = {
        'stability_asset': '현금성 자산',
        'investment_asset': '투자 자산',
        'real_estate_asset': '부동산 자산',
        'retirement_asset': '퇴직연금 자산',
        'other_asset': '기타 자산'
    }
    return nature_dict.get(nature, nature)

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = current_user.id
    
    try:
        # Fetch assets, liabilities, and asset types from Supabase
        assets_response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        liabilities_response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()
        asset_types_response = supabase.table('asset_type').select('*').execute()

        # Extract data from responses
        assets = assets_response.data if assets_response.data else []
        liabilities = liabilities_response.data if liabilities_response.data else []
        asset_types = asset_types_response.data if asset_types_response.data else []

        # Create a dictionary of asset types for quick lookup
        asset_type_dict = {asset_type['id']: asset_type for asset_type in asset_types}

        # Add asset type details to each asset
        for asset in assets:
            asset_type_id = asset['asset_type_id']
            asset['asset_type'] = asset_type_dict.get(asset_type_id, {})

        # Add liability type details to each liability
        for liability in liabilities:
            liability_type_id = liability['liability_type_id']
            liability['liability_type'] = asset_type_dict.get(liability_type_id, {})

    except Exception as e:
        app.logger.error(f"Error fetching data: {e}", exc_info=True)
        assets, liabilities, asset_types = [], [], []

    return render_template('dashboard.html', assets=assets, liabilities=liabilities, asset_types=asset_types)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@app.route('/api/asset_data', methods=['GET'])
@login_required
def asset_data():
    try:
        user_id = current_user.id
        #app.logger.info(f"Fetching assets for user_id: {user_id}")
        
        assets_response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        #app.logger.info(f"Assets Response: {assets_response.data}")
        
        liabilities_response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()
        #app.logger.info(f"Liabilities Response: {liabilities_response.data}")

        if not assets_response.data or not liabilities_response.data:
            app.logger.error(f"Error fetching asset data: {assets_response} {liabilities_response}")
            return jsonify({'error': 'Error fetching asset data'}), 500

        asset_data = [{'name': asset['nickname'], 'nature': asset['asset_type_id'], 'value': asset['value']} for asset in assets_response.data]
        liability_data = [{'name': liability['nickname'], 'nature': 'liability', 'value': liability['value']} for liability in liabilities_response.data]

        #app.logger.info(f"Asset Data: {asset_data}")
        #app.logger.info(f"Liability Data: {liability_data}")

        return jsonify({'assets': asset_data, 'liabilities': liability_data})
    except Exception as e:
        app.logger.error(f"Error fetching asset data: {e}", exc_info=True)
        return jsonify({'error': 'Error fetching asset data'}), 500

def parse_currency(value):
    return float(value.replace(',', ''))



@app.route('/add_asset', methods=['POST'])
@login_required
def add_asset():
    try:
        user_id = current_user.id
        asset_type_id = request.form.get('asset_type_id')
        nickname = request.form.get('nickname')
        value = parse_currency(request.form.get('value'))
        currency = request.form.get('currency')
        
        new_asset = {
            'user_id': user_id,
            'asset_type_id': asset_type_id,
            'nickname': nickname,
            'value': value,
            'currency': currency
        }
        response = supabase.table('user_asset').insert(new_asset).execute()
        
        if response.data:
            return redirect(url_for('dashboard'))
        else:
            app.logger.error(f"Error adding asset: {response}")
            return jsonify({'success': False, 'message': 'Error adding asset'}), 500
    except Exception as e:
        app.logger.error(f"Error adding asset: {e}")
        return jsonify({'success': False, 'message': 'Error adding asset'}), 500

@app.route('/add_liability', methods=['POST'])
@login_required
def add_liability():
    try:
        user_id = current_user.id
        liability_type_id = request.form.get('liability_type_id')
        nickname = request.form.get('nickname')
        value = parse_currency(request.form.get('value'))
        currency = request.form.get('currency')
        
        new_liability = {
            'user_id': user_id,
            'liability_type_id': liability_type_id,
            'nickname': nickname,
            'value': value,
            'currency': currency
        }
        response = supabase.table('user_liability').insert(new_liability).execute()
        
        if response.data:
            return redirect(url_for('dashboard'))
        else:
            app.logger.error(f"Error adding liability: {response}")
            return jsonify({'success': False, 'message': 'Error adding liability'}), 500
    except Exception as e:
        app.logger.error(f"Error adding liability: {e}")
        return jsonify({'success': False, 'message': 'Error adding liability'}), 500

@app.route('/delete_asset/<int:asset_id>', methods=['DELETE'])
@login_required
def delete_asset(asset_id):
    try:
        user_id = current_user.id
        response = supabase.table('user_asset').delete().eq('id', asset_id).eq('user_id', user_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error deleting asset: {e}")
        return jsonify({'success': False}), 404

@app.route('/delete_liability/<int:liability_id>', methods=['DELETE'])
@login_required
def delete_liability(liability_id):
    try:
        user_id = current_user.id
        response = supabase.table('user_liability').delete().eq('id', liability_id).eq('user_id', user_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error deleting liability: {e}")
        return jsonify({'success': False}), 404


@app.route('/update_asset/<int:asset_id>', methods=['POST'])
@login_required
def update_asset(asset_id):
    try:
        user_id = current_user.id
        data = request.get_json()
        if 'value' in data:
            update_data = {'value': float(data['value'])}
            response = supabase.table('user_asset').update(update_data).eq('id', asset_id).eq('user_id', user_id).execute()
            return jsonify({'success': True}), 200
        else:
            return jsonify({'success': False, 'message': 'Value not provided'}), 400
    except Exception as e:
        app.logger.error(f"Error updating asset: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/update_liability/<int:liability_id>', methods=['POST'])
@login_required
def update_liability(liability_id):
    try:
        user_id = current_user.id
        data = request.get_json()
        if 'value' in data:
            update_data = {'value': float(data['value'])}
            response = supabase.table('user_liability').update(update_data).eq('id', liability_id).eq('user_id', user_id).execute()
            return jsonify({'success': True}), 200
        else:
            return jsonify({'success': False, 'message': 'Value not provided'}), 400
    except Exception as e:
        app.logger.error(f"Error updating liability: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

import json

@app.route('/api/snapshots', methods=['GET'])
@login_required
def get_snapshots():
    try:
        user_id = current_user.id
        response = supabase.table('snapshot').select('*').eq('user_id', user_id).execute()
        snapshots = response.data
        
        snapshot_data = [{
            'id': snapshot['id'],
            'date': snapshot['date'],
            'total_assets': snapshot['total_assets'],
            'total_liabilities': snapshot['total_liabilities'],
            'net_worth': snapshot['net_worth']
        } for snapshot in snapshots]

        return jsonify({'snapshots': snapshot_data}), 200
    except Exception as e:
        app.logger.error(f"Error fetching snapshots: {e}")
        return jsonify({'error': 'Error fetching snapshots'}), 500

@app.route('/snapshot', methods=['POST'])
@login_required
def snapshot():
    try:
        user_id = current_user.id
        assets_response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        liabilities_response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()

        if assets_response.data is None or liabilities_response.data is None:
            raise Exception("Failed to fetch assets or liabilities")
        date = datetime.now()
        assets = assets_response.data
        liabilities = liabilities_response.data

        total_assets = sum(asset['value'] for asset in assets)
        total_liabilities = sum(liability['value'] for liability in liabilities)
        net_worth = total_assets - total_liabilities

        asset_details = [{'name': asset['nickname'], 'type': asset['asset_type_id'], 'value': asset['value']} for asset in assets]
        liability_details = [{'name': liability['nickname'], 'type': liability['liability_type_id'], 'value': liability['value']} for liability in liabilities]

        new_snapshot = {
            'user_id': user_id,
            'date': datetime.utcnow().isoformat(),  # Add current date and time
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'net_worth': net_worth,
            'asset_details': json.dumps(asset_details),  # Serialize details to JSON
            'liability_details': json.dumps(liability_details)  # Serialize details to JSON
        }
        response = supabase.table('snapshot').insert(new_snapshot).execute()
        if not response.data:
            raise Exception("Failed to create snapshot")

        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error creating snapshot: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/delete_snapshot/<int:snapshot_id>', methods=['DELETE'])
@login_required
def delete_snapshot(snapshot_id):
    try:
        user_id = current_user.id
        # Check if the snapshot exists
        response = supabase.table('snapshot').select('*').eq('id', snapshot_id).eq('user_id', user_id).execute()
        snapshot = response.data
        
        if not snapshot:
            app.logger.error(f"Snapshot with ID {snapshot_id} not found for user {user_id}.")
            return jsonify({'success': False, 'error': 'Snapshot not found or unauthorized'}), 404
        
        # Proceed to delete the snapshot
        delete_response = supabase.table('snapshot').delete().eq('id', snapshot_id).eq('user_id', user_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error deleting snapshot: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/snapshot_details/<int:snapshot_id>', methods=['GET'])
@login_required
def snapshot_details(snapshot_id):
    try:
        user_id = current_user.id
        response = supabase.table('snapshot').select('*').eq('id', snapshot_id).eq('user_id', user_id).execute()
        snapshot = response.data
        
        if not snapshot:
            app.logger.error(f"Snapshot with ID {snapshot_id} not found for user {user_id}.")
            return jsonify({'error': 'Snapshot not found or unauthorized'}), 404

        snapshot_data = snapshot[0]  # Get the first element from the response data

        asset_details = json.loads(snapshot_data['asset_details'])
        liability_details = json.loads(snapshot_data['liability_details'])

        return jsonify({
            'assets': asset_details,
            'liabilities': liability_details
        })
    except Exception as e:
        app.logger.error(f"Error fetching snapshot details: {e}")
        return jsonify({'error': 'Snapshot not found or unauthorized'}), 500

@app.route('/history')
@login_required
def history():
    try:
        user_id = current_user.id
        response = supabase.table('snapshot').select('*').eq('user_id', user_id).execute()
        if response.data is None:
            raise Exception("Failed to fetch snapshots")

        snapshots = response.data
        snapshot_data = [{
            'id': snapshot['id'],
            'date': snapshot['date'],
            'total_assets': snapshot['total_assets'],
            'total_liabilities': snapshot['total_liabilities'],
            'net_worth': snapshot['net_worth']
        } for snapshot in snapshots]

        return render_template('history.html', snapshots=snapshot_data)
    except Exception as e:
        app.logger.error(f"Error fetching history: {e}")
        return jsonify({'error': 'Error fetching history'}), 500

@app.route('/retirement')
@login_required
def retirement():
    return render_template('retirement.html')

@app.route('/economic_indicators')
@login_required
def economic_indicators():
    return render_template('economic_indicators.html')

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

@app.route('/api/economic_indicators', methods=['GET'])
@login_required
def api_economic_indicators():
    fred_api_key = os.getenv('FRED_API_KEY')
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365*3)  # 3 years of data
    recent_start_date = end_date - timedelta(days=365)  # 1 year of data
    start_date_str = start_date.strftime('%Y-%m-%d')
    recent_start_date_str = recent_start_date.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')

    fred_indicators = {
        'nasdaq': 'NASDAQCOM',
        'sp500': 'SP500'
    }

    data = {'dates': []}
    
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
            app.logger.error(f"Error fetching {key} data from FRED: {e}")

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
        app.logger.error(f"Error fetching or calculating data from Naver: {e}")

    # Filter data to only include the most recent year
    if len(data['dates']) > 365:
        for key in data.keys():
            data[key] = data[key][-365:]

    return jsonify(data)

if __name__ == '__main__':
    #app.run(debug=True)
    app.run(port=8080)