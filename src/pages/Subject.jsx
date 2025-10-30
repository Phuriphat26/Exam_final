import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
import { useNavigate } from 'react-router-dom';

export default function CoursePlannerAddNew() {
    const navigate = useNavigate();

    // State for new subjects to be added via the form
    const [subjects, setSubjects] = useState([
        { courseName: '', courseCode: '', credits: '', importance: 'Medium' },
    ]);

    // New states for fetching and displaying existing subjects
    const [existingSubjects, setExistingSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching Logic (GET Request) ---
    const fetchExistingSubjects = async () => {
        setLoading(true);
        setError(null);
        try {
            // API call to fetch all existing subjects
            const res = await axios.get(
                "http://localhost:5000/subject/",
                { withCredentials: true }
            );

            if (res.data && Array.isArray(res.data)) {
                setExistingSubjects(res.data);
            } else {
                setExistingSubjects([]);
            }

        } catch (err) {
            console.error("Error fetching subjects:", err);
            if (err.response && err.response.status === 401) {
                setError("คุณไม่มีสิทธิ์เข้าถึง (กรุณา Login)");
            } else {
                setError("เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา");
            }
            setExistingSubjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Run fetching logic once when the component mounts
    useEffect(() => {
        fetchExistingSubjects();
    }, []); 
    // -------------------------------------

    const handleSubjectChange = (index, e) => {
        const { name, value } = e.target;
        const list = [...subjects];
        list[index][name] = value;
        setSubjects(list);
    };

    const handleAddSubject = () => {
        setSubjects([...subjects, { courseName: '', courseCode: '', credits: '', importance: 'Medium' }]);
    };

    const handleRemoveSubject = (index) => {
        if (subjects.length <= 1) return;
        const list = [...subjects];
        list.splice(index, 1);
        setSubjects(list);
    };

    const handleCancel = () => {
        setSubjects([{ courseName: '', courseCode: '', credits: '', importance: 'Medium' }]);
    };

    const handleGoToEdit = () => {
        navigate('/course-planner/edit');
    };

    // --- Submission Logic (POST Request) ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- Client-side validation ---
        for (const subject of subjects) {
            if (!subject.courseName.trim() || !subject.courseCode.trim() || !subject.credits) {
                alert('กรุณากรอกข้อมูล: ชื่อวิชา, จำนวนบท และหน่วยกิต ให้ครบทุกช่อง');
                return;
            }
            if (isNaN(subject.credits) || Number(subject.credits) <= 0) {
                alert(`หน่วยกิตสำหรับวิชา "${subject.courseName}" ต้องเป็นตัวเลขที่มากกว่า 0`);
                return;
            }
        }

        // --- Map data for API payload ---
        const importanceMap = { Low: 1, Medium: 2, High: 3 };
        const payload = subjects.map(subject => ({
            title: subject.courseName, // maps to MongoDB 'title'
            subject: subject.courseCode, // maps to MongoDB 'subject' (chapters)
            credits: parseInt(subject.credits, 10), // maps to MongoDB 'credits'
            priority: importanceMap[subject.importance] || 2, // maps to MongoDB 'priority'
        }));

        try {
            const res = await axios.post(
                "http://localhost:5000/subject/",
                payload,
                { withCredentials: true }
            );
            alert(res.data.message || "เพิ่มรายวิชาสำเร็จ!");
            handleCancel(); // Reset form on success
            fetchExistingSubjects(); // Refresh the list of existing subjects
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert("กรุณา login ก่อน");
            } else {
                console.error("An error occurred during submission:", err);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">เพิ่มรายวิชา</h1>

                    {/* --- Display Existing Subjects Section (NEW) --- */}
                    <div className="mb-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                            📚 รายวิชาที่มีอยู่แล้ว
                            <span className="text-sm font-normal text-yellow-600">({existingSubjects.length} วิชา)</span>
                        </h2>

                        {loading && <p className="text-gray-600">กำลังโหลด...</p>}
                        {error && <p className="text-red-600 font-medium">❌ {error}</p>}
                        
                        {!loading && !error && (
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                {existingSubjects.length > 0 ? (
                                    existingSubjects.map((subject, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 text-sm">
                                            {/* subject.title and subject.subject fields come directly from MongoDB */}
                                            <span className="font-medium text-gray-700 truncate mr-4">
                                                {subject.title} (จำนวน {subject.subject} บท)
                                            </span>
                                            <span className="text-blue-600 font-mono flex-shrink-0">
                                                {subject.credits} หน่วยกิต
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">ยังไม่มีรายวิชาในระบบ</p>
                                )}
                            </div>
                        )}
                        <p className="mt-4 text-sm text-yellow-700">
                            หากต้องการแก้ไขหรือลบรายวิชาเหล่านี้ ให้กดปุ่ม **"แก้ไขรายวิชา"**
                        </p>
                    </div>
                    {/* ------------------------------------------------ */}


                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8">
                        <h2 className="text-2xl font-semibold text-gray-800">เพิ่มรายวิชาใหม่</h2>
                        {subjects.map((subject, index) => (
                            <div key={index} className="border border-gray-200 rounded-xl p-6 relative bg-gray-50/50">
                                <span className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg">{index + 1}</span>
                                {subjects.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubject(index)}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-mono hover:bg-red-600 transition-transform transform hover:scale-110"
                                        aria-label="Remove subject"
                                    >
                                        &times;
                                    </button>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-x-6 gap-y-6">
                                    {/* Course Name */}
                                    <div className="lg:col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อวิชา</label>
                                        <input
                                            type="text"
                                            name="courseName"
                                            value={subject.courseName}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                            placeholder="e.g., Introduction to Programming"
                                        />
                                    </div>

                                    {/* Course Code (Jumlah Bot/Chapter) */}
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนบท</label>
                                        <input
                                            type="number"
                                            name="courseCode"
                                            value={subject.courseCode}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                            placeholder="3, 5"
                                        />
                                    </div>
                                    
                                    {/* Credits */}
                                    <div className="lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">หน่วยกิต</label>
                                        <input
                                            type="number"
                                            name="credits"
                                            value={subject.credits}
                                            onChange={e => handleSubjectChange(index, e)}
                                            min="0"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                            placeholder="3"
                                        />
                                    </div>

                                    {/* Importance */}
                                    <div className="lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ความสำคัญ</label>
                                        <select
                                            name="importance"
                                            value={subject.importance}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                        >
                                            <option value="Low">น้อย</option>
                                            <option value="Medium">ปานกลาง</option>
                                            <option value="High">มาก</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Subject Button */}
                        <div>
                            <button
                                type="button"
                                onClick={handleAddSubject}
                                className="w-full py-3 rounded-lg border-2 border-dashed border-blue-500 text-blue-600 font-semibold hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                เพิ่มรายวิชา
                            </button>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4 justify-end border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleGoToEdit}
                                className="px-8 py-3 rounded-full bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition text-base"
                            >
                                แก้ไขรายวิชา 📝
                            </button>
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
                                บันทึก
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}