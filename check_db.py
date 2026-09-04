from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
db_url = os.environ.get('DATABASE_URL')
engine = create_engine(db_url)
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, hashed_password FROM users WHERE email='prath333@outlook.com'")).fetchone()
    print('USER IN DB:', result)
