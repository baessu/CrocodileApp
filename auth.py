from flask import Blueprint, render_template, redirect, url_for, request, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required
from models import User

from supabase import create_client, Client
import os

auth = Blueprint('auth', __name__)

# Load environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

def add_placeholder_assets_and_liabilities(user_id):
    placeholder_assets = [
        {"nickname": "OO예금계좌", "asset_type_id": 1, "value": 10000000, "currency": "KRW"},
        {"nickname": "OO증권", "asset_type_id": 2, "value": 5000000, "currency": "KRW"},
        {"nickname": "OO아파트", "asset_type_id": 9, "value": 100000000, "currency": "KRW"},
    ]
    for asset in placeholder_assets:
        supabase.table('user_asset').insert({"user_id": user_id, **asset}).execute()
    
    placeholder_liabilities = [
        {"nickname": "OO전세대출", "liability_type_id": 30, "value": 50000000, "currency": "KRW"},
    ]
    for liability in placeholder_liabilities:
        supabase.table('user_liability').insert({"user_id": user_id, **liability}).execute()

@auth.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')

        response = supabase.table('user').select('*').eq('email', email).execute()
        if response.data:
            flash('Email address already exists', 'error')
            return redirect(url_for('auth.signup'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        user = User.create_user(email, username, hashed_password)

        if user:
            add_placeholder_assets_and_liabilities(user.id)
            login_user(user)
            return redirect(url_for('dashboard'))

    return render_template('signup.html')


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        response = supabase.table('user').select('*').eq('email', email).execute()
        user_data = response.data[0] if response.data else None

        if not user_data or not check_password_hash(user_data['password'], password):
            flash('Please check your login details and try again.','error')
            return redirect(url_for('auth.login'))

        user = User(user_data)
        login_user(user, remember=True)  # 세션을 기억하도록 설정
        return redirect(url_for('dashboard'))

    return render_template('index.html')

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))