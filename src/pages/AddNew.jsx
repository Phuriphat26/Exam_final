import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";

export default function ExamPlannerAddNew() {
    // State for Exam Details
    const [examTitle, setExamTitle] = useState('');
    const [examSubjects, setExamSubjects] = useState([]); 
    const [examDate, setExamDate] = useState('');

    // State for fetching subjects
    const [subjects, setSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    const [subjectError, setSubjectError] = useState('');

    // State for preparation period
    const [prepStartDate, setPrepStartDate] = useState('');
    const [prepEndDate, setPrepEndDate] = useState('');
    const [defaultStartTime, setDefaultStartTime] = useState('09:00');
    const [defaultEndTime, setDefaultEndTime] = useState('17:00');
    
    // State for the generated daily schedule
    const [dailySchedule, setDailySchedule] = useState([]);

    // State for notification preference
    const [sendNotifications, setSendNotifications] = useState(true); // <-- เพิ่ม State นี้

    // Effect to fetch user's subjects on component mount
    useEffect(() => {
        const fetchSubjects = async () => {
            console.log("🔄 Starting to fetch subjects...");
            setIsLoadingSubjects(true);
            setSubjectError('');
            
            try {
                const API_URL = "http://localhost:5000/api/subjects/";
                console.log("📡 Fetching from:", API_URL);
                
                const response = await axios.get(API_URL, { 
                    withCredentials: true,
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                console.log("✅ Response status:", response.status);
                const fetchedSubjects = response.data;

                if (!Array.isArray(fetchedSubjects)) {
                    console.error("❌ Response is not an array:", fetchedSubjects);
                    setSubjectError("ข้อมูลที่ได้รับไม่ถูกต้อง");
                    setSubjects([]);
                    return;
                }

                if (fetchedSubjects.length === 0) {
                    console.warn("⚠️ No subjects found in database");
                    setSubjectError("ไม่พบรายวิชาในระบบ (กรุณาไปที่หน้า 'วิชาของฉัน' เพื่อเพิ่มวิชา)");
                    setSubjects([]);
                } else {
                    console.log(`✅ Found ${fetchedSubjects.length} subjects`);
                    setSubjects(fetchedSubjects);
                }
                
            } catch (error) {
                console.error("❌ Failed to fetch subjects:", error);
                
                if (error.response) {
                    setSubjectError(`เซิร์ฟเวอร์ตอบกลับ: ${error.response.data.message || error.response.status}`);
                } else if (error.request) {
                    setSubjectError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
                } else {
                    setSubjectError(`เกิดข้อผิดพลาด: ${error.message}`);
                }
                setSubjects([]);
            } finally {
                setIsLoadingSubjects(false);
                console.log("🏁 Fetch subjects completed");
            }
        };

        fetchSubjects();
    }, []);

    // Effect to auto-generate daily schedule when dates change
    useEffect(() => {
        if (prepStartDate && prepEndDate && new Date(prepStartDate) <= new Date(prepEndDate)) {
            const start = new Date(prepStartDate);
            const end = new Date(prepEndDate);
            const days = [];
            
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                days.push({
                    date: new Date(dt).toISOString().split('T')[0], // Format: "YYYY-MM-DD"
                    isAvailable: true,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                });
            }
            setDailySchedule(days);
        } else {
            setDailySchedule([]);
        }
    }, [prepStartDate, prepEndDate, defaultStartTime, defaultEndTime]);

    // Memoized calculation for formatting display dates
    const formattedDays = useMemo(() => {
        return dailySchedule.map(day => {
            const dateObj = new Date(day.date + 'T00:00:00'); // Ensure correct local date parsing
            return {
                ...day,
                displayDate: dateObj.toLocaleDateString('th-TH', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                }),
            };
        });
    }, [dailySchedule]);

    // Handler to update a specific day in the schedule
    const handleDayChange = (index, field, value) => {
        const updatedSchedule = [...dailySchedule];
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
        setDailySchedule(updatedSchedule);
    };
    
    // Handler to add/remove subjects from the exam plan
    const handleSubjectChange = (e) => {
        const { value, checked } = e.target;
    
        if (checked) {
            const selectedSubject = subjects.find(s => s.title === value);
            if (selectedSubject) {
                setExamSubjects(prev => [
                    ...prev,
                    {
                        name: selectedSubject.title,
                        priority: selectedSubject.priority ?? 1, // Default to 1 if priority is null/undefined
                    },
                ]);
            }
        } else {
            setExamSubjects(prev => prev.filter(subject => subject.name !== value));
        }
    };

    // Handler to reset the form
    const handleCancel = () => {
        setExamTitle('');
        setExamSubjects([]);
        setExamDate('');
        setPrepStartDate('');
        setPrepEndDate('');
        setDefaultStartTime('09:00');
        setDefaultEndTime('17:00');
        setDailySchedule([]);
        setSendNotifications(true); // <-- รีเซ็ต Checkbox
    };

    // Handler to submit the form
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log("🚀 Submitting exam plan...");
        
        if (!examTitle || !examDate) {
            alert("กรุณากรอกข้อมูลการสอบให้ครบถ้วน");
            return;
        }

        if (examSubjects.length === 0) {
            alert("กรุณาเลือกวิชาที่ต้องการวางแผนอย่างน้อย 1 วิชา");
            return;
        }

        if (dailySchedule.length === 0) {
            alert("กรุณาเลือกช่วงเวลาเตรียมตัวสอบที่ถูกต้อง");
            return;
        }

        // Filter out only the available days
        const studyPlan = dailySchedule
            .filter(day => day.isAvailable)
            .map(({ date, startTime, endTime }) => ({ date, startTime, endTime }));

        if (studyPlan.length === 0) {
            alert("คุณยังไม่ได้กำหนดวันสำหรับอ่านหนังสือเลย (ทุกวันถูกติ๊ก 'ไม่ว่าง')");
            return;
        }

        // --- Payload Creation ---
        const payload = {
            examTitle,
            examSubjects: examSubjects,
            examDate,
            studyPlan,
            sendNotifications: sendNotifications, // <-- ส่งค่า Checkbox ไป
            
            // (!!) หมายเหตุ: Backend (api/planner.py) ที่ผมเขียนให้ก่อนหน้า
            // จะรับ userId แบบ hardcode ไว้ก่อน
            // ในอนาคต คุณต้องส่ง userId ที่ login อยู่ มาใน payload นี้ด้วย
            // e.g., userId: auth.user.id 
        };

        console.log("📤 Payload:", payload);

        try {
            const res = await axios.post(
                "http://localhost:5000/api/exam-plan/", 
                payload,
                { 
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log("✅ Success:", res.data);
            alert(res.data.message || "บันทึกแผนการเตรียมสอบสำเร็จ!");
            handleCancel(); // Reset form after success
        } catch (err) {
            console.error("❌ Submission error:", err);
            console.error("Response:", err.response?.data);
            alert(err.response?.data?.message || err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">วางแผนเตรียมสอบ</h1>

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8">
                        
                        {/* 1. Exam Information Section */}
                        <div className="border border-gray-200 rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-5 text-gray-700">1. ข้อมูลการสอบ</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อการสอบ</label>
                                    <input 
                                        type="text" 
                                        placeholder="เช่น สอบปลายภาค" 
                                        value={examTitle} 
                                        onChange={e => setExamTitle(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                                
                                {/* Subject Selection UI */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">วิชาที่สอบ (เลือกได้หลายวิชา)</label>
                                    {isLoadingSubjects ? (
                                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 flex items-center gap-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            กำลังโหลดรายวิชา...
                                        </div>
                                    ) : subjectError ? (
                                        <div className="space-y-2">
                                            <div className="w-full px-4 py-3 rounded-lg border-2 border-red-300 bg-red-50 text-red-600 text-sm">
                                                ⚠️ {subjectError}
                                            </div>
                                            <a
                                                href="/Subject" // (ลิงก์ไปหน้าเพิ่มวิชา)
                                                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-blue-500 text-blue-600 font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                                เพิ่มรายวิชาใหม่
                                            </a>
                                        </div>
                                    ) : subjects.length > 0 ? (
                                        <div className="space-y-3 p-4 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                                            {subjects.map((subject) => (
                                                <label key={subject._id} className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={subject.title}
                                                        checked={examSubjects.some(s => s.name === subject.title)}
                                                        onChange={handleSubjectChange}
                                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="font-medium text-gray-800">{subject.title}</span>
                                                    {subject.priority && ( 
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            (ระดับ: {subject.priority})
                                                        </span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <a
                                            href="/Subject" // (ลิงก์ไปหน้าเพิ่มวิชา)
                                            className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-blue-500 text-blue-600 font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                            เพิ่มรายวิชาใหม่
                                        </a>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">วันที่สอบ</label>
                                    <input 
                                        type="date" 
                                        value={examDate} 
                                        onChange={e => setExamDate(e.target.value)} 
                                        className="w-full md:w-1/2 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Preparation Period Section */}
                        <div className="border border-gray-200 rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-5 text-gray-700">2. กำหนดช่วงเวลาเตรียมตัว</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">วันเริ่มเตรียมตัว</label>
                                    <input 
                                        type="date" 
                                        value={prepStartDate} 
                                        onChange={e => setPrepStartDate(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">วันสิ้นสุดเตรียมตัว</label>
                                    <input 
                                        type="date" 
                                        value={prepEndDate} 
                                        onChange={e => setPrepEndDate(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">เวลาอ่าน (เริ่มต้น)</label>
                                    <input 
                                        type="time" 
                                        value={defaultStartTime} 
                                        onChange={e => setDefaultStartTime(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">เวลาอ่าน (สิ้นสุด)</label>
                                    <input 
                                        type="time" 
                                        value={defaultEndTime} 
                                        onChange={e => setDefaultEndTime(e.target.value)} 
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Daily Study Schedule Section */}
                        {formattedDays.length > 0 && (
                            <div className="border border-gray-200 rounded-xl p-6">
                                <h2 className="text-xl font-semibold mb-4 text-gray-700">3. จัดการเวลาอ่านหนังสือรายวัน</h2>
                                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                    {formattedDays.map((day, index) => (
                                        <div 
                                            key={day.date} 
                                            className={`p-4 rounded-lg transition-all ${day.isAvailable ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-100 opacity-70 border-2 border-gray-200'}`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex-grow font-semibold text-gray-800">{day.displayDate}</div>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={day.isAvailable} 
                                                            onChange={e => handleDayChange(index, 'isAvailable', e.target.checked)} 
                                                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                                                        />
                                                        <span className="font-medium text-sm text-gray-700">อ่านวันนี้</span>
                                                    </label>
                                                </div>
                                            </div>
                                            {day.isAvailable && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-8 border-l-2 border-blue-300 ml-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">เริ่ม</label>
                                                        <input 
                                                            type="time" 
                                                            value={day.startTime} 
                                                            onChange={e => handleDayChange(index, 'startTime', e.target.value)} 
                                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none transition" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">สิ้นสุด</label>
                                                        <input 
                                                            type="time" 
                                                            value={day.endTime} 
                                                            onChange={e => handleDayChange(index, 'endTime', e.target.value)} 
                                                            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none transition" 
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- (!! ส่วนที่เพิ่มเข้ามา !!) --- */}
                        {/* 4. Notification Toggle Section */}
                        <div className="flex items-center justify-start p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center h-5">
                                <input
                                    id="sendNotifications"
                                    name="sendNotifications"
                                    type="checkbox"
                                    checked={sendNotifications}
                                    onChange={(e) => setSendNotifications(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                />
                            </div>
                            <div className="ml-4 text-sm">
                                <label htmlFor="sendNotifications" className="font-medium text-gray-800 cursor-pointer">
                                    อนุญาตให้ส่งอีเมลแจ้งเตือน
                                </label>
                                <p className="text-gray-500 text-xs mt-1">
                                    ระบบจะส่งอีเมลแจ้งเตือนคุณเมื่อถึงเวลาอ่านหนังสือตามตารางที่กำหนด
                                </p>
                            </div>
                        </div>

                        {/* 5. Action Buttons */}
                        <div className="flex gap-4 pt-6 justify-end border-t border-gray-200">
                            <button 
                                type="button" 
                                onClick={handleCancel} 
                                className="px-8 py-3 rounded-full bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition text-base"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-base"
                            >
                                บันทึกแผน
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}