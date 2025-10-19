import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // If no token, redirect to the homepage
    return <Navigate to="/" />;
  }

  return children; // If token exists, render the component (e.g., Dashboard)
}

export default ProtectedRoute;