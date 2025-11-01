import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { User, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'

const Navbar = ({user, setUser}) => {
    // const [user, setUser] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notification, setNotification] = useState('');
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate()
    //to check if user is logged in
    useEffect(() => {
        // const token = localStorage?.getItem('jobnexus_token');
        // const userData = localStorage?.getItem('jobnexus_user');

        // if (token && userData) {
        //     try {
        //         setUser(JSON.parse(userData));
        //     } catch (e) {
        //         console.error('Error parsing user data:', e);
        //     }
        // }

        const handleStorageChange = () => {
            const token = localStorage?.getItem('jobnexus_token');
            const userData = localStorage?.getItem('jobnexus_user');

            if (token && userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            } else {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        setShowMobileMenu(false);
    }, [location.pathname]);

    const showNotification = (message, duration = 3000) => {
        setNotification(message);
        setTimeout(() => setNotification(''), duration);
    };

    const handleLogout = () => {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('jobnexus_token');
            localStorage.removeItem('jobnexus_user');
        }
        setUser(null);
        setShowUserMenu(false);
        showNotification('Logged out successfully!');
        //Navigate back to home page
        setTimeout(() => {
            window.location.href = '/'; 
        }, 1000);
    };

    const handleViewShortlistedJobs = () => {
        setShowUserMenu(false);
        showNotification('Navigating to shortlisted jobs...');
        setTimeout(() => {
            window.location.href = '/shortlisted-jobs'; 
        }, 1000);
    };

    return (
        <div>
            <header className="fixed top-0 left-0 w-full z-50 bg-white shadow">
                <div className="mx-auto py-3 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900 to-gray-700 flex justify-between items-center">
                    <Link to="/user-home" className="group flex flex-col cursor-pointer">
                        <h1 className="text-3xl font-bold font-sans text-orange-600 ">JobNexus AI</h1>
                        <h2 className="text-sm mx-5 font-sans text-orange-100">Find. Match. Succeed.</h2>
                    </Link>

                    {/*User Menu (Only show if user is logged in)*/}
                    {user && (
                        <div className='hidden lg:flex space-x-96'>
                            <div className="hidden lg:flex space-x-7 mt-2" id="navbar-menu">
                                
                                <Link
                                    to="/upload"
                                    className={`text-lg font-medium transition duration-200 ease-in-out hover:text-orange-600 hover:underline underline-offset-4 ${
                                        location.pathname === '/upload'
                                            ? 'text-orange-600 underline'
                                            : 'text-white'
                                    }`}
                                >
                                    Find Jobs
                                </Link>
                                <Link
                                    to="/ats-score"
                                    className={`text-lg font-medium transition duration-200 ease-in-out hover:text-orange-600 hover:underline underline-offset-4 ${
                                        location.pathname === '/ats-score'
                                            ? 'text-orange-600 underline'
                                            : 'text-white'
                                    }`}
                                >
                                    Check ATS Score
                                </Link>
                                <Link
                                    to="/chat-ai"
                                    className={`text-lg font-medium transition duration-200 ease-in-out hover:text-orange-600 hover:underline underline-offset-4 ${
                                        location.pathname === '/chat-ai'
                                            ? 'text-orange-600 underline'
                                            : 'text-white'
                                    }`}
                                >
                                    HireBot
                                </Link>
                            </div>
                            <div className="relative ">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-white font-medium">{user.fullname}</span>
                                    <svg
                                        className={`w-4 h-4 text-white transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                                        <div className="p-4 border-b border-slate-200">
                                            <p className="font-semibold text-slate-900">{user.fullname}</p>
                                            <p className="text-sm text-slate-600">{user.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={handleViewShortlistedJobs}
                                                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                </svg>
                                                <span>View Shortlisted Jobs</span>
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Hamburger for mobile */}
                    {user && (
                        <button
                            className="lg:hidden flex items-center justify-center p-2 rounded-md text-white bg-slate-700 hover:bg-slate-600"
                            onClick={() => setShowMobileMenu(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="w-7 h-7" />
                        </button>
                    )}
                </div>
            </header>

            {/* Mobile Menu Drawer */}
            {user && showMobileMenu && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex">
                    <div className="w-72 bg-white h-full shadow-lg flex flex-col">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
                            <span className="font-bold text-orange-600 text-xl">Menu</span>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="text-slate-700 hover:text-orange-600"
                                aria-label="Close menu"
                            >
                                <X className="w-7 h-7" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-2 px-4 py-4">
                            <Link
                                to="/upload"
                                className={`py-2 px-2 rounded-md text-lg font-medium ${
                                    location.pathname === '/upload'
                                        ? 'text-orange-600 bg-orange-50'
                                        : 'text-slate-800 hover:bg-orange-100'
                                }`}
                                onClick={() => setShowMobileMenu(false)}
                            >
                                Find Jobs
                            </Link>
                            <Link
                                to="/ats-score"
                                className={`py-2 px-2 rounded-md text-lg font-medium ${
                                    location.pathname === '/ats-score'
                                        ? 'text-orange-600 bg-orange-50'
                                        : 'text-slate-800 hover:bg-orange-100'
                                }`}
                                onClick={() => setShowMobileMenu(false)}
                            >
                                Check ATS Score
                            </Link>
                            <Link
                                to="/chat-ai"
                                className={`py-2 px-2 rounded-md text-lg font-medium ${
                                    location.pathname === '/chat-ai'
                                        ? 'text-orange-600 bg-orange-50'
                                        : 'text-slate-800 hover:bg-orange-100'
                                }`}
                                onClick={() => setShowMobileMenu(false)}
                            >
                                HireBot
                            </Link>
                            <div className="border-t border-slate-200 my-2" />
                            {/* Profile dropdown in mobile */}
                            <div className="flex items-center gap-2 px-2 py-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">{user.fullname}</div>
                                    <div className="text-xs text-slate-600">{user.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMobileMenu(false);
                                    handleViewShortlistedJobs();
                                }}
                                className="w-full text-left px-2 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center space-x-2"
                            >
                                <span>View Shortlisted Jobs</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowMobileMenu(false);
                                    handleLogout();
                                }}
                                className="w-full text-left px-2 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
                            >
                                <span>Logout</span>
                            </button>
                        </nav>
                    </div>
                    {/* Click outside to close */}
                    <div className="flex-1" onClick={() => setShowMobileMenu(false)} />
                </div>
            )}

            {/*Alerts*/}
            {notification && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    {notification}
                </div>
            )}

            {/*Click outside to close menu*/}
            {showUserMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                />
            )}
        </div>
    );
};

export default Navbar;