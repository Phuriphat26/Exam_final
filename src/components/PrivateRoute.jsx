import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // ตรวจสอบว่ามี token ใน localStorage หรือไม่
  const isAuthenticated = localStorage.getItem('userToken') !== null;

  // ถ้ามี token (Login แล้ว) ให้แสดง Component ที่ต้องการ (Home, AddNew)
  // ถ้าไม่มี ให้ redirect ไปที่หน้า /login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;