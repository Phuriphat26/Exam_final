import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar"; // 💡[FIX] แก้ไขโดยการ comment out บรรทัดนี้
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// --- (Helper Functions - ไม่ได้แก้ไข) ---

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

const getLocalDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export default function Calendar() {
    // ⭐️ [แก้ไข] ตั้งค่าเริ่มต้นเป็นเดือนตุลาคม 2025
    const [currentDate, setCurrentDate] = useState(new Date('2025-10-01'));

    // 💡 [1. เพิ่ม State]
    const [allPlans, setAllPlans] = useState([]); // เก็บรายชื่อแผนทั้งหมด (สำหรับ Dropdown)
    const [selectedPlanId, setSelectedPlanId] = useState(""); // เก็บ ID ของแผนที่เลือก
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 💡 [2. แก้ไข useEffect] 
    // ดึง "รายชื่อแผนทั้งหมด" มาเพื่อสร้าง Dropdown
    useEffect(() => {
        const fetchAllPlans = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(
                    "http://localhost:5000/calender/api/exam-plans/",
                    { withCredentials: true }
                );

                if (response.data && response.data.length > 0) {
                    setAllPlans(response.data); // เก็บรายชื่อแผนทั้งหมด
                    setSelectedPlanId(response.data[0]._id); // เลือกแผนแรกเป็นค่าเริ่มต้น
                } else {
                    setError("ไม่พบแผนการสอบ");
                }

            } catch (err) {
                console.error("❌ Failed to fetch plans list:", err);
                setError(`ไม่สามารถดึงข้อมูลแผน: ${err.response?.data?.message || err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllPlans();
    }, []); // <-- ดึงข้อมูลครั้งเดียวตอนเริ่ม

    // 💡 [3. ใช้ useMemo] 
    // สร้าง scheduleMap ใหม่ "ทุกครั้งที่" selectedPlanId เปลี่ยน
    const scheduleMap = useMemo(() => {
        const newMap = new Map();

        if (!selectedPlanId || allPlans.length === 0) {
            return newMap; // ถ้ายังไม่มีแผน หรือยังไม่ได้เลือก ก็คืนค่า Map ว่าง
        }

        // ค้นหาแผนที่เลือกจาก 'allPlans'
        const selectedPlan = allPlans.find(p => p._id === selectedPlanId);
        if (!selectedPlan) {
            return newMap; // ไม่พบแผนที่เลือก
        }
        
        // --- เริ่ม Logic เดิม (แต่ทำกับ 'selectedPlan' แค่แผนเดียว) ---
        
        const scheduleSlots = selectedPlan.study_plan || selectedPlan.generated_schedule;

        if (scheduleSlots && Array.isArray(scheduleSlots)) {
            scheduleSlots.forEach(slot => {
                // ✅ [FIX] ใช้ 'slot.date' (ที่เป็น YYYY-MM-DD)
                const dateKey = slot.date.split('T')[0]; // เอาแค่ YYYY-MM-DD
                const existingSlots = newMap.get(dateKey) || [];
                newMap.set(dateKey, [...existingSlots, slot]);
            });
        } else {
            console.warn(`Plan (ID: ${selectedPlan._id}) ไม่มี 'study_plan'`);
        }

        // เพิ่มวันสอบ (exam_date)
        if (selectedPlan.exam_date && selectedPlan.exam_title) {
            const examDateString = selectedPlan.exam_date.split('T')[0]; // เอาแค่ YYYY-MM-DD
            
            const examSlot = {
                date: examDateString,
                subject: `สอบ: ${selectedPlan.exam_title}`,
                startTime: "!!",
                endTime: "",
                isExam: true
            };

            const existingSlots = newMap.get(examDateString) || [];
            // [แก้ไข] ใส่ examSlot ไว้ "อันแรก" เพื่อให้เด่นชัด
            newMap.set(examDateString, [examSlot, ...existingSlots]);
        }
        // --- จบ Logic เดิม ---

        console.log(`✅ Re-mapped schedule for plan: ${selectedPlan.exam_title}`, newMap);
        return newMap;

    }, [allPlans, selectedPlanId]); // <-- ให้คำนวณใหม่เมื่อ 2 ค่านี้เปลี่ยน


    // --- (Logic Calendar Grid - ไม่ได้แก้ไข) ---
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
            {  <Sidebar />  } 

            <div className="flex-1 p-4 sm:p-8">
                <div
                    className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8"
                    style={{ background: 'linear-gradient(to bottom right, #eff6ff, #f9faff)' }}
                >
                    <h1 className="text-4xl font-bold text-center text-blue-800 mb-6">
                        Calendar
                    </h1>

                    {/* 💡 [4. เพิ่ม Dropdown] */}
                    <div className="mb-6 max-w-sm mx-auto">
                        <label 
                            htmlFor="plan-select" 
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            เลือกแผน:
                        </label>
                        <select
                            id="plan-select"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            disabled={isLoading || allPlans.length === 0}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm 
                                       focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                                       disabled:bg-gray-100"
                        >
                            {isLoading ? (
                                <option>กำลังโหลดแผน...</option>
                            ) : error ? (
                                <option>ไม่พบแผน</option>
                            ) : (
                                allPlans.map(plan => (
                                    <option key={plan._id} value={plan._id}>
                                        {plan.exam_title}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>


                    {/* Navigation (เหมือนเดิม) */}
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

                    {/* Day Headers (เหมือนเดิม) */}
                    <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-600 mb-2">
                        {dayHeaders.map(day => (
                            <div key={day} className="py-2">{day}</div>
                        ))}
                    </div>

                    {/* Calendar Grid (เหมือนเดิม) */}
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
                                // ✅ Logic นี้จะดึงข้อมูลจาก scheduleMap ที่คำนวณใหม่แล้ว
                                const daySchedule = scheduleMap.get(dateString); 

                                return (
                                    <div
                                        key={index}
                                        className="h-28 sm:h-32 rounded-lg border border-gray-200 bg-white p-2 flex flex-col overflow-hidden"
                                    >
                                        <span className="font-semibold text-gray-800">{day.date.getDate()}</span>

                                        {/* Show schedule slots (เหมือนเดิม) */}
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

