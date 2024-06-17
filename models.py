from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    assets = db.relationship('UserAsset', backref='owner', lazy=True)
    liabilities = db.relationship('UserLiability', backref='owner', lazy=True)
    snapshots = db.relationship('Snapshot', backref='owner', lazy=True)

class AssetType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    asset_class = db.Column(db.String(100))
    nature = db.Column(db.String(100))
    liquidity = db.Column(db.String(100))
    assets = db.relationship('UserAsset', backref='asset_type', lazy=True)
    liabilities = db.relationship('UserLiability', backref='liability_type', lazy=True)

class UserAsset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    asset_type_id = db.Column(db.Integer, db.ForeignKey('asset_type.id'), nullable=False)
    nickname = db.Column(db.String(100))
    value = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(50))

class UserLiability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    liability_type_id = db.Column(db.Integer, db.ForeignKey('asset_type.id'), nullable=False)
    nickname = db.Column(db.String(100))
    value = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(50))

class Snapshot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    total_assets = db.Column(db.Float, nullable=False)
    total_liabilities = db.Column(db.Float, nullable=False)
    net_worth = db.Column(db.Float, nullable=False)
    asset_details = db.Column(db.Text, nullable=True)
    liability_details = db.Column(db.Text, nullable=True)