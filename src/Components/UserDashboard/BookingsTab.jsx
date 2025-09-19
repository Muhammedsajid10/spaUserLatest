import { Calendar, Clock, User, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BookingsTab = ({ bookings, onRate, onBookService }) => {
  const upcomingBookings = bookings.filter(b => new Date(b.appointmentDate || b.date) >= new Date());
  const pastBookings = bookings.filter(b => new Date(b.appointmentDate || b.date) < new Date());

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

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">
              You don't have any bookings right now. Start by booking a service.
            </p>
            <div className="space-y-3">
              <Button onClick={onBookService} className="w-full bg-black hover:bg-gray-800">
                Book a Service
              </Button>
              <Button variant="outline" className="w-full">
                Browse Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Upcoming Bookings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={`upcoming-${booking._id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.appointmentDate || booking.date).toLocaleDateString()}</span>
                        </div>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
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
        </CardContent>
      </Card>

      {/* Past Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Past Bookings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div key={`past-${booking._id}`} className="border border-gray-200 rounded-lg p-4">
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onRate(booking)}
                          className="flex items-center space-x-2"
                        >
                          <Star className="w-4 h-4" />
                          <span>Rate Experience</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No past bookings.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsTab;

