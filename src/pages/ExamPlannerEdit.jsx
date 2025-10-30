import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar"; // ❌ [FIX] ลบ/คอมเมนต์การ import ที่ไม่จำเป็นออก
// [EDIT] Import hooks สำหรับดึง ID จาก URL และการย้ายหน้า
import { useParams, useNavigate } from 'react-router-dom';

// [EDIT] ตั้งชื่อ Component ใหม่ (เช่น ExamPlannerEdit)
export default function ExamPlannerEdit() {
    // [EDIT] ดึง planId จาก URL และ navigate function
    const { planId } = useParams();
    const navigate = useNavigate();

    // State for Exam Details
    const [examTitle, setExamTitle] = useState('');
    const [examSubjects, setExamSubjects] = useState([]); 
    const [examDate, setExamDate] = useState('');

    // State for fetching subjects (เหมือนเดิม)
    const [subjects, setSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    const [subjectError, setSubjectError] = useState('');

    // State for preparation period (เหมือนเดิม)
    const [prepStartDate, setPrepStartDate] = useState('');
    const [prepEndDate, setPrepEndDate] = useState('');
    const [defaultStartTime, setDefaultStartTime] = useState('09:00');
    const [defaultEndTime, setDefaultEndTime] = useState('17:00');
    
    // State for the generated daily schedule (เหมือนเดิม)
    const [dailySchedule, setDailySchedule] = useState([]);

    // State for notification preference (เหมือนเดิม)
    const [sendNotifications, setSendNotifications] = useState(true);

    // [EDIT] State สำหรับการโหลดแผนเก่า
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [planError, setPlanError] = useState('');

    // Effect to fetch user's subjects on component mount (เหมือนเดิม)
    useEffect(() => {
        const fetchSubjects = async () => {
            console.log("🔄 Starting to fetch subjects...");
            setIsLoadingSubjects(true);
            setSubjectError('');
            
            try {
                const API_URL = "http://localhost:5000/api/subjects/";
                const response = await axios.get(API_URL, { 
                    withCredentials: true,
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const fetchedSubjects = response.data;

                if (!Array.isArray(fetchedSubjects)) {
                    setSubjectError("ข้อมูลที่ได้รับไม่ถูกต้อง");
                    setSubjects([]);
                } else if (fetchedSubjects.length === 0) {
                    setSubjectError("ไม่พบรายวิชาในระบบ (กรุณาไปที่หน้า 'วิชาของฉัน' เพื่อเพิ่มวิชา)");
                    setSubjects([]);
                } else {
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
    }, []); // ทำงานครั้งเดียว

    // [EDIT] Effect ใหม่: ดึงข้อมูลแผนเก่ามาแสดง
    useEffect(() => {
        const fetchPlan = async () => {
            if (!planId) {
                setIsLoadingPlan(false);
                setPlanError("ไม่พบ ID ของแผน");
                return;
            }
            console.log(`🔄 Fetching plan with ID: ${planId}...`);
            setIsLoadingPlan(true);
            setPlanError('');
            
            try {
                const API_URL = `http://localhost:5000/api/exam-plan/${planId}`;
                const response = await axios.get(API_URL, { 
                    withCredentials: true,
                    timeout: 5000,
                });
                
                const plan = response.data;
                console.log("✅ Fetched plan:", plan);

                // Set ค่า State ทั้งหมดจากข้อมูลที่ดึงมา
                setExamTitle(plan.exam_title || '');
                setExamSubjects(plan.subjects || []);
                // (ต้องมั่นใจว่า backend ส่ง YYYY-MM-DD)
                setExamDate(plan.exam_date ? plan.exam_date.split('T')[0] : '');
                
                setPrepStartDate(plan.prep_start_date ? plan.prep_start_date.split('T')[0] : '');
                setPrepEndDate(plan.prep_end_date ? plan.prep_end_date.split('T')[0] : '');
                setDefaultStartTime(plan.default_start_time || '09:00');
                setDefaultEndTime(plan.default_end_time || '17:00');
                
                // *** สำคัญ ***
                // ใช้ 'raw_study_plan_input' ที่เราบันทึกไว้ เพื่อกู้คืนตารางรายวัน
                if (plan.raw_study_plan_input && plan.raw_study_plan_input.length > 0) {
                    const savedSchedule = plan.raw_study_plan_input.map(day => ({
                        ...day,
                        date: day.date.split('T')[0] // กันเหนียว
                    }));
                    setDailySchedule(savedSchedule);
                }
                
                setSendNotifications(plan.send_notifications || false);

            } catch (error) {
                console.error("❌ Failed to fetch plan:", error);
                if (error.response) {
                    setPlanError(`เซิร์ฟเวอร์ตอบกลับ: ${error.response.data.message || error.response.status}`);
                } else if (error.request) {
                    setPlanError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
                } else {
                    setPlanError(`เกิดข้อผิดพลาด: ${error.message}`);
                }
            } finally {
                setIsLoadingPlan(false);
                console.log("🏁 Fetch plan completed");
            }
        };
        
        fetchPlan();
    }, [planId]); // ทำงานเมื่อ planId เปลี่ยน

    
    // [EDIT] แก้ไข Effect นี้:
    // เราจะให้มันทำงาน *เหมือนเดิม*
    // แต่ข้อมูลเริ่มต้นจะถูกแทนที่ด้วย 'raw_study_plan_input' จาก Effect ด้านบน
    // ซึ่ง Effect นี้จะทำงาน *หลังจาก* Effect (fetchPlan) ได้ setPrepStartDate/EndDate
    // แต่เราได้ setDailySchedule จาก `raw_study_plan_input` ไปแล้ว มันจึงไม่เป็นไร
    // **หรือ** ถ้าผู้ใช้ *เปลี่ยน* วันที่ในหน้า Edit นี้ มันก็จะ regenerate ให้อัตโนมัติ (ซึ่งถูกต้อง)
    useEffect(() => {
        // เช็กว่ากำลังโหลดแผนอยู่หรือเปล่า ถ้าใช่ อย่าเพิ่ง gen ทับ
        if (isLoadingPlan) return; 

        if (prepStartDate && prepEndDate && new Date(prepStartDate) <= new Date(prepEndDate)) {
            const start = new Date(prepStartDate);
            const end = new Date(prepEndDate);
            const days = [];
            
            // [EDIT] แก้ไข: ตรวจสอบ dailySchedule ที่มีอยู่ *ก่อน* วนลูป
            // เพื่อป้องกันการ reset ค่า เมื่อผู้ใช้แก้ default time
            const existingScheduleMap = new Map(dailySchedule.map(d => [d.date, d]));

            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                const dateString = new Date(dt).toISOString().split('T')[0];
                const existingDay = existingScheduleMap.get(dateString);

                if (existingDay) {
                    // ถ้ามี ใช้ข้อมูลเดิม
                    days.push(existingDay);
                } else {
                    // ถ้าไม่มี (เช่น ขยายช่วงเวลา) ให้ใช้ค่า default
                    days.push({
                        date: dateString,
                        isAvailable: true,
                        startTime: defaultStartTime,
                        endTime: defaultEndTime,
                    });
                }
            }
            
            // [EDIT] กรองเฉพาะวันที่อยู่ในช่วงใหม่
            const newSchedule = days.filter(d => {
                const dDate = new Date(d.date);
                // ปรับเวลาของ start/end ให้เป็นเที่ยงคืนเพื่อการเปรียบเทียบที่แม่นยำ
                const startDate = new Date(start.toISOString().split('T')[0] + 'T00:00:00');
                const endDate = new Date(end.toISOString().split('T')[0] + 'T00:00:00');
                return dDate >= startDate && dDate <= endDate;
            });
            
            setDailySchedule(newSchedule);

        } else {
            setDailySchedule([]);
        }
    // [EDIT] ตัด dailySchedule ออกจาก dependency array เพื่อป้องกันการวนลูปสร้างใหม่
    }, [prepStartDate, prepEndDate, defaultStartTime, defaultEndTime, isLoadingPlan]); 

    // Memoized calculation (เหมือนเดิม)
    const formattedDays = useMemo(() => {
        return dailySchedule.map(day => {
            const dateObj = new Date(day.date + 'T00:00:00'); // ใช้วันที่แบบ local
            return {
                ...day,
                displayDate: dateObj.toLocaleDateString('th-TH', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                }),
            };
        });
    }, [dailySchedule]);

    // Handler to update a specific day (เหมือนเดิม)
    const handleDayChange = (index, field, value) => {
        const updatedSchedule = [...dailySchedule];
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
        setDailySchedule(updatedSchedule);
    };
    
    // Handler to add/remove subjects (เหมือนเดิม)
    const handleSubjectChange = (e) => {
        const { value, checked } = e.target;
    
        if (checked) {
            const selectedSubject = subjects.find(s => s.title === value);
            if (selectedSubject) {
                setExamSubjects(prev => [
                    ...prev,
                    {
                        name: selectedSubject.title,
                        priority: selectedSubject.priority ?? 1,
                    },
                ]);
            }
        } else {
            setExamSubjects(prev => prev.filter(subject => subject.name !== value));
        }
    };

    // 💡 [NEW] Handlers สำหรับปุ่มเลือกทั้งหมด
    const handleSelectAllDays = () => {
        setDailySchedule(prevSchedule => 
            prevSchedule.map(day => ({ ...day, isAvailable: true }))
        );
    };

    const handleDeselectAllDays = () => {
        setDailySchedule(prevSchedule => 
            prevSchedule.map(day => ({ ...day, isAvailable: false }))
        );
    };

    // [EDIT] Handler to reset/cancel
    const handleCancel = () => {
        // กลับไปหน้ารวมแผนการสอบ
        navigate('/ExamPlanList'); 
    };

    // [EDIT] Handler to submit form (เปลี่ยนเป็น handleUpdate)
    const handleUpdate = async (e) => {
        e.preventDefault();
        
        console.log("🚀 Submitting exam plan UPDATE...");
        
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
            studyPlan, // ตารางที่ filter แล้ว
            sendNotifications: sendNotifications,
            
            // [EDIT] ส่งข้อมูล input กลับไปด้วย (ตามที่ backend PUT route ต้องการ)
            prepStartDate: prepStartDate,
            prepEndDate: prepEndDate,
            defaultStartTime: defaultStartTime,
            defaultEndTime: defaultEndTime,
            raw_study_plan_input: dailySchedule // ตารางดิบก่อน filter
        };

        console.log("📤 Update Payload:", payload);

        try {
            // [EDIT] เปลี่ยนเป็น axios.put และใส่ planId
            const res = await axios.put(
                `http://localhost:5000/api/exam-plan/${planId}`, 
                payload,
                { 
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log("✅ Success:", res.data);
            alert(res.data.message || "อัปเดตแผนการเตรียมสอบสำเร็จ!");
            
            // [EDIT] พาผู้ใช้กลับไปหน้ารวม (Path ที่ถูกต้อง)
            navigate('/ExamPlanList');

        } catch (err) {
            console.error("❌ Submission error:", err);
            console.error("Response:", err.response?.data);
            alert(err.response?.data?.message || err.response?.data?.error || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        }
    };

    // [EDIT] เพิ่ม UI สำหรับ Loading และ Error
    if (isLoadingPlan) {
        return (
            <div className="flex bg-gray-50 min-h-screen">
                {/* <Sidebar /> */} {/* ❌ [FIX] คอมเมนต์ Sidebar ออก */}
                <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-gray-600">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-xl font-semibold">กำลังโหลดข้อมูลแผน...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (planError) {
         return (
            <div className="flex bg-gray-50 min-h-screen">
                {/* <Sidebar /> */} {/* ❌ [FIX] คอมเมนต์ Sidebar ออก */}
                <div className="flex-1 p-4 sm:p-8">
                    <div className="max-w-lg mx-auto mt-10 text-center p-6 bg-white rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
                        <p className="text-gray-700 mb-6">{planError}</p>
                        <button 
                            onClick={() => navigate('/ExamPlanList')} // แก้เป็นกลับหน้ารวมเสมอ
                            className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                        >
                            กลับไปหน้ารวม
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- JSX Return (เหมือนเดิมเกือบทั้งหมด) ---
    return (
        <div className="flex bg-gray-50 min-h-screen">
            { <Sidebar /> } {/* ❌ [FIX] คอมเมนต์ Sidebar ออก */}

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    
                    {/* [EDIT] เปลี่ยนหัวข้อ */}
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">แก้ไขแผนเตรียมสอบ</h1>

                    {/* [EDIT] เปลี่ยน onSubmit เป็น handleUpdate */}
                    <form onSubmit={handleUpdate} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8">
                        
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
                                                href="/Subject"
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
                                                        // [EDIT] checked logic ต้องเช็กจาก examSubjects state
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
                                            href="/Subject" 
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
                                
                                {/* 💡 [NEW] เพิ่มปุ่มเลือกทั้งหมด/ยกเลิกทั้งหมด */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllDays}
                                        className="px-4 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition"
                                    >
                                        เลือกทุกวัน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeselectAllDays}
                                        className="px-4 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                                    >
                                        ยกเลิกทุกวัน
                                    </button>
                                </div>
                                {/* 💡 [END NEW] */}

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
                                {/* [EDIT] เปลี่ยนข้อความปุ่ม */}
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

