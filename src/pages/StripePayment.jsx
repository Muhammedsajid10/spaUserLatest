import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { loadStripe } from '@stripe/stripe-js';
import './Payment.css';
import { paymentsAPI } from '../services/api';
import Swal from 'sweetalert2';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripePayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripe, setStripe] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState('card');
  const [availableGateways, setAvailableGateways] = useState([
    { 
      name: 'card', 
      displayName: 'Credit / Debit Card', 
      icon: 'https://www.svgrepo.com/show/532386/credit-card-up-simple.svg'
    },
    { 
      name: 'upi', 
      displayName: 'UPI', 
      icon: 'https://www.svgrepo.com/show/360877/upi.svg'
    },
    { 
      name: 'cash', 
      displayName: 'Cash on Service', 
      icon: 'https://www.svgrepo.com/show/435160/money-cash.svg'
    }
  ]);
  
  const bookingData = location.state?.bookingData;
  const { amount, serviceName, date, time } = bookingData || {};

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (!bookingData || !bookingData.bookingId) {
      console.error('StripePayment: No booking data found in location state');
      setError('Booking data is missing. Please start a new booking.');
      return;
    }

    initializeStripe();
  }, [user, token, bookingData, navigate]);

  const initializeStripe = async () => {
    const stripeInstance = await stripePromise;
    setStripe(stripeInstance);
  };

  const createPaymentIntent = async () => {
    if (!stripe) {
      setError('Stripe not initialized');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
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
          paymentMethod: selectedGateway,
          gateway: 'stripe'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }
      
      if (data.data.clientSecret) {
        handleStripePayment(data.data.clientSecret);
      } else if (data.data.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else {
        throw new Error('No payment URL or client secret received.');
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
          <h2>Complete Your Payment</h2>
          <p>Booking ID: <strong>{bookingData.bookingId}</strong></p>
        </div>

        <div className="booking-summary-details">
          <h3>Booking Summary</h3>
          <div className="summary-list">
            <div className="summary-item">
              <span>Services:</span>
              <strong>{bookingData.serviceNames}</strong>
            </div>
            <div className="summary-item">
              <span>Date & Time:</span>
              <strong>{bookingData.date} at {bookingData.time}</strong>
            </div>
            <div className="summary-item">
              <span>Professional:</span>
              <strong>{bookingData.professionalName}</strong>
            </div>
          </div>
        </div>

        <div className="payment-method-selection">
          <h3>Choose a Payment Method</h3>
          <div className="gateway-grid">
            {availableGateways.map((gateway) => (
              <button
                key={gateway.name}
                className={`gateway-button ${selectedGateway === gateway.name ? 'selected' : ''}`}
                onClick={() => setSelectedGateway(gateway.name)}
                disabled={loading}
              >
                <img src={gateway.icon} alt={gateway.displayName} className="gateway-icon-svg" />
                <h4>{gateway.displayName}</h4>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="payment-actions-final">
          <div className="total-amount-display">
            <span>Total Payable:</span>
            <strong>AED {bookingData.totalAmount}</strong>
          </div>
          <button
            onClick={createPaymentIntent}
            className="pay-button"
            disabled={loading || !selectedGateway}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripePayment;