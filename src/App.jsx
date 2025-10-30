import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your page components
import PreDetail from "./pages/PreDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import AddNew from "./pages/AddNew";
import Profile from "./pages/Profile";
// Import your PrivateRoute component

import Subject from './pages/Subject';
import ExamPlanDetail from './pages/ExamPlanDetail';
import Calendar from "./pages/Calendar";
import ExamPlanList from './pages/ExamPlanList';
import './index.css';
import Timer from "./pages/Time";
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PreDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/add" element={<AddNew />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/subject" element={<Subject />} />
        <Route path="/exam-plan/:id" element={<ExamPlanDetail />} />
        <Route path="/Calendar" element={<Calendar />} />
        <Route path="/ExamPlanList" element={<ExamPlanList />} />
        <Route path="/time" element={<Timer />} />
      </Routes>
    </Router> // Remove the extra </Router> from here
  );
}

export default App;