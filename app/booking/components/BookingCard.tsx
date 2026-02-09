import React from 'react';

type BookingStatus = 'completed' | 'cancelled' | 'ongoing' | 'pending' | 'pending-payment' | 'declined';

interface BookingCardProps {
  booking: {
    id: string;
    check_in_date: string;
    check_out_date: string;
    status: BookingStatus;
    total_amount: number;
    transaction_number: string;
    listing: {
      title: string;
      location: string;
      main_image_url: string;
    };
    client: {
      first_name: string;
      last_name: string;
    };
    payment?: {
      reference_number: string;
      status: string;
    };
  };
  isToggled: boolean;
  onToggle: () => void;
  onView: (id: string) => void;
  isMobile: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isToggled,
  onToggle,
  onView,
  isMobile
}) => {
  const formatDateRange = (checkIn: string, checkOut: string) => {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'ongoing':
        return 'text-orange-500';
      case 'pending':
        return 'text-yellow-600';
      case 'pending-payment':
        return 'text-blue-600';
      case 'declined':
        return 'text-red-500';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: BookingStatus) => {
    if (status === 'pending-payment') {
      if (booking.payment) {
        return 'Payment Under Review';
      }
      return 'Awaiting payment';
    }
    
    switch (status) {
      case 'ongoing':
        return 'On-going';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      {/* Date Range */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-800 font-medium" style={{fontFamily: 'Poppins'}}>
          {formatDateRange(booking.check_in_date, booking.check_out_date)}
        </p>
        
        {/* Toggle Switch */}
        <div className="flex items-center">
          <span className="sr-only">Notifications</span>
          <span className="hidden sm:inline-block text-sm text-gray-500 mr-2" style={{fontFamily: 'Poppins'}}>
            Notifications
          </span>
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              isToggled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isToggled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Booking Details */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Left Column - Image */}
        <div className="flex-shrink-0 w-full sm:w-auto">
          <img
            src={booking.listing.main_image_url}
            alt={booking.listing.title}
            className="w-full sm:w-40 h-36 sm:h-28 object-cover rounded-lg"
          />
        </div>

        {/* Center Column - Details */}
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1" style={{fontFamily: 'Poppins'}}>
            {booking.listing.title}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3" style={{fontFamily: 'Poppins'}}>
            {booking.listing.location}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="text-xs sm:text-sm" style={{fontFamily: 'Poppins'}}>
                Booked for {booking.client.first_name} {booking.client.last_name}
              </span>
            </div>
            
            <div className="flex items-center text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-xs sm:text-sm" style={{fontFamily: 'Poppins'}}>
                Transaction No. #{booking.payment?.reference_number || booking.transaction_number}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Status and Bill */}
        {isMobile ? (
          // Mobile layout
          <div className="w-full mt-3">
            <div>
              <span className={`font-medium ${getStatusColor(booking.status)}`} style={{fontFamily: 'Poppins'}}>
                {getStatusText(booking.status)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-gray-500 text-xs" style={{fontFamily: 'Poppins'}}>
                  Total Bill
                </p>
                <p className="text-base font-bold text-gray-800" style={{fontFamily: 'Poppins'}}>
                  ₱ {booking.total_amount.toLocaleString()}
                </p>
              </div>

              <div className="pl-3">
                <button
                  onClick={() => onView(booking.id)}
                  className="bg-[#0B5858] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#0a4a4a] transition-colors cursor-pointer"
                  style={{fontFamily: 'Poppins'}}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Desktop layout
          <div className="flex-shrink-0 text-center sm:text-right mt-4 sm:mt-0">
            <div className="mb-3">
              <span className={`font-medium ${getStatusColor(booking.status)}`} style={{fontFamily: 'Poppins'}}>
                {getStatusText(booking.status)}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-gray-500 text-sm mb-1" style={{fontFamily: 'Poppins'}}>
                Total Bill
              </p>
              <p className="text-xl font-bold text-gray-800" style={{fontFamily: 'Poppins'}}>
                ₱ {booking.total_amount.toLocaleString()}
              </p>
            </div>

            <button 
              onClick={() => onView(booking.id)}
              className="bg-[#0B5858] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#0a4a4a] transition-colors cursor-pointer w-full sm:w-auto" 
              style={{fontFamily: 'Poppins'}}
            >
              View
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
