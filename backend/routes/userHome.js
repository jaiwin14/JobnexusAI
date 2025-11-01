const express = require('express');
const axios = require('axios');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');

const router = express.Router();

// Initialize Gemini AI
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.1,
  apiKey: process.env.GOOGLE_API_KEY,
});

// RapidAPI configuration for job search - Updated with working APIs
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Updated API configurations with working endpoints
const JOB_APIS = [
  {
    name: 'JSearch API',
    host: 'jsearch.p.rapidapi.com',
    endpoint: '/search',
    paramsMapping: (query, location) => ({
      query: `${query} in ${location}`,
      page: 1,
      num_pages: 1
    })
  },
  {
    name: 'Job Search API by PR Labs',
    host: 'jobs-search-api.p.rapidapi.com',
    endpoint: '/api/jobs/search',
    paramsMapping: (query, location) => ({
      q: query,
      location: location,
      limit: 10
    })
  }
];

// Utility function to clean JSON response from Gemini
function cleanJsonResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.trim();

    // Remove ```json and ``` markers
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
    }

    // Try to parse the cleaned JSON
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.error('Raw response:', response);
    throw new Error('Failed to parse JSON response from AI');
  }
}

// Agent 1: Input Processing Agent
class InputProcessingAgent {
  constructor() {
    this.model = model;
  }

  async processInput(jobTitle, workMode, location) {
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert job search analyst. Process the following job search criteria and provide structured, optimized search parameters.

      Job Title: {jobTitle}
      Work Mode: {workMode}
      Location: {location}

      Tasks:
      1. Analyze and refine the job title to include relevant keywords and synonyms
      2. Validate and format the work mode preference
      3. Extract city and country from location
      4. Suggest additional relevant job titles based on the input

      IMPORTANT: Return ONLY a valid JSON object without any markdown formatting or code blocks. The response should start with {{ and end with }}.

      {{
        "optimizedJobTitle": "primary job title",
        "alternativeJobTitles": ["alternative1", "alternative2"],
        "workMode": "formatted work mode",
        "city": "city name",
        "country": "country name",
        "searchKeywords": ["keyword1", "keyword2", "keyword3"]
      }}
    `);

    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

    try {
      const result = await chain.invoke({
        jobTitle,
        workMode,
        location
      });

      return cleanJsonResponse(result);
    } catch (error) {
      console.error('Error in input processing:', error);
      // Fallback if JSON parsing fails
      return {
        optimizedJobTitle: jobTitle,
        alternativeJobTitles: [jobTitle],
        workMode: workMode,
        city: location.split(',')[0].trim(),
        country: location.split(',')[1]?.trim() || 'Unknown',
        searchKeywords: [jobTitle.toLowerCase()]
      };
    }
  }
}

// Agent 2: Job Search Agent - Updated with working APIs
class JobSearchAgent {
  constructor() {
    this.rapidApiKey = RAPIDAPI_KEY;
  }

  async searchJobs(processedInput) {
    const { optimizedJobTitle, city, country, workMode, alternativeJobTitles } = processedInput;
    const locationString = `${city}, ${country}`;

    const jobResults = [];
    let apiSuccess = false;

    // Try each API
    for (const api of JOB_APIS) {
      if (apiSuccess && jobResults.length >= 10) break;

      try {
        console.log(`Trying ${api.name}...`);

        const params = api.paramsMapping(optimizedJobTitle, locationString);

        const options = {
          method: 'GET',
          url: `https://${api.host}${api.endpoint}`,
          params: params,
          headers: {
            'X-RapidAPI-Key': this.rapidApiKey,
            'X-RapidAPI-Host': api.host
          },
          timeout: 15000 // Increased timeout
        };

        console.log('API Request:', JSON.stringify(options, null, 2));

        const response = await axios.request(options);
        console.log(`${api.name} Response Status:`, response.status);

        if (response.data) {
          const jobs = this.parseApiResponse(response.data, api.name, workMode, locationString);
          if (jobs.length > 0) {
            jobResults.push(...jobs);
            apiSuccess = true;
            console.log(`${api.name} returned ${jobs.length} jobs`);
          }
        }
      } catch (error) {
        console.error(`Error with ${api.name}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        continue;
      }
    }

    // If no API worked, generate mock data
    if (!apiSuccess || jobResults.length === 0) {
      console.log(`No jobs found for ${optimizedJobTitle} in ${city}, ${country}`);
      return [];
    }

    // Remove duplicates and limit results
    const uniqueJobs = this.removeDuplicates(jobResults);
    return uniqueJobs.slice(0, 15);
  }

  parseApiResponse(data, apiName, workMode, location) {
    const jobs = [];

    try {
      let jobList = [];

      // Handle different API response formats
      if (apiName === 'JSearch API') {
        jobList = data.data || [];
      } else if (apiName === 'Job Search API by PR Labs') {
        jobList = data.jobs || data.data || [];
      }

      if (!Array.isArray(jobList)) {
        console.log('API response is not an array:', typeof jobList);
        return jobs;
      }

      jobList.forEach((job, index) => {
        try {
          const parsedJob = {
            id: job.job_id || job.id || `${apiName}-${Date.now()}-${index}`,
            title: job.job_title || job.title || job.position || 'Unknown Title',
            company: job.employer_name || job.company || job.company_name || 'Unknown Company',
            location: job.job_city && job.job_country ?
              `${job.job_city}, ${job.job_country}` :
              job.location || location,
            description: job.job_description || job.description || job.snippet || 'No description available',
            salary: job.job_salary || job.salary || job.salary_range || 'Not specified',
            workMode: job.job_employment_type || job.job_type || workMode,
            url: job.job_apply_link || job.url || job.apply_url || '#',
            postedDate: job.job_posted_at_timestamp ?
              new Date(job.job_posted_at_timestamp * 1000).toISOString() :
              job.posted_date || new Date().toISOString(),
            isRemote: job.job_is_remote || false,
            logo: job.employer_logo || null
          };

          jobs.push(parsedJob);
        } catch (jobError) {
          console.error('Error parsing individual job:', jobError);
        }
      });
    } catch (error) {
      console.error('Error parsing API response:', error);
    }

    return jobs;
  }

  generateMockJobs(jobTitle, city, country, workMode) {
    const companies = [
      'TechCorp Inc.', 'InnovateTech', 'Digital Solutions Ltd.', 'FutureTech Systems',
      'CloudFirst Technologies', 'DataDriven Analytics', 'NextGen Software', 'SmartCode Solutions',
      'AI Innovations', 'CyberTech Solutions', 'Global Tech Hub', 'StartupX'
    ];

    const salaryRanges = [
      '$60,000 - $80,000', '$80,000 - $100,000', '$100,000 - $120,000',
      '$120,000 - $150,000', '$70,000 - $90,000', '$90,000 - $110,000',
      '$150,000 - $180,000', '$50,000 - $70,000'
    ];

    const jobLevels = ['Senior', 'Lead', 'Principal', 'Junior', 'Mid-Level', ''];

    return Array.from({ length: 10 }, (_, index) => ({
      id: `mock-${Date.now()}-${index}`,
      title: `${jobLevels[index % jobLevels.length]} ${jobTitle}`.trim(),
      company: companies[index % companies.length],
      location: `${city}, ${country}`,
      description: `Join our dynamic team as a ${jobTitle}. We're looking for passionate professionals to contribute to innovative projects and drive technological advancement. This ${workMode.toLowerCase()} position offers excellent growth opportunities and competitive benefits.`,
      salary: salaryRanges[index % salaryRanges.length],
      workMode: workMode,
      url: `https://example-jobs.com/job/${index + 1}`,
      postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      relevanceScore: Math.floor(Math.random() * 40) + 60,
      isRemote: workMode.toLowerCase().includes('remote'),
      logo: null
    }));
  }

  removeDuplicates(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.title}-${job.company}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

// Agent 3: Results Optimization Agent
class ResultsOptimizationAgent {
  constructor() {
    this.model = model;
  }

  async optimizeResults(jobs, originalInput) {
    const { jobTitle, workMode, location } = originalInput;

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert job matching specialist. Analyze the following job listings and optimize them for the user's search criteria.

      User Requirements:
      - Job Title: {jobTitle}
      - Work Mode: {workMode}
      - Location: {location}

      Job Listings:
      {jobListings}

      Tasks:
      1. Score each job based on relevance to user requirements (0-100)
      2. Rank jobs by relevance score
      3. Return the jobs with their relevance scores

      IMPORTANT: Return ONLY a valid JSON array without any markdown formatting or code blocks. The response should start with [ and end with ].

      [
        {{
          "id": "job_id",
          "title": "job title",
          "company": "company name",
          "location": "location",
          "description": "description",
          "salary": "salary",
          "workMode": "work mode",
          "url": "application url",
          "postedDate": "date",
          "relevanceScore": 85,
          "isRemote": false,
          "logo": "logo_url_or_null"
        }}
      ]
    `);

    const jobListings = JSON.stringify(jobs.slice(0, 8), null, 2); // Limit input size

    try {
      const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

      const result = await chain.invoke({
        jobTitle,
        workMode,
        location,
        jobListings
      });

      const optimizedResults = cleanJsonResponse(result);
      return Array.isArray(optimizedResults) ? optimizedResults : jobs.slice(0, 10);
    } catch (error) {
      console.error('Error optimizing results:', error);
      // Fallback: return filtered and sorted jobs
      return this.fallbackOptimization(jobs, originalInput);
    }
  }

  fallbackOptimization(jobs, originalInput) {
    const { jobTitle, workMode } = originalInput;

    // Simple scoring based on title match and work mode
    const scoredJobs = jobs.map(job => {
      let score = job.relevanceScore || 0;

      // Title relevance
      const titleLower = job.title.toLowerCase();
      const searchTitleLower = jobTitle.toLowerCase();

      if (titleLower.includes(searchTitleLower)) {
        score += 50;
      }

      // Partial matches
      const searchWords = searchTitleLower.split(' ');
      searchWords.forEach(word => {
        if (titleLower.includes(word)) {
          score += 10;
        }
      });

      // Work mode match
      if (job.workMode === workMode) {
        score += 30;
      }

      // Recent posting bonus
      const daysSincePosted = job.postedDate ?
        (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24) : 30;

      if (daysSincePosted <= 7) {
        score += 20;
      } else if (daysSincePosted <= 30) {
        score += 10;
      }

      return { ...job, relevanceScore: Math.min(score, 100) };
    });

    // Sort by relevance score and return top 10
    return scoredJobs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }
}

// Main orchestrator function
async function processJobSearch(jobTitle, workMode, location) {
  const inputAgent = new InputProcessingAgent();
  const searchAgent = new JobSearchAgent();
  const optimizationAgent = new ResultsOptimizationAgent();

  try {
    // Step 1: Process input with Agent 1
    console.log('Processing input with Agent 1...');
    const processedInput = await inputAgent.processInput(jobTitle, workMode, location);
    console.log('Processed input:', processedInput);

    // Step 2: Search jobs with Agent 2
    console.log('Searching jobs with Agent 2...');
    const jobResults = await searchAgent.searchJobs(processedInput);
    console.log(`Found ${jobResults.length} jobs`);

    // Step 3: Optimize results with Agent 3
    console.log('Optimizing results with Agent 3...');
    const optimizedJobs = await optimizationAgent.optimizeResults(
      jobResults,
      { jobTitle, workMode, location }
    );
    console.log(`Returning ${optimizedJobs.length} optimized jobs`);

    return optimizedJobs;
  } catch (error) {
    console.error('Error in job search process:', error);
    throw error;
  }
}

// Route handler
router.post('/', async (req, res) => {
  try {
    const { jobTitle, workMode, location } = req.body;

    // Validate input
    if (!jobTitle || !workMode || !location) {
      return res.status(400).json({
        error: 'Missing required fields: jobTitle, workMode, and location are required'
      });
    }

    console.log(`Job search request: ${jobTitle} | ${workMode} | ${location}`);

    // Process job search with agentic workflow
    const jobs = await processJobSearch(jobTitle, workMode, location);

    if (!jobs || jobs.length === 0) {
      return res.json({
        success: false,
        message: `No such jobs found in ${location}.`,
        jobs: [],
        searchCriteria: {
          jobTitle,
          workMode,
          location
        },
        totalResults: 0
      });
    }

    // Return results
    res.json({
      success: true,
      jobs: jobs,
      searchCriteria: {
        jobTitle,
        workMode,
        location
      },
      totalResults: jobs.length
    });

  } catch (error) {
    console.error('Error in job search route:', error);
    res.status(500).json({
      error: 'Internal server error during job search',
      message: error.message
    });
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test route for checking API keys and configurations
router.get('/test-config', async (req, res) => {
  const testResults = {
    geminiConfigured: !!process.env.GOOGLE_API_KEY,
    rapidApiConfigured: !!process.env.RAPIDAPI_KEY,
    timestamp: new Date().toISOString(),
    apiTests: []
  };

  if (process.env.RAPIDAPI_KEY) {
    // Test JSearch API specifically
    try {
      const options = {
        method: 'GET',
        url: 'https://jsearch.p.rapidapi.com/search',
        params: {
          query: 'software engineer in New York',
          page: 1,
          num_pages: 1
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        timeout: 10000
      };

      const response = await axios.request(options);
      testResults.apiTests.push({
        name: 'JSearch API',
        status: 'success',
        statusCode: response.status,
        resultsCount: response.data?.data?.length || 0
      });
    } catch (error) {
      testResults.apiTests.push({
        name: 'JSearch API',
        status: 'error',
        error: error.message,
        statusCode: error.response?.status
      });
    }
  }

  res.json(testResults);
});

// Route to get supported locations
router.get('/locations', (req, res) => {
  const locations = [
    'Amsterdam, Netherlands', 'Atlanta, USA', 'Austin, USA', 'Bangalore, India', 'Barcelona, Spain',
    'Berlin, Germany', 'Boston, USA', 'Cairo, Egypt', 'Chicago, USA', 'Dallas, USA',
    'Delhi, India', 'Dubai, UAE', 'Dublin, Ireland', 'Frankfurt, Germany', 'Hong Kong, China',
    'Houston, USA', 'Istanbul, Turkey', 'London, UK', 'Los Angeles, USA', 'Madrid, Spain',
    'Melbourne, Australia', 'Miami, USA', 'Milan, Italy', 'Mumbai, India', 'Munich, Germany',
    'New York, USA', 'Paris, France', 'Philadelphia, USA', 'San Francisco, USA', 'Seattle, USA',
    'Singapore, Singapore', 'Sydney, Australia', 'Tokyo, Japan', 'Toronto, Canada', 'Zurich, Switzerland'
  ];

  res.json({ locations });
});

// Route to get popular job titles
router.get('/job-titles', (req, res) => {
  const jobTitles = [
    'Software Engineer', 'Data Scientist', 'Product Manager', 'UX/UI Designer',
    'DevOps Engineer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer',
    'Machine Learning Engineer', 'Cloud Architect', 'Cybersecurity Analyst', 'Business Analyst',
    'Project Manager', 'Marketing Manager', 'Sales Manager', 'HR Manager',
    'Financial Analyst', 'Operations Manager', 'Customer Success Manager', 'Technical Writer'
  ];

  res.json({ jobTitles });
});

module.exports = router;