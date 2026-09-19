import datetime
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    email = db.Column(db.String(100), unique=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    appointments = db.relationship('Appointment', backref='patient', lazy=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))  # Use UTC time for consistency
    # created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
class Appointment(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
        doctor_name = db.Column(db.String(100), nullable=False)
        date = db.Column(db.Date, nullable=False)
        time = db.Column(db.Time, nullable=False)
        status = db.Column(db.String(20), nullable=False, default='Scheduled')  # Default status
        notes = db.Column(db.Text, nullable=True)
        created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))  # Use UTC time for consistency

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)   # <-- changed from username
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), default='user')