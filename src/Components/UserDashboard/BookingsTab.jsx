import { Calendar, Clock, User, Star, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const BookingsTab = ({ bookings = [], onRate, onBookService }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Ensure bookings is an array before processing
      const validBookings = Array.isArray(bookings) ? bookings : [];
      
      // Process bookings with error handling for each item
      const processBookings = validBookings.map(booking => {
        try {
          // Ensure we have a valid date to work with
          const dateStr = booking.appointmentDate || booking.date;
          if (!dateStr) return { ...booking, _isValid: false };
          
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return { ...booking, _isValid: false };
          
          return { ...booking, _date: date, _isValid: true };
        } catch (err) {
          console.error('Error processing booking:', booking, err);
          return { ...booking, _isValid: false };
        }
      });
      
      // Filter out invalid bookings
      const validProcessedBookings = processBookings.filter(b => b._isValid);
      
      // Split into upcoming and past bookings
      const now = new Date();
      const upcoming = validProcessedBookings.filter(b => b._date >= now);
      const past = validProcessedBookings.filter(b => b._date < now);
      
      setUpcomingBookings(upcoming);
      setPastBookings(past);
      setError(null);
    } catch (err) {
      console.error('Error processing bookings:', err);
      setError('Failed to process bookings data. Please try again.');
      setUpcomingBookings([]);
      setPastBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookings]);

  const getServiceNames = (booking) => {
    if (!booking.services || booking.services.length === 0) return 'N/A';
    return booking.services
      .map(s => s.service?.name || s.name || 'Unknown Service')
      .filter(name => name !== 'Unknown Service')
      .join(', ') || 'N/A';
  };

  const getProfessionalNames = (booking) => {
    if (!booking.services || booking.services.length === 0) return 'N/A';
    const professionals = booking.services
      .map(s => {
        if (s.employee?.user?.firstName) {
          return `${s.employee.user.firstName} ${s.employee.user.lastName || ''}`.trim();
        }
        return s.employee?.name || s.professionalName || null;
      })
      .filter(name => name && name !== 'null');
    
    const uniqueProfessionals = [...new Set(professionals)];
    return uniqueProfessionals.length > 0 ? uniqueProfessionals.join(', ') : 'N/A';
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'badge badge-default';
      case 'pending':
        return 'badge badge-secondary';
      case 'failed':
        return 'badge badge-destructive';
      default:
        return 'badge badge-secondary';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Loading your bookings...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {error}
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-red-800 font-medium hover:text-red-600 focus:outline-none"
              >
                Try again<span aria-hidden="true"> &rarr;</span>
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no bookings
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No bookings</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by booking your first service.</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onBookService}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <span>Book a Service</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Bookings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock className="w-5 h-5" />
            <span>Upcoming Bookings</span>
          </h3>
        </div>
        <div className="card-content">
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={`upcoming-${booking._id}`} className="booking-item">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.appointmentDate || booking.date).toLocaleDateString()}</span>
                        </div>
                        <span className={getStatusBadgeClass(booking.status)}>
                          {booking.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{getServiceNames(booking)}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{getProfessionalNames(booking)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming bookings.</p>
          )}
        </div>
      </div>

      {/* Past Bookings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Calendar className="w-5 h-5" />
            <span>Past Bookings</span>
          </h3>
        </div>
        <div className="card-content">
          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div key={`past-${booking._id}`} className="booking-item">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.appointmentDate || booking.date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{getServiceNames(booking)}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{getProfessionalNames(booking)}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {booking.hasRating ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Star className="w-4 h-4 fill-current text-yellow-400" />
                          <span>Rated</span>
                        </div>
                      ) : (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onRate(booking)}
                        >
                          <Star className="w-4 h-4" />
                          <span>Rate Experience</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No past bookings.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsTab;

