from app import db, app
from models import User, AssetType, UserAsset, UserLiability
import csv

# Flask 애플리케이션 컨텍스트 내에서 데이터베이스를 초기화하고 데이터를 삽입합니다.
with app.app_context():
    db.drop_all()
    db.create_all()
    print("Database tables created")

    # CSV 파일에서 데이터를 읽어와서 AssetTypes 테이블에 삽입합니다.
    with open('asset_types.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            asset_type = AssetType(name=row['name'], asset_class=row['asset_class'], nature=row['nature'], liquidity=row['liquidity'])
            db.session.add(asset_type)
        db.session.commit()
    print("AssetTypes data inserted")