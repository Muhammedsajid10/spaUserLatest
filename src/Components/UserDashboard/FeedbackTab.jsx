import { Star, MessageSquare, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FeedbackTab = ({ feedback }) => {
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-current text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (!feedback || feedback.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-600">
              Your service reviews and ratings will appear here after you complete bookings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="w-5 h-5" />
          <span>My Feedback</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {feedback.map((item) => (
            <div key={item._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {item.booking?.services?.[0]?.service?.name || 'Service Review'}
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(item.ratings?.overall || 0)}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {item.ratings?.overall || 0}/5
                  </span>
                </div>
              </div>
              
              {item.comment && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    "{item.comment}"
                  </p>
                </div>
              )}
              
              {item.ratings && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(item.ratings).map(([key, value]) => {
                    if (key === 'overall') return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <div className="flex items-center space-x-1">
                          {renderStars(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackTab;

