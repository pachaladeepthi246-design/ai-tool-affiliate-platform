import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CardDetails from './pages/CardDetails';
import Checkout from './pages/Checkout';
import UserBookmarks from './pages/UserBookmarks';
import AuthPage from './pages/AuthPage';
import SearchPage from './pages/SearchPage';

export default function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/cards/:slug" element={<CardDetails />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/bookmarks" element={<UserBookmarks />} />
    </Routes>
  );
}
