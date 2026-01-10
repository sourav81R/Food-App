import React, { useEffect, useState } from 'react'
import { FaGift } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";

function WelcomeCelebration({ onClose }) {
    const [showConfetti, setShowConfetti] = useState(false);
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Generate confetti particles
        const colors = ['#ff4d2d', '#FFD700', '#26D701', '#0078FF', '#FF00FF'];
        const newParticles = Array.from({ length: 100 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // vw
            y: -10 - Math.random() * 20, // start above screen
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 5 + Math.random() * 10,
            rotation: Math.random() * 360,
            speed: 3 + Math.random() * 5,
            delay: Math.random() * 2
        }));
        setParticles(newParticles);
        setShowConfetti(true);

        const timer = setTimeout(() => {
            // Auto close after 10 seconds if not interacted? 
            // User didn't specify, but let's keep it open until closed for maximum impact
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className='fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in'>
            {/* Confetti container */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                {showConfetti && particles.map((p) => (
                    <div
                        key={p.id}
                        className='absolute rounded-full opacity-80'
                        style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            backgroundColor: p.color,
                            transform: `rotate(${p.rotation}deg)`,
                            animation: `fall ${p.speed}s linear ${p.delay}s infinite`
                        }}
                    />
                ))}
            </div>

            {/* Celebration Card */}
            <div className='relative bg-white dark:bg-[#16213e] w-full max-w-md rounded-3xl p-8 shadow-2xl text-center transform animate-bounce-in overflow-hidden'>
                {/* Decorative background elements */}
                <div className='absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500'></div>
                <div className='absolute -top-10 -right-10 w-32 h-32 bg-[#ff4d2d]/10 rounded-full blur-2xl'></div>
                <div className='absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl'></div>

                <button
                    onClick={onClose}
                    className='absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10'
                >
                    <RxCross2 size={24} className='text-gray-500 dark:text-gray-400' />
                </button>

                <div className='mb-6 flex justify-center'>
                    <div className='w-24 h-24 bg-[#fff9f6] dark:bg-gray-800 rounded-full flex items-center justify-center shadow-inner relative'>
                        <FaGift size={40} className='text-[#ff4d2d] animate-wiggle' />
                        <div className='absolute -top-2 -right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse'>
                            90% OFF
                        </div>
                    </div>
                </div>

                <h2 className='text-3xl font-extrabold text-gray-800 dark:text-white mb-2 bg-gradient-to-r from-[#ff4d2d] to-orange-500 bg-clip-text text-transparent'>
                    Welcome Back! 🎉
                </h2>

                <p className='text-gray-600 dark:text-gray-300 mb-8 text-lg'>
                    Place your first order now and get up to <br/><span className='font-bold text-[#ff4d2d]'>90% OFF</span>!
                </p>

                <button
                    onClick={onClose}
                    className='w-full py-3.5 bg-gradient-to-r from-[#ff4d2d] to-[#ff7e5f] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]'
                >
                    Claim Offer Now 🚀
                </button>
            </div>

            <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    )
}

export default WelcomeCelebration
