import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow, bookingsAPI, paymentsAPI } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Swal from 'sweetalert2';
import './Payment.css';

// Initialize Stripe with environment variable (TEST MODE)
// Using Stripe's official test publishable key as fallback
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_4eC39HqLyjWDarjtT1zdp7dc';
console.log('[STRIPE] Using publishable key:', stripePublishableKey);

const stripePromise = loadStripe(stripePublishableKey).then(stripe => {
  if (!stripe) {
    console.error('[STRIPE] Failed to load Stripe');
  } else {
    console.log('[STRIPE] Stripe loaded successfully');
  }
  return stripe;
}).catch(error => {
  console.error('[STRIPE] Error loading Stripe:', error);
  return null;
});

// Test mode configuration
const STRIPE_TEST_MODE = import.meta.env.VITE_STRIPE_TEST_MODE === 'true' || import.meta.env.DEV || true;
const TEST_CARD_NUMBERS = {
  visa: '4242424242424242',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002'
};

// Stripe Payment Form Component (TEST MODE with Offline Fallback)
const StripePaymentForm = ({ onPaymentSuccess, onPaymentError, paymentData, loading, setLoading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [useTestCard, setUseTestCard] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Check if Stripe is available and working
  useEffect(() => {
    if (STRIPE_TEST_MODE && (!stripe || !elements)) {
      // If Stripe fails to load in test mode, enable offline mode
      const timer = setTimeout(() => {
        setOfflineMode(true);
        console.log('[STRIPE] Enabling offline test mode due to Stripe load failure');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [stripe, elements]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setCardError('');

    try {
      console.log('[STRIPE TEST MODE] Processing payment in test mode');

      // Always use test simulation in test mode or when offline
      if (STRIPE_TEST_MODE || offlineMode) {
        console.log('[STRIPE TEST MODE] Using test card simulation');
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create mock payment intent
        const mockPaymentIntent = {
          id: 'pi_test_' + Date.now(),
          status: 'succeeded',
          amount: Math.round(paymentData.amount * 100),
          currency: 'aed',
          payment_method: 'pm_test_visa'
        };
        
        onPaymentSuccess({
          paymentIntent: mockPaymentIntent,
          paymentData: {
            paymentIntentId: mockPaymentIntent.id,
            clientSecret: 'pi_test_secret',
            status: 'SUCCESS'
          }
        });
        
        setLoading(false);
        return;
      }

      // Only attempt real Stripe processing if Stripe is loaded and not in test mode
      if (!stripe || !elements) {
        setCardError('Payment system is not available. Using test mode instead.');
        setOfflineMode(true);
        setLoading(false);
        return;
      }

      // Real Stripe processing (for production mode)
      const cardElement = elements.getElement(CardElement);

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: paymentData.clientInfo.name,
          email: paymentData.clientInfo.email,
          phone: paymentData.clientInfo.phone,
        },
      });

      if (paymentMethodError) {
        setCardError(paymentMethodError.message);
        setLoading(false);
        return;
      }

      // Call your backend to create payment intent
      const response = await paymentsAPI.createPayment({
        ...paymentData,
        paymentMethodId: paymentMethod.id,
      });

      if (response.success && response.data.clientSecret) {
        // Confirm payment
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          response.data.clientSecret,
          {
            payment_method: paymentMethod.id,
          }
        );

        if (confirmError) {
          setCardError(confirmError.message);
          setLoading(false);
        } else if (paymentIntent.status === 'succeeded') {
          // Confirm with backend
          await paymentsAPI.confirmStripePayment({
            paymentIntentId: paymentIntent.id,
            clientSecret: response.data.clientSecret,
            bookingId: paymentData.bookingId,
          });
          
          onPaymentSuccess({
            paymentIntent,
            paymentData: response.data,
          });
        }
      } else {
        throw new Error(response.message || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('[STRIPE] Payment error:', error);
      setCardError(error.message);
      onPaymentError(error.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      {(STRIPE_TEST_MODE || offlineMode) && (
        <div className="test-mode-banner">
          <div className="test-mode-info">
            ⚠️ <strong>{offlineMode ? 'OFFLINE' : 'TEST'} MODE</strong> - No real charges will be made
            {offlineMode && <div className="offline-notice">Payment system offline - using simulation</div>}
          </div>
          <div className="test-mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={useTestCard}
                onChange={(e) => setUseTestCard(e.target.checked)}
              />
              Use test card simulation (recommended)
            </label>
          </div>
        </div>
      )}
      
      {!useTestCard && !offlineMode && (
        <div className="card-element-container">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      )}
      
      {(useTestCard && (STRIPE_TEST_MODE || offlineMode)) && (
        <div className="test-card-info">
          <h4>Test Mode Active</h4>
          <p><strong>Available Test Card Numbers:</strong></p>
          <ul>
            <li><strong>Visa Success:</strong> {TEST_CARD_NUMBERS.visa}</li>
            <li><strong>Mastercard Success:</strong> {TEST_CARD_NUMBERS.mastercard}</li>
            <li><strong>Amex Success:</strong> {TEST_CARD_NUMBERS.amex}</li>
            <li><strong>Declined Card:</strong> {TEST_CARD_NUMBERS.declined}</li>
          </ul>
          <p><em>💡 No real card required - payment will be simulated successfully</em></p>
        </div>
      )}
      
      {cardError && <div className="card-error">{cardError}</div>}
      
      <button
        type="submit"
        disabled={loading}
        className="payment-submit-btn"
      >
        {loading ? 'Processing...' : 
         `${(STRIPE_TEST_MODE || offlineMode) ? 'Test ' : ''}Pay AED ${paymentData.amount}`}
      </button>
    </form>
  );
};

const Payment = () => {
  console.log('Payment component: Starting to render');
  
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableGateways, setAvailableGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('stripe');
  const [selectedMethod, setSelectedMethod] = useState('card'); // 'card' | 'upi' | 'cash'
  const [upiVpa, setUpiVpa] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);

  // Get booking data from localStorage
  const bookingData = JSON.parse(localStorage.getItem('bookingData') || '{}');
  
  // Create booking data from available booking flow data
  const createBookingData = () => {
    // Load booking flow data
    bookingFlow.load();
    
    console.log('Payment component: BookingFlow data:', {
      selectedServices: bookingFlow.selectedServices,
      selectedProfessionals: bookingFlow.selectedProfessionals,
      selectedTimeSlot: bookingFlow.selectedTimeSlot
    });
    
    console.log('Payment component: Full bookingFlow object:', bookingFlow);
    console.log('Payment component: localStorage booking data:', localStorage.getItem('bookingData'));
    
    // Check if booking flow data exists and is complete
    if (bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0 && 
        bookingFlow.selectedProfessionals && Object.keys(bookingFlow.selectedProfessionals).length > 0 && 
        bookingFlow.selectedTimeSlot) {
      
      const totalPrice = bookingFlow.getTotalPrice();
      const totalDuration = bookingFlow.getTotalDuration();
      const serviceNames = bookingFlow.selectedServices.map(s => s.name).join(', ');

      // Build per-service professional assignments
      const professionalAssignments = bookingFlow.selectedServices.map(s => {
        const prof = bookingFlow.selectedProfessionals[s._id];
        let profName = 'Any professional';
        if (prof && prof.id !== 'any') {
          profName = prof.user?.fullName || `${prof.user?.firstName || ''} ${prof.user?.lastName || ''}`.trim() || prof.name;
        }
        return { serviceId: s._id, serviceName: s.name, professionalName: profName };
      });
      const uniqueProfessionalNames = [...new Set(professionalAssignments.map(p => p.professionalName))];
      // For legacy single professional field keep first (or Any)
      const selectedProfessional = bookingFlow.selectedProfessionals[Object.keys(bookingFlow.selectedProfessionals)[0]];
      
      const bookingData = {
        bookingId: 'BK' + Date.now(),
        serviceNames,
        services: bookingFlow.selectedServices,
        professionalName: selectedProfessional.user?.fullName || 
          `${selectedProfessional.user?.firstName} ${selectedProfessional.user?.lastName}` || 
          selectedProfessional.name,
        professionalAssignments,
        uniqueProfessionalNames,
        date: new Date(bookingFlow.selectedTimeSlot.date).toLocaleDateString(),
        time: bookingFlow.selectedTimeSlot.time?.time || '10:00 AM',
        duration: totalDuration,
        servicePrice: totalPrice,
        totalAmount: Math.round(totalPrice * 1.05) // Including 5% tax
      };
      
      console.log('Payment component: Created booking data from booking flow:', bookingData);
      return bookingData;
    }
    
    // Fallback to localStorage data
    console.log('Payment component: Using fallback booking data:', bookingData);
    return bookingData;
  };
  
  const finalBookingData = createBookingData();
  
  console.log('Payment component: User data:', user);
  console.log('Payment component: Token:', token);
  console.log('Payment component: Booking data:', finalBookingData);
  console.log('Payment component: Booking data keys:', Object.keys(finalBookingData));
  console.log('Payment component: Has bookingId:', !!finalBookingData.bookingId);

  const createBookingInDatabase = async () => {
    console.log('[DEBUG] Creating booking in database...');
    console.log('[DEBUG] BookingFlow data:', bookingFlow);
    console.log('[DEBUG] FinalBookingData:', finalBookingData);
    
    // Get current logged-in user data
    console.log('[DEBUG] Current logged-in user:', user);
    
    if (!user || !user.email) {
      throw new Error('User not logged in or missing user data');
    }

    // Validate required booking flow data
    if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
      throw new Error('No services selected');
    }

    if (!bookingFlow.selectedTimeSlot) {
      throw new Error('No time slot selected');
    }

    const servicesPayload = finalBookingData.services.map(service => {
      const professional = bookingFlow.selectedProfessionals[service._id];
      return {
        service: service._id,
        employee: professional && (professional._id || professional.id) ? 
          (professional.id === 'any' ? 'any' : (professional._id || professional.id)) : 'any',
        price: service.price,
        duration: service.duration,
        startTime: bookingFlow.selectedTimeSlot?.startTime || new Date().toISOString(),
        endTime: bookingFlow.selectedTimeSlot?.endTime || new Date().toISOString()
      };
    });

    const appointmentDate = bookingFlow.selectedTimeSlot.date || 
                           bookingFlow.selectedDate || 
                           new Date().toISOString();

    const bookingPayload = {
      // Include current logged-in user as client
      client: {
        id: user._id || user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.username || 'Client',
        email: user.email,
        phone: user.phone || user.phoneNumber || user.mobile || '',
        userId: user._id || user.id // backend reference
      },
      services: servicesPayload,
      appointmentDate: new Date(appointmentDate).toISOString(),
      notes: '',
      selectionMode: bookingFlow.selectionMode || 'perService'
    };

    console.log('[DEBUG] Booking payload with client data:', {
      clientName: bookingPayload.client.name,
      clientEmail: bookingPayload.client.email,
      servicesCount: bookingPayload.services.length,
      appointmentDate: bookingPayload.appointmentDate,
      fullPayload: bookingPayload
    });

    try {
      const response = await bookingsAPI.createBooking(bookingPayload);
      console.log('Booking created successfully:', response);
      return response.data || response;
    } catch (error) {
      console.error('Error creating booking:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  };

  useEffect(() => {
    if (!user || !token) {
      navigate('/login', { state: { from: { pathname: '/payment' } } });
      return;
    }

    if (!finalBookingData.bookingId) {
      navigate('/booking');
      return;
    }

    // Create booking in database if it doesn't exist yet
    const initializePayment = async () => {
      try {
        // Check if this is a temporary booking ID (starts with 'BK')
        if (finalBookingData.bookingId.startsWith('BK')) {
          console.log('Creating booking in database...');
          await createBookingInDatabase();
        }
        
        // Get available payment gateways
        fetchAvailableGateways();
      } catch (error) {
        console.error('Error initializing payment:', error);
        setError('Failed to create booking. Please try again.');
      }
    };
    
    initializePayment();
  }, []);

  const fetchAvailableGateways = async () => {
    try {
      console.log('[PAYMENT] Fetching available payment gateways...');
      const response = await paymentsAPI.getAvailableGateways();
      
      if (response.success && response.data.gateways) {
        console.log('[PAYMENT] Available gateways:', response.data.gateways);
        // setAvailableGateways(response.data.gateways); // Commented - using hardcoded methods
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to fetch gateways, using defaults:', error);
      // Continue with hardcoded payment methods (card, upi, cash)
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[PAYMENT] Starting payment process with method:', selectedMethod);

      // Validation: UPI requires VPA
      if (selectedMethod === 'upi' && !upiVpa.trim()) {
        setError('Please enter your UPI ID');
        return;
      }

      // 1. Ensure booking exists in database
      let bookingData = finalBookingData;
      if (!bookingData.bookingId || bookingData.bookingId.toString().startsWith('BK')) {
        console.log('[PAYMENT] Creating booking in database first...');
        try {
          const createdBooking = await createBookingInDatabase();
          console.log('[PAYMENT] Booking creation response:', createdBooking);
          
          // Extract the correct booking ID from the response
          let newBookingId;
          let newBookingNumber;
          
          if (createdBooking && createdBooking.booking) {
            newBookingId = createdBooking.booking._id || createdBooking.booking.id;
            newBookingNumber = createdBooking.booking.bookingNumber;
          } else if (createdBooking && createdBooking._id) {
            newBookingId = createdBooking._id;
            newBookingNumber = createdBooking.bookingNumber;
          } else if (createdBooking && createdBooking.id) {
            newBookingId = createdBooking.id;
            newBookingNumber = createdBooking.bookingNumber;
          }
          
          console.log('[PAYMENT] Extracted booking ID:', newBookingId);
          console.log('[PAYMENT] Extracted booking number:', newBookingNumber);
          
          if (!newBookingId) {
            throw new Error('Failed to extract booking ID from created booking');
          }
          
          bookingData = {
            ...bookingData,
            bookingId: newBookingId,
            bookingNumber: newBookingNumber || newBookingId
          };
          
          console.log('[PAYMENT] Updated booking data:', bookingData);
        } catch (bookingError) {
          console.error('[PAYMENT] Failed to create booking:', bookingError);
          throw new Error(`Failed to create booking: ${bookingError.message}`);
        }
      }

      // 2. Prepare payment data
      const paymentData = {
        // Backend expects bookingId to be the bookingNumber according to the controller
        bookingId: bookingData.bookingNumber || bookingData.bookingId,
        amount: bookingData.totalAmount,
        currency: 'AED',
        paymentMethod: selectedMethod === 'upi' ? 'digital_wallet' : selectedMethod, // Map UPI to digital_wallet
        gateway: 'stripe', // Backend only supports stripe gateway
        
        // Include method-specific data
        ...(selectedMethod === 'upi' && { upiVpa }),
        
        // Client info
        clientInfo: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phone: user.phone
        }
      };

      console.log('[PAYMENT] Payment data prepared:', paymentData);

      // 3. Handle different payment methods (TEST MODE)
      if (selectedMethod === 'cash') {
        console.log('[PAYMENT TEST MODE] Processing cash payment');
        
        if (STRIPE_TEST_MODE) {
          // Simulate cash payment in test mode
          console.log('[PAYMENT TEST MODE] Simulating cash payment');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          await handlePaymentSuccess({
            paymentData: {
              paymentId: 'cash_test_' + Date.now(),
              status: 'pending',
              transactionId: 'TXN_CASH_' + Math.random().toString(36).substr(2, 9)
            },
            paymentMethod: 'cash'
          });
        } else {
          // Real cash payment processing
          const paymentResponse = await paymentsAPI.createPayment({
            ...paymentData,
            status: 'pending'
          });
          
          if (paymentResponse.success) {
            await handlePaymentSuccess({
              paymentData: paymentResponse.data,
              paymentMethod: 'cash'
            });
          } else {
            throw new Error(paymentResponse.message || 'Cash payment registration failed');
          }
        }
      } else if (selectedMethod === 'upi') {
        console.log('[PAYMENT TEST MODE] Processing UPI payment');
        
        if (STRIPE_TEST_MODE) {
          // Simulate UPI payment in test mode
          console.log('[PAYMENT TEST MODE] Simulating UPI payment for:', upiVpa);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await handlePaymentSuccess({
            paymentData: {
              paymentId: 'upi_test_' + Date.now(),
              status: 'completed',
              transactionId: 'TXN_UPI_' + Math.random().toString(36).substr(2, 9),
              upiVpa: upiVpa
            },
            paymentMethod: 'upi'
          });
        } else {
          // Real UPI payment processing
          const paymentResponse = await paymentsAPI.createPayment(paymentData);
          
          if (paymentResponse.success) {
            // For UPI, you would typically redirect to UPI app or show QR code
            await handlePaymentSuccess({
              paymentData: paymentResponse.data,
              paymentMethod: 'upi'
            });
          } else {
            throw new Error(paymentResponse.message || 'UPI payment failed');
          }
        }
      } else {
        // Card payment handled by Stripe component
        setPaymentIntent(paymentData);
      }

    } catch (error) {
      console.error('[PAYMENT] Payment error:', error);
      console.error('[PAYMENT] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.message.includes('User not logged in')) {
        errorMessage = 'Please log in to continue with payment.';
      } else if (error.message.includes('conflicting booking')) {
        errorMessage = 'This time slot is no longer available. Please select a different time.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else {
        errorMessage = error.message || 'Payment failed. Please try again.';
      }
      
      setError(errorMessage);
      
    } finally {
      if (selectedMethod !== 'card') {
        setLoading(false);
      }
    }
  };

  const handlePaymentSuccess = async (result) => {
    console.log('[PAYMENT] Payment successful:', result);
    
    // Clear booking flow data
    bookingFlow.clear();
    
    // Show success message
    await Swal.fire({
      title: 'Booking Confirmed!',
      text: `Your booking has been confirmed. ${result.paymentMethod === 'cash' ? 'Please pay at the venue.' : 'Payment processed successfully.'}`,
      icon: 'success',
      confirmButtonText: 'View Booking',
      timer: 5000
    });

    // Navigate to success page
    navigate('/dashboard', { 
      state: { 
        bookingData: finalBookingData,
        paymentData: result.paymentData,
        paymentMethod: result.paymentMethod
      } 
    });
  };

  const handlePaymentError = (errorMessage) => {
    console.error('[PAYMENT] Payment error:', errorMessage);
    setError(errorMessage);
    setLoading(false);
    setPaymentIntent(null);
  };

  const handleBackToBooking = () => {
    navigate('/booking');
  };

  const handleViewBookings = () => {
    navigate('/dashboard');
  };

  if (!finalBookingData.bookingId) {
    console.log('Payment component: No booking data found, showing test content');
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="payment-header">
            <h2>Payment Page Test</h2>
            <p>This is a test to see if the Payment component renders</p>
          </div>
          <div className="payment-details">
            <p>User: {user?.fullName}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {user?.role}</p>
            <p>Booking Data: {JSON.stringify(finalBookingData)}</p>
          </div>
          <div className="payment-actions">
            <button onClick={() => navigate('/')} className="btn-primary">
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimal left-only payment panel.
  // The booking summary will be shown by LayoutWithBooking's sidebar (right side).
  return (
    <Elements stripe={stripePromise}>
      <div className="payment-page">
        <div className="payment-card-main">
          <h2 className="payment-title">Review and confirm</h2>
          
          <div className="payment-section">
            <h3 className="section-title">Payment method</h3>
            
            <div className="payment-methods-grid">
              <button
                type="button"
                className={`payment-method-btn ${selectedMethod === 'card' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('card')}
              >
                <span className="method-text">Card</span>
              </button>
              
              <button
                type="button"
                className={`payment-method-btn ${selectedMethod === 'upi' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('upi')}
              >
                <span className="method-text">UPI</span>
              </button>
              
              <button
                type="button"
                className={`payment-method-btn ${selectedMethod === 'cash' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('cash')}
              >
                <span className="method-text">Cash</span>
              </button>
            </div>

            {selectedMethod === 'card' && paymentIntent && (
              <div className="card-payment-section">
                <h4>Enter Card Details</h4>
                <StripePaymentForm
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  paymentData={paymentIntent}
                  loading={loading}
                  setLoading={setLoading}
                />
              </div>
            )}

            {selectedMethod === 'card' && !paymentIntent && (
              <div className="card-details-form">
                <div className="form-group">
                  <label>Card holder full name*</label>
                  <input type="text" placeholder="Add card holder full name" className="form-input" />
                </div>
                
                <div className="form-group">
                  <label>Card number*</label>
                  <input type="text" placeholder="Credit or debit card number" className="form-input" />
                </div>
                
                <div className="form-row">
                  <div className="form-group half">
                    <label>Expiry date*</label>
                    <input type="text" placeholder="MM/YY" className="form-input" />
                  </div>
                  <div className="form-group half">
                    <label>Security code*</label>
                    <input type="text" placeholder="123" className="form-input" />
                  </div>
                </div>
                
                <div className="payment-icons">
                  <span>Pay securely with</span>
                  <div className="icons"></div>
                </div>
              </div>
            )}

            {selectedMethod === 'upi' && (
              <div className="upi-form">
                <div className="form-group">
                  <label>UPI ID*</label>
                  <input
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="name@bank"
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'cash' && (
              <div className="cash-payment-info">
                <p>You will pay at the venue. Your booking will be confirmed upon payment processing.</p>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
          
          {(selectedMethod !== 'card' || !paymentIntent) && (
            <div className="payment-actions">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="btn-primary payment-confirm-btn"
              >
                {loading ? 'Processing...' : `Confirm ${selectedMethod === 'cash' ? 'Booking' : 'Payment'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </Elements>
  );
};

export default Payment;