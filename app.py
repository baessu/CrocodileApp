import csv
import secrets
import yfinance as yf
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required, logout_user, current_user
from flask_migrate import Migrate
from models import db, User, AssetType, UserAsset, UserLiability, Snapshot
from auth import auth as auth_blueprint
import requests
import pandas as pd
from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()
app = Flask(__name__)

# 안전한 SECRET_KEY 생성 및 설정
app.config['SECRET_KEY'] = secrets.token_hex(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'

db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

app.register_blueprint(auth_blueprint)

def load_asset_types():
    asset_types = []
    with open('asset_types.csv', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            asset_types.append(row)
    return asset_types

@app.before_request
def initialize_database():
    db.create_all()

@app.template_filter('format_currency')
def format_currency(value):
    return f"{value:,.0f}"

@app.template_filter('asset_nature_ko')
def asset_nature_ko(nature):
    nature_dict = {
        'stability_asset': '안정성 자산',
        'investment_asset': '투자 자산',
        'real_estate_asset': '부동산 자산',
        'retirement_asset': '퇴직연금 자산',
        'other_asset': '기타 자산'
    }
    return nature_dict.get(nature, nature)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    assets = UserAsset.query.filter_by(user_id=current_user.id).all()
    liabilities = UserLiability.query.filter_by(user_id=current_user.id).all()
    asset_types = AssetType.query.all()
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
        assets = UserAsset.query.filter_by(user_id=current_user.id).all()
        liabilities = UserLiability.query.filter_by(user_id=current_user.id).all()

        asset_data = [{'name': asset.nickname, 'nature': asset.asset_type.nature, 'value': asset.value} for asset in assets]
        liability_data = [{'name': liability.nickname, 'nature': 'liability', 'value': liability.value} for liability in liabilities]

        return jsonify({'assets': asset_data, 'liabilities': liability_data})
    except Exception as e:
        app.logger.error(f"Error fetching asset data: {e}")
        return jsonify({'error': 'Error fetching asset data'}), 500


def parse_currency(value):
    return float(value.replace(',', ''))

@app.route('/add_asset', methods=['POST'])
@login_required
def add_asset():
    asset_type_id = request.form.get('asset_type_id')
    nickname = request.form.get('nickname')
    value = parse_currency(request.form.get('value'))
    currency = request.form.get('currency')
    new_asset = UserAsset(user_id=current_user.id, asset_type_id=asset_type_id, nickname=nickname, value=value, currency=currency)
    db.session.add(new_asset)
    db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/add_liability', methods=['POST'])
@login_required
def add_liability():
    liability_type_id = request.form.get('liability_type_id')
    nickname = request.form.get('nickname')
    value = parse_currency(request.form.get('value'))
    currency = request.form.get('currency')
    new_liability = UserLiability(user_id=current_user.id, liability_type_id=liability_type_id, nickname=nickname, value=value, currency=currency)
    db.session.add(new_liability)
    db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/delete_asset/<int:asset_id>', methods=['DELETE'])
@login_required
def delete_asset(asset_id):
    asset = UserAsset.query.get(asset_id)
    if asset and asset.user_id == current_user.id:
        db.session.delete(asset)
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

@app.route('/delete_liability/<int:liability_id>', methods=['DELETE'])
@login_required
def delete_liability(liability_id):
    liability = UserLiability.query.get(liability_id)
    if liability and liability.user_id == current_user.id:
        db.session.delete(liability)
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

@app.route('/update_asset/<int:asset_id>', methods=['POST'])
@login_required
def update_asset(asset_id):
    asset = UserAsset.query.get(asset_id)
    if asset and asset.user_id == current_user.id:
        try:
            data = request.get_json()
            if 'value' in data:
                asset.value = float(data['value'])
                db.session.commit()
                return jsonify({'success': True}), 200
            else:
                return jsonify({'success': False, 'message': 'Value not provided'}), 400
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    return jsonify({'success': False, 'message': 'Asset not found or unauthorized'}), 404

@app.route('/update_liability/<int:liability_id>', methods=['POST'])
@login_required
def update_liability(liability_id):
    liability = UserLiability.query.get(liability_id)
    if liability and liability.user_id == current_user.id:
        try:
            data = request.get_json()
            if 'value' in data:
                liability.value = float(data['value'])
                db.session.commit()
                return jsonify({'success': True}), 200
            else:
                return jsonify({'success': False, 'message': 'Value not provided'}), 400
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    return jsonify({'success': False, 'message': 'Liability not found or unauthorized'}), 404

import json

@app.route('/snapshot', methods=['POST'])
@login_required
def snapshot():
    assets = UserAsset.query.filter_by(user_id=current_user.id).all()
    liabilities = UserLiability.query.filter_by(user_id=current_user.id).all()
    
    total_assets = sum(asset.value for asset in assets)
    total_liabilities = sum(liability.value for liability in liabilities)
    net_worth = total_assets - total_liabilities

    asset_details = [{'name': asset.nickname, 'type': asset.asset_type.name, 'value': asset.value} for asset in assets]
    liability_details = [{'name': liability.nickname, 'type': liability.liability_type.name, 'value': liability.value} for liability in liabilities]

    new_snapshot = Snapshot(
        user_id=current_user.id,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=net_worth,
        asset_details=json.dumps(asset_details),  # Serialize details to JSON
        liability_details=json.dumps(liability_details)  # Serialize details to JSON
    )
    db.session.add(new_snapshot)
    db.session.commit()

    return jsonify({'success': True}), 200


@app.route('/delete_snapshot/<int:snapshot_id>', methods=['DELETE'])
@login_required
def delete_snapshot(snapshot_id):
    snapshot = Snapshot.query.get(snapshot_id)
    if snapshot and snapshot.user_id == current_user.id:
        db.session.delete(snapshot)
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

@app.route('/snapshot_details/<int:snapshot_id>', methods=['GET'])
@login_required
def snapshot_details(snapshot_id):
    snapshot = Snapshot.query.get(snapshot_id)
    if snapshot and snapshot.user_id == current_user.id:
        asset_details = json.loads(snapshot.asset_details)
        liability_details = json.loads(snapshot.liability_details)

        return jsonify({
            'assets': asset_details,
            'liabilities': liability_details
        })
    return jsonify({'error': 'Snapshot not found or unauthorized'}), 404


@app.route('/history')
@login_required
def history():
    snapshots = Snapshot.query.filter_by(user_id=current_user.id).all()
    snapshot_data = [{
        'id': snapshot.id,
        'date': snapshot.date.strftime('%Y-%m-%d'),
        'total_assets': snapshot.total_assets,
        'total_liabilities': snapshot.total_liabilities,
        'net_worth': snapshot.net_worth
    } for snapshot in snapshots]
    return render_template('history.html', snapshots=snapshot_data)

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
    app.run(host='0.0.0.0', port=5000)