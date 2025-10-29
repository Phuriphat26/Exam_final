import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Import date-fns สำหรับปฏิทิน (ต้อง npm install date-fns)
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale'; // Import ภาษาไทย

// --- (Helper Functions) ---

// 1. Function แปลง Date object เป็น "30 ตุลาคม 2568"
const formatExamDate = (date) => {
    if (!date || isNaN(date)) return "ไม่ระบุวันที่";
    return format(date, 'd MMMM yyyy', { locale: th });
};

// 2. Function แปลง Date object เป็น "YYYY-MM-DD" (สำหรับเทียบ key)
const toDateString = (date) => {
    return format(date, 'yyyy-MM-dd');
};

// 3. Function แปลงเวลา "09:00" / "12:00" เป็น "09:00 - 12:00"
const formatExamTime = (start, end) => {
    if (!start || !end) return "";
    return `${start} - ${end}`; 
};


// --- (Sub-components) ---

// 1. Donut Chart (เวอร์ชัน SVG ที่แก้ไขแล้ว)
const DonutChart = ({ percentage, label, color }) => {
    // --- (ส่วนคำนวณ) ---
    const radius = 60; // รัศมี
    const strokeWidth = 12; // ความหนาของเส้น
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    
    // ป้องกันค่า % ที่ผิดพลาด (ให้อยู่ระหว่าง 0-100)
    const safePercentage = Math.max(0, Math.min(percentage || 0, 100));
    const offset = circumference - (safePercentage / 100) * circumference;

    // --- (ส่วนสี) ---
    // ตัวแปรนี้จะถูกใช้โดย <circle> ใน SVG
    const ringColor = 
        color === 'blue' ? 'stroke-blue-500' :
        color === 'red' ? 'stroke-red-400' : 'stroke-gray-300';
    
    const bgColor = 
        color === 'blue' ? 'bg-blue-50' :
        color === 'red' ? 'bg-red-50' : 'bg-gray-50';

    return (
        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm ${bgColor}`}>
            <div className="relative w-40 h-40">
                <svg
                    height="100%"
                    width="100%"
                    viewBox="0 0 140 140" // 140 = (radius + padding) * 2
                    className="transform -rotate-90" // หมุน 90 องศา ให้ 0% เริ่มที่ด้านบน
                >
                    {/* 1. วงกลมพื้นหลัง (สีเทาอ่อน) */}
                    <circle
                        stroke="#E5E7EB" // bg-gray-200
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        r={normalizedRadius}
                        cx={70} // กึ่งกลาง (140/2)
                        cy={70} // กึ่งกลาง (140/2)
                    />
                    {/* 2. วงกลม % (ทับอยู่ด้านบน) */}
                    <circle
                        className={`${ringColor} transition-all duration-500`}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        // (นี่คือจุดที่ใช้ตัวแปร offset)
                        style={{ strokeDashoffset: offset }} 
                        r={normalizedRadius}
                        cx={70}
                        cy={70}
                        strokeLinecap="round" // ทำให้ปลายเส้นมน
                    />
                </svg>
                {/* ตัวเลข % ที่แสดงตรงกลาง */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">{safePercentage}%</span>
                </div>
            </div>
            
            <span className="mt-4 text-lg font-semibold text-gray-700">{label}</span>
        </div>
    );
};

// 2. Calendar Grid
const StudyCalendar = ({ studySlots = [], examDateStr }) => {
    //
    // --- (A) สมมติฐานข้อมูล ---
    // 1. examDateStr: "2025-10-30T00:00:00"
    // 2. studySlots: [
    //      { date: "2025-10-06", status: "read" },
    //      { date: "2025-10-08", status: "read" },
    //      { date: "2025-10-13", status: "not_read" },
    //      ...
    //    ]
    //
    const examDate = new Date(examDateStr);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(examDate));

    // สร้าง Map เพื่อค้นหา Status ได้เร็ว
    const statusMap = new Map();
    studySlots.forEach(slot => {
        statusMap.set(slot.date, slot.status);
    });

    // สร้างตารางปฏิทิน
    const daysInMonth = getDaysInMonth(currentMonth);
    const startDayOfWeek = getDay(currentMonth); // 0=Sun, 1=Mon...
    const dayHeaders = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const blankDays = Array(startDayOfWeek).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Render Logic
    const renderDay = (day) => {
        if (!day) {
            return <div key={`blank-${Math.random()}`} className="h-12 w-12"></div>;
        }

        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = toDateString(date);
        
        const status = statusMap.get(dateString);
        const isExamDay = isSameDay(date, examDate);

        let dayClasses = "h-12 w-12 flex items-center justify-center rounded-lg ";
        if (isExamDay) {
            dayClasses += "bg-yellow-200 text-yellow-800 font-bold";
        } else if (status === 'read') {
            dayClasses += "bg-green-200 text-green-800";
        } else if (status === 'not_read') {
            dayClasses += "bg-red-200 text-red-800";
        } else {
            dayClasses += "bg-gray-200 text-gray-700"; // วันที่ไม่มีในแผน
        }

        return (
            <div key={dateString} className={dayClasses}>
                {day}
            </div>
        );
    };

    return (
        <div className="bg-blue-50 p-6 rounded-2xl shadow-sm">
            {/* Header: October 2025 */}
            <div className="flex justify-between items-center mb-4">
                <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-full hover:bg-blue-100"
                >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <h3 className="text-xl font-bold text-gray-800">
                    {format(currentMonth, 'MMMM yyyy', { locale: th })}
                </h3>
                <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-full hover:bg-blue-100"
                >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
            </div>
            
            {/* Grid ปฏิทิน */}
            <div className="grid grid-cols-7 gap-2 text-center">
                {/* หัว (จ อ พ...) */}
                {dayHeaders.map(header => (
                    <div key={header} className="font-semibold text-gray-500 text-sm">
                        {header}
                    </div>
                ))}
                
                {/* วันที่ (ช่องว่าง + วันที่) */}
                {blankDays.map(renderDay)}
                {daysArray.map(renderDay)}
            </div>
        </div>
    );
};

// --- (Main Component) ---

export default function ExamPlanDetailPage() {
    const { planId } = useParams(); // ดึง ID จาก URL (เช่น /exam-plan/THIS_ID)
    const [plan, setPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlanDetail = async () => {
            if (!planId) return;
            setIsLoading(true);
            try {
                // --- (สำคัญ) ---
                // Endpoint นี้ต้องส่งข้อมูลแบบละเอียด
                const response = await axios.get(
                    `http://localhost:5000/calender/api/exam-plans/${planId}`, 
                    { withCredentials: true }
                );
                
                // --- (โครงสร้างข้อมูลที่คาดหวังจาก API) ---
                // response.data = {
                //   _id: "...",
                //   exam_title: "System Analysis and Designs",
                //   exam_date: "2025-10-30T00:00:00",
                //   exam_start_time: "09:00",
                //   exam_end_time: "12:00",
                //   progress_percentage: 20, // (20%)
                //   study_slots: [
                //     { date: "2025-10-06", status: "read" },
                //     { date: "2025-10-13", status: "not_read" },
                //     ...
                //   ]
                // }
                
                setPlan(response.data);
                console.log("Fetched plan detail:", response.data);

            } catch (err) {
                console.error("❌ Failed to fetch plan detail:", err);
                setError("ไม่สามารถดึงข้อมูลแผนการสอบได้");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlanDetail();
    }, [planId]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">กำลังโหลด...</div>;
    }

    if (error) {
        return <div className="flex h-screen items-center justify-center">{error}</div>;
    }

    if (!plan) {
        return <div className="flex h-screen items-center justify-center">ไม่พบข้อมูล</div>;
    }

    // คำนวณ % ที่เหลือ
    const remainingPercentage = 100 - (plan.progress_percentage || 0);

    return (
        <div className="flex bg-gray-100 min-h-screen">
            <Sidebar />
            
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header: "ติดตามความคืบหน้าการอ่าน" */}
                    <div className="flex items-center mb-6">
                        <Link to="/exam-plans" className="p-2 rounded-full hover:bg-gray-200 mr-2">
                            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-800">
                            ติดตามความคืbหน้าการอ่าน
                        </h1>
                    </div>

                    {/* Main Content Card */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        
                        {/* Title & Date */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-6 gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">
                                    {plan.exam_title}
                                </h2>
                                <p className="text-lg text-gray-600 mt-1">
                                    วันที่สอบ: {formatExamDate(new Date(plan.exam_date))} 
                                    เวลา {formatExamTime(plan.exam_start_time, plan.exam_end_time)}
                                </p>
                            </div>
                            {/* Legend (คำอธิบายสี) */}
                            <div className="flex flex-row sm:flex-col flex-wrap gap-2 text-sm">
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-full bg-green-200 mr-2"></span>
                                    <span>อ่านแล้ว</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-full bg-red-200 mr-2"></span>
                                    <span>ยังไม่ได้อ่าน</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-full bg-yellow-200 mr-2"></span>
                                    <span>วันสอบ</span>
                                </div>
                            </div>
                        </div>

                        {/* Calendar & Stats Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Calendar (คอลัมน์ซ้าย) */}
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                    ตารางการอ่าน
                                </h3>
                                <StudyCalendar 
                                    studySlots={plan.study_slots} 
                                    examDateStr={plan.exam_date}
                                />
                            </div>

                            {/* Stats (คอลัมน์ขวา) */}
                            <div className="flex flex-col space-y-6">
                                <DonutChart 
                                    percentage={plan.progress_percentage || 0} 
                                    label="Level Up"
                                    color="blue"
                                />
                                <DonutChart 
                                    percentage={remainingPercentage}
                                    label="บทที่ยังไม่ได้อ่าน"
                                    color="red"
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}