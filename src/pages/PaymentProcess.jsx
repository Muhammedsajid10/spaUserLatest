import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { paymentsAPI } from '../services/api';
import './Payment.css';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RpSYD5FOF6KgbFpVgzOspHQuZYVwLuawvNXCAI60gDNuyEFdfvwd9UnhHMqal5RfWh3N4WPv5uzLn3GEFiRTm1D00rpI5BXPQ');

// Simple Card Form Component (without Stripe Elements - for demo purposes)
const SimpleCardForm = ({ paymentData, bookingData, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '12/25',
    cvc: '123',
    nameOnCard: bookingData.clientName || 'Test User'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Starting payment processing with data:', {
        paymentData,
        bookingData,
        cardDetails
      });
      
      // Simulate payment processing with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real scenario, this would use Stripe.js to process the payment
      // For now, we'll simulate a successful payment for testing
      console.log('Simulating payment confirmation for:', {
        paymentIntentId: paymentData.paymentIntent || paymentData.paymentIntentId,
        clientSecret: paymentData.clientSecret,
        bookingId: bookingData.bookingId || bookingData.bookingNumber
      });

      // Simulate successful payment response
      const mockPaymentResult = {
        paymentIntent: {
          id: paymentData.paymentIntent || paymentData.paymentIntentId || 'pi_test_' + Date.now(),
          status: 'succeeded',
          amount: Math.round(bookingData.totalAmount * 100), // Convert to cents
          currency: 'aed',
          payment_method: 'card',
          created: Date.now(),
          client_secret: paymentData.clientSecret
        },
        booking: {
          id: bookingData.bookingId || bookingData.bookingNumber,
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      };

      // The API service already handles error responses, so if we get here, it's successful
      onPaymentSuccess(mockPaymentResult);
    } catch (error) {
      onPaymentError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="card-form-container">
        <div className="form-group">
          <label htmlFor="cardNumber">Card Number</label>
          <input
            type="text"
            id="cardNumber"
            name="cardNumber"
            value={cardDetails.cardNumber}
            onChange={handleInputChange}
            placeholder="1234 1234 1234 1234"
            className="card-input"
            readOnly
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expiryDate">Expiry Date</label>
            <input
              type="text"
              id="expiryDate"
              name="expiryDate"
              value={cardDetails.expiryDate}
              onChange={handleInputChange}
              placeholder="MM/YY"
              className="card-input"
              readOnly
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="cvc">CVC</label>
            <input
              type="text"
              id="cvc"
              name="cvc"
              value={cardDetails.cvc}
              onChange={handleInputChange}
              placeholder="123"
              className="card-input"
              readOnly
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="nameOnCard">Name on Card</label>
          <input
            type="text"
            id="nameOnCard"
            name="nameOnCard"
            value={cardDetails.nameOnCard}
            onChange={handleInputChange}
            placeholder="John Doe"
            className="card-input"
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="btn-primary payment-submit-btn"
      >
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Processing Payment...
          </>
        ) : (
          `Pay AED ${bookingData.totalAmount}`
        )}
      </button>
    </form>
  );
};

const PaymentProcess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const paymentProcessedRef = useRef(false);

  const { paymentData, bookingData, selectedGateway } = location.state || {};

  console.log('PaymentProcess: Component loaded with location.state:', location.state);
  console.log('PaymentProcess: paymentData:', paymentData);
  console.log('PaymentProcess: bookingData:', bookingData);
  console.log('PaymentProcess: selectedGateway:', selectedGateway);

  useEffect(() => {
    if (!paymentData || !bookingData) {
      navigate('/payment');
      return;
    }

    // Don't auto-process payment - let user interact with the form
    console.log('PaymentProcess: Ready to show Stripe form');
  }, [paymentData, bookingData]);

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment completed successfully:', paymentIntent);
    navigate('/payment/success', {
      state: {
        paymentIntent: paymentIntent,
        bookingData: bookingData
      }
    });
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Payment failed:', errorMessage);
    setError(errorMessage);
  };

  const handleStripePayment = async () => {
    // This function is no longer needed - payment handled by Stripe Elements form
    console.log('Stripe payment will be handled by Elements form');
  };

  const handleBackToPayment = () => {
    navigate('/payment');
  };

  if (!paymentData || !bookingData) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="payment-header">
            <h2>Payment Error</h2>
            <p>Payment data not found</p>
          </div>
          <div className="payment-actions">
            <button onClick={() => navigate('/payment')} className="btn-primary">
              Back to Payment
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
          <h2>Processing Payment</h2>
          <p>Please wait while we process your payment...</p>
        </div>

        {/* Stripe Branding */}
        <div className="stripe-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
          </svg>
          <span>Stripe</span>
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
            <span>Payment Method:</span>
            <span>{selectedGateway}</span>
          </div>
        </div>

        {/* Test Mode Notice */}
        <div className="test-mode-notice" style={{
          background: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>🧪 Test Mode</h4>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Use test card: 4242 4242 4242 4242, any future date, any 3-digit CVC
            <br />
            This is a test payment and will not charge any real money.
          </p>
        </div>

        {/* Stripe-Style Card Form */}
        {paymentData && paymentData.clientSecret && !error && (
          <SimpleCardForm
            paymentData={paymentData}
            bookingData={bookingData}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        )}

        {error && (
          <div className="error-message">
            <h3>Payment Error</h3>
            <p>{error}</p>
            <div className="payment-actions">
              <button onClick={handleBackToPayment} className="btn-primary">
                Try Again
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary">
                Go Home
              </button>
            </div>
          </div>
        )}

        {(!paymentData || !paymentData.clientSecret) && !error && (
          <div className="payment-info">
            <p>❌ Payment data not found</p>
            <button onClick={handleBackToPayment} className="btn-primary">
              Back to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentProcess;
