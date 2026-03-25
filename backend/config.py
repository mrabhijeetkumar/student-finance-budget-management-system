# config.py
# ...configuration variables...
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    DATABASE_PATH = os.getenv("DATABASE_PATH", "instance/database.db")