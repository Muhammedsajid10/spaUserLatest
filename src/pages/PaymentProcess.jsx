import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import './Payment.css';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RpSYD5FOF6KgbFpVgzOspHQuZYVwLuawvNXCAI60gDNuyEFdfvwd9UnhHMqal5RfWh3N4WPv5uzLn3GEFiRTm1D00rpI5BXPQ');

// Real Stripe Elements checkout form
const StripeCheckoutForm = ({ paymentData, bookingData, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage('');
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Optionally set a return_url for 3DS flows if you want redirect behavior
          // return_url: window.location.origin + '/payment/success'
        },
        redirect: 'if_required'
      });

      if (result.error) {
        setMessage(result.error.message || 'Payment failed');
        onPaymentError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent) {
        const pi = result.paymentIntent;
        if (pi.status === 'succeeded' || pi.status === 'processing' || pi.status === 'requires_capture') {
          onPaymentSuccess({ paymentIntent: pi });
        } else {
          setMessage('Payment status: ' + pi.status);
        }
      }
    } catch (err) {
      setMessage(err.message);
      onPaymentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form" style={{ display: 'grid', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {message && <div className="error-message" style={{ marginTop: 8 }}>{message}</div>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary payment-submit-btn"
      >
        {submitting ? 'Processing…' : `Pay AED ${bookingData.totalAmount}`}
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

  const { paymentData, bookingData, selectedGateway, selectedMethod } = location.state || {};
  // Extract UPI VPA if present in metadata (metadata may be plain object)
  const upiVpa = paymentData?.metadata?.upiVpa || paymentData?.upiVpa;

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
  console.log('PaymentProcess: Ready. selectedMethod =', selectedMethod);
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

  const handleSimulateUpi = () => {
    // Simulate success for UPI in mock/test mode
    const mockPaymentResult = {
      paymentIntent: {
        id: 'upi_' + Date.now(),
        status: 'succeeded',
        amount: Math.round(bookingData.totalAmount * 100),
        currency: 'aed',
        payment_method: 'upi',
        created: Date.now(),
        metadata: { upiVpa }
      }
    };
    handlePaymentSuccess(mockPaymentResult);
  };

  const handleCashConfirm = async () => {
    try {
      setProcessingPayment(true);
      // Simulate a quick confirmation for cash at venue
      await new Promise(r => setTimeout(r, 800));
      const mockPaymentResult = {
        paymentIntent: {
          id: 'cash_' + Date.now(),
          status: 'pending',
          amount: Math.round(bookingData.totalAmount * 100),
          currency: 'aed',
          payment_method: 'cash',
          created: Date.now(),
        }
      };
      handlePaymentSuccess(mockPaymentResult);
    } catch (e) {
      handlePaymentError(e.message || 'Failed to confirm cash payment');
    } finally {
      setProcessingPayment(false);
    }
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

        {/* Progress Steps */}
        <div className="checkout-steps" aria-label="Checkout progress">
          <div className="step completed">1<span>Services</span></div>
          <div className="step completed">2<span>Schedule</span></div>
          <div className="step completed">3<span>Payment</span></div>
          <div className="step active">4<span>Processing</span></div>
          <div className={`step ${paymentData?.isCash ? 'pending' : 'pending'}`}>5<span>Success</span></div>
        </div>

        {/* Stripe Branding */}
        {!paymentData?.isCash && (
          <div className="stripe-brand">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
            </svg>
            <span>Stripe</span>
          </div>
        )}

        <div className="process-grid">
          <div className="process-summary" aria-label="Booking summary">
            <h3>Booking summary</h3>
            <ul className="mini-summary-list">
              <li><span>Booking #</span><strong>{bookingData.bookingNumber || bookingData.bookingId}</strong></li>
              <li><span>Professional</span><strong>{bookingData.professionalName}</strong></li>
              <li><span>Date</span><strong>{bookingData.date}</strong></li>
              <li><span>Time</span><strong>{bookingData.time}</strong></li>
              <li><span>Duration</span><strong>{bookingData.duration} min</strong></li>
              <li className="services-row"><span>Services</span><strong>{bookingData.services?.map(s=>s.name).join(', ') || bookingData.serviceNames}</strong></li>
              <li className="total"><span>Total</span><strong>AED {bookingData.totalAmount}</strong></li>
            </ul>
            <div className="method-pill">Method: {selectedMethod === 'card' ? 'Debit Card' : selectedMethod === 'upi' ? 'UPI (Wallet)' : 'Cash at Venue'}</div>
            {!paymentData?.isCash && paymentData?.clientSecret?.startsWith('mock_') && (
              <div className="dev-warning" role="alert">
                Using mock gateway (real Stripe keys not loaded). Elements may fail. Provide valid STRIPE_* keys.
              </div>
            )}
          </div>
          <div className="process-main" aria-label="Payment form section">
            {/* Test Mode Notice or Cash Notice */}
            {!paymentData?.isCash ? (
              <div className="test-mode-notice" style={{
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                padding: '15px',
                margin: '0 0 20px 0',
                textAlign: 'center'
              }}>
                {selectedMethod === 'upi' ? (
                  <>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>🧪 UPI Test (Simulated)</h4>
                    {upiVpa && (
                      <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#444' }}>
                        UPI ID: <strong>{upiVpa}</strong>
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>A mock collect request is assumed sent. Complete via Stripe Payment Element below or use simulate button.</p>
                  </>
                ) : (
                  <>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>🧪 Test Mode</h4>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                      Use card 4242 4242 4242 4242 · Any future date · Any CVC
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="test-mode-notice" style={{
                background: '#fff8e1',
                border: '1px solid #ffecb3',
                borderRadius: '8px',
                padding: '15px',
                margin: '0 0 20px 0',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#ff8f00' }}>💵 Cash Payment Selected</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                  Pay at the venue. We reserved your slot.
                </p>
              </div>
            )}

            {/* Stripe Card Form only for card method (exclude UPI) */}
            {selectedMethod === 'card' && paymentData && paymentData.clientSecret && !error && !paymentData.isCash && (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: paymentData.clientSecret, appearance: { theme: 'stripe' } }}
              >
                <StripeCheckoutForm
                  paymentData={paymentData}
                  bookingData={bookingData}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </Elements>
            )}

            {/* UPI Dedicated UI (no card element) */}
            {selectedMethod === 'upi' && !paymentData?.isCash && !error && (
              <div className="upi-process-box" style={{
                border: '1px solid #d1c4e9',
                background: '#faf5ff',
                borderRadius: 12,
                padding: '18px 18px 20px',
                display: 'grid',
                gap: 12
              }}>
                <h4 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#4527a0'}}>UPI Payment</h4>
                {upiVpa && <div style={{fontSize:'0.8rem'}}>Collect request sent to: <strong>{upiVpa}</strong></div>}
                <div style={{fontSize:'0.7rem',color:'#555',lineHeight:1.4}}>
                  Approve the payment in your UPI app. This demo environment doesn't connect to a real UPI gateway, so you can click the simulate button below after "approval" to continue.
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div className="spinner" style={{width:26,height:26,border:'3px solid #d1c4e9',borderTop:'3px solid #673ab7',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
                  <span style={{fontSize:'0.75rem',color:'#673ab7',fontWeight:600}}>Waiting for UPI approval…</span>
                </div>
              </div>
            )}

            {/* UPI simulation helper (only when UPI selected) */}
            {selectedMethod === 'upi' && !paymentData?.isCash && !error && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '12px', color: '#555', textAlign: 'center' }}>
                  If your UPI approval can't be completed in test mode, you can simulate success.
                </div>
                <button onClick={handleSimulateUpi} className="btn-secondary" style={{ maxWidth: 280, margin: '0 auto' }}>
                  Simulate UPI Approval
                </button>
              </div>
            )}

            {/* Cash action */}
            {paymentData?.isCash && !error && (
              <div className="payment-actions" style={{ marginTop: 10 }}>
                <button onClick={handleCashConfirm} className="btn-primary" disabled={processingPayment}>
                  {processingPayment ? 'Confirming…' : 'Confirm Booking (Pay Cash at Venue)'}
                </button>
                <button onClick={handleBackToPayment} className="btn-secondary">Change Method</button>
              </div>
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

            {(!paymentData || (!paymentData.clientSecret && !paymentData.isCash)) && !error && (
              <div className="payment-info">
                <p>❌ Payment data not found</p>
                <button onClick={handleBackToPayment} className="btn-primary">
                  Back to Payment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcess;
