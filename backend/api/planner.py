from flask import Blueprint, jsonify, session, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from datetime import datetime
import os
import math
import uuid  # 1. Import เพิ่ม
from collections import Counter # 2. Import เพิ่ม


def generate_weighted_schedule(subjects, study_slots):
    if not subjects or not study_slots:
        return []

    total_priority = sum(s.get('priority', 1) for s in subjects)
    if total_priority == 0:
        # ถ้าไม่มี priority เลย ให้เป็น Free Slot ทั้งหมด
        return [
            slot | {
                'subject': 'Free Slot',
                'status': 'pending',
                'slot_id': str(uuid.uuid4())
            }
            for slot in study_slots
        ]

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
            'subject': subject_to_schedule['name'],
            'status': 'pending',
            'slot_id': str(uuid.uuid4())
        })
        
        allocation_counts[subject_to_schedule['name']] -= 1
        
        if allocation_counts[subject_to_schedule['name']] == 0:
            available_subjects = [s for s in available_subjects if s['name'] != subject_to_schedule['name']]
            
    remaining_slots = total_slots - len(final_schedule)
    for i in range(remaining_slots):
        slot_index = len(final_schedule)
        final_schedule.append({
            **study_slots[slot_index],
            'subject': 'Free Slot',
            'status': 'pending',
            'slot_id': str(uuid.uuid4())
        })
        
    return final_schedule


# --- Setup Blueprint และ Database ---
planner_bp = Blueprint("planner_bp", __name__)
CORS(planner_bp, supports_credentials=True)

client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client["mydatabase"]
subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]


# --- (แก้ไข) Endpoint /api/subjects/ ---
@planner_bp.route("/api/subjects/", methods=["GET"])
def get_user_subjects():
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        cursor = subjects_collection.find({"user_id": user_id})
        subjects_list = []
        
        for doc in cursor:
            # --- (นี่คือส่วนที่แก้ไข) ---
            final_topics = []
            
            # 1. ตรวจสอบฟิลด์ 'topics' ที่กำหนดเองก่อน
            custom_topics = doc.get("topics", [])
            if custom_topics: # ถ้ามีข้อมูล (ไม่ใช่ Array ว่าง)
                final_topics = custom_topics
            else:
                # 2. ถ้าไม่มี 'topics' ให้ลองสร้างจากฟิลด์ 'subject' (เช่น "5")
                try:
                    # ดึงค่า "5" และแปลงเป็นตัวเลข
                    chapter_count_str = doc.get("subject", "0")
                    chapter_count = int(chapter_count_str)
                    
                    if chapter_count > 0:
                        # สร้าง List ["บทที่ 1", "บทที่ 2", ..., "บทที่ 5"]
                        final_topics = [f"บทที่ {i+1}" for i in range(chapter_count)]
                    
                except (ValueError, TypeError):
                    # ถ้าฟิลด์ 'subject' ไม่ใช่ตัวเลข (เช่น "Math") ก็ไม่ต้องทำอะไร
                    final_topics = [] 
            # --- (สิ้นสุดส่วนที่แก้ไข) ---

            subjects_list.append({
                "_id": str(doc["_id"]),
                "title": doc.get("title", "ไม่มีชื่อวิชา"),
                "priority": doc.get("priority", 1),
                "topics": final_topics # ใช้ค่า topics ที่เราประมวลผลแล้ว
            })
            
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
        
        plan = exam_plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })

        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        
        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        
        return jsonify(plan), 200
    
    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] get_single_exam_plan: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการดึงข้อมูล"}), 500


@planner_bp.route("/api/exam-plan/<plan_id>/slot/<slot_id>", methods=["PUT"])
def update_slot_status(plan_id, slot_id):
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        new_status = data.get("status")

        if new_status not in ['completed', 'pending']:
            return jsonify({"message": "สถานะไม่ถูกต้อง"}), 400

        result = exam_plans_collection.update_one(
            {
                "_id": ObjectId(plan_id),
                "user_id": user_id,
                "study_plan.slot_id": slot_id
            },
            {
                "$set": { "study_plan.$.status": new_status }
            }
        )

        if result.matched_count == 0:
            return jsonify({"message": "ไม่พบแผนการสอบ หรือ slot_id"}), 404
        
        return jsonify({"message": f"อัปเดตสถานะเป็น {new_status} สำเร็จ"}), 200

    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] update_slot_status: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการอัปเดต"}), 500


@planner_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST"])
def reschedule_plan(plan_id):
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        postpone_date = data.get("date")

        if not postpone_date:
            return jsonify({"message": "กรุณาระบุวันที่ต้องการเลื่อน (date)"}), 400

        plan = exam_plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })
        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        
        completed_slots = []
        pending_slots = []
        
        for slot in plan.get("study_plan", []):
            if slot.get("status") == "completed":
                completed_slots.append(slot)
            else:
                pending_slots.append(slot)

        pending_subject_counts = Counter(
            s['subject'] for s in pending_slots if s['subject'] != 'Free Slot'
        )
        
        new_subject_priorities = [
            {"name": subject, "priority": count} 
            for subject, count in pending_subject_counts.items()
        ]

        new_available_slots = [
            slot for slot in pending_slots if slot.get("date") != postpone_date
        ]
        
        print(f"[INFO] Rescheduling. Subjects: {len(new_subject_priorities)}, Slots: {len(new_available_slots)}")
        if not new_available_slots and new_subject_priorities:
             return jsonify({"message": "ไม่เหลือวันให้จัดตารางใหม่ (ช่องว่างเต็ม)"}), 400
            
        regenerated_plan = generate_weighted_schedule(
            new_subject_priorities, 
            new_available_slots
        )
        
        final_new_study_plan = completed_slots + regenerated_plan
        
        exam_plans_collection.update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"study_plan": final_new_study_plan}}
        )
        
        return jsonify({
            "message": "จัดตารางใหม่เรียบร้อยแล้ว",
            "new_plan_length": len(final_new_study_plan)
        }), 200

    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] reschedule_plan: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการจัดตารางใหม่"}), 500
    
@planner_bp.route("/api/exam-plan/<plan_id>/progress", methods=["PUT"])
def update_plan_progress(plan_id):
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        # 'chapters' คือ Array ที่ React ส่งมา (ซึ่งจริงๆ คือ study_plan ที่อัปเดตแล้ว)
        chapters_to_update = data.get("chapters") 

        if not isinstance(chapters_to_update, list):
            return jsonify({"message": "ข้อมูล 'chapters' ไม่ถูกต้อง"}), 400

        plan = exam_plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })

        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบ"}), 404
        
        # สร้าง lookup map (dict) จากสถานะใหม่ที่ React ส่งมา
        # key คือ slot_id, value คือ status
        status_map = {
            slot['slot_id']: slot['status'] 
            for slot in chapters_to_update 
            if 'slot_id' in slot and 'status' in slot
        }
        
        original_study_plan = plan.get("study_plan", [])
        new_study_plan = []
        updated_count = 0

        # วนลูปที่ plan เดิมใน DB เพื่อป้องกันข้อมูลเพี้ยน
        for slot in original_study_plan:
            slot_id = slot.get("slot_id")
            
            # ถ้า slot_id นี้ อยู่ใน map ที่ React ส่งมา
            if slot_id in status_map:
                new_status = status_map[slot_id]
                # ถ้าสถานะไม่ตรงกัน ให้อัปเดต
                if slot['status'] != new_status:
                    slot['status'] = new_status
                    updated_count += 1
            
            new_study_plan.append(slot) # เพิ่ม slot (ที่อัปเดตแล้ว หรือ ไม่ได้อัปเดต) กลับเข้าไป

        # บันทึก study_plan ที่อัปเดตแล้วทั้งก้อนกลับลง DB
        exam_plans_collection.update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"study_plan": new_study_plan}}
        )

        return jsonify({
            "message": f"บันทึกความคืบหน้าสำเร็จ (อัปเดต {updated_count} รายการ)"
        }), 200

    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] update_plan_progress: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการบันทึก"}), 500