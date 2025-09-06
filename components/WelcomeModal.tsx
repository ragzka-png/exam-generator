import React, { useState, useEffect } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use a timeout to allow the component to mount before applying transition classes
      const timer = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShow(false);
    // Call the parent's onClose after the animation completes
    setTimeout(onClose, 300); // This duration should match the transition duration
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" 
        onClick={handleClose}
        aria-hidden="true"
      ></div>
      
      <div 
        className={`transform transition-all duration-300 ease-in-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} w-full max-w-md bg-slate-800/70 rounded-2xl border border-slate-700 shadow-2xl p-8 text-center`}
      >
        <h2 id="modal-title" className="text-2xl font-bold text-gray-200">
          Created by
        </h2>
        <p className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Muhammad Yafie Yulianto
        </p>

        <div className="my-6 border-t border-slate-700"></div>
        
        <blockquote className="text-gray-400 italic">
          <p>"kari ana sing gampang ngapain nggolet sing angel"</p>
        </blockquote>

        <button
          onClick={handleClose}
          className="mt-8 w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500"
        >
          OK
        </button>
      </div>
    </div>
  );
};