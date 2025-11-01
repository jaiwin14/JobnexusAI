import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Plus,
  Trash2,
  MessageCircle,
  Bot,
  User as UserIcon,
  FileText,
  Image as ImageIcon,
  X,
  Menu,
  ChevronLeft
} from 'lucide-react';

const HireBot = () => {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notification, setNotification] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  //auth check and initial data load
  useEffect(() => {
    const token = localStorage?.getItem('jobnexus_token');
    const userData = localStorage?.getItem('jobnexus_user');

    if (!token || !userData) {
      window.location.href = '/auth';
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadSessions();
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/auth';
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showNotification = (message, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(''), duration);
  };

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage?.getItem('jobnexus_token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/hirebot${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const loadSessions = async () => {
    try {
      const response = await apiCall('/sessions');
      if (response.success) {
        setSessions(response.sessions);

        // If no current session and sessions exist, select the first one
        if (!currentSession && response.sessions.length > 0) {
          selectSession(response.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await apiCall('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${sessions.length + 1}` })
      });

      if (response.success) {
        setSessions(prev => [...prev, response.session]);
        selectSession(response.session);
        showNotification('New chat session created!');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      showNotification('Error creating new session');
    }
  };

  const selectSession = async (session) => {
    try {
      setCurrentSession(session);
      setMessages(session.messages || []);
      const response = await apiCall(`/sessions/${session._id}`);
      if (response.success) {
        setMessages(response.session.messages || []);
      }
    } catch (error) {
      console.error('Error selecting session:', error);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return;
    }
    try {
      const response = await apiCall(`/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.success) {
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        if (currentSession && currentSession._id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }
        showNotification('Chat session deleted');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      showNotification('Error deleting session');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp'
      ];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        showNotification('Invalid file type. Only PDF, DOCX, and image files are allowed.');
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && !selectedFile) return;
    if (!currentSession) {
      showNotification('Please create or select a chat session first');
      return;
    }
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', inputMessage.trim() || 'Please analyze this document');
      formData.append('sessionId', currentSession._id);
      if (selectedFile) {
        formData.append('document', selectedFile);
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/hirebot/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage?.getItem('jobnexus_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setMessages(data.session.messages);

        // Update the session in the sessions list
        setSessions(prev => prev.map(s =>
          s._id === currentSession._id ? data.session : s
        ));
        setInputMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        showNotification(data.message || 'Error sending message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Error sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else {
      return <FileText className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-800 to-gray-700 flex">
      <div className={`
    ${sidebarOpen ? 'w-80' : 'w-0'}
    transition-all duration-300
    bg-gray-900 border-r border-gray-600
    flex flex-col
    overflow-hidden
    h-screen
    sticky top-0
    z-30
  `}>
        <div className="p-4 border-b border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-orange-600 flex items-center">
              <Bot className="w-6 h-6 mr-2" />
              HireBot
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className=" text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={createNewSession}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session._id}
                onClick={() => selectSession(session)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${currentSession?._id === session._id
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{session.title}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(session._id, e)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*Main Chat Area*/}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900 border-b border-gray-600 p-4 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className={`${sidebarOpen ? 'hidden' : 'block'}  text-gray-400 hover:text-white mr-4`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center">
            <Bot className="w-6 h-6 text-orange-600 mr-2" />
            <h1 className="text-xl font-bold text-white">
              {currentSession ? currentSession.title : 'Select a chat or create new one'}
            </h1>
          </div>
        </div>

        {/*Messages Area*/}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentSession ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Bot className="w-16 h-16 mx-auto mb-4 text-orange-600" />
                <h3 className="text-xl font-semibold mb-2">Welcome to HireBot!</h3>
                <p className="mb-4">Your AI career counseling assistant</p>
                <button
                  onClick={createNewSession}
                  className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-6 rounded-lg transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                <p>Start a conversation with HireBot!</p>
                <p className="text-sm mt-2">Ask about career advice, resume feedback, or upload documents for analysis.</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                    {message.role === 'user' ? (
                      <UserIcon className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className={`rounded-lg px-4 py-2 ${message.role === 'user'
                    ? 'bg-orange-600 text-white ml-2'
                    : 'bg-gray-700 text-gray-100 mr-2'
                    }`}>
                    {message.document && (
                      <div className="flex items-center text-sm opacity-75 mb-2">
                        {getFileIcon(message.document.mimeType)}
                        <span className="ml-1">{message.document.originalName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs opacity-50 mt-1">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/*Input Area*/}
        {currentSession && (
          <div className="border-t border-gray-600 bg-gray-900 p-4">
            {selectedFile && (
              <div className="mb-3 flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center text-gray-300">
                  {getFileIcon(selectedFile.type)}
                  <span className="ml-2 text-sm">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={sendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask HireBot about your career, upload a resume for feedback, or get help with cold emails..."
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-600 border border-gray-600"
                  rows="3"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-3 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="mt-2 text-xs text-gray-400 text-center">
              HireBot can make mistakes. Please verify important information.
            </div>
          </div>
        )}
      </div>

      {/*Alert popup*/}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notification}
        </div>
      )}
    </div>
  );
};

export default HireBot;