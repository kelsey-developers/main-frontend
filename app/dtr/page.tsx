'use client';

import React, { useState, useEffect, useRef } from 'react';

// Type definitions
type EmployeeRole = 'HOUSEKEEPING' | 'ADMIN';

interface Cleaner {
  employee_id: number;
  full_name: string;
  position: string;
  employee_code: string;
  role: EmployeeRole; // ADDED
}

interface DTRRecord {
  dtr_id: number;
  employee_id: number;
  work_date: string;
  time_in: string;
  time_out?: string;
  hours_worked?: number;
  status: 'OPEN' | 'CLOSED';
  proof_photo?: string;
  tasks_completed?: string;
  shift_start?: string; // ADDED e.g. "09:00"
  shift_end?: string;   // ADDED e.g. "15:00"
}

interface TaskLog {
  task_id: number;
  unit_name: string;
  task_type: string;
  completed_at: string;
  proof_photo: string;
  status: 'COMPLETED' | 'VERIFIED';
}

// ADDED: Shift options (6-hour blocks, offsettable)
const SHIFT_OPTIONS = [
  { label: '9:00 AM – 3:00 PM',  start: '09:00', end: '15:00' },
  { label: '10:00 AM – 4:00 PM', start: '10:00', end: '16:00' },
  { label: '11:00 AM – 5:00 PM', start: '11:00', end: '17:00' },
  { label: '12:00 PM – 6:00 PM', start: '12:00', end: '18:00' },
];

// Shift status helper — based on the valid time-in window (9 AM – 12 PM)
// Blue  : before 9 AM  → not yet in any shift window
// Green : 9 AM – 12 PM  → within the shift start window, can time in
// Red   : after 12 PM  → shift start hours have passed, cannot time in
function getShiftStatus() {
  const now = new Date();
  const earliest = new Date(now); earliest.setHours(9, 0, 0, 0);
  const latest   = new Date(now); latest.setHours(12, 0, 0, 0);
  if (now < earliest) return { label: 'Not Within Shift Hours',   color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300'  };
  if (now <= latest)  return { label: 'Within Shift Hours',       color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' };
  return                     { label: 'Shift Start Hours Passed', color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200'   };
}

// Simple Navbar
const Navbar: React.FC<{ cleaner: Cleaner }> = ({ cleaner }) => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-2xl font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
            Kelsey's Homestay
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                {cleaner.full_name}
              </p>
              <p className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>
                {cleaner.position}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-full flex items-center justify-center">
              <span className="text-white font-bold" style={{fontFamily: 'Poppins'}}>
                {cleaner.full_name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Footer
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B5858] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-300 text-sm" style={{fontFamily: 'Poppins'}}>
            © {currentYear} Kelsey's Homestay. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

// ADDED: Back Button
const BackButton: React.FC = () => (
  <button
    type="button"
    onClick={() => window.history.back()}
    className="flex items-center gap-2 text-gray-600 hover:text-[#0B5858] font-medium transition-colors group mb-6"
    style={{fontFamily: 'Poppins'}}
  >
    <span className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 group-hover:border-[#0B5858] group-hover:bg-[#0B5858]/5 transition-all">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </span>
    <span className="text-sm font-semibold">Admin Dashboard</span>
  </button>
);

// ADDED: Shift Selector component
const ShiftSelector: React.FC<{
  selectedShift: { label: string; start: string; end: string } | null;
  onSelect: (shift: { label: string; start: string; end: string }) => void;
  disabled?: boolean;
}> = ({ selectedShift, onSelect, disabled }) => {
  // Re-evaluate shift status every minute so the badge stays accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const status = getShiftStatus();
  return (
    <div className="bg-white rounded-lg shadow-lg border-t-4 border-gray-300 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
        Shift Schedule
      </h2>
      <p className="text-gray-600 mb-4" style={{fontFamily: 'Poppins'}}>
        Standard shift is 6 hours. Select your offset if applicable.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {SHIFT_OPTIONS.map((opt) => {
          const isSelected = selectedShift?.start === opt.start;
          return (
            <button
              key={opt.start}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt)}
              className={`py-3 px-3 rounded-lg border text-sm font-semibold transition-all text-center ${
                isSelected
                  ? 'bg-[#0B5858] text-white border-[#0B5858] shadow'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#0B5858] hover:text-[#0B5858]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{fontFamily: 'Poppins'}}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${status.bg} ${status.border}`}>
        <span className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
        <span className={`text-sm font-semibold ${status.color}`} style={{fontFamily: 'Poppins'}}>
          {status.label}
        </span>
      </div>
    </div>
  );
};

// ADDED: Admin Online Duty Panel
const AdminDutyPanel: React.FC<{
  isTimedIn: boolean;
  currentDTR: DTRRecord | null;
}> = ({ isTimedIn, currentDTR }) => {
  const hoursWorked = currentDTR?.time_in && isTimedIn
    ? ((Date.now() - new Date(currentDTR.time_in).getTime()) / 1000 / 3600).toFixed(1)
    : currentDTR?.hours_worked?.toFixed(1) ?? '0.0';

  return (
    <div className="bg-white rounded-lg shadow-lg border-t-4 border-purple-500 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
          Online Duty Summary
        </h2>
        <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
          Admins work online — queries, gatepasses, and booking confirmations.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0B5858]/5 rounded-lg p-4 border border-[#0B5858]/20">
          <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Duty Status</p>
          <p className={`text-xl font-bold ${isTimedIn ? 'text-green-700' : 'text-gray-400'}`} style={{fontFamily: 'Poppins'}}>
            {isTimedIn ? '● Online' : '○ Offline'}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Hours on Duty</p>
          <p className="text-xl font-bold text-blue-700" style={{fontFamily: 'Poppins'}}>{hoursWorked}h</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Role</p>
          <p className="text-xl font-bold text-purple-700" style={{fontFamily: 'Poppins'}}>Admin</p>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2" style={{fontFamily: 'Poppins'}}>Admin Responsibilities</p>
        <ul className="text-sm text-blue-700 space-y-1" style={{fontFamily: 'Poppins'}}>
          <li>• Answer queries from agents and guests</li>
          <li>• Issue gatepasses for check-ins</li>
          <li>• Accept down-payments for bookings</li>
          <li>• Coordinate with housekeeping as needed</li>
        </ul>
      </div>
    </div>
  );
};

// TIME IN/OUT CARD COMPONENT
const TimeTrackingCard: React.FC<{
  currentDTR: DTRRecord | null;
  onTimeIn: () => void;
  onTimeOut: () => void;
  isLoading: boolean;
  selectedShift: { label: string; start: string; end: string } | null;
}> = ({ currentDTR, onTimeIn, onTimeOut, isLoading, selectedShift }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize time on client only
  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show placeholder until mounted on client
  if (!isMounted) {
    return null; // or return a loading skeleton
  }

  // Rest of your component code stays the same
  const isTimedIn = currentDTR && currentDTR.status === 'OPEN';
  const timeInFormatted = currentDTR?.time_in ? new Date(currentDTR.time_in).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : null;

  const timeOutFormatted = currentDTR?.time_out ? new Date(currentDTR.time_out).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : null;

  const shiftStatus = getShiftStatus();
  // Can only time in if: not already timed in, not loading, AND current time is within the 9am–12pm window
  const timeInDisabled = !!isTimedIn || isLoading || shiftStatus.label !== 'Within Shift Hours';

  return (
    <div className="bg-white rounded-lg shadow-lg border-t-4 border-[#0B5858] overflow-hidden">
      <div className="relative bg-gradient-to-r from-[#0B5858] to-[#094444] text-white p-6 sm:p-8 overflow-hidden">
        {/* Decorative circle — upper right, behind content */}
        <div className="absolute -top-8 -right-10 w-45 h-45 rounded-full bg-white opacity-5 pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-100 mb-2" style={{fontFamily: 'Poppins'}}>
              Current Time
            </p>
            <p className="text-5xl font-bold font-mono" style={{fontFamily: 'Courier New'}}>
              {currentTime}
            </p>
          </div>
          <div className="text-right mt-4 sm:mt-0">
            <p className="text-sm text-gray-100 mb-2" style={{fontFamily: 'Poppins'}}>
              Today's Date
            </p>
            <p className="text-2xl font-semibold" style={{fontFamily: 'Poppins'}}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Selected Shift */}
        {selectedShift ? (
          <div className="mb-4 flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-teal-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-teal-100" style={{ fontFamily: 'Poppins' }}>
              Shift: {selectedShift.label}
            </span>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-300 italic" style={{ fontFamily: 'Poppins' }}>
              No shift selected
            </span>
          </div>
        )}

        {/* Time Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-grey bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-black-100 mb-2" style={{fontFamily: 'Poppins'}}>
              Time In
            </p>
            <p className="text-2xl font-bold" style={{fontFamily: 'Poppins'}}>
              {timeInFormatted || '-- : --'}
            </p>
          </div>
          <div className="bg-grey bg-opacity-20 rounded-lg p-4">
            <p className="text-sm text-black-100 mb-2" style={{fontFamily: 'Poppins'}}>
              Time Out
            </p>
            <p className="text-2xl font-bold" style={{fontFamily: 'Poppins'}}>
              {timeOutFormatted || '-- : --'}
            </p>
          </div>
        </div>

        {/* Time In/Out Buttons */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <button
            type="button"
            onClick={onTimeIn}
            disabled={timeInDisabled}
            className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
              timeInDisabled
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
            }`}
            style={{fontFamily: 'Poppins'}}
          >
            {isLoading ? 'Processing...' : '✓ Time In'}
          </button>
          <button
            type="button"
            onClick={onTimeOut}
            disabled={!isTimedIn || isLoading}
            className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
              !isTimedIn || isLoading
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
            }`}
            style={{fontFamily: 'Poppins'}}
          >
            {isLoading ? 'Processing...' : '✗ Time Out'}
          </button>
        </div>

        {isTimedIn && (
          <div className="mt-6 bg-green-600 text-white rounded-lg p-4 text-center">
            <p className="text-sm font-semibold animate-pulse" style={{fontFamily: 'Poppins'}}>
              ● You are currently signed in
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// WORK PHOTO UPLOAD COMPONENT
const WorkPhotoUpload: React.FC<{
  isTimedIn: boolean;
  onPhotoUpload: (file: File, taskType: string, location: string) => void;
  isUploading: boolean;
}> = ({ isTimedIn, onPhotoUpload, isUploading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<string>('Cleaning');
  const [location, setLocation] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile && location) {
      onPhotoUpload(selectedFile, taskType, location);
      setSelectedFile(null);
      setPreview(null);
      setLocation('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-t-4 border-blue-500 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
          Work Photo Log
        </h2>
        <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
          Upload photos of completed work as evidence
        </p>
      </div>

      {/* File Input */}
      <div className="mb-6">
        <label className="block mb-2">
          <span className="text-sm font-semibold text-gray-700" style={{fontFamily: 'Poppins'}}>
            Select Photo
          </span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            preview
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-500'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          {preview ? (
            <div className="space-y-4">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
              <p className="text-sm text-green-700 font-semibold" style={{fontFamily: 'Poppins'}}>
                Photo selected
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-700 font-semibold" style={{fontFamily: 'Poppins'}}>
                Click to upload or take a photo
              </p>
              <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                PNG, JPG, JPEG or GIF (max. 5MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Type & Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" style={{fontFamily: 'Poppins'}}>
            Task Type
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]"
            style={{fontFamily: 'Poppins'}}
          >
            <option value="Cleaning">Cleaning</option>
            <option value="Laundry">Laundry</option>
            <option value="Inspection">Inspection</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" style={{fontFamily: 'Poppins'}}>
            Location/Room
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Room 101, Kitchen, Bathroom"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]"
            style={{fontFamily: 'Poppins'}}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedFile || !location || !isTimedIn || isUploading}
        className={`w-full py-3 rounded-lg font-bold transition-colors ${
          !selectedFile || !location || !isTimedIn || isUploading
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        style={{fontFamily: 'Poppins'}}
      >
        {isUploading ? 'Uploading...' : 'Upload Work Photo'}
      </button>

      {!isTimedIn && (
        <p className="mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg text-center" style={{fontFamily: 'Poppins'}}>
          You must sign in first to upload work photos
        </p>
      )}
    </div>
  );
};

// DAILY LOG COMPONENT
const DailyLog: React.FC<{ tasks: TaskLog[] }> = ({ tasks }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
          Today's Work Log
        </h2>
        <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg" style={{fontFamily: 'Poppins'}}>
            No work photos uploaded yet today
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row">
                {/* Photo */}
                <div className="w-full sm:w-48 h-40 bg-gray-200 flex-shrink-0">
                  <img
                    src={task.proof_photo}
                    alt="Work photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-xl text-gray-900" style={{fontFamily: 'Poppins'}}>
                        {task.task_type}
                      </p>
                      <p className="text-m text-gray-600" style={{fontFamily: 'Poppins'}}>
                        {task.unit_name}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      task.status === 'VERIFIED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`} style={{fontFamily: 'Poppins'}}>
                      {task.status === 'VERIFIED' ? 'Verified' : 'Pending'}
                    </span>
                  </div>

                  <p className="text-s text-gray-500" style={{fontFamily: 'Poppins'}}>
                    {new Date(task.completed_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// MAIN DTR PAGE
export default function CleanerDTRPage() {
  const [cleaner, setCleaner] = useState<Cleaner>({
    employee_id: 1,
    full_name: 'Maria Santos',
    position: 'Cleaner',
    employee_code: 'EMP-001',
    role: 'HOUSEKEEPING', // ADDED — change to 'ADMIN' to see Admin view; in production derive from auth
  });

  const [currentDTR, setCurrentDTR] = useState<DTRRecord | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{ label: string; start: string; end: string } | null>(null); // ADDED
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastHideTimeout.current) clearTimeout(toastHideTimeout.current);
    // Mount with visible=false first, then flip to true on next tick so CSS transition fires
    setToast({ message, type, visible: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToast({ message, type, visible: true });
      });
    });
    toastTimeout.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
      toastHideTimeout.current = setTimeout(() => setToast(null), 400);
    }, 5000);
  };

  // Load cleaner info and DTR on mount
  useEffect(() => {
    // Replace with actual API call to get logged-in cleaner
    // const response = await fetch('/api/auth/me');
    // const data = await response.json();
    // setCleaner(data);

    // Load today's DTR
    loadTodaysDTR();
    loadTodaysTasks();
  }, []);

  const loadTodaysDTR = async () => {
    try {
      // Replace with actual API call
      // const response = await fetch(`/api/dtr?employee_id=${cleaner.employee_id}&date=${new Date().toISOString().split('T')[0]}`);
      // const data = await response.json();
      // setCurrentDTR(data);

      // Back-end will provide the actual DTR record; leave null until Time In is pressed
    } catch (error) {
      console.error('Error loading DTR:', error);
    }
  };

  const loadTodaysTasks = async () => {
    try {
      // Replace with actual API call
      const mockTasks: TaskLog[] = [
        {
          task_id: 1,
          unit_name: 'Room 101',
          task_type: 'Cleaning',
          completed_at: new Date(new Date().setHours(10, 30, 0)).toISOString(),
          proof_photo: 'https://via.placeholder.com/400x300?text=Room+101+Cleaned',
          status: 'VERIFIED'
        },
        {
          task_id: 2,
          unit_name: 'Room 102',
          task_type: 'Cleaning',
          completed_at: new Date(new Date().setHours(11, 45, 0)).toISOString(),
          proof_photo: 'https://via.placeholder.com/400x300?text=Room+102+Cleaned',
          status: 'COMPLETED'
        }
      ];
      setTodaysTasks(mockTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleTimeIn = async () => {
    setIsLoading(true);
    try {
      // Replace with actual API call
      // const response = await fetch('/api/dtr/time-in', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     employee_id: cleaner.employee_id,
      //     work_date: new Date().toISOString().split('T')[0],
      //     timestamp: new Date().toISOString()
      //   })
      // });
      // const data = await response.json();
      // setCurrentDTR(data);

      // Mock response
      const newDTR: DTRRecord = {
        dtr_id: 1,
        employee_id: cleaner.employee_id,
        work_date: new Date().toISOString().split('T')[0],
        time_in: new Date().toISOString(),
        status: 'OPEN',
        shift_start: selectedShift?.start, // ADDED
        shift_end: selectedShift?.end,     // ADDED
      };
      setCurrentDTR(newDTR);

      // Show success message
      showToast('Time In recorded successfully', 'success');
    } catch (error) {
      console.error('Error signing in:', error);
      showToast('Failed to record time in', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeOut = async () => {
    setIsLoading(true);
    try {
      // Replace with actual API call
      // const response = await fetch('/api/dtr/time-out', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     employee_id: cleaner.employee_id,
      //     dtr_id: currentDTR?.dtr_id,
      //     timestamp: new Date().toISOString()
      //   })
      // });
      // const data = await response.json();
      // setCurrentDTR(data);

      // Mock response
      if (currentDTR) {
        const updatedDTR: DTRRecord = {
          ...currentDTR,
          time_out: new Date().toISOString(),
          status: 'CLOSED',
          hours_worked: 9
        };
        setCurrentDTR(updatedDTR);
      }

      showToast('Time Out recorded successfully', 'success');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to record time out', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File, taskType: string, location: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', String(cleaner.employee_id));
      formData.append('dtr_id', String(currentDTR?.dtr_id));
      formData.append('task_type', taskType);
      formData.append('location', location);
      formData.append('completed_at', new Date().toISOString());

      // Replace with actual API call
      // const response = await fetch('/api/tasks', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();

      // Mock response
      const newTask: TaskLog = {
        task_id: todaysTasks.length + 1,
        unit_name: location,
        task_type: taskType,
        completed_at: new Date().toISOString(),
        proof_photo: URL.createObjectURL(file),
        status: 'COMPLETED'
      };

      setTodaysTasks([...todaysTasks, newTask]);
      showToast('Work photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const isTimedIn = currentDTR?.status === 'OPEN';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
            toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
          }`}
        >
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl text-white font-semibold flex items-center gap-3 min-w-72 ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
            style={{ fontFamily: 'Poppins' }}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      <Navbar cleaner={cleaner} />

      <main className="flex-grow w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ADDED: Back Button */}
          <BackButton />

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
              Welcome, {cleaner.full_name.split(' ')[0]}!
            </h1>
            <p className="text-lg text-gray-600" style={{fontFamily: 'Poppins'}}>
              Record your time, upload work photos, and track your daily attendance
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Status card — green sweeps left-to-right when signed in */}
            <div className="relative rounded-lg shadow-sm overflow-hidden bg-white border border-gray-200 border-l-4 border-l-green-500">
              {/* Green fill layer */}
              <div
                className={`absolute inset-0 bg-green-500 transition-transform duration-500 ease-in-out ${
                  currentDTR?.status === 'OPEN' ? 'scale-x-100' : 'scale-x-0'
                }`}
                style={{ transformOrigin: 'left' }}
              />
              {/* Card content sits above the fill */}
              <div className="relative p-4">
                <p className={`text-sm mb-1 transition-colors duration-500 ${currentDTR?.status === 'OPEN' ? 'text-green-100' : 'text-gray-600'}`} style={{fontFamily: 'Poppins'}}>
                  Status
                </p>
                <p className={`text-2xl font-bold transition-colors duration-500 ${currentDTR?.status === 'OPEN' ? 'text-white' : 'text-gray-900'}`} style={{fontFamily: 'Poppins'}}>
                  {currentDTR?.status === 'OPEN' ? '✓ Signed In' : '○ Not Started'}
                </p>
              </div>
            </div>

            {/* Photos Today — FIXED: border-3 → border-2 */}
            <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-500">
              <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Photos Today</p>
              <p className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                {todaysTasks.length}
              </p>
            </div>

            {/* Employee ID — purple accent on the right */}
            <div className="bg-white rounded-lg p-4 shadow-sm border-r-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Employee ID</p>
              <p className="text-lg font-bold text-gray-900" style={{fontFamily: 'Courier New'}}>
                {cleaner.employee_code}
              </p>
            </div>
          </div>

          {/* ADDED: Shift Selector — shown for both roles, locks once signed in */}
          <div className="mb-8">
            <ShiftSelector
              selectedShift={selectedShift}
              onSelect={setSelectedShift}
              disabled={!!isTimedIn}
            />
          </div>

          {/* Time Tracking Card */}
          <div className="mb-8 text-gray-900">
            <TimeTrackingCard
              currentDTR={currentDTR || null}
              onTimeIn={handleTimeIn}
              onTimeOut={handleTimeOut}
              isLoading={isLoading}
              selectedShift={selectedShift}
            />
          </div>

          {/* ADDED: Admin Duty Panel — only for ADMIN role */}
          {cleaner.role === 'ADMIN' && (
            <div className="mb-8">
              <AdminDutyPanel isTimedIn={!!isTimedIn} currentDTR={currentDTR} />
            </div>
          )}

          {/* Work Photo Upload — only for HOUSEKEEPING role */}
          {cleaner.role === 'HOUSEKEEPING' && (
            <div className="mb-8">
              <WorkPhotoUpload
                isTimedIn={!!isTimedIn}
                onPhotoUpload={handlePhotoUpload}
                isUploading={isUploading}
              />
            </div>
          )}

          {/* Daily Log — only for HOUSEKEEPING role */}
          {cleaner.role === 'HOUSEKEEPING' && (
            <div className="mb-8">
              <DailyLog tasks={todaysTasks} />
            </div>
          )}

          {/* Information Section */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-900 mb-3" style={{fontFamily: 'Poppins'}}>
              Important Reminders
            </h3>
            <ul className="space-y-2 text-blue-800" style={{fontFamily: 'Poppins'}}>
              {cleaner.role === 'HOUSEKEEPING' ? (
                <>
                  <li>Always sign in when you arrive at work</li>
                  <li>Upload clear photos of completed work as evidence</li>
                  <li>Include the room number or location in the photo description</li>
                  <li>Sign out before leaving work</li>
                  <li>Make sure photos are properly lit and show the completed task</li>
                </>
              ) : (
                <>
                  <li>Sign in when you begin your online duty</li>
                  <li>Respond promptly to agent and guest queries</li>
                  <li>Issue gatepasses and confirm bookings in a timely manner</li>
                  <li>Sign out at the end of your shift</li>
                  <li>Attend meetings as scheduled</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}