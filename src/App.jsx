import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your page components
import PreDetail from "./pages/PreDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import AddNew from "./pages/AddNew";
import Profile from "./pages/Profile";
// Import your PrivateRoute component (Removed/commented out since it's not used in the Routes)
// import PrivateRoute from "./components/PrivateRoute"; // Assuming it was in a components folder

import Subject from './pages/Subject';
import ExamPlanDetail from './pages/ExamPlanDetail';
import Calendar from "./pages/Calendar";
import ExamPlanList from './pages/ExamPlanList';
import './index.css';
import Timer from "./pages/Time";
import ExamPlannerEdit from "./pages/ExamPlannerEdit";
import Subjectedit from "./pages/Subjectedit";
import Admin from "./pages/Admin";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PreDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home" element={<Home />} />
        {/* Route for adding new item */}
        <Route path="/Admin" element={<Admin/>} /> 
    
        {/* [EDIT] เพิ่ม Route นี้เพื่อให้ปุ่ม "จัดตาราง" (จาก Subject.js) ทำงาน */}
        {/* Note: This route is functionally identical to /add. Keep one or the other. I'll keep it as you explicitly mentioned it. */}
        <Route path="/add" element={<AddNew />} />
        
        <Route path="/Profile" element={<Profile />} />
        <Route path="/subject" element={<Subject />} />
        
        {/* Route นี้สำหรับ "ดูรายละเอียด" (ถูกต้อง) */}
        <Route path="/exam-plan/:id" element={<ExamPlanDetail />} />
        
        <Route path="/Calendar" element={<Calendar />} />
        <Route path="/ExamPlanList" element={<ExamPlanList />} />
        <Route path="/time" element={<Timer />} />
        
        {/* [EDIT] แก้ไข Route นี้ให้รับ ID ได้ (เพื่อให้ปุ่ม "แก้ไข" ทำงาน) */}
        <Route path="/exam-planner/edit/:planId" element={<ExamPlannerEdit />}/>
        <Route path="/course-planner/edit" element={<Subjectedit />} />
        {/* If you wanted to use PrivateRoute, you'd wrap the routes like this: */}
        {/* <Route element={<PrivateRoute />}>
          <Route path="/home" element={<Home />} />
          ... other protected routes ...
        </Route> */}
        
      </Routes>
    </Router>
  );
}

export default App;