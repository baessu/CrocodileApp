from flask import Blueprint, render_template, redirect, url_for, request, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from models import User, db, UserAsset, UserLiability
import secrets

auth = Blueprint('auth', __name__)

def add_placeholder_assets_and_liabilities(user_id):
    placeholder_assets = [
        {"nickname": "OO예금계좌", "asset_type_id": 1, "value": 10000000, "currency": "KRW"},
        {"nickname": "OO증권", "asset_type_id": 2, "value": 5000000, "currency": "KRW"},
        {"nickname": "OO아파트", "asset_type_id": 9, "value": 100000000, "currency": "KRW"},
    ]
    for asset in placeholder_assets:
        new_asset = UserAsset(user_id=user_id, **asset)
        db.session.add(new_asset)
    
    placeholder_liabilities = [
        {"nickname": "OO전세대출", "liability_type_id": 30, "value": 50000000, "currency": "KRW"},
    ]
    for liability in placeholder_liabilities:
        new_liability = UserLiability(user_id=user_id, **liability)
        db.session.add(new_liability)
    
    db.session.commit()

@auth.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email address already exists')
            return redirect(url_for('auth.signup'))

        new_user = User(email=email, username=username, password=generate_password_hash(password, method='pbkdf2:sha256'))
        db.session.add(new_user)
        db.session.commit()
        
        add_placeholder_assets_and_liabilities(new_user.id)  # Add placeholder assets and liabilities after user creation

        login_user(new_user)
        return redirect(url_for('dashboard'))

    return render_template('signup.html')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            flash('Please check your login details and try again.')
            return redirect(url_for('auth.login'))

        login_user(user)
        return redirect(url_for('dashboard'))

    return render_template('index.html')

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))