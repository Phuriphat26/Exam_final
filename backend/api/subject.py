from flask import Blueprint, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import traceback

subject_bp = Blueprint("subject_bp", __name__,url_prefix='/subject')

CORS(subject_bp, supports_credentials=True)

client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
courses_collection = db["subject"]

@subject_bp.route("/", methods=["POST"])
def add_course():

    try:
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        data = request.json
        if not data:
            return jsonify({"message": "ไม่พบข้อมูล JSON ที่ส่งมา"}), 400
        

        if isinstance(data, list):
            courses_to_insert = []
            for course_data in data:

                required_fields = ["title", "subject", "credits", "priority"]
                if not all(field in course_data for field in required_fields):
                    return jsonify({"message": f"ข้อมูลไม่ครบถ้วนสำหรับวิชา: {course_data.get('title', 'N/A')}"}), 400

                try:
                    priority = int(course_data["priority"])
                    credits = int(course_data["credits"])
                    if not (1 <= priority <= 3):
                        return jsonify({"message": f"priority ของวิชา '{course_data['title']}' ต้องอยู่ระหว่าง 1 ถึง 3"}), 400
                    if credits < 0:
                         return jsonify({"message": f"หน่วยกิตของวิชา '{course_data['title']}' ต้องเป็นค่าบวก"}), 400
                except (ValueError, TypeError):
                    return jsonify({"message": f"Level หรือหน่วยกิตของวิชา '{course_data['title']}' ต้องเป็นตัวเลข"}), 400
                
                new_course = {
                    "user_id": ObjectId(session["user_id"]),
                    "title": course_data["title"],
                    "subject": course_data["subject"],
                    "credits": credits,
                    "priority": priority
                }
                courses_to_insert.append(new_course)
            

            if courses_to_insert:
                courses_collection.insert_many(courses_to_insert)
                return jsonify({"message": "บันทึกวิชาทั้งหมดเรียบร้อย"}), 201
            else:
                return jsonify({"message": "ไม่มีข้อมูลวิชาที่จะบันทึก"}), 400


        elif isinstance(data, dict):
            required_fields = ["title", "subject", "credits", "priority"]
            if not all(field in data for field in required_fields):
                return jsonify({"message": "กรอกข้อมูลให้ครบ"}), 400

            try:
                priority = int(data["priority"])
                credits = int(data["credits"])
                if not (1 <= priority <= 3):
                    return jsonify({"message": "priority ต้องอยู่ระหว่าง 1 ถึง 3"}), 400
                if credits < 0:
                    return jsonify({"message": "หน่วยกิตต้องเป็นค่าบวก"}), 400
            except (ValueError, TypeError):
                return jsonify({"message": "priority หรือหน่วยกิตต้องเป็นตัวเลข"}), 400

            courses_collection.insert_one({
                "user_id": ObjectId(session["user_id"]),
                "title": data["title"],
                "subject": data["subject"],
                "credits": credits,
                "priority": priority
            })
            return jsonify({"message": "บันทึกวิชาเรียบร้อย"}), 201

        else:
            return jsonify({"message": "รูปแบบข้อมูลไม่ถูกต้อง ต้องเป็น JSON object หรือ list"}), 400

    except Exception as e:

        print("An unexpected error occurred:")
        print(traceback.format_exc())

        return jsonify({"message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาตรวจสอบ logs"}), 500
