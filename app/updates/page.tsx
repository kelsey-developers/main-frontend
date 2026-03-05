'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface UpdateEntry {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'fix' | 'enhancement' | 'security' | 'performance' | 'breaking';
  date: string;
  version?: string;
  metadata?: {
    ticketId?: string;
    developer?: string;
  };
}

// Mock updates data
const mockUpdates: UpdateEntry[] = [
  {
    id: '1',
    title: 'Major Platform Release v2.0',
    description: 'Complete platform overhaul with new features, improved performance, and enhanced user experience across all modules.',
    type: 'feature',
    date: '2026-02-12T00:00:00Z',
    version: '2.0.0',
    metadata: {
      ticketId: 'PLAT-2024-001',
      developer: 'Development Team'
    }
  },
  {
    id: '2',
    title: 'Security Patch: Session Management',
    description: 'Fixed critical vulnerability in session handling that could allow unauthorized access. All users are recommended to re-login.',
    type: 'security',
    date: '2026-02-10T00:00:00Z',
    version: '1.9.3',
    metadata: {
      ticketId: 'SEC-2024-047'
    }
  },
  {
    id: '3',
    title: 'Performance Optimization Update',
    description: 'Optimized database queries and implemented caching strategies to reduce page load times by 40%. UI components now render faster.',
    type: 'performance',
    date: '2026-02-08T00:00:00Z',
    version: '1.9.2',
    metadata: {
      ticketId: 'PERF-2024-018'
    }
  },
  {
    id: '4',
    title: 'Bug Fix: Booking Calendar Display',
    description: 'Fixed issue where unavailable dates were not properly displayed in the booking calendar. Holiday and blocked dates now show correctly.',
    type: 'bug',
    date: '2026-02-05T00:00:00Z',
    version: '1.9.1'
  },
  {
    id: '5',
    title: 'New Feature: Advanced Filtering',
    description: 'Added advanced search and filtering capabilities to the property listings. Users can now filter by amenities, price range, and availability.',
    type: 'feature',
    date: '2026-02-01T00:00:00Z',
    version: '1.9.0',
    metadata: {
      ticketId: 'FEAT-2024-012',
      developer: 'Frontend Team'
    }
  },
  {
    id: '6',
    title: 'Platform Enhancement: User Interface',
    description: 'Redesigned user interface with improved navigation and better accessibility. Dark mode support added for better user experience.',
    type: 'enhancement',
    date: '2026-01-28T00:00:00Z',
    version: '1.8.5'
  },
  {
    id: '7',
    title: 'Bug Fix: Payment Processing',
    description: 'Resolved issue where payment confirmations were not being sent to users. Email notifications now work reliably across all payment methods.',
    type: 'bug',
    date: '2026-01-25T00:00:00Z',
    version: '1.8.4'
  },
  {
    id: '8',
    title: 'Breaking Change: API v2 Migration',
    description: 'Deprecated API v1 endpoints. All integrations must migrate to API v2. Transition period ends on March 31, 2026.',
    type: 'breaking',
    date: '2026-01-20T00:00:00Z',
    version: '1.8.0'
  },
  {
    id: '9',
    title: 'Enhancement: Admin Dashboard',
    description: 'Enhanced admin dashboard with real-time analytics, improved reporting tools, and new management capabilities for property managers.',
    type: 'enhancement',
    date: '2026-01-15T00:00:00Z',
    version: '1.7.8'
  },
  {
    id: '10',
    title: 'Fix: Mobile Responsiveness',
    description: 'Fixed layout issues on mobile devices. All pages now render correctly on screens as small as 320px width.',
    type: 'fix',
    date: '2026-01-10T00:00:00Z',
    version: '1.7.5'
  }
];

/**
 * Updates page component
 * Displays application updates in a clean timeline format with bullet points
 */
const Updates: React.FC = () => {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load updates data on component mount
   */
  useEffect(() => {
    const loadUpdates = async () => {
      try {
        console.log('Loading updates page');
        setLoading(true);
        setError(null);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setUpdates(mockUpdates);
        
        console.log('Successfully loaded updates', { count: mockUpdates.length });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load updates';
        console.error('Failed to load updates', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadUpdates();
  }, []);

  /**
   * Gets the appropriate icon and color for update type
   */
  const getUpdateTypeInfo = (type: string) => {
    const typeInfo = {
      bug: { icon: '🐛', color: 'bg-red-500', tagColor: 'bg-red-100 text-red-800', tagText: 'BUG FIX' },
      feature: { icon: '⭐', color: 'bg-green-500', tagColor: 'bg-green-100 text-green-800', tagText: 'NEW FEATURE' },
      fix: { icon: '🔧', color: 'bg-blue-500', tagColor: 'bg-blue-100 text-blue-800', tagText: 'FIX' },
      enhancement: { icon: '⚡', color: 'bg-purple-500', tagColor: 'bg-purple-100 text-purple-800', tagText: 'ENHANCEMENT' },
      security: { icon: '🔒', color: 'bg-orange-500', tagColor: 'bg-orange-100 text-orange-800', tagText: 'SECURITY' },
      performance: { icon: '🚀', color: 'bg-indigo-500', tagColor: 'bg-indigo-100 text-indigo-800', tagText: 'PERFORMANCE' },
      breaking: { icon: '💥', color: 'bg-red-600', tagColor: 'bg-red-100 text-red-800', tagText: 'BREAKING CHANGE' }
    };
    return typeInfo[type as keyof typeof typeInfo] || { icon: '📝', color: 'bg-gray-500', tagColor: 'bg-gray-100 text-gray-800', tagText: 'UPDATE' };
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="App">
        <Navbar />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#0B5858'}}></div>
            <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>Loading updates...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="App">
        <Navbar />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>Error Loading Updates</h2>
            <p className="text-gray-600 mb-4" style={{fontFamily: 'Poppins'}}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors cursor-pointer"
              style={{backgroundColor: '#0B5858', fontFamily: 'Poppins'}}
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar />
      
      {/* Main Content */}
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-white pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h1 className="text-4xl font-bold mb-4" style={{color: '#0B5858', fontFamily: 'Poppins'}}>
                System Updates
              </h1>
              <p className="text-xl text-gray-600" style={{fontFamily: 'Poppins'}}>
                Stay up to date with the latest improvements and features
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Updates List */}
              <div className="space-y-12">
                {updates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>No Updates Available</h3>
                    <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
                      No updates available at this time
                    </p>
                  </div>
                ) : (
                  updates.map((update) => {
                    const typeInfo = getUpdateTypeInfo(update.type);
                    return (
                      <div key={update.id} className="relative flex items-start">
                        {/* Timeline Marker */}
                        <div className={`absolute left-6 w-6 h-6 rounded-full ${typeInfo.color} flex items-center justify-center text-white text-sm z-10`}>
                          {typeInfo.icon}
                        </div>
                        
                        {/* Content */}
                        <div className="ml-16 flex-1">
                          {/* Date and Version */}
                          <div className="flex items-center gap-4 mb-2">
                            <div className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                              {formatDate(update.date)}
                            </div>
                            {update.version && (
                              <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded" style={{fontFamily: 'Poppins'}}>
                                v{update.version}
                              </div>
                            )}
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-xl font-bold text-gray-900 mb-3" style={{fontFamily: 'Poppins'}}>
                            {update.title}
                          </h3>
                          
                          {/* Tag */}
                          <div className="mb-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeInfo.tagColor}`} style={{fontFamily: 'Poppins'}}>
                              {typeInfo.tagText}
                            </span>
                          </div>
                          
                          {/* Description with Bullet Points */}
                          <div className="text-gray-700 leading-relaxed" style={{fontFamily: 'Poppins'}}>
                            <p className="mb-3">{update.description}</p>
                            
                            {/* Feature list for the main update */}
                            {update.id === '1' && (
                              <div className="mt-4 space-y-2">
                                <p className="font-medium text-gray-800">New Features:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  <li>Enhanced Authentication System with improved redirect handling</li>
                                  <li>Advanced Image Upload System with compression and progress indicators</li>
                                  <li>Comprehensive Input Validation and Security enhancements</li>
                                  <li>Database Query Optimization for faster performance</li>
                                  <li>Mobile Responsiveness improvements across all components</li>
                                  <li>System Updates Timeline with version tracking</li>
                                  <li>Admin Panel with user and unit management capabilities</li>
                                  <li>Profile Management with user role system</li>
                                  <li>Property Listing Management with image galleries</li>
                                  <li>Real-time Notification System for booking updates</li>
                                </ul>
                              </div>
                            )}
                            
                            {/* Additional details as bullet points if available */}
                            {update.metadata && update.metadata.ticketId && (
                              <div className="mt-3 text-sm text-gray-600">
                                <p>• Ticket: {update.metadata.ticketId}</p>
                                {update.metadata.developer && (
                                  <p>• Developer: {update.metadata.developer}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Updates;
