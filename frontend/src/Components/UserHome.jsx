import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import home from '../Assets/home.jpg';
import ats from '../Assets/ats.png';
import hireBot from '../Assets/hirebot.png';
import ms from '../Assets/ms.png';
import spot from '../Assets/spot.png';
import jpm from '../Assets/jpm.png';
import meta from '../Assets/meta.png';
import morgstan from '../Assets/morgstan.jpeg';
import deloi from '../Assets/deloi.jpg';
import download from '../Assets/download.jpg';
import tes from '../Assets/tes.jpg';

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

function TiltedCard({
  imageSrc,
  altText = "Tilted card image",
  captionText = "",
  containerHeight = "300px",
  containerWidth = "100%",
  imageHeight = "300px",
  imageWidth = "300px",
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = true,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
  onClick,
  style = {},
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1,
  });
  const [lastY, setLastY] = useState(0);

  function handleMouse(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;
    rotateX.set(rotationX);
    rotateY.set(rotationY);
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  return (
    <figure
      ref={ref}
      className="relative w-full h-full [perspective:800px] flex flex-col items-center justify-center"
      style={{
        height: containerHeight,
        width: containerWidth,
        ...style,
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {showMobileWarning && (
        <div className="absolute top-4 text-center text-sm block sm:hidden text-orange-400">
          This effect is not optimized for mobile. Check on desktop.
        </div>
      )}
      <motion.div
        className="relative [transform-style:preserve-3d]"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale,
        }}
      >
        <motion.img
          src={imageSrc || "https://via.placeholder.com/400x400/1f2937/f97316?text=JobNexus+AI+Platform"}
          alt={altText}
          className="absolute top-0 left-0 object-cover rounded-[15px] will-change-transform [transform:translateZ(0)]"
          style={{
            width: imageWidth,
            height: imageHeight,
          }}
        />
        {displayOverlayContent && overlayContent && (
          <motion.div
            className="absolute top-0 left-0 z-[2] will-change-transform [transform:translateZ(30px)]"
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>
      {showTooltip && (
        <motion.figcaption
          className="pointer-events-none absolute left-0 top-0 rounded-[4px] bg-white px-[10px] py-[4px] text-[10px] text-[#2d2d2d] opacity-0 z-[3] hidden sm:block"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption,
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}

const HEADER_TEXT = "No more difficulty in job hunting, \nJobNexus AI is here! 🚀";

function Typewriter({ text = "", speed = 50 }) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }

    setDisplayed('');
    setIsComplete(false);

    const chars = Array.from(text); //emoji handling
    let index = 0;

    const interval = setInterval(() => {
      if (index < chars.length) {
        setDisplayed(chars.slice(0, index + 1).join(''));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div className="w-full max-w-none">
      <h1 className="text-3xl md:text-5xl font-bold text-orange-500 leading-tight">
        {displayed.split('\n').map((line, idx, arr) => (
          <React.Fragment key={idx}>
            {line}
            {idx < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
        {!isComplete && <span className="animate-pulse">|</span>}
      </h1>
    </div>
  );
}

function Counter({ target, duration = 5000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      setCount(Math.floor(start));
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count >= 1000 ? '1000' : count}</span>;
}

const UserHome = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [location, setLocation] = useState('');
  const [jobResults, setJobResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noJobsMessage, setNoJobsMessage] = useState("");
  const jobSearchRef = useRef(null);
  const navigate = useNavigate();

  const scrollToJobSearch = () => {
    jobSearchRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const companies = [
    { name: 'Google', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg' },
    { name: 'Microsoft', logo: ms },
    { name: 'Netflix', logo: 'https://images.ctfassets.net/4cd45et68cgf/7LrExJ6PAj6MSIPkDyCO86/542b1dfabbf3959908f69be546879952/Netflix-Brand-Logo.png' },
    { name: 'JP Morgan', logo: jpm },
    { name: 'Morgan Stanley', logo: morgstan },
    { name: 'Deloitte', logo: deloi },
    { name: 'Amazon', logo: download },
    { name: 'Meta', logo: meta },
    { name: 'Tesla', logo: tes },
    { name: 'Apple', logo: 'https://companieslogo.com/img/orig/AAPL-bf1a4314.png' },
    { name: 'Spotify', logo: spot }
  ];

  const cities = [
    'Buenos Aires, Argentina',
    'Adelaide, Australia',
    'Brisbane, Australia',
    'Canberra, Australia',
    'Hobart, Australia',
    'Melbourne, Australia',
    'Perth, Australia',
    'Sydney, Australia',
    'Vienna, Austria',
    'Salzburg, Austria',
    'Baku, Azerbaijan',
    'Brussels, Belgium',
    'Rio de Janeiro, Brazil',
    'Sao Paulo, Brazil',
    'Calgary, Canada',
    'Montreal, Canada',
    'Ottawa, Canada',
    'Toronto, Canada',
    'Vancouver, Canada',
    'Santiago, Chile',
    'Beijing, China',
    'Guangzhou, China',
    'Hong Kong, China',
    'Shanghai, China',
    'Shenzhen, China',
    'Bogotá, Colombia',
    'Zagreb, Croatia',
    'Prague, Czech Republic',
    'Copenhagen, Denmark',
    'Cairo, Egypt',
    'Helsinki, Finland',
    'Paris, France',
    'Lille, France',
    'Lyon, France',
    'Marseille, France',
    'Nice, France',
    'Toulouse, France',
    'Berlin, Germany',
    'Cologne, Germany',
    'Düsseldorf, Germany',
    'Dortmund, Germany',
    'Frankfurt, Germany',
    'Hamburg, Germany',
    'Munich, Germany',
    'Stuttgart, Germany',
    'Accra, Ghana',
    'Athens, Greece',
    'Budapest, Hungary',
    'Reykjavik, Iceland',
    'Ahmedabad, India',
    'Bangalore, India',
    'Chennai, India',
    'Delhi, India',
    'Hyderabad, India',
    'Jaipur, India',
    'Kochi, India',
    'Kolkata, India',
    'Lucknow, India',
    'Mangalore, India',
    'Mumbai, India',
    'Nagpur, India',
    'Pune, India',
    'Bali, Indonesia',
    'Jakarta, Indonesia',
    'Cork, Ireland',
    'Dublin, Ireland',
    'Malahide, Ireland',
    'Rome, Italy',
    'Milan, Italy',
    'Tokyo, Japan',
    'Osaka, Japan',
    'Amman, Jordan',
    'Nairobi, Kenya',
    'Kuwait City, Kuwait',
    'Riga, Latvia',
    'Vilnius, Lithuania',
    'Kuala Lumpur, Malaysia',
    'Mexico City, Mexico',
    'Monterrey, Mexico',
    'Casablanca, Morocco',
    'Amsterdam, Netherlands',
    'Rotterdam, Netherlands',
    'Auckland, New Zealand',
    'Christchurch, New Zealand',
    'Hamilton, New Zealand',
    'Napier, New Zealand',
    'Tauranga, New Zealand',
    'Wellington, New Zealand',
    'Lagos, Nigeria',
    'Oslo, Norway',
    'Islamabad, Pakistan',
    'Karachi, Pakistan',
    'Lahore, Pakistan',
    'Manila, Philippines',
    'Warsaw, Poland',
    'Lisbon, Portugal',
    'Bucharest, Romania',
    'Moscow, Russia',
    'Saint Petersburg, Russia',
    'Riyadh, Saudi Arabia',
    'Jeddah, Saudi Arabia',
    'Belgrade, Serbia',
    'Singapore, Singapore',
    'Bratislava, Slovakia',
    'Ljubljana, Slovenia',
    'Bloemfontein, South Africa',
    'Cape Town, South Africa',
    'Durban, South Africa',
    'Johannesburg, South Africa',
    'Port Elizabeth, South Africa',
    'Pretoria, South Africa',
    'Seoul, South Korea',
    'Barcelona, Spain',
    'Madrid, Spain',
    'Valencia, Spain',
    'Stockholm, Sweden',
    'Zurich, Switzerland',
    'Geneva, Switzerland',
    'Taipei, Taiwan',
    'Bangkok, Thailand',
    'Tunis, Tunisia',
    'Ankara, Turkey',
    'Istanbul, Turkey',
    'Dubai, United Arab Emirates',
    'Abu Dhabi, United Arab Emirates',
    'Birmingham, United Kingdom',
    'Bristol, United Kingdom',
    'Cardiff, United Kingdom',
    'Edinburgh, United Kingdom',
    'Glasgow, United Kingdom',
    'Leeds, United Kingdom',
    'Leicester, United Kingdom',
    'Liverpool, United Kingdom',
    'London, United Kingdom',
    'Manchester, United Kingdom',
    'Nottingham, United Kingdom',
    'Sheffield, United Kingdom',
    'Atlanta, USA',
    'Austin, USA',
    'Baltimore, USA',
    'Boston, USA',
    'Charlotte, USA',
    'Chicago, USA',
    'Cincinnati, USA',
    'Cleveland, USA',
    'Columbus, USA',
    'Dallas, USA',
    'Denver, USA',
    'Detroit, USA',
    'Houston, USA',
    'Indianapolis, USA',
    'Kansas City, USA',
    'Las Vegas, USA',
    'Los Angeles, USA',
    'Miami, USA',
    'Minneapolis, USA',
    'Nashville, USA',
    'New York, USA',
    'Orlando, USA',
    'Philadelphia, USA',
    'Phoenix, USA',
    'Pittsburgh, USA',
    'Portland, USA',
    'Raleigh, USA',
    'Salt Lake City, USA',
    'San Antonio, USA',
    'San Diego, USA',
    'San Francisco, USA',
    'San Jose, USA',
    'Seattle, USA',
    'St. Louis, USA',
    'Tampa, USA',
    'Washington DC, USA'
  ];


  const handleSubmit = async () => {
    if (!jobTitle || !workMode || !location) return;

    setLoading(true);
    setNoJobsMessage(""); // Clear previous message
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userHome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobTitle, workMode, location }),
      });
      const data = await response.json();
      if (data.success) {
        setJobResults(data.jobs || []);
        setNoJobsMessage("");
      } else {
        setJobResults([]);
        setNoJobsMessage(data.message || "No jobs found.");
      }
    } catch (error) {
      setJobResults([]);
      setNoJobsMessage("An error occurred while searching for jobs.");
      console.error('Error fetching jobs:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white">
      {/*Animated Header Text*/}
      <div className="relative py-8 px-4 text-center w-full">
        <div className="container mx-auto max-w-6xl">
          <Typewriter text={HEADER_TEXT} speed={40} />
        </div>
      </div>

      {/*About JobNexus AI Section*/}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-orange-500 mb-6">About JobNexus AI</h2>
            <p className="text-lg text-gray-300 mb-6">
              JobNexus AI revolutionizes your job search experience with cutting-edge artificial intelligence.
              Our platform analyzes your resume, matches you with perfect opportunities, and provides
              personalized recommendations to accelerate your career growth.
            </p>
            <p className="text-lg text-gray-300">
              From ATS score optimization to intelligent job matching, we're your trusted partner
              in landing your dream job. Let our AI-powered tools transform your job hunting journey
              from stressful to successful.
            </p>
          </div>
          <div className="flex justify-center">
            <TiltedCard
              imageSrc={home}
              altText="JobNexus AI Platform"
              imageHeight="400px"
              imageWidth="400px"
              containerHeight="400px"
              onClick={scrollToJobSearch}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      </section>

      {/*Dream Companies Section*/}
      <section className="py-16 bg-gray-800/50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-orange-600 mb-12">
            Helps you get into your dream companies
          </h2>
          <div className="relative overflow-hidden">
            <motion.div
              className="flex gap-12 items-center"
              animate={{ x: [0, -2000] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {[...companies, ...companies].map((company, index) => (
                <div key={index} className="flex flex-col items-center min-w-[120px]">
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-16 h-16 object-contain mb-2"
                  />
                  <span className="text-sm text-gray-300 font-medium">{company.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/*Job Recommendations Counter*/}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-orange-600 mb-4">
            Get more than <Counter target={1000} />+ job recommendations based on your resume
          </h2>
        </div>
      </section>

      {/*Features Section*/}
      <section className="py-16 bg-gray-800/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              className="text-center p-8 bg-gray-700/50 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              onClick={() => navigate('/ats-score')}
              style={{ cursor: 'pointer' }}
            >
              <h3 className="text-2xl font-bold text-orange-500 mb-4">ATS Score Optimization</h3>
              <p className="text-gray-300">
                Check your ATS score and get personalized suggestions to optimize your resume
                for applicant tracking systems used by top companies.
              </p>
              <img
                src={ats}
                alt="ATS Score"
                className="mx-auto mb-4 pt-6 w-190 h-100 object-center"
              />
            </motion.div>
            <motion.div
              className="text-center p-8 bg-gray-700/50 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              onClick={() => navigate('/chat-ai')}
              style={{ cursor: 'pointer' }}
            >
              <h3 className="text-2xl font-bold text-orange-500 mb-4">HireBot Assistant</h3>
              <p className="text-gray-300">
                Talk to our friendly AI chatbot called HireBot for instant career advice,
                interview tips, and personalized job search guidance.
              </p>
              <img
                src={hireBot}
                alt="HireBot Assistant"
                className="mx-auto mb-4 pt-6 w-190 h-100 object-center"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/*Job Search Section*/}
      <section ref={jobSearchRef} className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-orange-600 mb-12">
            Find Your Perfect Job
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-orange-400 font-medium mb-2">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-orange-400 font-medium mb-2">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                  required
                >
                  <option value="">Select Work Mode</option>
                  <option value="Remote">Remote</option>
                  <option value="On-Site">On-Site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-orange-400 font-medium mb-2">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                  required
                >
                  <option value="">Select Location</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!jobTitle || !workMode || !location || loading}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-300"
              >
                {loading ? 'Searching...' : 'Find Jobs'}
              </button>
            </div>
            {noJobsMessage && (
              <div className="mt-8 text-center text-orange-400 text-lg font-semibold">
                {noJobsMessage}
              </div>
            )}
          </div>

          {/*Job Results*/}
          {jobResults.length > 0 && (
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-orange-500 mb-8 text-center">
                Top Job Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobResults.map((job, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-700/50 p-6 rounded-xl backdrop-blur-sm border border-gray-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h4 className="text-xl font-semibold text-orange-400 mb-2">{job.title}</h4>
                    <p className="text-gray-300 mb-2">{job.company}</p>
                    <p className="text-gray-400 mb-4">{job.location}</p>
                    <p className="text-sm text-gray-300 mb-4">{job.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-500 font-medium">{job.salary}</span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors duration-300"
                      >
                        Apply Now
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default UserHome;