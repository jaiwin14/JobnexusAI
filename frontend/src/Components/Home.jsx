import React, {useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import job from '../Assets/job.jpeg'

const Home = () => {
  const navigate = useNavigate()
  useEffect(() => {
    const token = localStorage.getItem('jobnexus_token');
    if (token) {
      navigate('/user-home', { replace: true });
    }
  }, [navigate]);
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 overflow-hidden">
      {/*Blurred Background Image*/}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110 opacity-70"
        style={{ backgroundImage: `url(${job})` }}
      ></div>

      {/*Foreground Content*/}
      <div className="relative text-center  ">
        <h1 className="text-6xl font-bold text-white leading-tight mb-6">
          Find your <span className="text-blue-700">Dream Job.</span><br />
          in just <span className="text-blue-700">ONE</span> click.
        </h1>
        <button  onClick={() => navigate('/auth')} className="bg-gray-800 text-orange-500 px-6 py-3 rounded-md text-lg hover:bg-gray-900 transition cursor-pointer">
          Get Started
        </button>
      </div>
    </div>
  )
}

export default Home
