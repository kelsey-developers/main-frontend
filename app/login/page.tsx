'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/lib/actions/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const result = await loginAction(email, password);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative" style={{backgroundColor: '#0B5858'}}>
      {/* Background design image - full page */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: "url('/bg.svg')"
        }}
      />
      
      {/* Left Section - Welcome Panel */}
      <div className="flex-1 relative overflow-hidden z-10 hidden lg:block">
        
        {/* Content */}
        <div className="relative z-10 p-12 h-full flex flex-col">
          {/* Logo */}
          <div className="pt-8 mb-16 ml-13">
            <Link href="/" className="block">
              <img src="/logo.svg" alt="kelsey's homestay" className="h-24 w-auto hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          
          {/* Greeting */}
          <div className="mb-6 ml-16 mt-16">
            <h1 className="text-white text-6xl mb-2" style={{fontFamily: 'Poppins', fontWeight: 400}}>
              Hello,<br />
              <span className="text-yellow-400" style={{fontFamily: 'Poppins', fontWeight: 600}}>welcome!</span>
            </h1>
          </div>
          
          {/* Tagline */}
          <div className="ml-16">
            <p className="text-white text-3xl" style={{fontFamily: 'Poppins', fontWeight: 400}}>
              A welcoming stay, the Kelsey&apos;s way
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Section - Login Form */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-lg flex-1 flex flex-col justify-center">
          {/* Mobile Logo - Center */}
          <div className="lg:hidden pb-4 flex justify-center">
            <Link href="/" className="block">
              <img src="/logo.png" alt="kelsey's homestay" className="h-20 sm:h-24 w-auto hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          {/* Login Form Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10">
            {/* Title */}
            <h2 className="text-black text-center text-2xl sm:text-3xl mb-2" style={{fontFamily: 'Poppins', fontWeight: 700}}>
              Log In
            </h2>
            
            {/* Sign Up Link */}
            <p className="text-gray-600 text-center text-sm mb-8" style={{fontFamily: 'Poppins', fontWeight: 400}}>
              Don&apos;t have an account? <Link href="/signup" className="underline cursor-pointer" style={{color: '#0B5858', fontFamily: 'Poppins', fontWeight: 600}}>Sign Up</Link>
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm" style={{fontFamily: 'Poppins'}}>
                {error}
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 animate-fade-in">
              {/* Email Field */}
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  className="w-full py-3 pl-4 pr-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-400 hover:shadow-md"
                  style={{
                    fontFamily: 'Poppins', 
                    fontWeight: 400,
                    '--tw-ring-color': '#549F74',
                  } as React.CSSProperties}
                />
                <label 
                  htmlFor="email" 
                  className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    (email || emailFocused) ? '-top-2 text-xs bg-white px-1 rounded' : 'top-1/2 -translate-y-1/2 text-gray-500'
                  }`}
                  style={{
                    fontFamily: 'Poppins',
                    color: (email || emailFocused) ? '#0B5858' : undefined
                  }}
                >
                  Email Address
                </label>
              </div>
              
              {/* Password Field */}
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  className="w-full py-3 pl-4 pr-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-400 hover:shadow-md"
                  style={{
                    fontFamily: 'Poppins', 
                    fontWeight: 400,
                    '--tw-ring-color': '#549F74',
                  } as React.CSSProperties}
                />
                <label 
                  htmlFor="password" 
                  className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    (password || passwordFocused) ? '-top-2 text-xs bg-white px-1 rounded' : 'top-1/2 -translate-y-1/2 text-gray-500'
                  }`}
                  style={{
                    fontFamily: 'Poppins',
                    color: (password || passwordFocused) ? '#0B5858' : undefined
                  }}
                >
                  Password
                </label>
              </div>
              
              {/* Options */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-poppins cursor-pointer" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="hover:opacity-80 cursor-pointer" style={{color: '#0B5858', fontFamily: 'Poppins', fontWeight: 400}}>
                    Forgot password?
                  </a>
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 rounded-3xl text-white text-lg transition-all duration-300 hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden group"
                style={{backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600}}
              >
                {isPending ? (
                  <div className="flex items-center justify-center animate-pulse">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span className="animate-pulse">Loading...</span>
                  </div>
                ) : (
                  <span className="group-hover:animate-pulse">Log In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
