from flask import Blueprint, request, jsonify
from pymongo import MongoClient

register_bp = Blueprint('register', __name__, url_prefix='/register')

client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
users_collection = db['users']

@register_bp.route('/', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if users_collection.find_one({'email': email}):
        return jsonify({'message': 'อีเมลนี้มีอยู่แล้ว'}), 400

    users_collection.insert_one({
        'username': username,
        'email': email,
        'password': password  
    })

    return jsonify({'message': 'สมัครสมาชิกสำเร็จ'}), 200
