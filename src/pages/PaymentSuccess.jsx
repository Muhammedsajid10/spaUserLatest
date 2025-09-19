import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow } from '../services/api';
import './Payment.css';
import Swal from 'sweetalert2';
import { SiGmail } from "react-icons/si";
import { TiTick } from "react-icons/ti";
import { FaCalendarAlt } from "react-icons/fa";

import { RxDashboard } from "react-icons/rx";
const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Get data from navigation state and localStorage and normalize shapes
  const navState = location.state || {};
  // payment might be under several keys
  const paymentObj = navState.payment || navState.paymentIntent || navState.paymentData || null;
  // booking payload can be nested (e.g. { booking: { booking: { ... } } }) depending on which caller passed it
  const rawBooking = navState.booking || navState.bookingData || navState.bookingResult || null;

  console.log('PaymentSuccess - Received navigation state:', { navState });

  useEffect(() => {
    // Do not immediately redirect if user is absent — keep debug info visible so we can inspect state
    if (!user) {
      console.warn('PaymentSuccess: no authenticated user in context — debug info will still render');
    } else {
      console.log('PaymentSuccess - User is authenticated:', user);
    }

    // Normalize booking shape: unwrap nested .booking or .data fields
    let finalBookingDetails = null;
    try {
      if (rawBooking) {
        finalBookingDetails = rawBooking;
        // unwrap common nesting patterns
        if (finalBookingDetails.booking) finalBookingDetails = finalBookingDetails.booking;
        if (finalBookingDetails.data) finalBookingDetails = finalBookingDetails.data;
        if (finalBookingDetails.bookingData) finalBookingDetails = finalBookingDetails.bookingData;
      }
    } catch (err) {
      console.error('Error normalizing booking payload:', err);
    }

    // fallback to localStorage keys
    if (!finalBookingDetails) {
      try {
        const stored = localStorage.getItem('currentBooking') || localStorage.getItem('bookingData');
        finalBookingDetails = stored ? JSON.parse(stored) : null;
      } catch (err) {
        finalBookingDetails = null;
      }
    }

    console.log('PaymentSuccess - Final booking details (normalized):', finalBookingDetails);
    setBookingDetails(finalBookingDetails);

    // Do NOT clear bookingFlow/localStorage here so the booking summary sidebar keeps showing details.
    if (finalBookingDetails) {
      console.log('PaymentSuccess - booking details present; will NOT clear bookingFlow/localStorage to keep sidebar visible');
      // Still auto-send confirmation email if available
      if (finalBookingDetails?.bookingId || finalBookingDetails?.bookingNumber || finalBookingDetails?._id) {
        sendConfirmationEmailAuto(finalBookingDetails);
      }
    } else {
      console.log('PaymentSuccess - no booking details found to send confirmation for');
    }
  }, [location.state, user, navigate]);

  const handleViewBookings = () => {
    try {
      localStorage.removeItem('bookingData');
      localStorage.removeItem('currentBooking');
    } catch (e) {
      /* ignore */
    }
    bookingFlow.reset();
    navigate('/dashboard');
  };

  const handleNewBooking = () => {
    // Clear booking data and navigate to home
    try {
      localStorage.removeItem('currentBooking');
      localStorage.removeItem('bookingData');
    } catch (e) {
      /* ignore */
    }
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
      const token = localStorage.getItem('token');
      const response = await fetch('https://spabacklat.onrender.com/api/v1/payments/send-confirmation', {
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
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://spabacklat.onrender.com/api/v1/payments/send-confirmation', {
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
    <div className="payment-success-wrapper">
      <div className="success-card">
        <div className="success-icon">
          <TiTick size={40} />
        </div>

        <div className="success-content">
          <h1>Payment Successful!</h1>
          <p>Your booking has been confirmed. We've sent a confirmation to your email.</p>
          
          <div className="payment-summary">
            <h3>Booking Summary</h3>
            <div className="summary-details">
              <div className="detail-row">
                <span>Booking ID:</span>
                <span>{bookingDetails?.bookingId || bookingDetails?._id || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Booking Number:</span>
                <span>{bookingDetails?.bookingNumber || 'N/A'}</span>
              </div>
              {bookingDetails?.date && (
                <div className="detail-row">
                  <span>Date:</span>
                  <span>{new Date(bookingDetails.date).toLocaleDateString()}</span>
                </div>
              )}
              {bookingDetails?.time && (
                <div className="detail-row">
                  <span>Time:</span>
                  <span>{bookingDetails.time}</span>
                </div>
              )}
              {bookingDetails?.totalAmount && (
                <div className="detail-row">
                  <span>Amount Paid:</span>
                  <span>AED {parseFloat(bookingDetails.totalAmount).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="success-message">
            <h3>What's Next?</h3>
            <div className="next-steps">
              <div className="step-item">
                <div className="step-icon">
                  {emailSent ? <TiTick /> : <SiGmail />}
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
                  {emailSent && <span className="status-text">Email sent! <TiTick /></span>}
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-icon"><FaCalendarAlt /></div>
                <div className="step-content">
                  <span>Your appointment is confirmed</span>
                  <button onClick={handleViewBookings} className="action-link">
                    View Details
                  </button>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-icon"><RxDashboard /></div>
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