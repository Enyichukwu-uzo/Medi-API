from flask import Blueprint, render_template
views_bp = Blueprint('views', __name__, url_prefix='/')

@views_bp.route('/')
def dashboard():
    return render_template('dashboard.html')

@views_bp.route('/login')
def login_page():
    return render_template('login.html')

@views_bp.route('/register')
def register_page():
    return render_template('register.html')

@views_bp.route('/patients')
def patients_page():
    return render_template('patients.html')

@views_bp.route('/appointments')
def appointments_page():
    return render_template('appointments.html')