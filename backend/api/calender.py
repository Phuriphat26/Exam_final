from flask import Flask, request, jsonify, Blueprint, session, make_response
from flask_cors import CORS
import secrets 
import math
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from datetime import datetime, date, timedelta # 💡 [เพิ่ม] timedelta
import os
import traceback 

# --- 1. Blueprint Setup ---
calender_bp = Blueprint('calender', __name__, url_prefix='/calender')

CORS(calender_bp, 
     origins=["http://localhost:5173"], 
     supports_credentials=True,       
     methods=["GET", "POST", "PUT", "OPTIONS"] 
)

# --- 2. Database Connection ---
client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client['mydatabase']
users_collection = db['users']

try:
    client.admin.command('ping')
    print("✅ MongoDB connection successful.")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    
db = client.get_database(os.getenv("MONGO_DB_NAME", "mydatabase"))
subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]

# --- 3. Helper Functions (เหมือนเดิม) ---

def time_to_minutes(time_str):
    try:
        hours, minutes = map(int, time_str.split(':'))
        return (hours * 60) + minutes
    except Exception as e:
        print(f"Error parsing time: {time_str}, {e}")
        return 0

def minutes_to_time(total_minutes):
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"

def generate_weighted_schedule(subjects, study_slots):
    # (Logic นี้จะถูกใช้ตอน 'add_exam_plan' แต่ไม่ใช้ตอน 'reschedule' แล้ว)
    if not subjects or not study_slots:
        return []
    total_priority = sum(s.get('priority', 1) for s in subjects)
    if total_priority == 0:
        return [{**slot, 'subject': 'Free Slot'} for slot in study_slots]
    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    subject_allocation = {}
    allocated_count = 0
    sorted_subjects = sorted(subjects, key=lambda s: s.get('priority', 1), reverse=True)
    for s in sorted_subjects:
        count = math.floor(s.get('priority', 1) * slots_per_point)
        subject_allocation[s['name']] = count
        allocated_count += count
    remainder = total_slots - allocated_count
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


# --- 4. Routes (Get, Add, Progress - เหมือนเดิม) ---

@calender_bp.route("/api/subjects/", methods=["GET"])
def get_user_subjects():
    # (โค้ดเดิม)
    if "user_id" not in session:
         return jsonify({"message": "กรุณา login ก่อน"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        cursor = subjects_collection.find({"user_id": user_id})
        subjects_list = [
            {"_id": str(doc["_id"]), "title": doc.get("title", "ไม่มีชื่อวิชา"), "priority": doc.get("priority", 1)}
            for doc in cursor
        ]
        return jsonify(subjects_list), 200
    except Exception as e:
        print(f"[ERROR] get_user_subjects: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการดึงข้อมูลวิชา", "error": str(e)}), 500

@calender_bp.route("/api/exam-plan/", methods=["POST"])
def add_exam_plan():
    # (โค้ดเดิม - ที่มีการเพิ่ม slot_id และ status)
    if "user_id" not in session:
         return jsonify({"message": "กรุณา login ก่อน"}), 401
    try:
        data = request.json
        # ... (Validations) ...
        required_fields = ["examTitle", "examDate", "studyPlan", "examSubjects"]
        # ... (Validations) ...
        study_plan_slots_raw = data["studyPlan"] 
        # ... (Logic ซอยย่อยเวลา) ...
        available_time_slots = [] 
        slot_duration = 60 
        for day in study_plan_slots_raw:
            current_slot_start = time_to_minutes(day['startTime'])
            day_end = time_to_minutes(day['endTime'])
            while current_slot_start < day_end and (current_slot_start + slot_duration) <= day_end:
                available_time_slots.append({
                    'date': day['date'],
                    'startTime': minutes_to_time(current_slot_start),
                    'endTime': minutes_to_time(current_slot_start + slot_duration),
                })
                current_slot_start += slot_duration
        if not available_time_slots:
             return jsonify({"message": "ช่วงเวลาที่เลือกไม่เพียงพอ (ขั้นต่ำ 1 ชั่วโมง)"}), 400
        
        exam_subjects = data["examSubjects"]
        scheduled_plan = generate_weighted_schedule(exam_subjects, available_time_slots)
        
        final_schedule_with_ids = []
        for i, slot in enumerate(scheduled_plan):
            final_schedule_with_ids.append({
                **slot,
                "slot_id": f"slot_{secrets.token_hex(8)}", 
                "status": "pending" 
            })
        user_id = session["user_id"]
        new_plan = {
            "user_id": ObjectId(user_id),
            "exam_title": data["examTitle"],
            "subjects": exam_subjects, 
            "exam_date": data["examDate"],
            "study_plan_raw": study_plan_slots_raw, 
            "generated_schedule": final_schedule_with_ids,
            "createdAt": datetime.utcnow(),
            "status": "active"
        }
        result = exam_plans_collection.insert_one(new_plan)
        return jsonify({
            "message": "บันทึกและจัดตารางเรียนเรียบร้อยแล้ว",
            "plan_id": str(result.inserted_id),
            "generatedSchedule": final_schedule_with_ids
        }), 201
    except Exception as e:
        print(f"[ERROR] add_exam_plan: {e}\n{traceback.format_exc()}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการบันทึกแผน", "error": str(e)}), 500

@calender_bp.route("/api/exam-plans/", methods=["GET"])
def get_exam_plans():
    # (โค้ดเดิม)
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        plans_cursor = exam_plans_collection.find({"user_id": user_id}).sort("createdAt", -1)
        plans = list(plans_cursor)
        for plan in plans:
            plan["_id"] = str(plan["_id"])
            plan["user_id"] = str(plan["user_id"])
            if "generated_schedule" in plan:
                plan["study_plan"] = plan["generated_schedule"]
        return jsonify(plans), 200
    except Exception as e:
        print(f"[ERROR] get_exam_plans: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาด"}), 500
    
@calender_bp.route("/api/exam-plan/<plan_id>", methods=["GET"])
def get_single_exam_plan(plan_id):
    # (โค้ดเดิม)
    if "user_id" not in session:
         return jsonify({"message": "กรุณา login ก่อน"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        plan = exam_plans_collection.find_one({"_id": ObjectId(plan_id), "user_id": user_id})
        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        if "generated_schedule" in plan:
            plan["study_plan"] = plan["generated_schedule"]
        return jsonify(plan), 200
    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] get_single_exam_plan: {e}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการดึงข้อมูล"}), 500

@calender_bp.route("/api/exam-plan/<plan_id>/progress", methods=["PUT", "OPTIONS"])
def update_plan_progress(plan_id):
    # (โค้ดเดิม)
    if request.method == 'OPTIONS':
        return make_response(jsonify({"message": "CORS preflight OK"}), 200)
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        updated_chapters = data.get('chapters') 
        if not isinstance(updated_chapters, list):
            return jsonify({"message": "ไม่พบข้อมูล 'chapters' ที่ส่งมา"}), 400
        result = exam_plans_collection.update_one(
            {"_id": ObjectId(plan_id), "user_id": user_id},
            {"$set": {"generated_schedule": updated_chapters}}
        )
        if result.matched_count == 0:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        return jsonify({"message": "บันทึกความคืบหน้าเรียบร้อย"}), 200
    except InvalidId:
        return jsonify({"message": "ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"[ERROR] update_plan_progress: {e}\n{traceback.format_exc()}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการบันทึก"}), 500

# --- 5. 💡 [แทนที่ด้วย LOGIC ใหม่] ---
@calender_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST", "OPTIONS"])
def reschedule_plan(plan_id):

    # 1. อนุญาต OPTIONS ก่อนเช็ค Login
    if request.method == 'OPTIONS':
        return make_response(jsonify({"message": "CORS preflight OK"}), 200)

    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        date_to_postpone_str = data.get('date').split('T')[0] 
        
        # 2. Fetch แผนปัจจุบัน
        plan = exam_plans_collection.find_one({
            "_id": ObjectId(plan_id), 
            "user_id": user_id
        })
        if not plan:
            return jsonify({"message": "ไม่พบแผนการสอบนี้"}), 404
        
        current_schedule = plan.get('generated_schedule', [])
        exam_subjects_raw = plan.get('subjects', []) # รายชื่อวิชาและความสำคัญเดิม
        study_plan_raw = plan.get('study_plan_raw', []) # ตารางว่างต้นฉบับ
        exam_date_str = plan.get('exam_date')

        # 3. 💡 [Logic ใหม่] - ปั๊มตรา "postponed" ให้อันที่โดนเลื่อน 
        
        # (เรายังคงต้องปั๊มตรา postponed ไว้ เพื่อแยกแยะงานที่ 'เคย' ถูกจัดตารางแล้วแต่เลื่อน)
        
        schedule_after_postpone = []
        has_postponed_anything = False
        for slot in current_schedule:
            slot_date_str = slot.get('date', '').split('T')[0]
            if slot_date_str == date_to_postpone_str and slot.get('status') == 'pending':
                slot['status'] = 'postponed' 
                has_postponed_anything = True
            schedule_after_postpone.append(slot)
        
        if not has_postponed_anything:
            print(f"[INFO] No pending tasks to postpone for {date_to_postpone_str}")
            return jsonify({"message": "ไม่มีงานที่ยังไม่อ่านในวันนี้ให้เลื่อน"}), 200

        # 4. 💡 [Logic ใหม่] - รวบรวมข้อมูลสำหรับคำนวณใหม่
        
        # 4.1 รวบรวมวัน/เวลาว่างที่เหลือ
        today = datetime.now().date()
        available_slots_for_reschedule = [] 

        # หาวันสอบ (Deadline)
        exam_date_obj = datetime.fromisoformat(exam_date_str.replace('Z', '+00:00')).date()
        
        # รวบรวมวันที่ว่างทั้งหมดที่ยังไม่ถึงวันสอบ (จาก study_plan_raw)
        for day in study_plan_raw:
            try:
                # แปลงวันที่เริ่มต้นของวันว่าง (ใน study_plan_raw) เป็น object date
                slot_date_obj = datetime.fromisoformat(day['date'].replace('Z', '+00:00')).date()
                
                # ถ้าวันว่างนั้นยังไม่ถึงวันนี้ (today) และยังไม่ชนวันสอบ
                if slot_date_obj >= today and slot_date_obj < exam_date_obj:
                    # Logic ซอยย่อยเวลาเดิม (เอา Slot 60 นาที)
                    slot_duration = 60
                    current_slot_start = time_to_minutes(day['startTime'])
                    day_end = time_to_minutes(day['endTime'])
                    
                    while current_slot_start < day_end and (current_slot_start + slot_duration) <= day_end:
                        # ใช้ date/time จาก study_plan_raw เป็นวันว่าง
                        available_slots_for_reschedule.append({
                            'date': day['date'], 
                            'startTime': minutes_to_time(current_slot_start),
                            'endTime': minutes_to_time(current_slot_start + slot_duration),
                        })
                        current_slot_start += slot_duration
            except Exception as e:
                print(f"Error processing study_plan_raw slot: {e}")
                continue
        
        if not available_slots_for_reschedule:
            return jsonify({"message": "ไม่สามารถจัดตารางใหม่ได้: ไม่มีวันที่ว่างเหลืออยู่ก่อนวันสอบ"}), 400

        # 5. 💡 [Logic ใหม่] - จัดตารางใหม่ทั้งหมดสำหรับงานที่ยังไม่เสร็จ (pending/postponed)
        
        # 5.1 คัดกรองงานที่ทำเสร็จแล้ว
        completed_slots = [
            slot for slot in schedule_after_postpone 
            if slot.get('status') == 'completed'
        ]
        
        # 5.2 คำนวณตารางใหม่สำหรับงานที่ยังไม่เสร็จ
        # เราใช้ generate_weighted_schedule() กับวิชาเดิม (เพราะความสำคัญอาจเปลี่ยนยาก)
        # แต่ถ้าคุณต้องการเปลี่ยนความสำคัญ ให้แก้ไข 'subjects' ก่อนส่งเข้าฟังก์ชัน
        newly_generated_schedule = generate_weighted_schedule(
            exam_subjects_raw, 
            available_slots_for_reschedule
        )

        # 5.3 เพิ่ม slot_id และ status ให้กับตารางที่เพิ่งสร้างใหม่
        final_new_slots_with_ids = []
        for slot in newly_generated_schedule:
            final_new_slots_with_ids.append({
                **slot,
                "slot_id": f"slot_{secrets.token_hex(8)}", 
                "status": "pending" 
            })

        # 6. 💡 [Logic ใหม่] - รวมตาราง: งานที่เสร็จแล้ว + งานที่สร้างใหม่
        
        # งานที่เสร็จแล้ว (completed) จะยังอยู่
        # งานที่เลื่อน (postponed) จะถูกทิ้งไป เพราะเราจัดใหม่หมดแล้ว
        # เราจะนำงานที่ทำเสร็จแล้ว (completed_slots) มาใส่ใน DB เพื่อให้มันถูกบันทึกไว้
        
        final_schedule_to_save = completed_slots + final_new_slots_with_ids

        # 7. บันทึกตารางใหม่ลง DB
        result = exam_plans_collection.update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"generated_schedule": final_schedule_to_save}}
        )

        print("[SUCCESS] Full Reschedule and recalculation complete.")
        return jsonify({"message": "เลื่อนและจัดตารางใหม่ทั้งหมดเรียบร้อยแล้ว"}), 200

    except Exception as e:
        print(f"[ERROR] reschedule_plan (Full Recalculation): {e}\n{traceback.format_exc()}")
        return jsonify({"message": "เกิดข้อผิดพลาดในการเลื่อนและคำนวณตารางใหม่"}), 500