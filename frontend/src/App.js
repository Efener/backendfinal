import React, { useContext } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import RoomManagementPage from './pages/RoomManagementPage';
import HotelDetailPage from './pages/HotelDetailPage';
import AdminRoute from './components/AdminRoute';
import ChatWidget from './components/ChatWidget';
import AuthContext from './context/AuthContext';
import './App.css';

function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="App">
      <header>
        <nav>
          <Link to="/" className="nav-logo">Hotels.com</Link>
          <div className="nav-links">
            {user ? (
              <>
                <span>Welcome, {user.name}</span>
                {user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}
                <button onClick={logout} className="logout-button">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/hotel/:id" element={<HotelDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminPage />} />
            <Route path="hotel/:hotelId/rooms" element={<RoomManagementPage />} />
          </Route>
        </Routes>
      </main>
      <ChatWidget />
    </div>
  );
}

export default App;
