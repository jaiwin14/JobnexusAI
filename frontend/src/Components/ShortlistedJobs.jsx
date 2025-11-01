import { useState, useEffect } from 'react';

const ShortlistedJobs = () => {
  const [shortlistedJobs, setShortlistedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShortlistedJobs();
  }, []);

  const fetchShortlistedJobs = async () => {
    try {
      const userId = localStorage.getItem('userId'); 
      const response = await fetch(`${import.meta.env.VITE_RESUME_API_URL}/api/shortlisted-jobs/${userId}`);

      
      if (response.ok) {
        const data = await response.json();
        setShortlistedJobs(data.shortlisted_jobs);
      } else {
        setError('Failed to fetch shortlisted jobs');
      }
    } catch (error) {
      console.error('Error fetching shortlisted jobs:', error);
      setError('Error loading shortlisted jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveJob = async (jobId) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${import.meta.env.VITE_RESUME_API_URL}/api/remove-shortlisted-job`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          job_id: jobId
        }),
      });

      if (response.ok) {
        setShortlistedJobs(prev => prev.filter(job => job.jobId !== jobId));
        alert('Job removed from shortlist');
      } else {
        alert('Failed to remove job');
      }
    } catch (error) {
      console.error('Error removing job:', error);
      alert('Error removing job');
    }
  };

  const handleViewJob = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Your <span className="text-orange-600">Shortlisted Jobs</span>
          </h1>
          <p className="text-gray-300 text-lg">
            {shortlistedJobs.length} {shortlistedJobs.length === 1 ? 'job' : 'jobs'} in your collection
          </p>
        </div>

        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow-2xl">
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            {shortlistedJobs.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-16 w-16 text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-white mb-2">No shortlisted jobs yet</h3>
                <p className="text-gray-400 text-lg">
                  Start exploring jobs and add them to your shortlist to see them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {shortlistedJobs.map((job) => (
                  <div key={job.jobId} className="bg-gray-600/50 border border-gray-500 rounded-xl shadow-lg hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300 transform hover:scale-105">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center flex-1">
                          <img 
                            src={job.companyLogo} 
                            alt={`${job.company} logo`} 
                            className="w-12 h-12 mr-3 object-contain rounded-lg" 
                            onError={(e) => {
                              e.target.src = `https://via.placeholder.com/48x48?text=${job.company.charAt(0)}`;
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white">{job.title}</h3>
                            <p className="text-gray-300">{job.company}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveJob(job.jobId)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                          title="Remove from shortlist"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center text-gray-400">
                          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {job.mode}
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-300">Match Score</div>
                          <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {job.matchScore}%
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-600 to-orange-700 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${job.matchScore}%` }}
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
                        <div className="text-xs text-gray-400 text-center">
                          Shortlisted: {job.shortlistedAt ? new Date(job.shortlistedAt).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortlistedJobs;