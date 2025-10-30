import React, { useState, useEffect } from 'react';
// ไม่ต้อง import './Time.css'; แล้ว

// --- CSS Styles ---
// เราจะเก็บ CSS ทั้งหมดไว้ในตัวแปร string นี้
const cssStyles = `
/* Import Font (ถ้าต้องการ) */
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap');

:root {
    --primary-color: #4a69e2;
    --bg-light-blue: #eef2ff;
    --sidebar-bg: #ffffff;
    --text-color: #333;
    --text-secondary: #888;
}

body {
    font-family: 'Sarabun', sans-serif;
    background-color: var(--bg-light-blue);
    margin: 0;
}

/* --- Layout หลัก --- */
.container {
    display: flex;
    height: 100vh;
}

/* --- Sidebar --- */
.sidebar {
    width: 250px;
    background-color: var(--sidebar-bg);
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e0e0e0;
}

.sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2.5rem;
}

.sidebar-header svg {
    width: 24px;
    height: 24px;
    color: var(--primary-color);
}

.sidebar-header h1 {
    font-size: 1.25rem;
    color: var(--primary-color);
    font-weight: 700;
}

.nav-menu {
    list-style: none;
    flex-grow: 1;
    padding: 0;
}

.nav-item {
    margin-bottom: 1rem;
}

.nav-link {
    text-decoration: none;
    color: var(--text-secondary);
    font-size: 1rem;
    padding: 0.75rem 1rem;
    display: block;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.nav-link:hover {
    background-color: #f4f4f4;
    color: var(--text-color);
}

.nav-link.active {
    background-color: #e9edff;
    color: var(--primary-color);
    font-weight: 500;
}

.btn-add-new {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.2s ease;
    margin-bottom: 1rem;
}

.btn-add-new:hover {
    background-color: #3a52b4;
}

.sidebar-footer {
    margin-top: auto;
}

.btn-logout {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.75rem 1rem;
    width: 100%;
    text-align: left;
    font-family: 'Sarabun', sans-serif;
}

/* --- Main Content --- */
.main-content {
    flex-grow: 1;
    padding: 2rem 3rem;
    display: flex;
    flex-direction: column;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-title {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 400;
    letter-spacing: 0.5px;
}

#current-time {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-color);
}

.timer-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
}

.timer-circle {
    width: 400px;
    height: 400px;
    border-radius: 50%;
    border: 15px solid var(--primary-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #ffffff30;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

#countdown-display {
    font-size: 3.5rem; /* ขนาดจะถูกปรับโดย inline style ด้านล่าง */
    font-weight: 700;
    color: var(--text-color);
    text-align: center;
    line-height: 1.2;
}

#next-event-subject {
    font-size: 1.5rem;
    color: var(--primary-color);
    margin-top: 10px;
}

.btn-edit-time {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.8rem 2rem;
    border-radius: 20px;
    font-size: 1rem;
    font-family: 'Sarabun', sans-serif;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.btn-edit-time:hover {
    background-color: #3a52b4;
}
`;
// --- จบส่วน CSS ---


function Time() {
  // State สำหรับเก็บเวลาปัจจุบัน (มุมบนขวา)
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State สำหรับเก็บเวลาที่นับถอยหลัง
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  
  // State สำหรับเก็บชื่อวิชาถัดไป
  const [nextEventSubject, setNextEventSubject] = useState('กำลังโหลด...');
  
  // State สำหรับเก็บเวลาของอีเวนต์ถัดไป
  const [targetDate, setTargetDate] = useState(null);

  // --- 1. เอฟเฟกต์สำหรับอัปเดตนาฬิกา (มุมบนขวา) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // อัปเดตทุกวินาที

    return () => clearInterval(timer);
  }, []);

  // --- 2. เอฟเฟกต์สำหรับดึงข้อมูลจาก Flask ---
  useEffect(() => {
    const apiUrl = 'http://127.0.0.1:5000/api/study_plan';

    fetch(apiUrl) 
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        const nextEvent = findNextEvent(data);
        if (nextEvent) {
          const eventDateTime = new Date(`${nextEvent.date}T${nextEvent.startTime}`);
          setTargetDate(eventDateTime);
          setNextEventSubject(nextEvent.subject);
        } else {
          setNextEventSubject('ไม่มีอีเวนต์');
        }
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setNextEventSubject('เชื่อมต่อล้มเหลว');
      });
  }, []); // ทำงานครั้งเดียว

  // --- 3. เอฟเฟกต์สำหรับเริ่มนับถอยหลัง ---
  useEffect(() => {
    if (!targetDate) return;

    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(timer);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setNextEventSubject('เริ่มแล้ว!');
      } else {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // --- Helper Functions ---

  const findNextEvent = (plan) => {
    const now = new Date();
    // ตอนนี้คือ 30 ต.ค. 2025
    // อีเวนต์แรกคือ 29 พ.ย. 2025 (คณิต)
    // อีเวนต์สองคือ 30 พ.ย. 2025 (วิทย์)
    
    let nextEvent = null;
    let minDate = Infinity;

    plan.forEach(item => {
      const eventDate = new Date(`${item.date}T${item.startTime}`); // e.g., 2025-11-29T09:00
      if (eventDate > now && eventDate < minDate) {
        minDate = eventDate;
        nextEvent = item;
      }
    });
    return nextEvent; // ควรจะคืนค่า { ... subject: "คณิต" }
  };

  const formatCurrentTime = (date) => {
    // แสดงผลเป็น "30 October 4:45 PM" (ตามเวลาปัจจุบัน)
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleString('en-US', options).replace(',', '');
  };

  const formatCountdown = () => {
    // เวลาเป้าหมายคือ 29 พ.ย. 2025, 09:00
    // เวลาปัจจุบันคือ 30 ต.ค. 2025, 16:45
    // จะเหลือประมาณ 29 วัน 16 ชั่วโมง ...
    if (countdown.days > 0) {
      return `${countdown.days} วัน ${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}`;
    }
    return `${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`;
  };

  return (
    <>
      {/* แทรก CSS ที่เราสร้างไว้ข้างบนเข้าไปในหน้าเว็บ */}
      <style>{cssStyles}</style>
      
      <div className="container">
        {/* --- Sidebar --- */}
        <nav className="sidebar">
          <div className="sidebar-header">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5v-.008ZM9.75 18h.008v.008H9.75v-.008ZM7.5 18h.008v.008H7.5v-.008ZM14.25 15h.008v.008H14.25v-.008ZM14.25 18h.008v.008H14.25v-.008ZM16.5 15h.008v.008H16.5v-.008ZM16.5 18h.008v.008H16.5v-.008Z" />
            </svg>
            <h1>Exam Planner</h1>
          </div>
          <ul className="nav-menu">
            <li className="nav-item"><a href="#" className="nav-link">Dashboard</a></li>
            <li className="nav-item"><a href="#" className="nav-link">Calendar</a></li>
            <li className="nav-item"><a href="#" className="nav-link">Subject</a></li>
            <li className="nav-item"><a href="#" className="nav-link active">Time</a></li>
          </ul>
          <button className="btn-add-new">Add New +</button>
          <div className="sidebar-footer">
            <button className="btn-logout">Log Out</button>
          </div>
        </nav>

        {/* --- Main Content --- */}
        <main className="main-content">
          <header className="header">
            <span className="header-title">timer</span>
            <span id="current-time">{formatCurrentTime(currentTime)}</span>
          </header>

          <div className="timer-container">
            <div className="timer-circle">
              <div id="countdown-display" style={{ fontSize: countdown.days > 0 ? '2.5rem' : '3.5rem' }}>
                {formatCountdown()}
              </div>
              <div id="next-event-subject">
                {nextEventSubject}
              </div>
            </div>
            <button className="btn-edit-time">แก้ไขเวลา</button>
          </div>
        </main>
      </div>
    </>
  );
}

export default Time;