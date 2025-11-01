import { useState } from 'react';

const UploadResume = ({ jobRecommendations, setJobRecommendations, resumeAnalysis, setResumeAnalysis }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [shortlistedJobs, setShortlistedJobs] = useState(new Set());

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!validTypes.includes(fileType)) {
        setUploadError('Please upload only PDF or DOCX files');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setUploadError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }
    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_RESUME_API_URL}/api/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error uploading resume');
      }

      const data = await response.json();
      setResumeAnalysis(data.resume_analysis);
      setJobRecommendations(data.job_listings);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error.message || 'Error uploading resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewJob = (url) => {
    window.open(url, '_blank');
  };

  const handleShortlistJob = async (job) => {
    try {
      const userId = localStorage.getItem('userId'); 

      const response = await fetch(`${import.meta.env.VITE_RESUME_API_URL}/api/shortlist-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          job_data: {
            jobId: job.id,
            title: job.title,
            company: job.company,
            companyLogo: job.company_logo,
            location: job.location,
            mode: job.mode,
            url: job.url,
            matchScore: job.match_score
          }
        }),
      });

      if (response.ok) {
        setShortlistedJobs(prev => new Set([...prev, job.id]));
        alert('Job shortlisted successfully!');
      }
    } catch (error) {
      console.error('Error shortlisting job:', error);
      alert('Failed to shortlist job');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Resume <span className="text-orange-600">Job Matcher</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Upload your resume and find the perfect job matches
          </p>
        </div>
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Upload Your Resume</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-500 rounded-xl cursor-pointer bg-gray-600/30 hover:bg-gray-600/50 hover:border-orange-500 transition-all duration-300">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 mb-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="mb-2 text-lg text-gray-300">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-400">PDF or DOCX only</p>
                    {file && <p className="mt-3 text-sm text-orange-400 font-medium">Selected: {file.name}</p>}
                  </div>
                  <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" />
                </label>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-red-400">{uploadError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isUploading || !file}
                >
                  {isUploading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </div>
                  ) : "Find Matching Jobs"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/*Job Results*/}
        {jobRecommendations.length > 0 && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl mb-8">
            <div className="p-8">
              <h2 className="text-3xl font-bold text-center text-white mb-8">
                Top Job <span className="text-orange-600">Recommendations</span>
              </h2>
              <p className="text-center text-gray-300 mb-8">Based on your resume analysis</p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobRecommendations.map((job) => (
                  <div key={job.id} className="bg-gray-600/50 border border-gray-500 rounded-xl shadow-lg hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300 transform hover:scale-105">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <img
                          src={job.company_logo}
                          alt={`${job.company} logo`}
                          className="w-12 h-12 mr-3 object-contain rounded-lg"
                          onError={(e) => {
                            if (!e.target.src.includes('via.placeholder.com')) {
                              e.target.src = `https://via.placeholder.com/48x48?text=${job.company.charAt(0)}`;
                            }
                          }}
                        />
                        <div>
                          <h3 className="text-xl font-bold text-white">{job.title}</h3>
                          <p className="text-gray-300">{job.company}</p>
                        </div>
                      </div>
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center text-gray-400">
                          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {job.location}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                          {job.mode}
                        </div>
                      </div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-300">Match Score</div>
                          <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold px-3 py-1 rounded-full">{job.match_score}%</div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-600 to-orange-700 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${job.match_score}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={() => handleViewJob(job.url)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                        >
                          View Job
                        </button>
                        <button
                          onClick={() => handleShortlistJob(job)}
                          disabled={shortlistedJobs.has(job.id)}
                          className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-200 ${shortlistedJobs.has(job.id)
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transform hover:scale-105'
                            }`}
                        >
                          {shortlistedJobs.has(job.id) ? 'Shortlisted ✓' : 'Shortlist Job'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/*Resume Analysis Section*/}
        {resumeAnalysis && Object.keys(resumeAnalysis).length > 0 && (
          <section>
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl">
              <div className="p-8">
                <h2 className="text-3xl font-bold text-center text-white mb-8">
                  Resume <span className="text-orange-600">Analysis</span>
                </h2>

                {/*Skills Section*/}
                <div className="bg-gray-600/50 border border-gray-500 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    Skills Identified
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.skills && resumeAnalysis.skills.length > 0 ? (
                      resumeAnalysis.skills.map((skill, index) => (
                        <span key={index} className="bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30 text-orange-300 text-sm font-medium px-3 py-1 rounded-full">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-400">No skills identified</p>
                    )}
                  </div>
                </div>

                {/*Education Section*/}
                <div className="bg-gray-600/50 border border-gray-500 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                    </svg>
                    Education
                  </h3>
                  <div className="space-y-3">
                    {resumeAnalysis.education && resumeAnalysis.education.length > 0 ? (
                      resumeAnalysis.education.map((edu, index) => (
                        <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                          <p className="font-semibold text-white">{edu.degree}</p>
                          <p className="text-gray-300">{edu.institution}, {edu.year}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">No education information found</p>
                    )}
                  </div>
                </div>

                {/*Experience Section*/}
                <div className="bg-gray-600/50 border border-gray-500 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {resumeAnalysis.experience && resumeAnalysis.experience.length > 0 ? (
                      resumeAnalysis.experience.map((exp, index) => (
                        <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                          <p className="font-semibold text-white">{exp.position}</p>
                          <p className="text-gray-300">{exp.company}, {exp.duration}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">No experience information found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default UploadResume;