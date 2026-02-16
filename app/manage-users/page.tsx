'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  fullname: string;
  email: string;
  profile_photo?: string;
  contact_number?: string;
  gender?: string;
  created_at?: string;
  role?: string;
}

interface UserWithRole extends UserProfile {
  role?: string;
  created_at?: string;
}

// Mock user data
const mockUsers: UserWithRole[] = [
  {
    id: '1',
    fullname: 'John Smith',
    email: 'john.smith@example.com',
    profile_photo: '',
    contact_number: '+63 912 345 6789',
    gender: 'Male',
    created_at: '2025-01-15T10:00:00Z',
    role: 'admin'
  },
  {
    id: '2',
    fullname: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    profile_photo: '',
    contact_number: '+63 923 456 7890',
    gender: 'Female',
    created_at: '2025-02-01T14:30:00Z',
    role: 'user'
  },
  {
    id: '3',
    fullname: 'James Wilson',
    email: 'james.wilson@example.com',
    profile_photo: '',
    contact_number: '+63 934 567 8901',
    gender: 'Male',
    created_at: '2025-02-05T09:15:00Z',
    role: 'agent'
  },
  {
    id: '4',
    fullname: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    profile_photo: '',
    contact_number: '+63 945 678 9012',
    gender: 'Female',
    created_at: '2025-02-08T11:45:00Z',
    role: 'user'
  },
  {
    id: '5',
    fullname: 'Robert Brown',
    email: 'robert.brown@example.com',
    profile_photo: '',
    contact_number: '+63 956 789 0123',
    gender: 'Male',
    created_at: '2025-02-10T16:20:00Z',
    role: 'agent'
  },
  {
    id: '6',
    fullname: 'Emily Davis',
    email: 'emily.davis@example.com',
    profile_photo: '',
    contact_number: '+63 967 890 1234',
    gender: 'Female',
    created_at: '2025-02-11T13:00:00Z',
    role: 'user'
  }
];

const ManageUsers: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredText, setHoveredText] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Get user initials for default avatar
  const getInitials = (user: UserWithRole) => {
    if (user.fullname) {
      const names = user.fullname.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  // Check if we have a valid photo URL
  const hasValidPhoto = (user: UserWithRole) => {
    if (!user.profile_photo) return false;
    if (typeof user.profile_photo !== 'string') return false;
    const trimmed = user.profile_photo.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false;
    if (imageErrors[user.id]) return false;
    return true;
  };

  // Handle image error
  const handleImageError = (userId: string) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }));
  };

  // Reset image errors when users data changes
  useEffect(() => {
    setImageErrors({});
  }, [users]);

  // Load mock users on mount
  useEffect(() => {
    setLoadingUsers(true);
    // Simulate loading delay
    setTimeout(() => {
      setUsers(mockUsers);
      setLoadingUsers(false);
    }, 800);
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdatingRole(userId);
      
      console.log(`Updating role for user ${userId} to ${newRole}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );

      console.log(`User role updated successfully to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(`Unexpected error updating user role: ${error}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to handle text hover for tooltips
  const handleTextHover = (event: React.MouseEvent, text: string) => {
    const element = event.currentTarget as HTMLElement;
    const isOverflowing = element.scrollWidth > element.clientWidth;
    
    if (isOverflowing) {
      setHoveredText(text);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleTextLeave = () => {
    setHoveredText(null);
  };

  // Handle role dropdown toggle
  const toggleRoleDropdown = (userId: string) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.role-dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="pt-24 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 
                className="text-3xl font-bold text-black"
                style={{fontFamily: 'Poppins', fontWeight: 700}}
              >
                Manage Users
              </h1>
            </div>
          </div>

          {/* Search Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <div className="relative">
                  <svg 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#558B8B' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      '--tw-ring-color': '#549F74'
                    } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr style={{backgroundColor: '#0B5858'}}>
                    <th className="px-6 py-5 text-left text-white font-semibold w-1/3" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                      User Info
                    </th>
                    <th className="px-6 py-5 text-left text-white font-semibold w-28" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                      Contact
                    </th>
                    <th className="px-6 py-5 text-left text-white font-semibold w-20" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                      Gender
                    </th>
                    <th className="px-6 py-5 text-left text-white font-semibold w-24" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                      Joined Date
                    </th>
                    <th className="px-6 py-5 text-left text-white font-semibold w-28" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    // Data loading state - show loading message
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                          <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>Loading users...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    // No users found - maintain table structure
                    <tr>
                      <td className="px-6 py-8 text-center" colSpan={5}>
                        <div className="text-gray-500">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <p className="text-xl font-semibold mb-2" style={{fontFamily: 'Poppins', fontWeight: 600}}>
                            No Users Found
                          </p>
                          <p className="text-gray-600" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                            {searchTerm ? 'No users match your current search.' : 'No users have been registered yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className={`border-b border-gray-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        {/* User Info */}
                        <td className="px-6 py-3 align-top">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                              style={{
                                minWidth: '48px',
                                minHeight: '48px',
                                maxWidth: '48px',
                                maxHeight: '48px',
                                background: hasValidPhoto(user)
                                  ? 'transparent'
                                  : 'linear-gradient(to bottom right, #14b8a6, #0d9488)'
                              }}
                            >
                              {hasValidPhoto(user) ? (
                                <img
                                  src={user.profile_photo}
                                  alt={user.fullname || 'User'}
                                  className="w-full h-full object-cover"
                                  onError={() => handleImageError(user.id)}
                                />
                              ) : (
                                <span 
                                  className="text-sm font-bold text-white" 
                                  style={{ fontFamily: 'Poppins', fontWeight: 700 }}
                                >
                                  {getInitials(user)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div 
                                className="font-medium text-gray-900 truncate cursor-default" 
                                style={{fontFamily: 'Poppins', fontSize: '16px'}}
                                onMouseEnter={(e) => handleTextHover(e, user.fullname || 'No Name')}
                                onMouseLeave={handleTextLeave}
                              >
                                {user.fullname || 'No Name'}
                              </div>
                              <div 
                                className="text-gray-500 truncate cursor-default" 
                                style={{fontFamily: 'Poppins', fontSize: '16px'}}
                                onMouseEnter={(e) => handleTextHover(e, user.email || 'No Email')}
                                onMouseLeave={handleTextLeave}
                              >
                                {user.email || 'No Email'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-3 align-top">
                          <span 
                            className="text-gray-900 block truncate cursor-default" 
                            style={{fontFamily: 'Poppins', fontSize: '16px'}}
                            onMouseEnter={(e) => handleTextHover(e, String(user.contact_number || 'N/A'))}
                            onMouseLeave={handleTextLeave}
                          >
                            {user.contact_number || 'N/A'}
                          </span>
                        </td>

                        {/* Gender */}
                        <td className="px-6 py-3 align-top">
                          <span className="text-gray-900" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                            {user.gender || 'N/A'}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="px-6 py-3 align-top">
                          <span className="text-gray-900" style={{fontFamily: 'Poppins', fontSize: '16px'}}>
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>

                        {/* Role - Combined Badge and Dropdown */}
                        <td className="px-6 py-3 align-top">
                          <div className="flex items-center space-x-2">
                            <div className="relative role-dropdown-container">
                              <button
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-md focus:outline-none cursor-pointer"
                                style={{
                                  backgroundColor: user.role === 'admin' ? '#B84C4C' : user.role === 'agent' ? '#FACC15' : '#558B8B',
                                  color: user.role === 'agent' ? '#0B5858' : 'white',
                                  fontFamily: 'Poppins'
                                }}
                                onClick={() => toggleRoleDropdown(user.id)}
                                disabled={updatingRole === user.id}
                              >
                                <span>{user.role === 'admin' ? 'Admin' : user.role === 'agent' ? 'Agent' : 'User'}</span>
                                <svg 
                                  className={`ml-1 w-3 h-3 transition-transform duration-200 ${openDropdown === user.id ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              
                              {/* Simple Role Dropdown */}
                              {openDropdown === user.id && (
                                <div className="absolute top-full left-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                  <div className="py-1">
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                      style={{fontFamily: 'Poppins'}}
                                      onClick={() => {
                                        updateUserRole(user.id, 'user');
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      User
                                    </button>
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                      style={{fontFamily: 'Poppins'}}
                                      onClick={() => {
                                        updateUserRole(user.id, 'agent');
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      Agent
                                    </button>
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                                      style={{fontFamily: 'Poppins'}}
                                      onClick={() => {
                                        updateUserRole(user.id, 'admin');
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      Admin
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {updatingRole === user.id && (
                              <div className="ml-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0B5858]"></div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Legend */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4" style={{fontFamily: 'Poppins'}}>Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <span 
                  className="inline-flex px-3 py-1 text-xs rounded-full text-white mr-3"
                  style={{backgroundColor: '#558B8B', fontFamily: 'Poppins', fontWeight: 400}}
                >
                  User
                </span>
                <span className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>Can browse</span>
              </div>
              <div className="flex items-center">
                <span 
                  className="inline-flex px-3 py-1 text-xs rounded-full mr-3"
                  style={{backgroundColor: '#FACC15', color: '#0B5858', fontFamily: 'Poppins', fontWeight: 400}}
                >
                  Agent
                </span>
                <span className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>Can make bookings only</span>
              </div>
              <div className="flex items-center">
                <span 
                  className="inline-flex px-3 py-1 text-xs rounded-full text-white mr-3"
                  style={{backgroundColor: '#B84C4C', fontFamily: 'Poppins', fontWeight: 400}}
                >
                  Admin
                </span>
                <span className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>Full access to all features</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tooltip */}
      {hoveredText && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 40,
            backgroundColor: '#558B8B',
            fontFamily: 'Poppins',
            maxWidth: '300px',
            wordWrap: 'break-word'
          }}
        >
          {hoveredText}
          <div
            className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{ borderTopColor: '#558B8B' }}
          />
        </div>
      )}

      {/* Footer Section */}
    </div>
  );
};

export default ManageUsers;
