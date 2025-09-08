import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import './Payment.css';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [bookingExists, setBookingExists] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    // Check for booking details passed via navigation state
    if (location && location.state && location.state.booking) {
      setBookingExists(!!(location.state.booking.bookingId || location.state.booking._id || location.state.booking.bookingNumber));
      setBookingInfo(location.state.booking);
    } else {
      // Fallback to localStorage keys used by the app
      const currentBooking = JSON.parse(localStorage.getItem('currentBooking') || 'null');
      const bookingData = JSON.parse(localStorage.getItem('bookingData') || 'null');
      const found = currentBooking || bookingData;
      if (found && (found.bookingId || found._id || found.bookingNumber)) {
        setBookingExists(true);
        setBookingInfo(found);
      } else if (found) {
        // booking object present but not created (no id)
        setBookingExists(false);
        setBookingInfo(found);
      } else {
        setBookingExists(false);
        setBookingInfo(null);
      }
    }

    // Capture any error details passed in state (e.g., network error info)
    if (location && location.state && location.state.error) {
      setErrorDetails(location.state.error);
    }
  }, [location]);

  const handleRetryPayment = () => {
    // Navigate back to payment page; Payment component can check localStorage for bookingData
    navigate('/payment');
  };

  const handleRetryCreateBooking = () => {
    // Suggest user retry by going to payment where orchestration will recreate booking then process payment
    navigate('/payment', { state: { retryCreate: true } });
  };

  const handleBackToBooking = () => {
    navigate('/');
  };

  const handleViewBookings = () => {
    navigate('/dashboard');
  };

  const handleContactSupport = () => {
    // Open mail client for support
    window.location.href = 'mailto:support@spa-booking.com';
  };

  return (
    <div className="payment-container">
      <div className="payment-card cancel-card">
        <div className="cancel-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>

        <div className="cancel-content">
          <h1>Payment Cancelled</h1>

          {bookingExists ? (
            <>
              <p>Your payment was cancelled but your booking was created successfully.</p>
              <div className="cancel-info">
                <h3>Booking status</h3>
                <ul>
                  <li>✅ Booking created: {bookingInfo?.bookingNumber || bookingInfo?.bookingId || bookingInfo?._id}</li>
                  <li>💳 Payment was not completed.</li>
                </ul>
              </div>

              <div className="action-buttons">
                <button onClick={handleViewBookings} className="btn-primary">
                  View My Bookings
                </button>
                <button onClick={handleRetryPayment} className="btn-secondary">
                  Try Payment Again
                </button>
                <button onClick={handleBackToBooking} className="btn-outline">
                  Back to Home
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Payment did not complete and booking was not created.</p>
              <p>Please check your connection or try again. If this persists contact support.</p>

              {errorDetails && (
                <div className="error-details">
                  <h4>Error details</h4>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{String(errorDetails)}</pre>
                </div>
              )}

              <div className="cancel-info">
                <h3>What happened?</h3>
                <ul>
                  <li>❌ Booking could not be created due to a network or API error.</li>
                  <li>🔄 You can retry creating the booking and payment.</li>
                </ul>
              </div>

              <div className="action-buttons">
                <button onClick={handleRetryCreateBooking} className="btn-primary">
                  Retry Create Booking
                </button>
                <button onClick={handleBackToBooking} className="btn-secondary">
                  Back to Booking
                </button>
                <button onClick={handleContactSupport} className="btn-outline">
                  Contact Support
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;