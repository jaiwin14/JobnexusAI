import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';



const OAuth = ({ onAuthStateChange }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState('');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage?.getItem('jobnexus_token');
    const userData = localStorage?.getItem('jobnexus_user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Notify parent component about auth state change
        if (onAuthStateChange) {
          onAuthStateChange(parsedUser);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, [onAuthStateChange]);

  // Password validation
  const validatePassword = (password) => {
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;

    return {
      hasNumber,
      hasSpecialChar,
      hasMinLength,
      isValid: hasNumber && hasSpecialChar && hasMinLength
    };
  };

  const passwordValidation = !isLogin ? validatePassword(formData.password) : null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const showNotification = (message, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(''), duration);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const endpoint = isLogin ? '/api/login' : '/api/signup';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log('API Base URL:', apiUrl);  // Check if the env var is correct
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });


      const data = await response.json();

      if (data.success) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('jobnexus_token', data.token);
          localStorage.setItem('jobnexus_user', JSON.stringify(data.user));
          localStorage.setItem('userId', data.user.id);
        }
        setUser(data.user);
        if (onAuthStateChange) {
          onAuthStateChange(data.user);
        }
        showNotification(isLogin ? 'Login successful!' : 'Account created successfully!');
        setFormData({ fullname: '', email: '', password: '' });
        setTimeout(() => {
          navigate('/user-home');
        }, 1500);

      } else {
        if (data.message.includes('email')) {
          setErrors({ email: data.message });
        } else if (data.message.includes('password') || data.message.includes('Password')) {
          setErrors({ password: data.message });
        } else {
          setErrors({ general: data.message });
        }
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('jobnexus_token');
      localStorage.removeItem('jobnexus_user');
      localStorage.removeItem('userId');
    }
    setUser(null);
    if (onAuthStateChange) {
      onAuthStateChange(null);
    }
    showNotification('Logged out successfully!');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({ fullname: '', email: '', password: '' });
    setErrors({});
  };

  const handleViewShortlistedJobs = () => {
    window.location.href = '/shortlisted-jobs';
  };

  //If user is logged in, return user data for parent to handle
  // if (user) {
  //   return <Navigate to="/user-home" />;
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
            {isLogin ? 'Login to Your Account' : 'Create Your Account'}
          </h2>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullname ? 'border-red-300' : 'border-slate-300'
                      }`}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                {errors.fullname && (
                  <p className="text-red-600 text-sm mt-1">{errors.fullname}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-slate-300'
                    }`}
                  placeholder="Enter your email"
                  required
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-300' : 'border-slate-300'
                    }`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>
            {!isLogin && formData.password && (
              <div className="text-sm space-y-1">
                <div className={`flex items-center space-x-2 ${passwordValidation?.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation?.hasMinLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation?.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation?.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>At least 1 number</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation?.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation?.hasSpecialChar ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>At least 1 special character</span>
                </div>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || (!isLogin && !passwordValidation?.isValid)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={toggleAuthMode}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {isLogin ? 'SignUp' : 'Login'}
              </button>
            </p>
          </div>
        </div>

        {/*Alerts*/}
        {notification && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuth;