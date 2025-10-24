import React from "react";
import Sidebar from "../components/Sidebar";

export default function Home() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6">
        <h2 className="text-xl font-bold mb-4">มีเวลาที่ต้องอ่านหนังสือ!</h2>
        <div className="bg-white shadow-md rounded-lg p-6 flex justify-between">
          <div className="text-center">
            <p className="text-lg font-bold">วิชาคณิต</p>
            <p className="text-indigo-600 text-2xl">10</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">วิทย์</p>
            <p className="text-indigo-600 text-2xl">15</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">สังคม</p>
            <p className="text-indigo-600 text-2xl">5</p>
          </div>
        </div>
      </div>
    </div>
  );
}
