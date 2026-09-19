# auth.py
from flask import Blueprint
from .auth_handlers import register, login, protected   # <-- import the logic

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Route definitions – each calls the imported function directly
@auth_bp.route('/register', methods=['POST'])
def register_route():
    return register()

@auth_bp.route('/login', methods=['POST'])
def login_route():
    return login()

@auth_bp.route('/me', methods=['GET'])
def me_route():
    return protected()