from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Patient
patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')

@patients_bp.route('/', methods=['GET'])
@jwt_required()
def get_patients():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    patients = Patient.query.paginate(page=page, per_page=per_page)
    return jsonify({
        'patients': [{
        'id': patient.id,
        'first_name': patient.first_name,
        'last_name': patient.last_name,
        'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d'),
        'email': patient.email,
        'phone': patient.phone,
        # 'address': patient.address,
        # 'created_at': patient.created_at.isoformat(),
        'appointments_count': len(patient.appointments)
    } for patient in patients.items],
        'total': patients.total,
        'page': page,
        'pages': patients.pages,
    }), 200
    
@patients_bp.route('/', methods=['POST'])
@jwt_required()
def create_patient():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    date_of_birth = data.get('date_of_birth')
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')

    required_fields = ['first_name', 'last_name', 'date_of_birth']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400

    patient = Patient(
        first_name=first_name,
        last_name=last_name,
        date_of_birth=datetime.strptime(date_of_birth, '%Y-%m-%d'),
        email=email,
        phone=phone,
        address=address
    )
    db.session.add(patient)
    db.session.commit()
    return jsonify({'id': patient.id, 'first_name': patient.first_name, 'last_name': patient.last_name, 'message': 'Patient created successfully'}), 201

@patients_bp.route('/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    return jsonify({
        'id': patient.id,
        'first_name': patient.first_name,
        'last_name': patient.last_name,
        'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d'),
        'email': patient.email,
        'phone': patient.phone,
        'address': patient.address,
        'created_at': patient.created_at.isoformat(),
        'appointments_count': len(patient.appointments)
    }), 200
    
@patients_bp.route('/<int:patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
    patient.first_name = data.get('first_name', patient.first_name)
    patient.last_name = data.get('last_name', patient.last_name)
    date_of_birth = data.get('date_of_birth')
    if date_of_birth:
        patient.date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d')
    patient.email = data.get('email', patient.email)
    patient.phone = data.get('phone', patient.phone)
    patient.address = data.get('address', patient.address)
    db.session.commit()
    return jsonify({'message': 'Patient updated successfully'}), 200

@patients_bp.route('/<int:patient_id>', methods=['DELETE'])
@jwt_required()
def delete_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    db.session.delete(patient)
    db.session.commit()
    return jsonify({'message': 'Patient deleted successfully'}), 200

@patients_bp.route('/search', methods=['GET'])
@jwt_required()
def search_patients():
    query = request.args.get('q', '', type=str)
    if not query:
        return jsonify({'message': 'Search query is required'}), 400
    patients = Patient.query.filter(
        (Patient.first_name.ilike(f'%{query}%')) | (Patient.last_name.ilike(f'%{query}%'))).all()
    return jsonify({
        # 'patients': [patient.to_dict() for patient in patients]
        'patients': [{
            'id': patient.id,
            'first_name': patient.first_name,
            'last_name': patient.last_name,
            'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d'),
            'email': patient.email
        } for patient in patients]
    }), 200