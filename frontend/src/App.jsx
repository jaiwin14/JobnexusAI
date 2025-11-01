import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './Components/Navbar';
import Home from './Components/Home';
import OAuth from './Components/OAuth';
import UploadResume from './Components/UploadResume';
import Footer from './Components/Footer';
import ShortlistedJobs from './Components/ShortlistedJobs';
import HireBot from './Components/HireBot';
import UserHome from './Components/UserHome';
import ATS from './Components/ATS';

const App = () => {
  const [jobRecommendations, setJobRecommendations] = useState([]);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [user, setUser] = useState(null);

  // Load user from localStorage on first load
  useEffect(() => {
    const token = localStorage?.getItem('jobnexus_token');
    const userData = localStorage?.getItem('jobnexus_user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        setUser(null);
      }
    }
  }, []);

  return (
    <Router>
      <main className="flex flex-col min-h-screen bg-gray-100 pt-20">
        <Navbar user={user} setUser={setUser} />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/auth"
              element={user ? <Navigate to="/user-home" /> : <OAuth onAuthStateChange={setUser} />}
            />
            <Route path="/upload" element={<UploadResume jobRecommendations={jobRecommendations}
              setJobRecommendations={setJobRecommendations}
              resumeAnalysis={resumeAnalysis}
              setResumeAnalysis={setResumeAnalysis} />} />
            <Route path="/shortlisted-jobs" element={<ShortlistedJobs />} />
            <Route path="/chat-ai" element={<HireBot />} />
            <Route path="/user-home" element={user ? <UserHome /> : <Navigate to="/auth" />} />
            <Route path="/ats-score" element={<ATS />} />
          </Routes>
        </div>
        <Footer />
      </main>
    </Router>
  );
};

export default App;
