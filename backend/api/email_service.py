from flask_mail import Mail, Message
from datetime import datetime

# 1. สร้าง Instance ของ Mail ไว้ก่อน โดยยังไม่ผูกกับ app
mail = Mail()

def send_notification_email(subject, recipient_email):
    """
    ฟังก์ชันสำหรับส่งอีเมลแจ้งเตือน
    ฟังก์ชันนี้จะถูกเรียกจาก app.py
    """
    try:
        msg = Message(
            subject=f"🔔 แจ้งเตือน: ได้เวลาอ่าน {subject} แล้ว!",
            recipients=[recipient_email],
            body=f"สวัสดี,\n\nถึงเวลา ( {datetime.now().strftime('%H:%M')} น.) ที่คุณตั้งไว้เพื่ออ่านวิชา {subject} แล้ว เริ่มกันเลย!"
        )
        
        # mail.send() จะทำงานได้ เพราะเราจะเรียก mail.init_app(app) ใน app.py
        mail.send(msg)
        print(f"ส่งอีเมลแจ้งเตือนสำหรับวิชา {subject} ไปยัง {recipient_email} สำเร็จ")
    
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการส่งอีเมล: {e}")