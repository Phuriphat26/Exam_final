from flask import Blueprint, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import traceback

subject_bp = Blueprint("subject_bp", __name__, url_prefix='/subject')

CORS(subject_bp, supports_credentials=True)

client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
courses_collection = db["subject"]

# =========================================================================
# 1. ROUTE: GET /subject/ to fetch all subjects for the logged-in user
# (No changes needed, this section is correct)
# =========================================================================
@subject_bp.route("/", methods=["GET"])
def get_all_courses():
    try:
        # 1. Check for user session (Authentication)
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        user_id = session["user_id"]
        
        # 2. Query MongoDB for subjects belonging to the current user
        user_obj_id = ObjectId(user_id)
        
        subjects_cursor = courses_collection.find(
            {"user_id": user_obj_id}
        ).sort("title", 1)
        
        # 3. Convert MongoDB cursor results to a list of dictionaries
        subjects_list = []
        for subject in subjects_cursor:
            # Convert ObjectId fields to string before sending as JSON
            subject['_id'] = str(subject['_id'])
            subject['user_id'] = str(subject['user_id'])
            
            subjects_list.append(subject)

        # 4. Return the list of subjects
        return jsonify(subjects_list), 200

    except Exception as e:
        print("An unexpected error occurred during GET:")
        print(traceback.format_exc())
        return jsonify({"message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาตรวจสอบ logs"}), 500

# =========================================================================
# 2. ROUTE: POST /subject/ to add new subjects
# (No changes needed, this section is correct)
# =========================================================================
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
        print("An unexpected error occurred during POST:")
        print(traceback.format_exc())
        return jsonify({"message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาตรวจสอบ logs"}), 500

# =========================================================================
# 3. NEW ROUTE: DELETE /subject/<subject_id> to delete a specific subject
# =========================================================================
@subject_bp.route("/<subject_id>", methods=["DELETE"])
def delete_course(subject_id):
    try:
        # 1. Check for user session (Authentication)
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        user_id = session["user_id"]
        
        # Validate ObjectId format
        try:
            subject_obj_id = ObjectId(subject_id)
            user_obj_id = ObjectId(user_id)
        except:
            return jsonify({"message": "รหัสวิชาไม่ถูกต้อง"}), 400

        # 2. Delete the subject, ensuring it belongs to the logged-in user
        result = courses_collection.delete_one({
            "_id": subject_obj_id,
            "user_id": user_obj_id
        })

        # 3. Check the result of the delete operation
        if result.deleted_count == 1:
            return jsonify({"message": "ลบรายวิชาสำเร็จ"}), 200
        else:
            # This handles cases where the ID is valid but belongs to another user (or doesn't exist)
            return jsonify({"message": "ไม่พบรายวิชาที่ต้องการลบ หรือคุณไม่มีสิทธิ์ลบรายการนี้"}), 404

    except Exception as e:
        print("An unexpected error occurred during DELETE:")
        print(traceback.format_exc())
        return jsonify({"message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาตรวจสอบ logs"}), 500
    
# =========================================================================
# 4. NEW ROUTE: PUT /subject/<subject_id> to update a specific subject
# =========================================================================
@subject_bp.route("/<subject_id>", methods=["PUT"])
def update_course(subject_id):
    try:
        # 1. Check for user session (Authentication)
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        user_id = session["user_id"]
        
        # 2. Get data from JSON request
        data = request.json
        if not data:
            return jsonify({"message": "ไม่พบข้อมูล JSON ที่ส่งมา"}), 400

        # 3. Validate required fields
        required_fields = ["title", "subject", "credits", "priority"]
        if not all(field in data for field in required_fields):
            return jsonify({"message": "กรอกข้อมูลให้ครบ"}), 400

        # 4. Validate data types and values
        try:
            priority = int(data["priority"])
            credits = int(data["credits"])
            if not (1 <= priority <= 3):
                return jsonify({"message": "priority ต้องอยู่ระหว่าง 1 ถึง 3"}), 400
            if credits < 0:
                 return jsonify({"message": "หน่วยกิตต้องเป็นค่าบวก"}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "priority หรือหน่วยกิตต้องเป็นตัวเลข"}), 400

        # 5. Validate ObjectIds
        try:
            subject_obj_id = ObjectId(subject_id)
            user_obj_id = ObjectId(user_id)
        except:
            return jsonify({"message": "รหัสวิชาไม่ถูกต้อง"}), 400

        # 6. Prepare the update
        update_data = {
            "title": data["title"],
            "subject": data["subject"],
            "credits": credits,
            "priority": priority
        }

        # 7. Find and update the document
        # This query ensures user can only update their *own* subjects
        result = courses_collection.update_one(
            {"_id": subject_obj_id, "user_id": user_obj_id},
            {"$set": update_data}
        )

        # 8. Check the result
        if result.matched_count == 1:
            if result.modified_count == 1:
                return jsonify({"message": "อัปเดตรายวิชาสำเร็จ"}), 200
            else:
                return jsonify({"message": "ข้อมูลที่ส่งมาเหมือนเดิม ไม่มีการเปลี่ยนแปลง"}), 200
        else:
            return jsonify({"message": "ไม่พบรายวิชาที่ต้องการแก้ไข หรือคุณไม่มีสิทธิ์แก้ไขรายการนี้"}), 404

    except Exception as e:
        print("An unexpected error occurred during PUT/UPDATE:")
        print(traceback.format_exc())
        return jsonify({"message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาตรวจสอบ logs"}), 500