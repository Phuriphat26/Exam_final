from datetime import datetime, time

class Scheduler:
    """คลาสสำหรับจัดการและตรวจสอบตารางเวลาว่าง"""

    def __init__(self):

        self.availability_rules = []

    def add_availability(self, day_of_week, start_time, end_time):

        rule = (day_of_week, start_time, end_time)
        self.availability_rules.append(rule)
        print(f"✅ เพิ่มกฎใหม่: {'ทุกวัน' if day_of_week is None else f'วันที่ {day_of_week}'} เวลา {start_time} - {end_time}")

    def is_available(self, check_datetime):

        check_day = check_datetime.weekday() 
        check_time = check_datetime.time()

   
        for day_rule, start_time, end_time in self.availability_rules:

            day_matches = (day_rule is None) or (day_rule == check_day)

            if day_matches:
 
                if start_time <= check_time < end_time:
                    return True 

        return False 


if __name__ == "__main__":

    my_scheduler = Scheduler()

    my_scheduler.add_availability(None, time(18, 0), time(20, 0))

    my_scheduler.add_availability(2, time(10, 0), time(12, 0))
    
    print("\n--- เริ่มการตรวจสอบ ---")

    time_to_check1 = datetime(2025, 10, 15, 19, 0)
    print(f"กำลังเช็ก {time_to_check1}: ว่างหรือไม่? 👉 {my_scheduler.is_available(time_to_check1)}")

    time_to_check2 = datetime(2025, 10, 15, 21, 0)
    print(f"กำลังเช็ก {time_to_check2}: ว่างหรือไม่? 👉 {my_scheduler.is_available(time_to_check2)}")

    time_to_check3 = datetime(2025, 10, 16, 18, 30)
    print(f"กำลังเช็ก {time_to_check3}: ว่างหรือไม่? 👉 {my_scheduler.is_available(time_to_check3)}")
    
    time_to_check4 = datetime(2025, 10, 15, 11, 0)
    print(f"กำลังเช็ก {time_to_check4}: ว่างหรือไม่? 👉 {my_scheduler.is_available(time_to_check4)}")

    time_to_check5 = datetime(2025, 10, 14, 11, 0)
    print(f"กำลังเช็ก {time_to_check5}: ว่างหรือไม่? 👉 {my_scheduler.is_available(time_to_check5)}")