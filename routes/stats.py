from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models import db, Patient, Appointment

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

@stats_bp.route('/', methods=['GET'])
@jwt_required()
def get_stats():
    recent = Appointment.query.order_by(Appointment.id.desc()).limit(5).all()
    return jsonify({
        'total_patients':      Patient.query.count(),
        'total_appointments':  Appointment.query.count(),
        'completed':           Appointment.query.filter_by(status='Completed').count(),
        'pending':             Appointment.query.filter_by(status='Scheduled').count(),
        'recent_appointments': [{
            'id': a.id,
            'patient_id': a.patient_id,
            'doctor_name': a.doctor_name,
            'date': a.date.strftime('%Y-%m-%d'),
            'status': a.status,
        } for a in recent]
    }), 200