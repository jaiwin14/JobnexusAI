const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and image files are allowed.'));
    }
  }
});

// Helper function to extract text from different file types
async function extractTextFromFile(filePath, mimeType) {
  try {
    switch (mimeType) {
      case 'application/pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(pdfBuffer);
        return pdfData.text;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxBuffer = await fs.readFile(filePath);
        const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
        return docxResult.value;
      
      default:
        // For images, we'll use Gemini's vision capabilities
        return null;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Helper function to process image files with Gemini Vision
async function processImageWithGemini(filePath, userQuery) {
  try {
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `You are HireBot, a career counseling AI assistant. The user has uploaded an image and asked: "${userQuery}". 
    Please analyze the image content and provide helpful career advice, resume feedback, or answer their question based on what you see in the image. 
    Be motivating, emotionally intelligent, and supportive in your response.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: path.extname(filePath).includes('png') ? 'image/png' : 'image/jpeg'
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Error processing image with Gemini:', error);
    throw error;
  }
}

// Generate context-aware response using Langchain and Gemini
async function generateContextAwareResponse(userQuery, chatHistory, documentContent = null) {
  try {
    // Build context from chat history
    let context = "You are HireBot, an AI career counseling assistant. You are motivating, emotionally intelligent, and very helpful. You help users with career advice, resume feedback, cold email drafting, and general career guidance.\n\n";
    
    if (chatHistory && chatHistory.length > 0) {
      context += "Previous conversation context:\n";
      chatHistory.slice(-10).forEach((msg, index) => { // Last 10 messages for context
        context += `${msg.role === 'user' ? 'User' : 'HireBot'}: ${msg.content}\n`;
      });
      context += "\n";
    }
    
    if (documentContent) {
      // Use Langchain for document processing
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const docs = await textSplitter.createDocuments([documentContent]);
      
      // Create embeddings and vector store
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "embedding-001",
      });
      
      const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
      
      // Retrieve relevant documents
      const relevantDocs = await vectorStore.similaritySearch(userQuery, 3);
      const relevantContent = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      
      context += `Document content for reference:\n${relevantContent}\n\n`;
    }
    
    context += `Current user query: ${userQuery}\n\nPlease provide a helpful, motivating, and emotionally intelligent response:`;
    
    const result = await model.generateContent(context);
    return result.response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

// Get all chat sessions for a user
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const sessions = user.chatSessions || [];
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new chat session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newSession = {
      _id: new mongoose.Types.ObjectId(),
      title: title || `Chat ${(user.chatSessions?.length || 0) + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.chatSessions) {
      user.chatSessions = [];
    }
    
    user.chatSessions.push(newSession);
    await user.save();

    res.json({ success: true, session: newSession });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get specific chat session
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const session = user.chatSessions?.find(s => s._id.toString() === req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.chatSessions) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    user.chatSessions = user.chatSessions.filter(s => s._id.toString() !== req.params.sessionId);
    await user.save();

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send message to chat
router.post('/chat', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find or create session
    let session = user.chatSessions?.find(s => s._id.toString() === sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      document: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      } : null
    };

    session.messages.push(userMessage);

    // Process document if uploaded
    let documentContent = null;
    let botResponse = '';

    if (req.file) {
      const filePath = req.file.path;
      
      if (req.file.mimetype.startsWith('image/')) {
        // Process image with Gemini Vision
        botResponse = await processImageWithGemini(filePath, message);
      } else {
        // Extract text from document
        documentContent = await extractTextFromFile(filePath, req.file.mimetype);
        botResponse = await generateContextAwareResponse(message, session.messages.slice(0, -1), documentContent);
      }
      
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    } else {
      // Generate response without document
      botResponse = await generateContextAwareResponse(message, session.messages.slice(0, -1));
    }

    // Add bot response
    const botMessage = {
      role: 'assistant',
      content: botResponse,
      timestamp: new Date()
    };

    session.messages.push(botMessage);
    session.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      userMessage,
      botMessage,
      session: {
        _id: session._id,
        title: session.title,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error occurred' 
    });
  }
});

module.exports = router;