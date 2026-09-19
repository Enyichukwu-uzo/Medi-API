import os
from dotenv import load_dotenv

load_dotenv()   # Load environment variables from a .env file

class Config:
    """Base configuration class."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')  # Default value if not set
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///medi.db')  # Default to SQLite
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Disable track modifications to save resources
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret')  # Default value if not set
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))  # Default to 1 hour