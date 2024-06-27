import secrets
import yfinance as yf
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from flask import Flask, render_template, request, redirect, url_for, jsonify, g
from flask_login import LoginManager, login_required, logout_user, current_user
from flask_migrate import Migrate
from auth import auth as auth_blueprint
import requests
import pandas as pd
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from models import User
import googlecloudprofiler
from dateutil import parser
from pykrx import stock
from economic_indicators import get_economic_indicators
import json

KST = timezone(timedelta(hours=9))  # Korea Standard Time (UTC+9)

def initialize_profiler():
    """
    Google Cloud Profiler를 초기화합니다.
    """
    try:
        googlecloudprofiler.start(
            service="hello-profiler",
            service_version="1.0.1",
            verbose=3,
        )
    except (ValueError, NotImplementedError) as exc:
        print(f"프로파일러 초기화 오류: {exc}")

def main():
    """
    애플리케이션의 메인 진입점입니다.
    """
    initialize_profiler()
    print("애플리케이션이 시작되었습니다.")

load_dotenv()
app = Flask(__name__)

app.config['SECRET_KEY'] = secrets.token_hex(24)
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=1)
# app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

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
        assets_response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        liabilities_response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()
        asset_types_response = supabase.table('asset_type').select('*').execute()

        assets = assets_response.data if assets_response.data else []
        liabilities = liabilities_response.data if liabilities_response.data else []
        asset_types = asset_types_response.data if asset_types_response.data else []

        asset_type_dict = {asset_type['id']: asset_type for asset_type in asset_types}

        for asset in assets:
            asset_type_id = asset['asset_type_id']
            asset['asset_type'] = asset_type_dict.get(asset_type_id, {})

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
        assets_response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        liabilities_response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()

        if not assets_response.data or not liabilities_response.data:
            app.logger.error(f"Error fetching asset data: {assets_response} {liabilities_response}")
            return jsonify({'error': 'Error fetching asset data'}), 500

        asset_data = [{'name': asset['nickname'], 'nature': asset['asset_type_id'], 'value': asset['value']} for asset in assets_response.data]
        liability_data = [{'name': liability['nickname'], 'nature': 'liability', 'value': liability['value']} for liability in liabilities_response.data]

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
        if response.data:
            return jsonify({'success': True}), 200
        else:
            app.logger.error(f"Error deleting asset: {response}")
            return jsonify({'success': False, 'message': 'Error deleting asset'}), 404
    except Exception as e:
        app.logger.error(f"Error deleting asset: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/delete_liability/<int:liability_id>', methods=['DELETE'])
@login_required
def delete_liability(liability_id):
    try:
        user_id = current_user.id
        response = supabase.table('user_liability').delete().eq('id', liability_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'success': True}), 200
        else:
            app.logger.error(f"Error deleting liability: {response}")
            return jsonify({'success': False, 'message': 'Error deleting liability'}), 404
    except Exception as e:
        app.logger.error(f"Error deleting liability: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/update_asset/<int:asset_id>', methods=['POST'])
@login_required
def update_asset(asset_id):
    try:
        user_id = current_user.id
        data = request.get_json()
        if 'value' in data:
            update_data = {'value': float(data['value'])}
            response = supabase.table('user_asset').update(update_data).eq('id', asset_id).eq('user_id', user_id).execute()
            if response.data:
                return jsonify({'success': True}), 200
            else:
                app.logger.error(f"Error updating asset: {response}")
                return jsonify({'success': False, 'message': 'Error updating asset'}), 400
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
            if response.data:
                return jsonify({'success': True}), 200
            else:
                app.logger.error(f"Error updating liability: {response}")
                return jsonify({'success': False, 'message': 'Error updating liability'}), 400
        else:
            return jsonify({'success': False, 'message': 'Value not provided'}), 400
    except Exception as e:
        app.logger.error(f"Error updating liability: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/snapshots', methods=['GET'])
@login_required
def get_snapshots():
    try:
        user_id = current_user.id
        response = supabase.table('snapshot').select('*').eq('user_id', user_id).execute()
        if not response.data:
            raise Exception("Failed to fetch snapshots")
        
        snapshots = response.data
        snapshot_data = []
        
        for snapshot in snapshots:
            try:
                utc_date = parser.isoparse(snapshot['date'])
                kst_date = utc_date.astimezone(KST).strftime('%Y-%m-%d')
                snapshot_data.append({
                    'id': snapshot['id'],
                    'date': kst_date,
                    'total_assets': snapshot['total_assets'],
                    'total_liabilities': snapshot['total_liabilities'],
                    'net_worth': snapshot['net_worth']
                })
            except Exception as e:
                app.logger.error(f"Error converting date for snapshot {snapshot['id']}: {e}")
                raise

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
        
        date = datetime.utcnow().isoformat()
        assets = assets_response.data
        liabilities = liabilities_response.data

        total_assets = sum(asset['value'] for asset in assets)
        total_liabilities = sum(liability['value'] for liability in liabilities)
        net_worth = total_assets - total_liabilities

        asset_details = [{'name': asset['nickname'], 'type': asset['asset_type_id'], 'value': asset['value']} for asset in assets]
        liability_details = [{'name': liability['nickname'], 'type': liability['liability_type_id'], 'value': liability['value']} for liability in liabilities]

        new_snapshot = {
            'user_id': user_id,
            'date': date,  
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'net_worth': net_worth,
            'asset_details': json.dumps(asset_details),
            'liability_details': json.dumps(liability_details)
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
        response = supabase.table('snapshot').select('*').eq('id', snapshot_id).eq('user_id', user_id).execute()
        snapshot = response.data
        
        if not snapshot:
            app.logger.error(f"Snapshot with ID {snapshot_id} not found for user {user_id}.")
            return jsonify({'success': False, 'error': 'Snapshot not found or unauthorized'}), 404
        
        delete_response = supabase.table('snapshot').delete().eq('id', snapshot_id).eq('user_id', user_id).execute()
        if delete_response.data:
            return jsonify({'success': True}), 200
        else:
            app.logger.error(f"Error deleting snapshot: {delete_response}")
            return jsonify({'success': False, 'message': 'Error deleting snapshot'}), 404
    except Exception as e:
        app.logger.error(f"Error deleting snapshot: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

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

        snapshot_data = snapshot[0]

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
        snapshot_data = []
        
        for snapshot in snapshots:
            try:
                utc_date = parser.isoparse(snapshot['date'])
                kst_date = utc_date.astimezone(KST).strftime('%Y-%m-%d')
                snapshot_data.append({
                    'id': snapshot['id'],
                    'date': kst_date,
                    'total_assets': snapshot['total_assets'],
                    'total_liabilities': snapshot['total_liabilities'],
                    'net_worth': snapshot['net_worth']
                })
            except Exception as e:
                app.logger.error(f"Error converting date for snapshot {snapshot['id']}: {e}")
                raise

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

@app.route('/api/economic_indicators', methods=['GET'])
@login_required
def api_economic_indicators():
    fred_api_key = os.getenv('FRED_API_KEY')
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365*3)
    data = get_economic_indicators(fred_api_key, start_date, end_date)
    return jsonify(data)

@app.route('/budget')
@login_required
def budget():
    try:
        user_id = current_user.id
        response = supabase.table('user_budget').select('*').eq('user_id', user_id).execute()
        if response.data is None:
            raise Exception("Failed to fetch budget entries")

        budget_entries = response.data
        budget_data = []
        for entry in budget_entries:
            budget_data.append({
                'id': entry['id'],
                'year': entry['year'],
                'month': entry['month'],
                'category': entry['category'],
                'sub_category': entry['sub_category'],
                'amount': entry['amount'],
                'description': entry['description']
            })
        return render_template('budget.html', budget_entries=budget_data)
    except Exception as e:
        app.logger.error(f"Error fetching budget: {e}")
        return jsonify({'error': 'Error fetching budget'}), 500

@app.route('/add_budget_entry', methods=['POST'])
@login_required
def add_budget_entry():
    try:
        user_id = current_user.id
        data = request.json
        new_entry = {
            "user_id": user_id,
            "year": data['year'],
            "month": data['month'],
            "category": data['category'],
            "sub_category": data['sub_category'],
            "amount": data['amount'],
            "description": data['description']
        }

        response = supabase.table('user_budget').insert(new_entry).execute()
        if not response.data:
            raise Exception("Failed to add budget entry")

        return jsonify(success=True, id=response.data[0]['id'])
    except Exception as e:
        app.logger.error(f"Error adding budget entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/delete_budget_entry/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_budget_entry(entry_id):
    try:
        user_id = current_user.id
        response = supabase.table('user_budget').delete().eq('id', entry_id).eq('user_id', user_id).execute()
        if response.data is None:
            raise Exception("Failed to delete budget entry")

        return jsonify(success=True)
    except Exception as e:
        app.logger.error(f"Error deleting budget entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)