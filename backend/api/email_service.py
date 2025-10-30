from flask_mail import Mail, Message
from datetime import datetime
import os
# 1. สร้าง Instance ของ Mail ไว้ก่อน โดยยังไม่ผูกกับ app
mail = Mail()

def send_notification_email(subject, recipient_email):
    """
    ฟังก์ชันสำหรับส่งอีเมลแจ้งเตือน (แบบสร้างแรงบันดาลใจ)
    """
    try:
        # (ดึงเวลาปัจจุบันมาแสดงผล)
        current_time_str = datetime.now().strftime('%H:%M')
        
        msg = Message(
            # --- Subject ---
            subject=f"ได้เวลาลุยวิชา {subject} แล้ว! 🚀", 
            sender=os.getenv('MAIL_DEFAULT_SENDER'),
            recipients=[recipient_email],
            # --- Body ---
            body=f"สวัสดีครับ,\n\n"
                 f"ตั้งสมาธิให้พร้อม! 🧠\n\n"
                 f"ถึงเวลา ( {current_time_str} น.) สำหรับวิชา {subject} ที่คุณตั้งเป้าไว้แล้ว\n\n"
                 f"ความพยายามในวันนี้ สร้างความสำเร็จในวันสอบนะครับ สู้ๆ!"
        )
        
        mail.send(msg)
        print(f"ส่งอีเมล (แบบสร้างแรงบันดาลใจ) สำหรับวิชา {subject} ไปยัง {recipient_email} สำเร็จ")
    
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการส่งอีเมล: {e}")






"""def send_notification_email(subject, recipient_email):
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
        print(f"เกิดข้อผิดพลาดในการส่งอีเมล: {e}")"""