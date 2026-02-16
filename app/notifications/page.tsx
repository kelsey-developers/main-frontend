'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Booking Approved',
    message: 'Your booking request for the beachfront apartment has been approved.',
    type: 'booking_approved',
    link: '/booking-details',
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60000).toISOString() // 15 minutes ago
  },
  {
    id: '2',
    title: 'Payment Confirmed',
    message: 'Payment of $450.00 has been successfully processed for your booking.',
    type: 'payment_confirmed',
    link: '/booking-details',
    is_read: false,
    created_at: new Date(Date.now() - 1 * 60 * 60000).toISOString() // 1 hour ago
  },
  {
    id: '3',
    title: 'New Message',
    message: 'You have a new message from John Smith regarding your booking.',
    type: 'message',
    link: '/inbox',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60000).toISOString() // 3 hours ago
  },
  {
    id: '4',
    title: 'Booking Declined',
    message: 'Your booking request for the mountain cabin has been declined.',
    type: 'booking_declined',
    link: '/listings',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString() // 1 day ago
  },
  {
    id: '5',
    title: 'Refund Processed',
    message: 'Your refund of $150.00 has been processed successfully.',
    type: 'payment_confirmed',
    link: '/bookings',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString() // 2 days ago
  },
  {
    id: '6',
    title: 'Booking Reminder',
    message: 'Your booking for the luxury villa starts in 2 days. Check-in is at 3:00 PM.',
    type: 'booking_approved',
    link: '/booking-details',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString() // 3 days ago
  },
  {
    id: '7',
    title: 'Review Reminder',
    message: 'Your stay at the oceanfront cottage has ended. Please leave a review!',
    type: 'message',
    link: '/bookings',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60000).toISOString() // 5 days ago
  },
  {
    id: '8',
    title: 'New Payment Method Added',
    message: 'A new payment method has been added to your account.',
    type: 'payment_confirmed',
    link: '/profile',
    is_read: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString() // 7 days ago
  }
];

const NotificationsPage: React.FC = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setNotifications(mockNotifications);
        console.log('Successfully loaded notifications', { count: mockNotifications.length });
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      setDeleting(notificationId);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Delete all read notifications
  const deleteAllRead = async () => {
    if (!window.confirm('Are you sure you want to delete all read notifications?')) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_approved':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'payment_confirmed':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'booking_declined':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-32">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
            Notifications
          </h1>
          <p className="text-gray-600 mt-2" style={{fontFamily: 'Poppins'}}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
          </p>
        </div>

        {/* Filter and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#0B5858] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{fontFamily: 'Poppins'}}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-[#0B5858] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{fontFamily: 'Poppins'}}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'read'
                    ? 'bg-[#0B5858] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{fontFamily: 'Poppins'}}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm font-medium text-[#0B5858] hover:text-[#0a4a4a] transition-colors"
                  style={{fontFamily: 'Poppins'}}
                >
                  Mark all as read
                </button>
              )}
              {notifications.filter(n => n.is_read).length > 0 && (
                <button
                  onClick={deleteAllRead}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  style={{fontFamily: 'Poppins'}}
                >
                  Delete all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
            <p className="text-gray-500 mt-4" style={{fontFamily: 'Poppins'}}>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
              No notifications
            </h3>
            <p className="text-gray-500" style={{fontFamily: 'Poppins'}}>
              {filter === 'unread' ? "You're all caught up!" : filter === 'read' ? 'No read notifications' : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer ${
                  !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    {getNotificationIcon(notification.type)}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`text-sm font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`} style={{fontFamily: 'Poppins'}}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1" style={{fontFamily: 'Poppins'}}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2" style={{fontFamily: 'Poppins'}}>
                            {formatDate(notification.created_at)}
                          </p>
                        </div>

                        {/* Unread Badge */}
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      disabled={deleting === notification.id}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
                      title="Delete notification"
                    >
                      {deleting === notification.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default NotificationsPage;
