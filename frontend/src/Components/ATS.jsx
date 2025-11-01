import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Loader, AlertCircle, TrendingUp, Award, Target } from 'lucide-react';
import io from 'socket.io-client';

const ATS = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState([
    { key: 'skills', name: 'Analyzing your Skills section', status: 'pending' },
    { key: 'experience', name: 'Analyzing your Experience section', status: 'pending' },
    { key: 'projects', name: 'Analyzing your Projects section', status: 'pending' },
    { key: 'education', name: 'Analyzing your Education section', status: 'pending' },
    { key: 'formatting', name: 'Checking the overall formatting', status: 'pending' }
  ]);
  const [atsScore, setAtsScore] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket'],  
    });
    setSocket(newSocket);

    newSocket.on('stepUpdate', (data) => {
      setAnalysisSteps(prev => 
        prev.map(step => 
          step.key === data.step 
            ? { ...step, status: data.status }
            : step
        )
      );
    });

    newSocket.on('analysisComplete', (data) => {
      setAtsScore(data.atsScore);
      setAnalysisResults(data.analysisResults);
      setRecommendations(data.recommendations?.recommendations || []);
      setUploading(false);
    });

    newSocket.on('analysisError', (data) => {
      setError(data.error);
      setUploading(false);
    });

    return () => newSocket.close();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, DOCX, or image file (JPG, PNG)');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const analyzeResume = async () => {
    if (!file || !socket || !socket.id) {
    setError('Socket connection not established. Please try again.');
    return;
  }

    setUploading(true);
    setError(null);
    setAtsScore(null);
    setAnalysisResults(null);
    setRecommendations([]);
    
    setAnalysisSteps(prev => 
      prev.map(step => ({ ...step, status: 'pending' }))
    );

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('socketId', socket.id);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ats/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      setError(error.message);
      setUploading(false);
    }
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Loader className="w-5 h-5 text-orange-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <div className="w-5 h-5 border border-gray-300 rounded-full" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/*Header*/}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            ATS Resume <span className="text-orange-600">Analyzer</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Get your resume analyzed by AI agents and receive an ATS compatibility score
          </p>
        </div>

        {/*Upload Section*/}
        {!uploading && !atsScore && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl p-8 mb-8">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-orange-500 bg-orange-50/10'
                  : 'border-gray-500 hover:border-orange-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-orange-600 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-4">
                Upload Your Resume
              </h3>
              <p className="text-gray-300 mb-6">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Supports PDF, DOCX, JPG, PNG (Max 10MB)
              </p>
              
              <input
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg cursor-pointer transition-colors duration-200"
              >
                <FileText className="w-5 h-5 mr-2" />
                Choose File
              </label>

              {file && (
                <div className="mt-6 p-4 bg-gray-600/50 rounded-lg">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-300 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={analyzeResume}
                    className="mt-4 inline-flex items-center px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Analyze Resume
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-red-400">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/*Analysis Progress*/}
        {uploading && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl p-8 mb-8">
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Analyzing Your Resume...
            </h3>
            <div className="space-y-6">
              {analysisSteps.map((step, index) => (
                <div key={step.key} className="flex items-center space-x-4">
                  {getStepIcon(step.status)}
                  <span className={`text-lg ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'processing' ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/*Results*/}
        {atsScore !== null && (
          <div className="space-y-8">
            {/*Score Display*/}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl p-8 text-center">
              <Award className="w-16 h-16 text-orange-600 mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-white mb-4">Your ATS Score</h3>
              <div className={`text-7xl font-bold mb-4 ${getScoreColor(atsScore)}`}>
                {atsScore}
                <span className="text-3xl text-gray-400">/100</span>
              </div>
              <p className={`text-xl font-semibold ${getScoreColor(atsScore)}`}>
                {getScoreLabel(atsScore)}
              </p>
            </div>

            {/*Detailed Analysis*/}
            {analysisResults && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <TrendingUp className="w-7 h-7 text-orange-600 mr-3" />
                  Detailed Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-600/50 rounded-lg">
                      <h4 className="font-semibold text-orange-400 mb-2">Skills Assessment</h4>
                      <p className="text-gray-300 text-sm">
                        {analysisResults.skillsAnalysis?.analysis || 'Analysis completed'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-600/50 rounded-lg">
                      <h4 className="font-semibold text-orange-400 mb-2">Experience Quality</h4>
                      <p className="text-gray-300 text-sm">
                        {analysisResults.experienceAnalysis?.analysis || 'Analysis completed'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-600/50 rounded-lg">
                      <h4 className="font-semibold text-orange-400 mb-2">Projects Evaluation</h4>
                      <p className="text-gray-300 text-sm">
                        {analysisResults.projectsAnalysis?.analysis || 'Analysis completed'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-600/50 rounded-lg">
                      <h4 className="font-semibold text-orange-400 mb-2">ATS Formatting</h4>
                      <p className="text-gray-300 text-sm">
                        {analysisResults.formattingAnalysis?.analysis || 'Analysis completed'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/*Recommendations*/}
            {recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                  Improvement Recommendations
                </h3>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="p-4 bg-gray-600/50 rounded-lg border-l-4 border-orange-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-2">
                            {rec.category}
                          </h4>
                          <p className="text-gray-300">{rec.suggestion}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {rec.priority} priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/*New Analysis Button*/}
            <div className="text-center">
              <button
                onClick={() => {
                  setFile(null);
                  setAtsScore(null);
                  setAnalysisResults(null);
                  setRecommendations([]);
                  setError(null);
                  setAnalysisSteps(prev => 
                    prev.map(step => ({ ...step, status: 'pending' }))
                  );
                }}
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATS;