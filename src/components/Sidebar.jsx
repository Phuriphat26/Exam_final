import React from "react";
import { Calendar, LogOut, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="h-screen w-56 bg-white shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-4 py-6">
          <Calendar className="text-indigo-500" />
          <h1 className="text-lg font-semibold text-indigo-600">Exam Planner</h1>
        </div>

        <nav className="flex flex-col gap-2 px-4">
          <Link to="/" className="w-full text-left px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-medium">
            Dashboard
          </Link>
          <Link to="/Calendar" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Calendar
          </Link>
          <Link to="/Subject" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Subject
          </Link>
          <Link to="/profile" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Time
          </Link>
          <Link to="/ExamPlanDetail" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            ตาราง
          </Link>
          <Link to="/ExamPlanList" className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            แผนการอ่าน
          </Link>

          {/* ✅ Add New เชื่อมไปหน้า Create Exam */}
          <Link
            to="/add"
            className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-blue-50 text-indigo-600 font-medium hover:from-indigo-200 hover:to-blue-100 transition"
          >
            <Plus size={16} /> Add New
          </Link>
        </nav>
      </div>

      <div className="px-4 pb-6">
        <button className="flex items-center gap-2 text-gray-500 hover:text-red-500">
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
}
