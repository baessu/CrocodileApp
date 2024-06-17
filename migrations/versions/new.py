from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'your_revision_id'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('snapshot', sa.Column('asset_details', sa.Text(), nullable=True))
    op.add_column('snapshot', sa.Column('liability_details', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('snapshot', 'asset_details')
    op.drop_column('snapshot', 'liability_details')