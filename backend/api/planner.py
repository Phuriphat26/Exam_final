from flask import Blueprint, jsonify, session, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from datetime import datetime
import os
import math


def generate_weighted_schedule(subjects, study_slots):
    if not subjects or not study_slots:
        return []

    total_priority = sum(s.get('priority', 1) for s in subjects)
    if total_priority == 0:
        return [slot | {'subject': 'Free Slot'} for slot in study_slots]

    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    
    subject_allocation = {}
    allocated_count = 0
    for s in subjects:
        count = math.floor(s['priority'] * slots_per_point)
        subject_allocation[s['name']] = count
        allocated_count += count

    remainder = total_slots - allocated_count
    sorted_subjects = sorted(subjects, key=lambda s: s['priority'], reverse=True)
    
    idx = 0
    while remainder > 0:
        subject_to_add = sorted_subjects[idx % len(sorted_subjects)]
        subject_allocation[subject_to_add['name']] += 1
        remainder -= 1
        idx += 1
        
    final_schedule = []
    allocation_counts = subject_allocation.copy()
    
    available_subjects = [s for s in sorted_subjects if allocation_counts.get(s['name'], 0) > 0]

    for i in range(total_slots):
        if not available_subjects:
            break
        
        subject_to_schedule = available_subjects[i % len(available_subjects)]
        
        final_schedule.append({
            **study_slots[i],
            'subject': subject_to_schedule['name']
        })
        
        allocation_counts[subject_to_schedule['name']] -= 1
        
        if allocation_counts[subject_to_schedule['name']] == 0:
            available_subjects = [s for s in available_subjects if s['name'] != subject_to_schedule['name']]
            
    return final_schedule


planner_bp = Blueprint("planner_bp", __name__)
CORS(planner_bp, supports_credentials=True)


client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client["mydatabase"]
subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]


@planner_bp.route("/api/subjects/", methods=["GET"])
def get_user_subjects():
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        cursor = subjects_collection.find({"user_id": user_id})
        subjects_list = [
            {
                "_id": str(doc["_id"]),
                "title": doc.get("title", "ไม่มีชื่อวิชา"),
                "priority": doc.get("priority", 1)
            }
            for doc in cursor
        ]
        return jsonify(subjects_list), 200
    except Exception as e:
        print(f"[ERROR] get_user_subjects: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการดึงข้อมูลวิชา", "error": str(e)}), 500


@planner_bp.route("/api/exam-plan/", methods=["POST"])
def add_exam_plan():
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        data = request.json
        print(f"[INFO] Received data: {data}")

        required_fields = ["examTitle", "examDate", "studyPlan", "examSubjects"]
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({"message": f"ข้อมูลไม่ครบถ้วน: ขาด {', '.join(missing_fields)}"}), 400

        exam_subjects = data["examSubjects"]

        if not isinstance(exam_subjects, list) or not exam_subjects:
            return jsonify({"message": "กรุณาระบุวิชาที่สอบอย่างน้อย 1 วิชา"}), 400

        for subject in exam_subjects:
            if not isinstance(subject, dict) or 'name' not in subject or 'priority' not in subject:
                return jsonify({"message": "โครงสร้างข้อมูลวิชาไม่ถูกต้อง"}), 400

        study_plan_slots = data["studyPlan"]
        if not isinstance(study_plan_slots, list) or not study_plan_slots:
            return jsonify({"message": "กรุณาระบุวันเตรียมตัวสอบอย่างน้อย 1 วัน"}), 400

        print("[INFO] Generating weighted schedule...")
        scheduled_plan = generate_weighted_schedule(exam_subjects, study_plan_slots)
        print(f"[SUCCESS] Schedule generated with {len(scheduled_plan)} slots.")

        user_id = session["user_id"]
        
        new_plan = {
            "user_id": ObjectId(user_id),
            "exam_title": data["examTitle"],
            "subjects": exam_subjects,
            "exam_date": data["examDate"],
            "study_plan": scheduled_plan,
            "createdAt": datetime.utcnow(),
            "status": "active"
        }

        print(f"[INFO] Inserting new plan for user {user_id}")
        result = exam_plans_collection.insert_one(new_plan)
        print(f"[SUCCESS] Plan saved with ID: {result.inserted_id}")
        
        return jsonify({
            "message": "บันทึกและจัดตารางเรียนเรียบร้อยแล้ว",
            "plan_id": str(result.inserted_id),
        }), 201

    except Exception as e:
        import traceback
        print(f"[ERROR] add_exam_plan: {e}\n{traceback.format_exc()}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการบันทึกแผน", "error": str(e)}), 500


@planner_bp.route("/api/exam-plans/", methods=["GET"])
def get_exam_plans():

    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plans = list(exam_plans_collection.find({"user_id": user_id}).sort("createdAt", -1))
        
        for plan in plans:
            plan["_id"] = str(plan["_id"])
            plan["user_id"] = str(plan["user_id"])
        
        return jsonify(plans), 200
    
    except Exception as e:
        print(f"[ERROR] get_exam_plans: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาด"}), 500
    
@planner_bp.route("/api/exam-plan/<plan_id>", methods=["GET"])
def get_single_exam_plan(plan_id):

    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        
        # Search for the plan by both _id and user_id for security
        plan = exam_plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })

        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        
        # Convert ObjectId to string for JSON serialization
        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        
        return jsonify(plan), 200
    
    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] get_single_exam_plan: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการดึงข้อมูล"}), 500