import React from "react";
import { Calendar, LogOut, Plus } from "lucide-react";
// 1. import useNavigate เพิ่มเข้ามา
import { Link, useNavigate } from "react-router-dom";

export default function Sidebar() {
  // 2. สร้าง instance ของ navigate
  const navigate = useNavigate();

  // 3. สร้างฟังก์ชัน handleLogout
  const handleLogout = async () => {
    try {
      // ตรวจสอบ Port ของ Flask ให้ถูกต้อง (ปกติคือ 5000)
      const response = await fetch('http://localhost:5000/login/logout', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // สำคัญมาก: ต้องส่ง cookie ไปด้วย
        credentials: 'include', 
      });

      const data = await response.json();

      if (data.success) {
        // 4. เมื่อสำเร็จ ใช้ navigate พาไปหน้า login
        navigate('/login');
        // (ใช้ navigate ดีกว่า window.location.reload() สำหรับ React Router)
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="h-screen w-56 bg-white shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-4 py-6">
          <Calendar className="text-indigo-500" />
          <h1 className="text-lg font-semibold text-indigo-600">Exam Planner</h1>
        </div>

        <nav className="flex flex-col gap-2 px-4">
          <Link to="/" className="w-full text-left px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-medium">
            Dashboard
          </Link>
          <Link to="/Calendar" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Calendar
          </Link>
          <Link to="/Subject" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Subject
          </Link>
          <Link to="/time" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Time
          </Link>
          <Link to="/ExamPlanList" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            แผนการอ่าน
          </Link>

          <Link
            to="/add"
            className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-blue-50 text-indigo-600 font-medium hover:from-indigo-200 hover:to-blue-100 transition"
          >
            <Plus size={16} /> Add New
          </Link>
        </nav>
      </div>

      <div className="px-4 pb-6">
        {/* 5. เพิ่ม onClick เข้าไปในปุ่ม */}
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-2 text-gray-500 hover:text-red-500"
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
}