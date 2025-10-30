import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function CoursePlannerEdit() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching Logic (useEffect) ---
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                // ปรับ port หากจำเป็น (คุณใช้ 5173 ในภาพ แต่ API เป็น 5000)
                const res = await axios.get(
                    "http://localhost:5000/subject/",
                    { withCredentials: true }
                );

                const rawData = Array.isArray(res.data) ? res.data : []; 

                const importanceMap = { 1: 'Low', 2: 'Medium', 3: 'High' };
                const fetchedSubjects = rawData.map(item => ({
                    _id: item._id, 
                    courseName: item.title,
                    courseCode: item.subject,
                    credits: item.credits.toString(),
                    importance: importanceMap[item.priority] || 'Medium',
                    isDeleted: false,
                }));

                setSubjects(fetchedSubjects);
                setIsLoading(false);
            } catch (err) {
                console.error("Error fetching subjects:", err);
                // ตรวจสอบสถานะ 401 (ไม่ได้เข้าสู่ระบบ)
                if (err.response && err.response.status === 401) {
                     setError("กรุณา Login ก่อนจึงจะสามารถแก้ไขรายวิชาได้");
                } else {
                    setError("ไม่สามารถโหลดรายวิชาได้. กรุณาลองอีกครั้ง.");
                }
                setIsLoading(false);
            }
        };

        fetchSubjects();
    }, []);

    // --- Handlers ---
    const handleSubjectChange = (index, e) => {
        const { name, value } = e.target;
        const list = [...subjects];
        list[index][name] = value;
        setSubjects(list);
    };

    const handleMarkForDeletion = (index) => {
        const list = [...subjects];
        list[index].isDeleted = !list[index].isDeleted;
        setSubjects(list);
    };

    const handleGoToAdd = () => {
        navigate('/course-planner/add');
    };

    const handleBackToDashboard = () => {
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const subjectsToUpdate = subjects.filter(sub => !sub.isDeleted && sub._id);
        const subjectsToDelete = subjects.filter(sub => sub.isDeleted && sub._id);

        // --- Client-side validation ---
        for (const subject of subjectsToUpdate) {
            if (!subject.courseName.trim() || !subject.courseCode.trim() || !subject.credits) {
                alert('กรุณากรอกข้อมูล: ชื่อวิชา, จำนวนบท และหน่วยกิต ให้ครบทุกช่องสำหรับวิชาที่ต้องการบันทึก');
                return;
            }
            if (isNaN(subject.credits) || Number(subject.credits) <= 0) {
                alert(`หน่วยกิตสำหรับวิชา "${subject.courseName}" ต้องเป็นตัวเลขที่มากกว่า 0`);
                return;
            }
        }

        // --- Prepare Payloads ---
        const importanceMap = { Low: 1, Medium: 2, High: 3 };
        const updatePromises = subjectsToUpdate.map(subject => {
            const payload = {
                title: subject.courseName,
                subject: subject.courseCode,
                credits: parseInt(subject.credits, 10),
                priority: importanceMap[subject.importance] || 2,
            };
            return axios.put(`http://localhost:5000/subject/${subject._id}`, payload, { withCredentials: true });
        });

        const deletePromises = subjectsToDelete.map(subject => 
            axios.delete(`http://localhost:5000/subject/${subject._id}`, { withCredentials: true })
        );

        try {
            await Promise.all([...updatePromises, ...deletePromises]);

            alert("บันทึกการแก้ไขสำเร็จ!");
            navigate(0); // Refresh the component to show updated list
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert("กรุณา login ก่อน");
            } else {
                console.error("An error occurred during submission:", err);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลการแก้ไข");
            }
        }
    };

    // --- Render Logic for Loading/Error ---
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <p className="text-xl font-semibold text-blue-600">กำลังโหลดข้อมูลวิชา...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-100 font-sans">
                <Sidebar />
                <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
                    <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                        <p className="text-xl font-semibold text-red-600 mb-6">{error}</p>
                        <button
                            onClick={handleBackToDashboard}
                            className="px-8 py-3 rounded-full bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition text-base"
                        >
                            กลับหน้าหลัก
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (subjects.length === 0) {
        return (
            <div className="flex min-h-screen bg-gray-100 font-sans">
                <Sidebar />
                <div className="flex-1 p-4 sm:p-8">
                    <div className="max-w-5xl mx-auto">
                        <h1 className="text-3xl font-bold mb-6 text-gray-800">แก้ไขรายวิชา</h1>
                        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
                            <p className="text-xl text-gray-600 mb-6">ยังไม่มีรายวิชาให้แก้ไข</p>
                            <button
                                onClick={handleGoToAdd}
                                className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-base"
                            >
                                เพิ่มรายวิชาใหม่ ➕
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Render (Form) ---
    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            <Sidebar />

            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">แก้ไขรายวิชา 📝</h1>
                    <p className="mb-6 text-gray-600">แก้ไขข้อมูลวิชาหรือทำเครื่องหมายวิชาที่ต้องการลบ</p>

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8">
                        {subjects.map((subject, index) => (
                            <div 
                                key={subject._id || index} 
                                className={`border rounded-xl p-6 relative transition-all ${
                                    subject.isDeleted 
                                        ? 'border-red-500 bg-red-50/50 opacity-50' 
                                        : 'border-gray-200 bg-gray-50/50'
                                }`}
                            >
                                <span className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg">{index + 1}</span>

                                {/* Delete/Restore Button */}
                                <button
                                    type="button"
                                    onClick={() => handleMarkForDeletion(index)}
                                    className={`absolute -top-3 -right-3 rounded-full h-8 w-8 flex items-center justify-center font-mono transition-transform transform hover:scale-110 ${
                                        subject.isDeleted 
                                            ? 'bg-green-500 text-white hover:bg-green-600' 
                                            : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                    aria-label={subject.isDeleted ? "Restore subject" : "Mark for deletion"}
                                >
                                    {subject.isDeleted ? "⟲" : "🗑"}
                                </button>

                                {subject.isDeleted && (
                                    <p className="text-center text-red-600 font-semibold mb-4">จะถูกลบเมื่อกด 'บันทึกการแก้ไข'</p>
                                )}

                                <fieldset disabled={subject.isDeleted}>
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

                                        {/* Course Code (Jumlah Bab) */}
                                        <div className="lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนบท</label>
                                            <input
                                                type="number"
                                                name="courseCode"
                                                value={subject.courseCode}
                                                onChange={e => handleSubjectChange(index, e)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                                placeholder="3,5"
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
                                </fieldset>
                            </div>
                        ))}

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4 justify-end border-t border-gray-200">
                            {/* Button to go back to the Add page */}
                            <button
                                type="button"
                                onClick={handleGoToAdd}
                                className="px-8 py-3 rounded-full bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition text-base"
                            >
                                เพิ่มรายวิชา ➕
                            </button>

                            {/* Button to go back to dashboard/home */}
                            <button
                                type="button"
                                onClick={handleBackToDashboard}
                                className="px-8 py-3 rounded-full bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition text-base"
                            >
                                กลับหน้าหลัก
                            </button>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-base"
                            >
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}