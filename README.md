# JobnexusAI

JobnexusAI is an AI-powered job application platform that helps job seekers streamline their application process and employers find the right candidates.

## Project Overview

This project consists of three main components:
- **Frontend**: React application built with Vite
- **Backend**: Express.js API server
- **FastAPI Backend**: Python-based service for resume processing

## Features

- Resume parsing and analysis
- AI-powered job matching
- User authentication and profile management
- Applicant tracking system (ATS)
- Hiring bot for automated screening

## Tech Stack

### Frontend
- React.js
- Vite
- Socket.io (client)
- Tailwind CSS
- Framer Motion

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Google Generative AI
- LangChain
- Socket.io

### FastAPI Backend
- Python
- FastAPI
- Tesseract OCR

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MongoDB

### Installation

1. Clone the repository
```bash
git clone https://github.com/jaiwin14/JobnexusAI.git
cd JobnexusAI
```

2. Set up the Node.js backend
```bash
cd backend
npm install
# Create a .env file with your environment variables
npm run dev
```

3. Set up the FastAPI backend
```bash
cd ../fastapi_backend
pip install -r requirements.txt
# Create a .env file with your environment variables
python uploadResume.py
```

4. Set up the frontend
```bash
cd ../frontend
npm install
# Create a .env file with your environment variables
npm run dev
```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_api_key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
VITE_FASTAPI_URL=http://localhost:8000
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Jaiwin - [GitHub](https://github.com/jaiwin14)

Project Link: [https://github.com/jaiwin14/JobnexusAI](https://github.com/jaiwin14/JobnexusAI)