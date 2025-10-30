import os
from flask import Blueprint, jsonify
from pymongo import MongoClient
# import [datetime, date, time] จาก [datetime]
from datetime import datetime, date, time
from bson.objectid import ObjectId, InvalidId 

# --- 1. เชื่อมต่อ MongoDB (ใช้ localhost ตามที่เคยคุยกัน) ---
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['mydatabase'] # <-- [สำคัญ] แก้ชื่อ DB ของคุณตรงนี้
    
    # ดึง collections
    subjects_collection = db["subject"]
    exam_plans_collection = db["exam_plans"]
    
    client.admin.command('ping')
    print("เชื่อมต่อ MongoDB (localhost) สำเร็จ!")
except Exception as e:
    print(f"เกิดข้อผิดพลาดในการเชื่อมต่อ MongoDB (localhost): {e}")
    raise
# --------------------------

# --- 2. สร้าง Blueprint ---
# (Frontend เรียก /home_bp/...)
home_bp = Blueprint('home_bp', __name__, url_prefix='/home_bp')

# --- 3. [API 1] ดึง "รายชื่อ" แผน ---
# Frontend เรียก: GET /home_bp/plans
@home_bp.route('/plans', methods=['GET'])
def get_all_plans():
    """
    ส่งรายชื่อแผนทั้งหมดที่มีให้ Frontend
    (สำหรับใส่ใน Dropdown)
    """
    try:
        # ค้นหาทุกแผน, แต่เอามาแค่ _id และ exam_title
        plans_cursor = exam_plans_collection.find(
            {}, 
            {"_id": 1, "exam_title": 1} 
        )
        
        plan_list = []
        for plan in plans_cursor:
            plan_list.append({
                "_id": str(plan["_id"]),
                # (Frontend คาดหวัง field นี้)
                "exam_title": plan.get("exam_title", "แผนไม่มีชื่อ") 
            })
            
        return jsonify(plan_list)
    
    except Exception as e:
        print(f"เกิดข้อผิดพลาดใน /plans: {e}")
        return jsonify({"error": str(e)}), 500


# --- 4. [API 2] ดึง "ข้อมูลสรุป" ของแผนที่เลือก ---
# Frontend เรียก: GET /home_bp/study_summary/<plan_id>
@home_bp.route('/study_summary/<plan_id>')
def get_study_summary_by_id(plan_id):
    """
    ส่งข้อมูลสรุป (Dashboard) ของแผนที่ระบุ (plan_id)
    """
    try:
        # 1. ค้นหาแผนที่เลือก
        active_plan = exam_plans_collection.find_one(
            {"_id": ObjectId(plan_id)}
        )

        if not active_plan:
            return jsonify({"error": "ไม่พบแผนที่ระบุ"}), 404

        # 2. ดึง study_plan (array) จากแผนนั้น
        study_plan = active_plan.get("study_plan", [])
        
        # 3. นับจำนวนวิชาทั้งหมด (จาก collection 'subject')
        # (Frontend คาดหวัง 'subject_count')
        total_subjects = subjects_collection.count_documents({})

        # --- 4. ประมวลผลข้อมูล ---
        today = date.today()
        days_read = 0
        days_remaining = 0
        today_study = None
        total_duration_minutes = 0

        for item in study_plan:
            # (ส่วนนับ วันที่อ่าน/เหลือ/วันนี้)
            item_date_str = item.get("date")
            if item_date_str:
                try:
                    item_date = datetime.strptime(item_date_str, '%Y-%m-%d').date()
                    if item_date < today:
                        days_read += 1
                    elif item_date > today:
                        days_remaining += 1
                    else: # วันนี้
                        days_remaining += 1 # นับวันนี้เป็นวันที่เหลือ
                        today_study = {
                            "subject": item.get("subject", "N/A"),
                            "time": item.get("startTime", "N/A")
                        }
                except ValueError:
                    print(f"ข้ามวันที่ผิดรูปแบบ: {item_date_str}")
            
            # (ส่วนคำนวณเวลารวมของแผน)
            start_time_str = item.get("startTime")
            end_time_str = item.get("endTime")

            if start_time_str and end_time_str:
                try:
                    start_t = datetime.strptime(start_time_str, '%H:%M').time()
                    end_t = datetime.strptime(end_time_str, '%H:%M').time()
                    
                    # ใช้วันที่ dummy เพื่อคำนวณ timedelta
                    duration = datetime.combine(date.min, end_t) - datetime.combine(date.min, start_t)
                    
                    total_duration_minutes += duration.total_seconds() / 60
                except ValueError:
                    print(f"ข้ามเวลาผิดรูปแบบ: {start_time_str} or {end_time_str}")
                    continue

        # 5. สร้าง object ที่จะส่งกลับ (ต้องตรงกับที่ Frontend คาดหวัง)
        summary = {
            "days_read": days_read,
            "days_remaining": days_remaining,
            "subject_count": total_subjects,
            "today_study": today_study,
            "total_duration_minutes": total_duration_minutes 
        }
        return jsonify(summary)

    except InvalidId:
        return jsonify({"error": "รูปแบบ ID ของแผนไม่ถูกต้อง"}), 400
    except Exception as e:
        print(f"เกิดข้อผิดพลาดใน /study_summary/<plan_id>: {e}")
        return jsonify({"error": str(e)}), 500

