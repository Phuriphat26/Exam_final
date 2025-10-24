from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from pymongo import MongoClient

login_bp = Blueprint('login', __name__, url_prefix='/login')

client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
users_collection = db['users']

@login_bp.route('/', methods=['POST'])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = users_collection.find_one({'username': username})
    if user and user['password'] == password:
        session['user_id'] = str(user['_id'])
        session['username'] = user['username']
        return jsonify({'success': True})
    return jsonify({'success': False}), 401


@login_bp.route('/check', methods=['GET'])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def check_login():
    if 'user_id' in session:
        return jsonify({'logged_in': True, 'username': session.get['username']})
    return jsonify({'logged_in': False})
