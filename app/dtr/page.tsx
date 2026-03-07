'use client';

import React, { useState, useEffect, useRef } from 'react';

// Type definitions
interface Cleaner {
  employee_id: number;
  full_name: string;
  position: string;
  employee_code: string;
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
}

interface TaskLog {
  task_id: number;
  unit_name: string;
  task_type: string;
  completed_at: string;
  proof_photo: string;
  status: 'COMPLETED' | 'VERIFIED';
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

// TIME IN/OUT CARD COMPONENT
const TimeTrackingCard: React.FC<{
  currentDTR: DTRRecord | null;
  onTimeIn: () => void;
  onTimeOut: () => void;
  isLoading: boolean;
}> = ({ currentDTR, onTimeIn, onTimeOut, isLoading }) => {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }));

  useEffect(() => {
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

  return (
    <div className="bg-white rounded-lg shadow-lg border-t-4 border-[#0B5858] overflow-hidden">
      <div className="bg-gradient-to-r from-[#0B5858] to-[#094444] text-white p-6 sm:p-8">
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
            disabled={isTimedIn || isLoading}
            className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
              isTimedIn || isLoading
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
            }`}
            style={{fontFamily: 'Poppins'}}
          >
            {isLoading ? '⏳ Processing...' : '✓ Time In'}
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
            {isLoading ? '⏳ Processing...' : '✗ Time Out'}
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
          📸 Work Photo Log
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
                ✓ Photo selected
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl">📷</div>
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
            <option value="Cleaning">🧹 Cleaning</option>
            <option value="Laundry">👕 Laundry</option>
            <option value="Inspection">🔍 Inspection</option>
            <option value="Maintenance">🔧 Maintenance</option>
            <option value="Other">📝 Other</option>
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
        {isUploading ? '⏳ Uploading...' : '📤 Upload Work Photo'}
      </button>

      {!isTimedIn && (
        <p className="mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg text-center" style={{fontFamily: 'Poppins'}}>
          ⚠️ You must sign in first to upload work photos
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
          📋 Today's Work Log
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
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                        {task.task_type}
                      </p>
                      <p className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>
                        📍 {task.unit_name}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      task.status === 'VERIFIED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`} style={{fontFamily: 'Poppins'}}>
                      {task.status === 'VERIFIED' ? '✓ Verified' : '⏳ Pending'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                    ⏰ {new Date(task.completed_at).toLocaleTimeString('en-US', {
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
    employee_code: 'EMP-001'
  });

  const [currentDTR, setCurrentDTR] = useState<DTRRecord | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

      // Mock data
      const mockDTR: DTRRecord = {
        dtr_id: 1,
        employee_id: 1,
        work_date: new Date().toISOString().split('T')[0],
        time_in: new Date(new Date().setHours(8, 0, 0)).toISOString(),
        status: 'OPEN'
      };
      setCurrentDTR(mockDTR);
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
        status: 'OPEN'
      };
      setCurrentDTR(newDTR);

      // Show success message
      alert('✓ Time In recorded successfully!');
    } catch (error) {
      console.error('Error signing in:', error);
      alert('❌ Failed to record time in');
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

      alert('✓ Time Out recorded successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('❌ Failed to record time out');
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
      alert('✓ Work photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('❌ Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar cleaner={cleaner} />

      <main className="flex-grow w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
              Welcome, {cleaner.full_name.split(' ')[0]}! 👋
            </h1>
            <p className="text-lg text-gray-600" style={{fontFamily: 'Poppins'}}>
              Record your time, upload work photos, and track your daily attendance
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Status</p>
              <p className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                {currentDTR?.status === 'OPEN' ? '✓ Signed In' : '○ Not Started'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Photos Today</p>
              <p className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                {todaysTasks.length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1" style={{fontFamily: 'Poppins'}}>Employee ID</p>
              <p className="text-lg font-bold text-gray-900 font-mono" style={{fontFamily: 'Courier New'}}>
                {cleaner.employee_code}
              </p>
            </div>
          </div>

          {/* Time Tracking Card */}
          <div className="mb-8 text-gray-900">
            <TimeTrackingCard
              currentDTR={currentDTR || null}
              onTimeIn={handleTimeIn}
              onTimeOut={handleTimeOut}
              isLoading={isLoading}
            />
          </div>

          {/* Work Photo Upload */}
          <div className="mb-8">
            <WorkPhotoUpload
              isTimedIn={currentDTR?.status === 'OPEN'}
              onPhotoUpload={handlePhotoUpload}
              isUploading={isUploading}
            />
          </div>

          {/* Daily Log */}
          <div className="mb-8">
            <DailyLog tasks={todaysTasks} />
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-900 mb-3" style={{fontFamily: 'Poppins'}}>
              ℹ️ Important Reminders
            </h3>
            <ul className="space-y-2 text-blue-800" style={{fontFamily: 'Poppins'}}>
              <li>✓ Always sign in when you arrive at work</li>
              <li>✓ Upload clear photos of completed work as evidence</li>
              <li>✓ Include the room number or location in the photo description</li>
              <li>✓ Sign out before leaving work</li>
              <li>✓ Make sure photos are properly lit and show the completed task</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}