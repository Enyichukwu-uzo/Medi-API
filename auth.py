from flask import request, jsonify
from models import db, User
from werkzeug.security import (generate_password_hash, check_password_hash)
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
def register():
    data = request.get_json()
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already exists"}), 400
    user = User(username=data["username"],
        password_hash=generate_password_hash(data["password"]), role=data.get("role", "user"))
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully"}), 201
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data["username"]).first()
    if not user or not check_password_hash(user.password_hash, data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    return jsonify({"access_token": access_token, "user": {"id": user.id, "username": user.username, "role": user.role}}), 200

@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return jsonify({'user_id': current_user_id,'username': user.username,'role': user.role}), 200