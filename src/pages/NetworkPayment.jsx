import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { loadStripe } from '@stripe/stripe-js';
import './Payment.css';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const [stripe, setStripe] = useState(null);

  // Get booking data from location state or localStorage
  const bookingData = location.state?.bookingData;

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (!bookingData || !bookingData.bookingId) {
      console.error('StripePayment: No booking data found in location state');
      return;
    }

    // Initialize Stripe
    initializeStripe();
  }, []);

  const initializeStripe = async () => {
    const stripeInstance = await stripePromise;
    setStripe(stripeInstance);
  };

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('https://spabackend-0tko.onrender.com/api/v1/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          amount: bookingData.totalAmount,
          currency: 'AED',
          paymentMethod: 'card',
          gateway: 'stripe'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }

      setPaymentData(data.data);
      
      // Redirect to Stripe Checkout or handle payment intent
      if (data.data.clientSecret) {
        // Handle payment with Stripe Elements (if using Elements)
        handleStripePayment(data.data.clientSecret);
      } else if (data.data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('No payment method received from Stripe');
      }

    } catch (error) {
      console.error('Stripe payment creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async (clientSecret) => {
    if (!stripe) {
      setError('Stripe not initialized');
      return;
    }

    try {
      const { error } = await stripe.redirectToCheckout({
        sessionId: clientSecret
      });

      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      setError('Payment failed. Please try again.');
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await fetch(`/api/v1/payments/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data.status === 'completed' || data.data.status === 'paid') {
          // Payment successful
          navigate('/payment/success', { 
            state: { 
              sessionId,
              amount: bookingData.totalAmount,
              bookingId: bookingData.bookingId
            }
          });
        } else if (data.data.status === 'failed' || data.data.status === 'canceled') {
          // Payment failed
          navigate('/payment/failed', { 
            state: { 
              sessionId,
              error: 'Payment failed or was canceled'
            }
          });
        }
      }
    } catch (error) {
      console.error('Payment status check error:', error);
    }
  };

  const handlePaymentSuccess = () => {
    // This will be called when user returns from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');

    if (sessionId && success === 'true') {
      checkPaymentStatus(sessionId);
    }
  };

  const handlePaymentCancel = () => {
    navigate('/payment/cancel');
  };

  useEffect(() => {
    // Check if this is a return from Stripe Checkout
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');

    if (sessionId && success) {
      handlePaymentSuccess();
    }
  }, []);

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Creating Stripe payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="error-message">
            <h2>Payment Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/booking')} className="btn-primary">
              Back to Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!bookingData || !bookingData.bookingId) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="error-message">
            <h2>Booking Data Missing</h2>
            <p>No booking information found. Please complete your booking first.</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Start Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <h2>Stripe Payment</h2>
          <p>Secure payment powered by Stripe</p>
        </div>

        <div className="payment-details">
          <div className="detail-row">
            <span>Booking ID:</span>
            <span>{bookingData.bookingId}</span>
          </div>
          <div className="detail-row">
            <span>Amount:</span>
            <span>AED {bookingData.totalAmount}</span>
          </div>
          <div className="detail-row">
            <span>Service:</span>
            <span>{bookingData.serviceName}</span>
          </div>
          <div className="detail-row">
            <span>Date:</span>
            <span>{bookingData.date}</span>
          </div>
          <div className="detail-row">
            <span>Time:</span>
            <span>{bookingData.time}</span>
          </div>
        </div>

        <div className="payment-actions">
          <button 
            onClick={createPaymentIntent} 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
          
          <button 
            onClick={handlePaymentCancel} 
            className="btn-secondary"
          >
            Cancel Payment
          </button>
        </div>

        <div className="payment-info">
          <h3>Payment Security</h3>
          <ul>
            <li>🔒 SSL encrypted connection</li>
            <li>🛡️ PCI DSS compliant</li>
            <li>💳 All major cards accepted</li>
            <li>🌍 Global payment processing</li>
            <li>⚡ Instant payment confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StripePayment; 