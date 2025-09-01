import React, { useState } from 'react';
import './StarRating.css';

const StarRating = ({ 
  rating = 0, 
  onRatingChange, 
  readOnly = false, 
  size = 'medium',
  showText = true 
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (starRating) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating) => {
    if (!readOnly) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  const getRatingText = (rating) => {
    if (rating === 0) return 'No rating';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    if (rating === 5) return 'Excellent';
    return '';
  };

  const currentRating = hoverRating || rating;

  return (
    <div className={`star-rating ${size} ${readOnly ? 'read-only' : ''}`}>
      <div className="stars" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= currentRating ? 'filled' : ''}`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
            disabled={readOnly}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      {showText && (
        <span className="rating-text">
          {getRatingText(currentRating)} {currentRating > 0 && `(${currentRating}/5)`}
        </span>
      )}
    </div>
  );
};

export default StarRating;
