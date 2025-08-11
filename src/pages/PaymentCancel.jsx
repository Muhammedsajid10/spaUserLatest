import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import './Payment.css';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRetryPayment = () => {
    navigate('/payment');
  };

  const handleBackToBooking = () => {
    navigate('/booking');
  };

  const handleViewBookings = () => {
    navigate('/dashboard');
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
          <p>Your payment was cancelled. No charges were made to your account.</p>
          
          <div className="cancel-info">
            <h3>What happened?</h3>
            <ul>
              <li>❌ Payment process was interrupted</li>
              <li>💳 No charges were made to your card</li>
              <li>📅 Your booking is still pending</li>
              <li>🔄 You can try the payment again</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Need Help?</h3>
            <p>If you're experiencing issues with payment, please contact our support team:</p>
            <div className="contact-info">
              <p>📧 Email: support@spa-booking.com</p>
              <p>📞 Phone: +971 4 123 4567</p>
              <p>💬 Live Chat: Available 24/7</p>
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={handleRetryPayment} className="btn-primary">
              Try Payment Again
            </button>
            <button onClick={handleBackToBooking} className="btn-secondary">
              Back to Booking
            </button>
            <button onClick={handleViewBookings} className="btn-outline">
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel; 