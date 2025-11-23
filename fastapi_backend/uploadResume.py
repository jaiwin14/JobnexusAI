import os
import tempfile
import json
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import requests
import base64
from typing import Optional
from pydantic import BaseModel
# Document processing libraries
import docx2txt
import PyPDF2
import io
import logging
from bson import ObjectId
from datetime import datetime
from pymongo import MongoClient

# LangChain imports
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Setup CORS to allow requests from the React frontend. Read allowed origins from
# FASTAPI_CORS_ORIGINS environment variable (comma-separated). If not provided,
# fall back to the previous defaults.
origins_env = os.getenv("FASTAPI_CORS_ORIGINS", "")
if origins_env:
    origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    origins = ["https://https://jobnexus-iota.vercel.app/", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ShortlistJobRequest(BaseModel):
    user_id: str
    job_data: dict

class RemoveShortlistRequest(BaseModel):
    user_id: str
    job_id: str

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up API keys
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY environment variable not set")
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")
MODEL_NAME = "gemini-2.5-flash"

# Initialize LLM
llm = ChatGoogleGenerativeAI(
    model=MODEL_NAME,
    google_api_key=GOOGLE_API_KEY,
    temperature=0.2,
    convert_system_message_to_human=True
)

# Setup Parser for structured output
class ResumeParsingOutputParser(JsonOutputParser):
    def parse(self, text: str) -> Dict[str, Any]:
        try:
            return super().parse(text)
        except Exception as e:
            print(f"Error parsing JSON output: {e}")
            print(f"Problematic text: {text}")
            # Try to clean and repair the output
            cleaned_text = self.clean_json_string(text)
            return json.loads(cleaned_text)
    
    def clean_json_string(self, text: str) -> str:
        # Extract JSON part if wrapped in ```json ... ``` or other markers
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            text = text[start:end].strip()
        return text

parser = ResumeParsingOutputParser()

# Resume Parsing LLM Chain
resume_system_prompt = """
You are an expert resume analyzer specialized in extracting structured information from resumes. 
Analyze the provided resume text and extract the following information in JSON format:

1. Personal information (name, contact details)
2. Skills (technical, soft skills)
3. Education (degrees, institutions, years)
4. Work experience (positions, companies, responsibilities, achievements, years)
5. Projects (if any)
6. Certifications (if any)
7. Keywords (extract important keywords that represent the person's expertise)

Be comprehensive and accurate. Parse all relevant information but structure it carefully.
"""

resume_prompt = PromptTemplate(
    input_variables=["resume_text"],
    template="""
Carefully analyze this resume text and extract all relevant information in a structured format:

{resume_text}

Return ONLY the JSON response with no additional explanation. Follow this exact structure:
{{
    "personal_info": {{
        "name": "string",
        "contact": "string",
        "location": "string" 
    }},
    "skills": ["skill1", "skill2", ...],
    "education": [
        {{
            "degree": "string",
            "institution": "string",
            "year": "string"
        }},
        ...
    ],
    "experience": [
        {{
            "position": "string",
            "company": "string",
            "duration": "string",
            "responsibilities": ["string", "string", ...],
            "achievements": ["string", "string", ...]
        }},
        ...
    ],
    "projects": [
        {{
            "name": "string",
            "description": "string",
            "technologies": ["string", "string", ...]
        }},
        ...
    ],
    "certifications": ["string", "string", ...],
    "keywords": ["string", "string", ...]
}}
"""
)

resume_chain = (
    {"resume_text": RunnablePassthrough()}
    | resume_prompt
    | llm
    | parser
)

# Job Search Keywords Generator LLM Chain
job_search_prompt = PromptTemplate(
    input_variables=["resume_data"],
    template="""
You are a career advisor and job search expert. Based on the following parsed resume information, generate the most effective job search keywords and queries that would find the best matching jobs for this candidate.

Resume data:
{resume_data}

Generate search terms that include:
1. Job titles that match the candidate's experience level and skills
2. Key technical skills and technologies
3. Industry-specific terms
4. Alternative job titles and synonyms

Return ONLY the JSON response with no additional explanation. Follow this exact structure:
{{
    "search_keywords": [
        {{
            "primary_keyword": "string",
            "related_terms": ["string", "string", ...],
            "job_level": "entry|mid|senior",
            "locations": ["string", "string", ...]
        }},
        ...
    ]
}}

Generate 5-7 different search keyword combinations to maximize job discovery.
"""
)

job_search_chain = (
    {"resume_data": RunnablePassthrough()}
    | job_search_prompt
    | llm
    | parser
)

# Real-time job search using JSearch API (RapidAPI)
def search_jobs_jsearch(search_keywords, user_location=None):
    """
    Search for real jobs using JSearch API from RapidAPI
    This provides actual job listings from various job boards including LinkedIn data
    """
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }
    
    all_jobs = []
    
    # Search with multiple keyword combinations to get diverse results
    for keyword_set in search_keywords["search_keywords"][:3]:  # Limit to 3 searches to avoid rate limits
        query = keyword_set["primary_keyword"]
        
        querystring = {
            "query": query,
            "page": "1",
            "num_pages": "1",
            "date_posted": "week",  # Recent jobs only
            "remote_jobs_only": "false",
            "employment_types": "FULLTIME,PARTTIME,CONTRACTOR",
        }
        
        # Add location parameter if user location is available
        if user_location and user_location.strip():
            querystring["location"] = user_location
        
        try:
            response = requests.get(url, headers=headers, params=querystring, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "data" in data and data["data"]:
                    all_jobs.extend(data["data"][:5])  # Take top 5 from each search
            else:
                print(f"API request failed with status {response.status_code}: {response.text}")
            
            # Add delay to respect rate limits
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error fetching jobs from JSearch API: {e}")
            continue
    
    # If API fails, fall back to mock data but with dynamic content based on keywords
    if not all_jobs:
        return generate_fallback_jobs(search_keywords, user_location)
    
    # Format jobs for frontend
    formatted_jobs = []
    seen_jobs = set()  # To avoid duplicates
    
    for job in all_jobs[:10]:  # Limit to top 10
        try:
            job_id = job.get("job_id", "")
            if job_id in seen_jobs:
                continue
            seen_jobs.add(job_id)
            
            #Extracting company logo
            company_logo = job.get("employer_logo") or "https://via.placeholder.com/120x120?text=" + job.get("employer_name", "Company")[:1]
            
            #Extracting job details
            job_title = job.get("job_title", "Software Engineer")
            company_name = job.get("employer_name", "Tech Company")
            location = job.get("job_city", "Remote")
            if job.get("job_state"):
                location += f", {job.get('job_state')}"
            if job.get("job_country") and job.get("job_country") != "US":
                location += f", {job.get('job_country')}"
            
            #Work mode display
            is_remote = job.get("job_is_remote", False)
            job_type = "Remote" if is_remote else "On-site"
            if "hybrid" in job.get("job_description", "").lower():
                job_type = "Hybrid"
            
            # Use the actual job apply link
            job_url = job.get("job_apply_link") or job.get("job_google_link", "https://www.linkedin.com/jobs/")
            
            # Calculate match score based on keyword relevance
            match_score = calculate_match_score(job, search_keywords)
            
            formatted_jobs.append({
                "id": job_id,
                "title": job_title,
                "company": company_name,
                "company_logo": company_logo,
                "location": location,
                "mode": job_type,
                "url": job_url,
                "description": job.get("job_description", "")[:200] + "...",
                "match_score": match_score,
                "posted_date": job.get("job_posted_at_date", "Recently")
            })
            
        except Exception as e:
            print(f"Error formatting job: {e}")
            continue
    
    # Sort by match score
    formatted_jobs.sort(key=lambda x: x["match_score"], reverse=True)
    
    return formatted_jobs[:10]

def calculate_match_score(job, search_keywords):
    """Calculate match score based on keyword relevance"""
    score = 70  # Base score
    
    job_text = (job.get("job_title", "") + " " + 
               job.get("job_description", "") + " " + 
               job.get("employer_name", "")).lower()
    
    # Check for keyword matches
    total_keywords = 0
    matched_keywords = 0
    
    for keyword_set in search_keywords["search_keywords"]:
        primary = keyword_set["primary_keyword"].lower()
        related = [term.lower() for term in keyword_set.get("related_terms", [])]
        
        all_terms = [primary] + related
        total_keywords += len(all_terms)
        
        for term in all_terms:
            if term in job_text:
                matched_keywords += 1
    
    if total_keywords > 0:
        keyword_match_rate = matched_keywords / total_keywords
        score += int(keyword_match_rate * 25)  # Up to 25 bonus points
    
    return min(score, 98)  # Cap at 98%

def generate_fallback_jobs(search_keywords, user_location=None):
    """Generate fallback jobs when API is unavailable"""
    fallback_companies = [
        {"name": "TechCorp", "logo": "https://via.placeholder.com/120x120?text=TC"},
        {"name": "InnovateLabs", "logo": "https://via.placeholder.com/120x120?text=IL"},
        {"name": "DataSoft", "logo": "https://via.placeholder.com/120x120?text=DS"},
        {"name": "CloudTech", "logo": "https://via.placeholder.com/120x120?text=CT"},
        {"name": "DevSolutions", "logo": "https://via.placeholder.com/120x120?text=DS"},
    ]
    
    # Use user location if available, otherwise default locations
    if user_location and user_location.strip():
        locations = [user_location, "Remote"]
    else:
        locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Remote"]
    
    modes = ["Remote", "Hybrid", "On-site"]
    
    jobs = []
    for i, keyword_set in enumerate(search_keywords["search_keywords"][:5]):
        company = fallback_companies[i % len(fallback_companies)]
        job_title = keyword_set["primary_keyword"]
        
        jobs.append({
            "id": f"fallback_{i}",
            "title": job_title,
            "company": company["name"],
            "company_logo": company["logo"],
            "location": locations[i % len(locations)],
            "mode": modes[i % len(modes)],
            "url": f"https://www.linkedin.com/jobs/search/?keywords={job_title.replace(' ', '%20')}",
            "description": f"Exciting opportunity for a {job_title} role.",
            "match_score": 85 - (i * 5),
            "posted_date": "Recently"
        })
    
    return jobs

# Alternative job search using Adzuna API (backup option)
def search_jobs_adzuna(search_keywords, user_location=None):
    """
    Alternative job search using Adzuna API
    Free tier available with good coverage
    """
    app_id = os.environ.get("ADZUNA_APP_ID", "595333d0")
    app_key = os.environ.get("ADZUNA_APP_KEY", "4ab5e2aacb40f33b9197f36989e22ba6")
    
    if not app_id or not app_key or app_id == "your-adzuna-app-id":
        return generate_fallback_jobs(search_keywords, user_location)
    
    base_url = "https://api.adzuna.com/v1/api/jobs/us/search/1"
    all_jobs = []
    
    for keyword_set in search_keywords["search_keywords"][:3]:
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "what": keyword_set["primary_keyword"],
            "results_per_page": 5,
            "sort_by": "relevance"
        }
        
        # Add location parameter if user location is available
        if user_location and user_location.strip():
            params["where"] = user_location
        
        try:
            response = requests.get(base_url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "results" in data:
                    all_jobs.extend(data["results"])
            time.sleep(0.5)
        except Exception as e:
            print(f"Error fetching from Adzuna: {e}")
            continue
    
    # Format Adzuna jobs
    formatted_jobs = []
    for i, job in enumerate(all_jobs[:10]):
        formatted_jobs.append({
            "id": job.get("id", f"adzuna_{i}"),
            "title": job.get("title", "Software Engineer"),
            "company": job.get("company", {}).get("display_name", "Company"),
            "company_logo": "https://via.placeholder.com/120x120?text=" + job.get("company", {}).get("display_name", "C")[:1],
            "location": job.get("location", {}).get("display_name", "Remote"),
            "mode": "On-site",  # Adzuna doesn't specify remote/hybrid clearly
            "url": job.get("redirect_url", "https://www.adzuna.com"),
            "description": job.get("description", "")[:200] + "...",
            "match_score": 80 - (i * 2),
            "posted_date": job.get("created", "Recently")
        })
    
    return formatted_jobs

# Function to extract text from PDF
def extract_text_from_pdf(file_content):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

# Function to extract text from DOCX
def extract_text_from_docx(file_content):
    return docx2txt.process(io.BytesIO(file_content))

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    # Validate file extension
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    
    # Read file content
    file_content = await file.read()
    
    # Extract text based on file type
    if file.filename.lower().endswith('.pdf'):
        resume_text = extract_text_from_pdf(file_content)
    else:  # .docx
        resume_text = extract_text_from_docx(file_content)
    
    if not resume_text or len(resume_text) < 100:
        raise HTTPException(status_code=400, detail="Could not extract sufficient text from the resume")
    
    try:
        # First agent: Parse resume
        parsed_resume = resume_chain.invoke(resume_text)
        
        # Extract user location from parsed resume
        user_location = parsed_resume.get("personal_info", {}).get("location", "").strip()
        
        # Second agent: Generate job search keywords
        search_keywords = job_search_chain.invoke(json.dumps(parsed_resume))
        
        # Third agent: Search for real jobs with location consideration
        job_listings = search_jobs_jsearch(search_keywords, user_location)
        
        # If JSearch fails, try Adzuna as backup
        if not job_listings:
            job_listings = search_jobs_adzuna(search_keywords, user_location)
        
        # Return the full result
        return {
            "resume_analysis": parsed_resume,
            "search_keywords": search_keywords,
            "job_listings": job_listings
        }
    
    except Exception as e:
        print(f"Error processing resume: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")
    


def get_database():
    CONNECTION_STRING = os.environ.get("MONGODB_URI")
    if not CONNECTION_STRING:
        raise RuntimeError("MONGODB_URI environment variable not set")
    client = MongoClient(CONNECTION_STRING)
    return client["jobnexus"]
    
@app.post("/api/shortlist-job")
async def shortlist_job(request: ShortlistJobRequest):
    try:
        # Validate user_id format
        if not ObjectId.is_valid(request.user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Get database connection (replace with your actual database connection)
        db = get_database()  # Replace with your database connection method
        user_collection = db["users"]  
        
        # Check if user exists
        user = user_collection.find_one({"_id": ObjectId(request.user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare job data with additional metadata
        job_data_with_metadata = {
            **request.job_data,
            "shortlistedAt": datetime.utcnow().isoformat(),
            "status": "active"  
        }
        
        # Check if job is already shortlisted to avoid duplicates
        existing_job = user_collection.find_one({
            "_id": ObjectId(request.user_id),
            "shortlistedJobs.jobId": request.job_data.get("jobId")
        })
        
        if existing_job:
            raise HTTPException(status_code=400, detail="Job already shortlisted")
        
        # Add job to user's shortlisted jobs using $addToSet to prevent duplicates
        result = user_collection.update_one(
            {"_id": ObjectId(request.user_id)},
            {"$addToSet": {"shortlistedJobs": job_data_with_metadata}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to shortlist job")
        
        logger.info(f"Job {request.job_data.get('jobId')} shortlisted for user {request.user_id}")
        
        return {
            "message": "Job shortlisted successfully",
            "jobId": request.job_data.get("jobId"),
            "shortlistedAt": job_data_with_metadata["shortlistedAt"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error shortlisting job: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while shortlisting job")

@app.get("/api/shortlisted-jobs/{user_id}")
async def get_shortlisted_jobs(user_id: str):
    try:
        # Validate user_id format
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Get database connection
        db = get_database()  # Replace with your database connection method
        user_collection = db["users"]  # Replace with your actual collection name
        
        # Fetch user's shortlisted jobs
        user = user_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"shortlistedJobs": 1, "_id": 0}  # Only return shortlistedJobs field
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        shortlisted_jobs = user.get("shortlistedJobs", [])
        
        # Filter out any inactive jobs (optional)
        active_jobs = [
            job for job in shortlisted_jobs 
            if job.get("status", "active") == "active"
        ]
        
        # Sort by shortlisted date (most recent first)
        active_jobs.sort(
            key=lambda x: x.get("shortlistedAt", ""), 
            reverse=True
        )
        
        logger.info(f"Retrieved {len(active_jobs)} shortlisted jobs for user {user_id}")
        
        return {
            "shortlisted_jobs": active_jobs,
            "total_count": len(active_jobs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shortlisted jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching shortlisted jobs")

@app.delete("/api/remove-shortlisted-job")
async def remove_shortlisted_job(request: RemoveShortlistRequest):
    try:
        # Validate user_id format
        if not ObjectId.is_valid(request.user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Get database connection
        db = get_database()  # Replace with your database connection method
        user_collection = db["users"]  
        
        # Check if user exists
        user = user_collection.find_one({"_id": ObjectId(request.user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if job exists in user's shortlisted jobs
        job_exists = user_collection.find_one({
            "_id": ObjectId(request.user_id),
            "shortlistedJobs.jobId": request.job_id
        })
        
        if not job_exists:
            raise HTTPException(status_code=404, detail="Job not found in shortlisted jobs")
        
        # Remove job from user's shortlisted jobs
        result = user_collection.update_one(
            {"_id": ObjectId(request.user_id)},
            {"$pull": {"shortlistedJobs": {"jobId": request.job_id}}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to remove job from shortlist")
        
        logger.info(f"Job {request.job_id} removed from shortlist for user {request.user_id}")
        
        return {
            "message": "Job removed from shortlist successfully",
            "jobId": request.job_id,
            "removedAt": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing shortlisted job: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while removing shortlisted job")

# Root endpoint for testing
@app.get("/")
def read_root():
    return {"message": "AI Job Finder API is running with real-time job search"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "apis": {
            "gemini": "configured" if GOOGLE_API_KEY != "your-gemini-api-key" else "not configured",
            "jsearch": "configured" if RAPIDAPI_KEY != "your-rapidapi-key" else "not configured"
        }
    }

# Run the FastAPI app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))