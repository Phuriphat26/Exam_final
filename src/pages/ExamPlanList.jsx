import React, { useState, useEffect } from 'react';
import axios from 'axios';
// (ใช้ icon อื่นแทนปฏิทิน เพื่อให้เข้ากับคำว่า Subject)
import { AcademicCapIcon } from '@heroicons/react/24/solid';

// --- (Helper Functions) ---

// 1. Function แปลง "2025-10-31" เป็น "31 ตุลาคม 2568"
const formatExamDate = (dateString) => {
    if (!dateString) return "ไม่ระบุวันที่";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// 2. Function แปลง "2025-10-25" เป็น "วันเสาร์"
const formatStudyDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { weekday: 'long' });
};

// 3. Function ประเมินความยากจาก Priority
const getDifficulty = (subjects) => {
    if (!subjects || subjects.length === 0) {
        return { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
    }
    
    // หา priority ที่สูงที่สุดในแผนนี้
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
                // ดึงข้อมูลจาก Endpoint ที่เราคุยกันไว้ (get_exam_plans)
                const response = await axios.get(
                    "http://localhost:5000/calender/api/exam-plans/", 
                    { withCredentials: true }
                );
                setPlans(response.data); // response.data คือ array ของ plans
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

    // Function สำหรับ Render การ์ดแต่ละใบ
    const renderPlanCard = (plan) => {
        const difficulty = getDifficulty(plan.subjects);

        return (
            <div key={plan._id} className="bg-white p-6 rounded-2xl shadow-lg transition-all hover:shadow-xl">
                
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
                                // (ใช้สีเขียวอ่อนตาม UI)
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
        );
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            
            {/* Sidebar (เหมือนใน Calendar.js แต่เปลี่ยน Active) */}
            <div className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        {/* (เปลี่ยนไอคอน) */}
                        <AcademicCapIcon className="w-8 h-8" />
                        Exam Planner
                    </h2>
                </div>
                <nav className="mt-6 px-4">
                    <a href="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Dashboard</a>
                    <a href="/calendar" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Calendar</a>
                    
                    {/* (Active หน้านี้) */}
                    <a href="/subject" className="block py-2.5 px-4 rounded transition duration-200 bg-blue-100 text-blue-700 font-bold">Subject</a>
                    
                    <a href="/time" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Time</a>
                    
                    <a href="/create-plan" className="mt-4 w-full text-center block bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Add New +
                    </a>
                </nav>
                <div className="absolute bottom-0 left-0 w-64 p-6">
                    <a href="/logout" className="text-gray-600 hover:text-red-500 font-medium">Log Out</a>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    
                    {/* (แสดงผล Loading / Error / Data) */}
                    {isLoading ? (
                        <div className="text-center py-10 text-blue-600">กำลังโหลดข้อมูล...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : (
                        <div className="space-y-6">
                            {plans.length > 0 ? (
                                plans.map(plan => renderPlanCard(plan))
                            ) : (
                                <p className="text-center text-gray-500">ไม่พบแผนการสอบ</p>
                            )}
                        </div>
                    )}

                    {/* ปุ่ม "จัดตาราง" ที่มุมขวาล่าง */}
                    {!isLoading && (
                        <div className="mt-8 flex justify-end">
                            <a 
                                href="/create-plan" // (ควรลิงก์ไปหน้า Add New)
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all"
                            >
                                จัดตาราง
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}