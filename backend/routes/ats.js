const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const tesseract = require('tesseract.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Agent 1: File Processing
class FileProcessorAgent {
  async processFile(filePath, mimeType) {
    try {
      let extractedText = '';

      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text;
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } else if (mimeType.startsWith('image/')) {
        // Process image with OCR
        const { data: { text } } = await tesseract.recognize(filePath, 'eng');
        extractedText = text;
      }

      return extractedText;
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }
}

// Agent 2: Content Analysis
class ContentAnalysisAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async analyzeSkills(resumeText) {
    const prompt = `
      Analyze the skills section from this resume text and extract all technical and soft skills mentioned.
      Rate the relevance and market demand of these skills on a scale of 1-10.
      
      Resume Text: ${resumeText}
      
      Provide response in JSON format:
      {
        "skills": ["skill1", "skill2", ...],
        "skillsRelevance": number,
        "marketDemand": number,
        "analysis": "detailed analysis"
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  async analyzeExperience(resumeText) {
    const prompt = `
      Analyze the work experience section from this resume text.
      Extract company names, job titles, duration, and responsibilities.
      Assess the quality and relevance of the experience.
      
      Resume Text: ${resumeText}
      
      Provide response in JSON format:
      {
        "companies": ["company1", "company2", ...],
        "positions": ["position1", "position2", ...],
        "totalExperience": "X years",
        "experienceQuality": number,
        "analysis": "detailed analysis"
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    // Remove code block markers if present
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  async analyzeProjects(resumeText) {
    const prompt = `
      Analyze the projects section from this resume text.
      Extract project names, technologies used, and descriptions.
      Assess the complexity and relevance of projects.
      
      Resume Text: ${resumeText}
      
      Provide response in JSON format:
      {
        "projects": ["project1", "project2", ...],
        "technologies": ["tech1", "tech2", ...],
        "projectQuality": number,
        "innovation": number,
        "analysis": "detailed analysis"
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    // Remove code block markers if present
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  async analyzeEducation(resumeText) {
    const prompt = `
      Analyze the education section from this resume text.
      Extract degree, institution, graduation year, and GPA if mentioned.
      Assess the quality of educational background.
      
      Resume Text: ${resumeText}
      
      Provide response in JSON format:
      {
        "degree": "degree name",
        "institution": "institution name",
        "graduationYear": "year",
        "gpa": "gpa if mentioned",
        "educationQuality": number,
        "analysis": "detailed analysis"
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    // Remove code block markers if present
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  async analyzeFormatting(resumeText) {
    const prompt = `
      Analyze the formatting and structure of this resume text.
      Check for ATS-friendly formatting, readability, and organization.
      
      Resume Text: ${resumeText}
      
      Provide response in JSON format:
      {
        "atsCompliance": number,
        "readability": number,
        "organization": number,
        "formatting": number,
        "analysis": "detailed analysis"
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    // Remove code block markers if present
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  async validateLinks(resumeText) {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const links = resumeText.match(linkRegex) || [];

    const validationResults = [];
    for (const link of links) {
      try {
        const response = await axios.head(link, { timeout: 5000 });
        validationResults.push({
          link: link,
          status: response.status,
          valid: response.status === 200
        });
      } catch (error) {
        validationResults.push({
          link: link,
          status: 'error',
          valid: false
        });
      }
    }

    return {
      totalLinks: links.length,
      validLinks: validationResults.filter(r => r.valid).length,
      linkValidation: validationResults
    };
  }
}

// Agent 3: ATS Score Calculator
class ATSScoreAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async verifyCompanies(companies) {
    const prompt = `
      Research and verify the reputation and market standing of these companies: ${companies.join(', ')}.
      Rate each company's reputation on a scale of 1-10 based on their industry standing, size, and recognition.
      
      Provide response in JSON format:
      {
        "companyRatings": [
          {"company": "name", "rating": number, "analysis": "brief analysis"}
        ],
        "averageCompanyRating": number
      }
    `;

    const result = await this.model.generateContent(prompt);
    let text = result.response.text();
    // Remove code block markers if present
    text = text.replace(/```json|```/g, '').trim();
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
      return match.replace(/[\r\n\t]+/g, ' ');
    });
    return JSON.parse(text);
  }

  calculateATSScore(analysisResults) {
    const {
      skillsAnalysis,
      experienceAnalysis,
      projectsAnalysis,
      educationAnalysis,
      formattingAnalysis,
      linkValidation,
      companyVerification
    } = analysisResults;

    // Weighted scoring system
    const weights = {
      skills: 0.25,
      experience: 0.25,
      projects: 0.20,
      education: 0.15,
      formatting: 0.10,
      links: 0.05
    };

    const skillsScore = (skillsAnalysis.skillsRelevance + skillsAnalysis.marketDemand) / 2;
    const experienceScore = experienceAnalysis.experienceQuality;
    const projectsScore = (projectsAnalysis.projectQuality + projectsAnalysis.innovation) / 2;
    const educationScore = educationAnalysis.educationQuality;
    const formattingScore = (formattingAnalysis.atsCompliance + formattingAnalysis.readability +
      formattingAnalysis.organization + formattingAnalysis.formatting) / 4;
    const linksScore = linkValidation.totalLinks > 0 ?
      (linkValidation.validLinks / linkValidation.totalLinks) * 10 : 8;

    // Company reputation bonus
    const companyBonus = companyVerification.averageCompanyRating > 7 ? 5 : 0;

    const totalScore = (
      skillsScore * weights.skills +
      experienceScore * weights.experience +
      projectsScore * weights.projects +
      educationScore * weights.education +
      formattingScore * weights.formatting +
      linksScore * weights.links
    ) * 10 + companyBonus;

    return Math.min(Math.round(totalScore), 100);
  }
}

// Main ATS Analysis Route
router.post('/analyze', upload.single('resume'), async (req, res) => {
  const io = req.app.get('io');
  const socketId = req.body.socketId;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Agent 1: Process file
    const fileProcessor = new FileProcessorAgent();
    const resumeText = await fileProcessor.processFile(req.file.path, req.file.mimetype);

    // Agent 2: Content analysis with real-time updates
    const contentAnalyzer = new ContentAnalysisAgent();

    // Skills analysis
    io.to(socketId).emit('stepUpdate', { step: 'skills', status: 'processing' });
    const skillsAnalysis = await contentAnalyzer.analyzeSkills(resumeText);
    io.to(socketId).emit('stepUpdate', { step: 'skills', status: 'completed' });

    // Experience analysis
    io.to(socketId).emit('stepUpdate', { step: 'experience', status: 'processing' });
    const experienceAnalysis = await contentAnalyzer.analyzeExperience(resumeText);
    io.to(socketId).emit('stepUpdate', { step: 'experience', status: 'completed' });

    // Projects analysis
    io.to(socketId).emit('stepUpdate', { step: 'projects', status: 'processing' });
    const projectsAnalysis = await contentAnalyzer.analyzeProjects(resumeText);
    io.to(socketId).emit('stepUpdate', { step: 'projects', status: 'completed' });

    // Education analysis
    io.to(socketId).emit('stepUpdate', { step: 'education', status: 'processing' });
    const educationAnalysis = await contentAnalyzer.analyzeEducation(resumeText);
    io.to(socketId).emit('stepUpdate', { step: 'education', status: 'completed' });

    // Formatting analysis
    io.to(socketId).emit('stepUpdate', { step: 'formatting', status: 'processing' });
    const formattingAnalysis = await contentAnalyzer.analyzeFormatting(resumeText);
    const linkValidation = await contentAnalyzer.validateLinks(resumeText);
    io.to(socketId).emit('stepUpdate', { step: 'formatting', status: 'completed' });

    // Agent 3: Calculate ATS Score
    const scoreCalculator = new ATSScoreAgent();
    const companyVerification = await scoreCalculator.verifyCompanies(experienceAnalysis.companies);

    const analysisResults = {
      skillsAnalysis,
      experienceAnalysis,
      projectsAnalysis,
      educationAnalysis,
      formattingAnalysis,
      linkValidation,
      companyVerification
    };

    const atsScore = scoreCalculator.calculateATSScore(analysisResults);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Send final results
    const finalResults = {
      atsScore,
      analysisResults,
      recommendations: await router.generateRecommendations(analysisResults, atsScore)
    };

    io.to(socketId).emit('analysisComplete', finalResults);
    res.json(finalResults);

  } catch (error) {
    console.error('ATS Analysis Error:', error);
    io.to(socketId).emit('analysisError', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.generateRecommendations = async function (analysisResults, atsScore) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Based on this ATS analysis with score ${atsScore}/100, provide specific recommendations for improvement:
    
    Analysis: ${JSON.stringify(analysisResults)}
    
    Provide 5-7 actionable recommendations in JSON format:
    {
      "recommendations": [
        {"category": "category", "suggestion": "specific suggestion", "priority": "high/medium/low"}
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  // Remove code block markers if present
  text = text.replace(/```json|```/g, '').trim();
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  text = text.replace(/"([^"]*?)([\r\n\t]+)([^"]*?)"/g, (match) => {
    return match.replace(/[\r\n\t]+/g, ' ');
  });
  return JSON.parse(text);
};

module.exports = router;