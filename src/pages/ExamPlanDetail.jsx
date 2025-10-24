import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar'; // Adjust the path to your Sidebar component

export default function ExamPlanDetail() {
    const { id } = useParams(); // Get the plan ID from the URL
    const [plan, setPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Fetch the specific exam plan when the component mounts or the ID changes
    useEffect(() => {
        const fetchPlan = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await axios.get(`http://localhost:5000/api/exam-plan/${id}`, {
                    withCredentials: true,
                });
                setPlan(response.data);
            } catch (err) {
                console.error("Failed to fetch exam plan:", err);
                setError(err.response?.data?.message || "Could not load the exam plan.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlan();
    }, [id]);

    // Process the study plan into a Map for quick lookups by date (YYYY-MM-DD)
    const scheduleMap = useMemo(() => {
        if (!plan?.study_plan) return new Map();
        
        const map = new Map();
        plan.study_plan.forEach(item => {
            map.set(item.date, item);
        });
        return map;
    }, [plan]);

    // Function to get all 7 days of the week, starting from Monday
    const getWeekDays = (date) => {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust so Monday is the first day
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }).map((_, i) => {
            const weekDay = new Date(startOfWeek);
            weekDay.setDate(startOfWeek.getDate() + i);
            return weekDay;
        });
    };
    
    const weekDays = getWeekDays(currentDate);
    const weekDaysHeaders = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const changeWeek = (amount) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + amount);
            return newDate;
        });
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading Schedule...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }
    
    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <h1 className="text-3xl font-bold text-gray-800">{plan?.exam_title}</h1>
                           <p className="text-gray-500">
                                Exam Date: {new Date(plan?.exam_date + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'long' })}
                           </p>
                        </div>
                        <Link to="/exam-planner" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                            Back to All Plans
                        </Link>
                    </div>

                    {/* Week Navigation */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-t-xl shadow">
                        <button onClick={() => changeWeek(-7)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
                            &lt; Previous
                        </button>
                        <h2 className="text-xl font-semibold text-center">
                            {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeWeek(7)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
                            Next &gt;
                        </button>
                    </div>

                    {/* Schedule Grid */}
                    <div className="grid grid-cols-7 bg-white rounded-b-xl shadow border-t">
                        {/* Day Headers */}
                        {weekDaysHeaders.map(header => (
                            <div key={header} className="text-center font-bold p-3 border-b border-r border-gray-200 bg-gray-100">
                                {header}
                            </div>
                        ))}
                        
                        {/* Day Cells */}
                        {weekDays.map((day) => {
                            const dateString = day.toISOString().split('T')[0]; // Format to 'YYYY-MM-DD'
                            const session = scheduleMap.get(dateString);
                            const isToday = new Date().toISOString().split('T')[0] === dateString;

                            return (
                                <div key={dateString} className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                                    <div className={`font-bold text-center mb-2 ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {day.getDate()}
                                    </div>
                                    {session ? (
                                        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-2 rounded-md text-sm">
                                            <p className="font-bold truncate">{session.subject}</p>
                                            <p className="text-xs">{session.startTime} - {session.endTime}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 text-xs mt-4">-</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}