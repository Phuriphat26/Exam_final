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

// ✅ [FIX] ฟังก์ชันสำหรับแปลง Local Date เป็น "YYYY-MM-DD" โดยไม่สน Timezone
const getLocalDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export default function Calendar() {
    // ⭐️ [แก้ไข] ตั้งค่าเริ่มต้นเป็นเดือนตุลาคม 2025 เพื่อให้ตรงกับตัวอย่าง
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
                    "http://localhost:5000/calender/api/exam-plans/", // <-- ใช้ URL ที่ถูกต้องตาม Blueprint
                    { withCredentials: true }
                );

                const newMap = new Map();

                response.data.forEach(plan => {
                    const scheduleSlots = plan.study_plan || plan.generated_schedule;

                    if (scheduleSlots && Array.isArray(scheduleSlots)) {
                        scheduleSlots.forEach(slot => {
                            const existingSlots = newMap.get(slot.date) || [];
                            newMap.set(slot.date, [...existingSlots, slot]);
                        });
                    } else {
                        console.warn(`Plan (ID: ${plan._id || 'N/A'}) ไม่มี 'study_plan' หรือ 'generated_schedule' ที่เป็น Array`);
                        console.log("Data ที่มีปัญหา:", scheduleSlots);
                    }

                    // [เพิ่มใหม่] ตรวจสอบและเพิ่มวันสอบ (exam_date)
                    if (plan.exam_date && plan.exam_title) {
                        const examDateString = plan.exam_date; // "YYYY-MM-DD"
                        
                        const examSlot = {
                            date: examDateString,
                            subject: `สอบ: ${plan.exam_title}`,
                            startTime: "!!",
                            endTime: "",
                            isExam: true
                        };

                        const existingSlots = newMap.get(examDateString) || [];
                        newMap.set(examDateString, [examSlot, ...existingSlots]);
                    }
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
                    console.error("JavaScript Error during processing:", err.message);
                    setError(`เกิดข้อผิดพลาดในการประมวลผลข้อมูล: ${err.message}`);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, []); // <-- ดึงข้อมูลครั้งเดียวตอนเริ่ม

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getMonthStartDay(year, month);

        const grid = [];
        for (let i = 0; i < startDay; i++) {
            grid.push({ date: null, isCurrentMonth: false });
        }
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
            {/* ⭐️ [คืนค่า] กลับไปใช้แบบเดิม */}
            { <Sidebar /> } {/* ปิดไว้ก่อน */}

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

                                const dateString = getLocalDateString(day.date);
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
                                                {daySchedule.map((slot, i) => {
                                                    const isExamSlot = slot.isExam === true;
                                                    
                                                    const slotClass = isExamSlot
                                                        ? "text-xs p-1.5 bg-red-100 text-red-800 rounded-md truncate font-bold" // Style วันสอบ
                                                        : "text-xs p-1.5 bg-blue-100 text-blue-800 rounded-md truncate font-medium"; // Style วันอ่าน

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={slotClass}
                                                            title={isExamSlot ? slot.subject : `${slot.subject} (${slot.startTime} - ${slot.endTime})`}
                                                        >
                                                            {isExamSlot ? slot.subject : `${slot.subject}`}
                                                        </div>
                                                    );
                                                })}
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