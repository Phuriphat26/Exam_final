import React, { useState, useEffect } from 'react';
import axios from 'axios';
// (--- ADD ---) Import 'Link' เพื่อใช้ในการเปลี่ยนหน้า
import { Link } from 'react-router-dom'; 
import { AcademicCapIcon } from '@heroicons/react/24/solid';
import Sidebar from "../components/Sidebar";

// --- (Helper Functions) ---
// (ไม่เปลี่ยนแปลง)
const formatExamDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const formatStudyDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { weekday: 'long' });
};

const getDifficulty = (subjects) => {
    if (!subjects || subjects.length === 0) {
        return { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
    }
    const maxPriority = Math.max(...subjects.map(s => s.priority || 1));
    if (maxPriority >= 3) {
        return { text: 'Hard', color: 'bg-red-100 text-red-800' };
    }
    if (maxPriority === 2) {
        return { text: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Easy', color: 'bg-green-100 text-green-800' };
};

// --- (Main Component) ---

export default function Subject() {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(
                    "http://localhost:5000/calender/api/exam-plans/", 
                    { withCredentials: true }
                );
                setPlans(response.data);
                console.log("Fetched plans:", response.data);
            } catch (err) {
                console.error("❌ Failed to fetch exam plans:", err);
                setError("ไม่สามารถดึงข้อมูลแผนการสอบได้");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlans();
    }, []);

    // --- (Render Function) ---

    // (--- EDIT ---) แก้ไข Function นี้ให้ return <Link> หุ้ม <div>
    const renderPlanCard = (plan) => {
        const difficulty = getDifficulty(plan.subjects);

        return (
            // 1. หุ้มด้วย <Link>
            // 2. ย้าย `key` มาไว้ที่ <Link>
            // 3. ตั้งค่า `to` ไปยัง URL ของหน้ารายละเอียด (เช่น /exam-plan/ID)
            // 4. เพิ่ม `className="block"` เพื่อให้ <Link> ทำตัวเหมือน block
            <Link 
                key={plan._id} 
                to={`/exam-plan/${plan._id}`} 
                className="block cursor-pointer"
            >
                {/* ย้าย `key` ออกจาก div นี้ไปไว้ที่ Link ด้านบนแล้ว
                  เพิ่ม 'h-full' เพื่อให้การ์ดสูงเท่ากัน (ถ้าอยู่ใน grid) 
                  และ transition-all จะอยู่ที่ div นี้
                */}
                <div className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl h-full">
                    
                    {/* ส่วนหัวของการ์ด (Title และ ป้ายความยาก) */}
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {plan.exam_title}
                        </h2>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${difficulty.color}`}>
                            {difficulty.text}
                        </span>
                    </div>

                    {/* วันที่สอบ */}
                    <p className="text-gray-600">
                        วันที่สอบ: {formatExamDate(plan.exam_date)}
                    </p>

                    {/* ช่วงเวลาอ่าน (จาก study_plan) */}
                    <h3 className="text-md font-semibold text-gray-700 mt-5 mb-3">
                        ช่วงเวลาสำหรับอ่านหนังสือ
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                        {plan.study_plan_raw && plan.study_plan_raw.length > 0 ? (
                            plan.study_plan_raw.map((slot, index) => (
                                <span 
                                    key={index} 
                                    className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                                >
                                    {formatStudyDay(slot.date)} {slot.startTime} - {slot.endTime}
                                </span>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">ยังไม่ได้กำหนดเวลาอ่าน</p>
                        )}
                    </div>

                </div>
            </Link>
        );
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    
                    {isLoading ? (
                        <div className="text-center py-10 text-blue-600">กำลังโหลดข้อมูล...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : (
                        // (--- EDIT ---) เปลี่ยนจาก space-y-6 เป็น grid
                        // การใช้ grid จะช่วยให้การ์ดที่ถูก <Link> หุ้มจัดเรียงสวยงาม
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {plans.length > 0 ? (
                                plans.map(plan => renderPlanCard(plan))
                            ) : (
                                <p className="text-center text-gray-500 col-span-2">ไม่พบแผนการสอบ</p>
                            )}
                        </div>
                    )}

                    {/* ปุ่ม "จัดตาราง" ที่มุมขวาล่าง */}
                    {!isLoading && (
                        <div className="mt-8 flex justify-end">
                            {/* (--- EDIT ---) เปลี่ยนจาก <a> เป็น <Link> */}
                            <Link 
                                to="/create-plan" // ใช้ 'to' แทน 'href'
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all"
                            >
                                จัดตาราง
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}