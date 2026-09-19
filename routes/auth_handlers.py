# auth_handlers.py
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

def register():
    """Handle user registration – expects JSON with email and password."""
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email:
        return jsonify({'message': 'Email is required'}), 400
    if not password:
        return jsonify({'message': 'Password is required'}), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'A user with this email already exists'}), 409

    hashed_password = generate_password_hash(password)
    user = User(email=email, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User registered successfully',
        'user': {'id': user.id, 'email': user.email}
    }), 201


def login():
    """Handle user login – expects JSON with email and password."""
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {'id': user.id, 'email': user.email}
    }), 200


@jwt_required()
def protected():
    """Example protected endpoint – returns current user info."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({
        'id': user.id,
        'email': user.email
    }), 200