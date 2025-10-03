import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow } from '../services/api';
import styles from './PaymentSuccess.module.css';
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
  const paymentObj = navState.payment || navState.paymentIntent || navState.paymentData || null;
  const rawBooking = navState.booking || navState.bookingData || navState.bookingResult || null;

  console.log('PaymentSuccess - Received navigation state:', { navState });

  useEffect(() => {
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

    if (finalBookingDetails) {
      console.log('PaymentSuccess - booking details present; will NOT clear bookingFlow/localStorage to keep sidebar visible');
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
    navigate('/client-profile');
  };

  const handleNewBooking = () => {
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
    navigate('/client-profile');
  };

  const sendConfirmationEmailAuto = async (bookingDetails) => {
    try {
      console.log('Auto-sending confirmation email for booking:', bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id);
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.alloraspadubai.com/api/v1/payments/send-confirmation', {
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
    }
  };

  const sendConfirmationEmail = async () => {
    setLoading(true);
    try {
      console.log('Sending confirmation email for booking:', bookingDetails?.bookingId || bookingDetails?.bookingNumber || bookingDetails?._id);
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://api.alloraspadubai.com/api/v1/payments/send-confirmation', {
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
    <div className={styles.paymentSuccessWrapper}>
      <div className={styles.successCard}>
        {/* Success Header */}
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>
            <TiTick />
          </div>
          <h1 className={styles.successTitle}>Payment Successful</h1>
          <p className={styles.successSubtitle}>
            Your booking has been confirmed. We've sent a confirmation to your email.
          </p>
        </div>

        {/* Booking Summary */}
        <div className={styles.bookingSummary}>
          <h3 className={styles.summaryTitle}>Booking Summary</h3>
          <div className={styles.summaryDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Booking ID</span>
              <span className={styles.detailValue}>
                {bookingDetails?.bookingId || bookingDetails?._id || 'Loading...'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Booking Number</span>
              <span className={styles.detailValue}>
                {bookingDetails?.bookingNumber || 'Loading...'}
              </span>
            </div>
            {bookingDetails?.date && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>
                  {new Date(bookingDetails.date).toLocaleDateString()}
                </span>
              </div>
            )}
            {bookingDetails?.time && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Time</span>
                <span className={styles.detailValue}>{bookingDetails.time}</span>
              </div>
            )}
            {bookingDetails?.totalAmount && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount Paid</span>
                <span className={styles.detailValue}>
                  AED {parseFloat(bookingDetails.totalAmount).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className={styles.nextSteps}>
          <h3 className={styles.stepsTitle}>What's Next?</h3>
          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepIcon}>
                {emailSent ? <TiTick /> : <SiGmail />}
              </div>
              <div className={styles.stepContent}>
                <p className={styles.stepText}>
                  You will receive a confirmation email shortly
                </p>
                {!emailSent ? (
                  <button 
                    onClick={sendConfirmationEmail} 
                    disabled={loading}
                    className={`${styles.stepAction} ${loading ? styles.loading : ''}`}
                  >
                    {loading ? 'Sending...' : 'Resend Email'}
                  </button>
                ) : (
                  <span className={styles.emailSent}>
                    <TiTick /> Email sent!
                  </span>
                )}
              </div>
            </div>
            
            <div className={styles.stepItem}>
              <div className={styles.stepIcon}>
                <FaCalendarAlt />
              </div>
              <div className={styles.stepContent}>
                <p className={styles.stepText}>Your appointment is confirmed</p>
                <button onClick={handleViewBookings} className={styles.stepAction}>
                  View Details
                </button>
              </div>
            </div>
            
            <div className={styles.stepItem}>
              <div className={styles.stepIcon}>
                <RxDashboard />
              </div>
              <div className={styles.stepContent}>
                <p className={styles.stepText}>
                  You can view your bookings in your dashboard
                </p>
                <button onClick={handleViewBookings} className={styles.stepAction}>
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button onClick={handleViewBookings} className={styles.btnPrimary}>
            View My Bookings
          </button>
          <button onClick={handleNewBooking} className={styles.btnSecondary}>
            Book Another Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;