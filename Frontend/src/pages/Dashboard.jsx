import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate

function Dashboard() {
  const navigate = useNavigate(); // 2. Initialize the navigate function

  // 3. Create the logout handler
  const handleLogout = () => {
    // Remove the token from local storage
    localStorage.removeItem('token');
    // Redirect to the homepage
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Navbar for the Dashboard */}
      <header className="bg-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="text-xl font-bold text-teal-800">ChatApp Dashboard</div>
          {/* 4. Add the onClick event to the button */}
          <button 
            onClick={handleLogout}
            className="rounded-md bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-grow items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Welcome to the Dashboard</h1>
          <p className="mt-2 text-gray-600">Your chat interface will be built here.</p>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;