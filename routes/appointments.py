from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Appointment
from datetime import datetime
appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')
@appointments_bp.route('/', methods=['GET'])
@jwt_required()
def get_appointments():
    appointments = Appointment.query.all()
    return jsonify({
        'appointments': [{
            'id': a.id,
            'patient_id': a.patient_id,
            'doctor_name': a.doctor_name,
            'date': a.date.strftime('%Y-%m-%d'),
            'time': a.time.strftime('%H:%M:%S'),
            'status': a.status,
            'notes': a.notes
        } for a in appointments]
    }), 200
    
@appointments_bp.route('/', methods=['POST'])
@jwt_required()
def create_appointment():
    data = request.get_json()
    required_fields = ['patient_id', 'doctor_name', 'date', 'time']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    appointment_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    appointment_time = datetime.strptime(data['time'], '%H:%M:%S').time()
    appointment = Appointment(
        patient_id=data['patient_id'],
        doctor_name=data['doctor_name'],
        date=appointment_date,
        time=appointment_time,
        notes=data.get('notes')
    )
    db.session.add(appointment)
    db.session.commit()
    return jsonify({
        'id': appointment.id,
        'patient_id': appointment.patient_id,
        'doctor_name': appointment.doctor_name,
        'date': appointment.date.strftime('%Y-%m-%d'),
        'time': appointment.time.strftime('%H:%M:%S'),
        'status': appointment.status,
        'message': 'Appointment created successfully'
    }), 201
    
@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    return jsonify({
        'id': appointment.id,
        'patient_id': appointment.patient_id,
        'doctor_name': appointment.doctor_name,
        'date': appointment.date.strftime('%Y-%m-%d'),
        'time': appointment.time.strftime('%H:%M:%S'),
        'status': appointment.status,
        'notes': appointment.notes
    }), 200
    
@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.get_json()
    if 'doctor_name' in data:
        appointment.doctor_name = data['doctor_name']
    if 'date' in data:
        appointment.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    if 'time' in data:
        appointment.time = datetime.strptime(data['time'], '%H:%M:%S').time()
    if 'status' in data:
        appointment.status = data['status']
    if 'notes' in data:
        appointment.notes = data['notes']
    db.session.commit()
    return jsonify({
        'id': appointment.id,
        'patient_id': appointment.patient_id,
        'doctor_name': appointment.doctor_name,
        'date': appointment.date.strftime('%Y-%m-%d'),
        'time': appointment.time.strftime('%H:%M:%S'),
        'status': appointment.status,
        'notes': appointment.notes
    }), 200
    
@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    db.session.delete(appointment)
    db.session.commit()
    return jsonify({'message': 'Appointment deleted successfully'}), 200