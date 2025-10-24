import React, { useState } from 'react';
import axios from 'axios';
import Sidebar from "../components/Sidebar";
// A placeholder for the Sidebar component to make this file self-contained and runnable.
// In your actual project, you would import this from "../components/Sidebar"

export default function CoursePlannerAddNew() {
    const [subjects, setSubjects] = useState([
        { courseName: '', courseCode: '', credits: '', importance: 'Medium' },
    ]);

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
        // Prevent removing the last remaining form
        if (subjects.length <= 1) return;
        const list = [...subjects];
        list.splice(index, 1);
        setSubjects(list);
    };
    
    const handleCancel = () => {
        setSubjects([{ courseName: '', courseCode: '', credits: '', importance: 'Medium' }]);
    };

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

        // --- Map data for API ---
        const importanceMap = { Low: 1, Medium: 2, High: 3 };
        const payload = subjects.map(subject => ({
            title: subject.courseName,
            subject: subject.courseCode,
            credits: parseInt(subject.credits, 10), // Ensure credits is a number
            priority: importanceMap[subject.importance] || 2, // Map importance to 'level' field
        }));

        try {
            // Assuming the backend can handle an array of subjects. 
            // If not, you might need to loop and send one by one.
            const res = await axios.post(
                "http://localhost:5000/subject/", // Changed endpoint to indicate bulk operation
                payload,
                { withCredentials: true }
            );
            alert(res.data.message || "เพิ่มรายวิชาสำเร็จ!");
            handleCancel(); // Reset form on success
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

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-8">
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

                                    {/* Course Code */}
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนบท</label>
                                        <input
                                            type="text"
                                            name="courseCode"
                                            value={subject.courseCode}
                                            onChange={e => handleSubjectChange(index, e)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                            placeholder="e.g., CS101"
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
