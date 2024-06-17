"""Add asset and liability details to Snapshot model

Revision ID: eff6b5ef6928
Revises: ffe672988a69
Create Date: 2023-07-16 12:34:56.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eff6b5ef6928'
down_revision = 'ffe672988a69'
branch_labels = None
depends_on = None


def upgrade():
    # Create a new table with the updated schema
    op.create_table(
        'snapshot_new',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('date', sa.DateTime, nullable=False, default=sa.func.current_timestamp()),
        sa.Column('total_assets', sa.Float, nullable=False),
        sa.Column('total_liabilities', sa.Float, nullable=False),
        sa.Column('net_worth', sa.Float, nullable=False),
        sa.Column('asset_details', sa.Text, nullable=True),
        sa.Column('liability_details', sa.Text, nullable=True)
    )

    # Copy data from the old table to the new table
    op.execute(
        'INSERT INTO snapshot_new (id, user_id, date, total_assets, total_liabilities, net_worth) '
        'SELECT id, user_id, date, total_assets, total_liabilities, net_worth FROM snapshot'
    )

    # Drop the old table
    op.drop_table('snapshot')

    # Rename the new table to the old table name
    op.rename_table('snapshot_new', 'snapshot')


def downgrade():
    # Create the original table without the new columns
    op.create_table(
        'snapshot_old',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('date', sa.DateTime, nullable=False, default=sa.func.current_timestamp()),
        sa.Column('total_assets', sa.Float, nullable=False),
        sa.Column('total_liabilities', sa.Float, nullable=False),
        sa.Column('net_worth', sa.Float, nullable=False)
    )

    # Copy data from the current table to the old table
    op.execute(
        'INSERT INTO snapshot_old (id, user_id, date, total_assets, total_liabilities, net_worth) '
        'SELECT id, user_id, date, total_assets, total_liabilities, net_worth FROM snapshot'
    )

    # Drop the current table
    op.drop_table('snapshot')

    # Rename the old table back to the original name
    op.rename_table('snapshot_old', 'snapshot')