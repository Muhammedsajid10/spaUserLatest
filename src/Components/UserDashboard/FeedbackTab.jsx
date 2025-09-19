import { Star, MessageSquare, Calendar } from 'lucide-react';

const FeedbackTab = ({ feedback }) => {
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`star ${i < rating ? 'filled' : ''}`}
      />
    ));
  };

  if (!feedback || feedback.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-card">
          <MessageSquare className="empty-state-icon" />
          <h3 className="empty-state-title">No feedback yet</h3>
          <p className="empty-state-description">
            Your service reviews and ratings will appear here after you complete bookings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Star className="w-5 h-5" />
          <span>My Feedback</span>
        </h3>
      </div>
      <div className="card-content">
        <div className="space-y-6">
          {feedback.map((item) => (
            <div key={item._id} className="feedback-item">
              <div className="feedback-header">
                <div>
                  <h4 className="feedback-title">
                    {item.booking?.services?.[0]?.service?.name || 'Service Review'}
                  </h4>
                  <div className="feedback-date">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="feedback-rating">
                  <div className="star-rating">
                    {renderStars(item.ratings?.overall || 0)}
                  </div>
                  <span className="feedback-rating-text">
                    {item.ratings?.overall || 0}/5
                  </span>
                </div>
              </div>
              
              {item.comment && (
                <div className="feedback-comment">
                  <p>
                    "{item.comment}"
                  </p>
                </div>
              )}
              
              {item.ratings && (
                <div className="feedback-breakdown">
                  {Object.entries(item.ratings).map(([key, value]) => {
                    if (key === 'overall') return null;
                    return (
                      <div key={key} className="feedback-breakdown-item">
                        <span className="feedback-breakdown-label">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <div className="star-rating">
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
      </div>
    </div>
  );
};

export default FeedbackTab;

