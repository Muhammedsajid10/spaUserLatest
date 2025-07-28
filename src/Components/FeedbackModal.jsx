import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import StarRating from './StarRating';
import './FeedbackModal.css';

const FeedbackModal = ({ show, onHide, booking, onSubmitFeedback }) => {
  const [feedback, setFeedback] = useState({
    ratings: {
      overall: 0,
      serviceQuality: 0,
      staffBehavior: 0,
      cleanliness: 0,
      ambiance: 0
    },
    comments: {
      positive: '',
      improvement: ''
    },
    suggestions: '',
    wouldRecommend: true,
    wouldReturnAsCustomer: true,
    visitFrequency: 'first-time',
    discoveryMethod: 'search-engine'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRatingChange = (category, rating) => {
    setFeedback(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: rating
      }
    }));
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFeedback(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFeedback(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (feedback.ratings.overall === 0) {
      setError('Please provide an overall rating (minimum 1 star)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Submit a single feedback for the entire booking
      const feedbackData = {
        bookingId: booking._id,
        serviceId: booking.services[0]?.service?._id || booking.services[0]?.serviceId,
        employeeId: booking.services[0]?.employee?._id || booking.services[0]?.employeeId,
        ratings: {
          overall: feedback.ratings.overall,
          // Only include ratings that are greater than 0
          ...(feedback.ratings.serviceQuality > 0 && { serviceQuality: feedback.ratings.serviceQuality }),
          ...(feedback.ratings.staffBehavior > 0 && { staffBehavior: feedback.ratings.staffBehavior }),
          ...(feedback.ratings.cleanliness > 0 && { cleanliness: feedback.ratings.cleanliness }),
          ...(feedback.ratings.ambiance > 0 && { ambiance: feedback.ratings.ambiance })
        },
        comment: feedback.comments.positive + (feedback.comments.improvement ? ` | Improvements: ${feedback.comments.improvement}` : ''),
        wouldRecommend: feedback.wouldRecommend
      };

      await onSubmitFeedback(feedbackData);

      onHide();
      // Reset form
      setFeedback({
        ratings: {
          overall: 0,
          serviceQuality: 0,
          staffBehavior: 0,
          cleanliness: 0,
          ambiance: 0
        },
        comments: {
          positive: '',
          improvement: ''
        },
        suggestions: '',
        wouldRecommend: true,
        wouldReturnAsCustomer: true,
        visitFrequency: 'first-time',
        discoveryMethod: 'search-engine'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Rate Your Experience</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="feedback-booking-info">
          <h6>Booking Details:</h6>
          <p><strong>Date:</strong> {new Date(booking.appointmentDate).toLocaleDateString()}</p>
          <p><strong>Services:</strong> {booking.services.map(s => s.service?.name).join(', ')}</p>
          <p><strong>Professional(s):</strong> {booking.services.map(s => s.employee?.user?.firstName + ' ' + s.employee?.user?.lastName).join(', ')}</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <div className="rating-sections">
            <div className="rating-group">
              <h6>Overall Rating *</h6>
              <small className="text-muted mb-2 d-block">Required - Please rate your overall experience (1-5 stars)</small>
              <StarRating
                rating={feedback.ratings.overall}
                onRatingChange={(rating) => handleRatingChange('overall', rating)}
                size="large"
              />
            </div>

            <div className="rating-group">
              <h6>Service Quality</h6>
              <small className="text-muted mb-2 d-block">Optional - Rate the quality of services received</small>
              <StarRating
                rating={feedback.ratings.serviceQuality}
                onRatingChange={(rating) => handleRatingChange('serviceQuality', rating)}
              />
            </div>

            <div className="rating-group">
              <h6>Staff Behavior</h6>
              <StarRating
                rating={feedback.ratings.staffBehavior}
                onRatingChange={(rating) => handleRatingChange('staffBehavior', rating)}
              />
            </div>

            <div className="rating-group">
              <h6>Cleanliness</h6>
              <StarRating
                rating={feedback.ratings.cleanliness}
                onRatingChange={(rating) => handleRatingChange('cleanliness', rating)}
              />
            </div>

            <div className="rating-group">
              <h6>Ambiance</h6>
              <StarRating
                rating={feedback.ratings.ambiance}
                onRatingChange={(rating) => handleRatingChange('ambiance', rating)}
              />
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>What did you like most?</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={feedback.comments.positive}
              onChange={(e) => handleInputChange('comments.positive', e.target.value)}
              placeholder="Tell us what you enjoyed about your experience..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>What could be improved?</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={feedback.comments.improvement}
              onChange={(e) => handleInputChange('comments.improvement', e.target.value)}
              placeholder="How can we make your next visit even better?"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Additional Suggestions</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={feedback.suggestions}
              onChange={(e) => handleInputChange('suggestions', e.target.value)}
              placeholder="Any other suggestions or comments?"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="I would recommend this spa to others"
              checked={feedback.wouldRecommend}
              onChange={(e) => handleInputChange('wouldRecommend', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="I would return as a customer"
              checked={feedback.wouldReturnAsCustomer}
              onChange={(e) => handleInputChange('wouldReturnAsCustomer', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Visit Frequency *</Form.Label>
            <Form.Select
              value={feedback.visitFrequency}
              onChange={(e) => handleInputChange('visitFrequency', e.target.value)}
              required
            >
              <option value="first-time">First Time Visit</option>
              <option value="occasional">Occasional (2-3 times a year)</option>
              <option value="regular">Regular (Monthly)</option>
              <option value="frequent">Frequent (Weekly/Bi-weekly)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>How did you discover us?</Form.Label>
            <Form.Select
              value={feedback.discoveryMethod}
              onChange={(e) => handleInputChange('discoveryMethod', e.target.value)}
            >
              <option value="search-engine">Search Engine</option>
              <option value="social-media">Social Media</option>
              <option value="friend-referral">Friend Referral</option>
              <option value="advertisement">Advertisement</option>
              <option value="walk-by">Walk By</option>
              <option value="repeat-customer">Repeat Customer</option>
              <option value="online-review">Online Review</option>
              <option value="promotional-offer">Promotional Offer</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading || feedback.ratings.overall === 0}
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FeedbackModal;
