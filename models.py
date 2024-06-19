from flask_login import UserMixin
from datetime import datetime
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
# Load environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

class User(UserMixin):
    def __init__(self, data):
        self.id = data.get('id')
        self.username = data.get('username')
        self.email = data.get('email')
        self.password = data.get('password')
        self.assets = []
        self.liabilities = []
        self.snapshots = []

    def get_id(self):
        return str(self.id)

    @staticmethod
    def get_user_by_email(email):
        response = supabase.table('user').select('*').eq('email', email).execute()
        if response.data:
            return User(response.data[0])
        return None

    @staticmethod
    def get_user_by_id(user_id):
        response = supabase.table('user').select('*').eq('id', user_id).execute()
        if response.data:
            return User(response.data[0])
        return None

    @staticmethod
    def create_user(email, username, password):
        new_user_data = {
            "email": email,
            "username": username,
            "password": password
        }
        response = supabase.table('user').insert(new_user_data).execute()
        if response.data:
            return User(response.data[0])
        return None

    def save(self):
        supabase.table('user').update({
            'username': self.username,
            'email': self.email,
            'password': self.password
        }).eq('id', self.id).execute()

class AssetType:
    @staticmethod
    def get_all():
        response = supabase.table('asset_type').select('*').execute()
        return response.data

class UserAsset:
    @staticmethod
    def get_assets_by_user_id(user_id):
        response = supabase.table('user_asset').select('*').eq('user_id', user_id).execute()
        return response.data

    @staticmethod
    def create_asset(user_id, asset_type_id, nickname, value, currency):
        new_asset_data = {
            "user_id": user_id,
            "asset_type_id": asset_type_id,
            "nickname": nickname,
            "value": value,
            "currency": currency
        }
        response = supabase.table('user_asset').insert(new_asset_data).execute()
        return response.data

class UserLiability:
    @staticmethod
    def get_liabilities_by_user_id(user_id):
        response = supabase.table('user_liability').select('*').eq('user_id', user_id).execute()
        return response.data

    @staticmethod
    def create_liability(user_id, liability_type_id, nickname, value, currency):
        new_liability_data = {
            "user_id": user_id,
            "liability_type_id": liability_type_id,
            "nickname": nickname,
            "value": value,
            "currency": currency
        }
        response = supabase.table('user_liability').insert(new_liability_data).execute()
        return response.data

class Snapshot:
    @staticmethod
    def get_snapshots_by_user_id(user_id):
        response = supabase.table('snapshot').select('*').eq('user_id', user_id).execute()
        return response.data

    @staticmethod
    def create_snapshot(user_id, total_assets, total_liabilities, net_worth, asset_details, liability_details):
        new_snapshot_data = {
            "user_id": user_id,
            "date": datetime.utcnow().isoformat(),
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "net_worth": net_worth,
            "asset_details": asset_details,
            "liability_details": liability_details
        }
        response = supabase.table('snapshot').insert(new_snapshot_data).execute()
        return response.data