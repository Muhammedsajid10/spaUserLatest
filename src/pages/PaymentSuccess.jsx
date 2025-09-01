import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow } from '../services/api';
import './Payment.css';
import Swal from 'sweetalert2';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Get data from navigation state and localStorage
  const { paymentIntent, bookingData } = location.state || {};
  
  console.log('PaymentSuccess - Received data:', {
    paymentIntent,
    bookingData,
    locationState: location.state
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Get booking details from multiple sources
    const storedBooking = JSON.parse(localStorage.getItem('currentBooking') || '{}');
    const finalBookingDetails = bookingData || storedBooking;
    
    console.log('PaymentSuccess - Final booking details:', finalBookingDetails);
    setBookingDetails(finalBookingDetails);

    // Clear booking flow data since payment is successful
    console.log('PaymentSuccess - Clearing booking flow data after successful payment');
    bookingFlow.reset();
    localStorage.removeItem('bookingData');
    localStorage.removeItem('currentBooking');

    // Automatically send confirmation email if we have booking details
    if (finalBookingDetails?.bookingId || finalBookingDetails?.bookingNumber || finalBookingDetails?._id) {
      sendConfirmationEmailAuto(finalBookingDetails);
    }
    
    console.log('Payment success - processed booking data and cleared booking flow');
  }, [bookingData, user, navigate]);

  const handleViewBookings = () => {
    navigate('/client-profile');
  };

  const handleNewBooking = () => {
    // Clear booking data and navigate to home
    localStorage.removeItem('currentBooking');
    bookingFlow.reset();
    navigate('/');
  };

  const handleModifyBooking = () => {
    // For now, redirect to bookings where they can manage
    navigate('/client-profile');
  };

  const sendConfirmationEmailAuto = async (bookingDetails) => {
    try {
      console.log('Auto-sending confirmation email for booking:', bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id);
      
      const response = await fetch('https://spabackend-0tko.onrender.com/api/v1/payments/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send confirmation email');
      }

      console.log('Auto confirmation email sent:', result);
      setEmailSent(true);
      
    } catch (error) {
      console.error('Error auto-sending confirmation email:', error);
      // Don't show alert for auto-send failures, just log
    }
  };

  const sendConfirmationEmail = async () => {
    setLoading(true);
    try {
      console.log('Sending confirmation email for booking:', bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id);
      
      const response = await fetch('https://spabackend-0tko.onrender.com/api/v1/payments/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send confirmation email');
      }

      console.log('Confirmation email sent:', result);
      setEmailSent(true);
      Swal.fire({
        title: 'Email Sent!',
        text: `Confirmation email sent successfully to ${result.data.email}!`,
        icon: 'success',
        timer: 5000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      Swal.fire({
        title: 'Email Failed!',
        text: `Failed to send email: ${error.message}`,
        icon: 'error',
        timer: 5000,
        showConfirmButton: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card success-card">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22,4 12,14.01 9,11.01"></polyline>
          </svg>
        </div>

        <div className="success-content">
          <h1>Payment Successful!</h1>
          <p>Your payment has been processed successfully.</p>
          
          <div className="payment-summary">
            <h3>Payment Summary</h3>
            <div className="summary-details">
              <div className="detail-row">
                <span>Payment ID:</span>
                <span>{paymentIntent?.id || paymentIntent?.paymentIntent?.id || 'Processing...'}</span>
              </div>
              <div className="detail-row">
                <span>Amount:</span>
                <span>AED {bookingDetails?.totalAmount || paymentIntent?.amount || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Booking ID:</span>
                <span>{bookingDetails?.bookingId || bookingDetails?._id || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Booking Number:</span>
                <span>{bookingDetails?.bookingNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Services:</span>
                <span>{bookingDetails?.serviceNames || bookingDetails?.services?.map(s => s.name).join(', ') || 'N/A'}</span>
              </div>
              {bookingDetails?.professionalAssignments && bookingDetails.professionalAssignments.length > 0 && bookingDetails.uniqueProfessionalNames?.length > 1 ? (
                <div className="detail-row">
                  <span>Professionals:</span>
                  <span>{bookingDetails.uniqueProfessionalNames.join(', ')}</span>
                </div>
              ) : (
                <div className="detail-row">
                  <span>Professional:</span>
                  <span>{bookingDetails?.professionalName || 'N/A'}</span>
                </div>
              )}
              <div className="detail-row">
                <span>Date:</span>
                <span>{bookingDetails?.date || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Time:</span>
                <span>{bookingDetails?.time || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="success-message">
            <h3>What's Next?</h3>
            <div className="next-steps">
              <div className="step-item">
                <div className="step-icon">
                  {emailSent ? '✅' : '📧'}
                </div>
                <div className="step-content">
                  <span>You will receive a confirmation email shortly</span>
                  {!emailSent && (
                    <button 
                      onClick={sendConfirmationEmail} 
                      disabled={loading}
                      className="resend-btn"
                    >
                      {loading ? 'Sending...' : 'Resend Email'}
                    </button>
                  )}
                  {emailSent && <span className="status-text">Email sent! ✅</span>}
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-icon">📅</div>
                <div className="step-content">
                  <span>Your appointment is confirmed</span>
                  <button onClick={handleViewBookings} className="action-link">
                    View Details
                  </button>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-icon">📱</div>
                <div className="step-content">
                  <span>You can view your bookings in your dashboard</span>
                  <button onClick={handleViewBookings} className="action-link">
                    Go to Dashboard
                  </button>
                </div>
              </div>
              
              {/* <div className="step-item">
                <div className="step-icon">🔄</div>
                <div className="step-content">
                  <span>You can modify or cancel your booking up to 24 hours before</span>
                  <button onClick={handleModifyBooking} className="action-link">
                    Manage Booking
                  </button>
                </div>
              </div> */}
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={handleViewBookings} className="btn-primary">
              View My Bookings
            </button>
            <button onClick={handleNewBooking} className="btn-secondary">
              Book Another Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 