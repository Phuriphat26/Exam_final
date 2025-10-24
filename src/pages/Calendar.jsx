import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar"; // (ปิดไว้ก่อน ถ้าไม่มีไฟล์นี้)
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Function ช่วยสร้างวันที่
const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

const getMonthStartDay = (year, month) => {
    return new Date(year, month, 1).getDay(); 
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date('2025-10-01')); 
    
    // State สำหรับเก็บข้อมูลตาราง
    const [scheduleMap, setScheduleMap] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // [1] ดึงข้อมูลตารางจาก Backend
    useEffect(() => {
        const fetchSchedule = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(
                    // (Endpoint นี้ต้องตรงกับ calender_bp.route("/api/exam-plans/"))
                    // (ซึ่งในโค้ด Flask ของคุณคือ /calender/api/exam-plans/
                    // แต่ในโค้ด React เดิมคุณใช้ /api/exam-plans/
                    // ผมจะยึดตามโค้ด React เดิมของคุณ แต่ถ้าไม่เจอลองแก้เป็น "http://localhost:5000/calender/api/exam-plans/")
                    "http://localhost:5000/calender/api/exam-plans/", // <-- ใช้ URL ที่ถูกต้องตาม Blueprint
                    { withCredentials: true }
                );
                
                const newMap = new Map();
                
                response.data.forEach(plan => {
                    // plan.generated_schedule คือ [ {date: ..., subject: ...}, ... ]
                    plan.generated_schedule.forEach(slot => { // เปลี่ยนชื่อตัวแปรเป็น slot
                    
                        // ดึง list ของ slot ที่มีอยู่เดิมในวันที่นี้
                        const existingSlots = newMap.get(slot.date) || [];
                        
                        // ✅ [FIX 1] แก้ไขบรรทัดนี้: เพิ่ม slot ทั้ง object ลงไปใน array
                        newMap.set(slot.date, [...existingSlots, slot]);
                    });
                });
                
                setScheduleMap(newMap);
                console.log("✅ Fetched and mapped schedule:", newMap);

            } catch (err) {
                console.error("❌ Failed to fetch schedule:", err);
                if (err.response) {
                    console.error("Error data:", err.response.data);
                    console.error("Error status:", err.response.status);
                    setError(`ไม่สามารถดึงข้อมูล: ${err.response.data.message || err.message}`);
                } else {
                    setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, []); 

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); 
        
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getMonthStartDay(year, month); 

        const grid = [];
        
        // ช่องว่างก่อนวันที่ 1
        for (let i = 0; i < startDay; i++) {
            grid.push({ date: null, isCurrentMonth: false });
        }

        // วันที่ในเดือน
        for (const day of daysInMonth) {
            grid.push({ date: day, isCurrentMonth: true });
        }
        
        return grid;
    }, [currentDate]); 

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToPrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const dayHeaders = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Sidebar (ตามโค้ดเดิมของคุณ) */}
            <div className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        <svg className="w-8 h-8" /* ไอคอนรูปปฏิทิน */ fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Exam Planner
                    </h2>
                </div>
                <nav className="mt-6 px-4">
                    <a href="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Dashboard</a>
                    <a href="/calendar" className="block py-2.5 px-4 rounded transition duration-200 bg-blue-100 text-blue-700 font-bold">Calendar</a>
                    <a href="/subject" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Subject</a>
                    <a href="/time" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-100 text-gray-700 font-medium">Time</a>
                    
                    {/* (ปุ่ม Add New ควรใช้ Link ของ React Router ถ้ามี) */}
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
                <div 
                    className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8"
                    style={{ background: 'linear-gradient(to bottom right, #eff6ff, #f9faff)' }} 
                >
                    {/* Calendar Header (ตามภาพ) */}
                    <h1 className="text-4xl font-bold text-center text-blue-800 mb-8">
                        Calendar
                    </h1>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={goToPrevMonth}
                            className="p-2 rounded-full hover:bg-gray-200 transition"
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                        </button>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button 
                            onClick={goToNextMonth}
                            className="p-2 rounded-full hover:bg-gray-200 transition"
                        >
                            <ChevronRightIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>

                    {/* Day Headers (อา, จ, อ, ...) */}
                    <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-600 mb-2">
                        {dayHeaders.map(day => (
                            <div key={day} className="py-2">{day}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    {isLoading ? (
                        <div className="text-center py-10 text-blue-600">กำลังโหลด...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {calendarGrid.map((day, index) => {
                                if (!day.isCurrentMonth) {
                                    return <div key={index} className="h-28 sm:h-32 rounded-lg bg-gray-50/50"></div>; // ช่องว่าง
                                }

                                // แปลงเป็น YYYY-MM-DD
                                const dateString = day.date.toISOString().split('T')[0];
                                const daySchedule = scheduleMap.get(dateString); // ดึงข้อมูลจาก Map

                                return (
                                    <div 
                                        key={index} 
                                        className="h-28 sm:h-32 rounded-lg border border-gray-200 bg-white p-2 flex flex-col overflow-hidden"
                                    >
                                        <span className="font-semibold text-gray-800">{day.date.getDate()}</span>
                                        
                                        {/* Show schedule slots */}
                                        {daySchedule && (
                                            <div className="mt-1 space-y-1 overflow-y-auto pr-1">
                                                {/* ✅ [FIX 2] แก้ไขการแสดงผล */}
                                                {daySchedule.map((slot, i) => (
                                                    <div 
                                                        key={i}
                                                        className="text-xs p-1.5 bg-blue-100 text-blue-800 rounded-md truncate font-medium"
                                                        // (แสดงเวลาเริ่มต้น-สิ้นสุด เมื่อเอาเมาส์ชี้)
                                                        title={`${slot.subject} (${slot.startTime} - ${slot.endTime})`}
                                                    >
                                                        {/* (แสดงเวลาเริ่มต้น และ ชื่อวิชา) */}
                                                        {`${slot.startTime} ${slot.subject}`}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}