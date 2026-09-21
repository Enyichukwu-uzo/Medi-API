from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from models import db
from config import Config
from routes.patients import patients_bp
from routes.appointments import appointments_bp
from routes.auth import auth_bp
from routes.views import views_bp
from routes.stats import stats_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    JWTManager(app)
    CORS(app)
    app.register_blueprint(patients_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(views_bp)
    app.register_blueprint(stats_bp)
    with app.app_context():
        db.create_all()
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)