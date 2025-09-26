import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow, bookingsAPI, paymentsAPI } from '../services/api';
import { confirmBookingAndPay } from '../services/paymentFlow';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Swal from 'sweetalert2';
import { Spinner } from 'react-bootstrap';
import './Payment.css';

// Initialize Stripe with environment variable (TEST MODE)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_4eC39HqLyjWDarjtT1zdp7dc';

const stripePromise = loadStripe(stripePublishableKey);

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
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [stripe, elements]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setCardError('');

    try {

      // Always use test simulation in test mode or when offline
      if (STRIPE_TEST_MODE || offlineMode) {
      
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
            status: 'SUCCESS',
            amount: paymentData.amount,
            currency: paymentData.currency || 'aed',
            created: new Date().toISOString()
          },
          paymentMethod: 'card'
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
          name: paymentData.clientInfo?.name,
          email: paymentData.clientInfo?.email,
          phone: paymentData.clientInfo?.phone,
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

    </form>
  );
};

const Payment = () => {
  console.log('Payment component: Starting to render');

  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  console.log('Payment component: Auth context:', { user, token, isAuthenticated });

  // Load booking flow data at component start
  useEffect(() => {
    console.log('[Payment] Component mounted - checking bookingFlow data');
    
    // Check if localStorage is available
    try {
      const test = localStorage.getItem('test');
      console.log('[Payment] localStorage available');
    } catch (e) {
      console.error('[Payment] localStorage not available:', e);
    }
    
    const bookingData = bookingFlow.load();
    console.log('[Payment] Loaded bookingFlow data:', bookingData);
    console.log('[Payment] selectedTimeSlot details:', bookingFlow.selectedTimeSlot);
    console.log('[Payment] localStorage raw data:', localStorage.getItem('bookingFlow'));
    
    // Check if data is missing and log warnings
    if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
      console.warn('[Payment] WARNING - No services selected in bookingFlow!');
    }
    if (!bookingFlow.selectedTimeSlot) {
      console.warn('[Payment] WARNING - No time slot selected in bookingFlow!');
    }
    if (!bookingFlow.selectedProfessionals || Object.keys(bookingFlow.selectedProfessionals).length === 0) {
      console.warn('[Payment] WARNING - No professionals selected in bookingFlow!');
    }
  }, []); // Run once on mount
  // Auth check
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!user && !savedToken && !savedUser && !import.meta.env.DEV) {
      console.log('[PAYMENT] User not authenticated, redirecting to login');
      navigate('/login', {
        state: { from: { pathname: '/payment' } },
        replace: true
      });
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card'); // 'card' | 'upi' | 'cash'
  const [upiVpa, setUpiVpa] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  // ---------- Helpers for date/time ----------
  const toLongDate = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return 'N/A';
    const d = new Date(`${yyyy_mm_dd}T00:00:00`);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Build a Date from selectedDate + timeValue ("HH:mm") or time ("h:mm A")
  const combineDateAndTime = (yyyy_mm_dd, timeValue, timeStr) => {
    // Fallback to 10:00 if nothing
    let hour = 10;
    let minute = 0;

    if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
      const [h, m] = timeValue.split(':').map(Number);
      hour = h; minute = m;
    } else if (typeof timeStr === 'string') {
      // Parse "12:00 AM" etc.
      const m = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (m) {
        let h = parseInt(m[1], 10);
        let mins = m[2] ? parseInt(m[2], 10) : 0;
        const mer = m[3]?.toUpperCase();
        if (mer === 'PM' && h < 12) h += 12;
        if (mer === 'AM' && h === 12) h = 0;
        hour = h; minute = mins;
      }
    }

    const base = new Date(`${yyyy_mm_dd || ''}T00:00:00`);
    if (isNaN(base)) return null;
    base.setHours(hour, minute, 0, 0);
    return base;
  };
  // ------------------------------------------

  // Create booking data for the UI summary
  const createBookingData = () => {
    // Load booking flow data
    bookingFlow.load();

    console.log('Payment component: BookingFlow data:', {
      selectedServices: bookingFlow.selectedServices,
      selectedProfessionals: bookingFlow.selectedProfessionals,
      selectedTimeSlot: bookingFlow.selectedTimeSlot,
      selectedDate: bookingFlow.selectedDate
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
        date: (() => {
          console.log('Payment component: selectedDate:', bookingFlow.selectedDate);
          const dateStr = bookingFlow.selectedDate || bookingFlow.date;
          const date = typeof dateStr === 'string' ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr);
          return date.toLocaleDateString();
        })(),
        time: bookingFlow.selectedTimeSlot.time || '10:00 AM',
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
  console.log('Payment component: Final booking data for summary:', finalBookingData);



   const createBookingInDatabase = async () => {
    // Helper function to safely create and validate dates
    const createValidDate = (dateInput, fallbackDate = new Date()) => {
      if (!dateInput) return fallbackDate;
      
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date input:', dateInput, 'using fallback');
        return fallbackDate;
      }
      return date;
    };

    // Creating booking in database
    
    // Helper function to get user data reliably
    const getUserData = () => {
      // First try the context user
      if (user && (user.email || user.username || user._id || user.id)) {
        return user;
      }
      
      // Fallback to localStorage
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser && (parsedUser.email || parsedUser.username || parsedUser._id || parsedUser.id)) {
            return parsedUser;
          }
        } catch (parseError) {
          console.error('[DEBUG] Failed to parse user from localStorage:', parseError);
        }
      }
      
      // Development mode fallback - create a temporary user for testing
      if (import.meta.env.DEV) {
        console.warn('[DEBUG] Using development mode fallback user');
        return {
          _id: 'dev_user_id',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          username: 'testuser'
        };
      }
      
      return null;
    };

    const currentUser = getUserData();
    console.log('[DEBUG] Current user determined:', currentUser);
    
    // Check if user is logged in
    if (!currentUser) {
      throw new Error('User not logged in - no valid user data found');
    }

    // Validate required booking flow data
    if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
      throw new Error('No services selected');
    }

    if (!bookingFlow.selectedTimeSlot) {
      throw new Error('No time slot selected');
    }

    const servicesPayload = finalBookingData.services.map((service, index) => {
      const professional = bookingFlow.selectedProfessionals[service._id];
      
      // Debug logging for time conversion
      console.log(`[TIME DEBUG] Processing service ${index}:`, {
        selectedTimeSlot: bookingFlow.selectedTimeSlot,
        selectedTimeSlotStartTime: bookingFlow.selectedTimeSlot?.startTime,
        selectedTimeSlotEndTime: bookingFlow.selectedTimeSlot?.endTime,
        serviceCount: finalBookingData.services.length
      });
      
      // Calculate sequential start and end times for multiple services
      let startTime, endTime;
      if (finalBookingData.services.length === 1) {

        // Single service: use the selected time slot start time, but calculate end time based on service duration
        startTime = createValidDate(bookingFlow.selectedTimeSlot?.startTime);
        // FIXED: Calculate end time based on actual service duration, not time slot end time
        endTime = new Date(startTime.getTime() + ((service.duration || 30) * 60 * 1000));
      
      } else {
        // Multiple services: calculate sequential times
        const baseStartTime = createValidDate(bookingFlow.selectedTimeSlot?.startTime);
        const serviceStartMinutes = finalBookingData.services.slice(0, index).reduce((total, s) => total + (s.duration || 30), 0);
        
        startTime = new Date(baseStartTime.getTime() + (serviceStartMinutes * 60 * 1000));
        endTime = new Date(startTime.getTime() + ((service.duration || 30) * 60 * 1000));
      }
      // Instead of using toISOString() which converts to UTC, manually create local ISO format
      const formatLocalISO = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
      };

      return {
        service: service._id,
        employee: professional && (professional._id || professional.id) ? 
          (professional.id === 'any' ? 'any' : (professional._id || professional.id)) : 'any',
        price: service.price,
        duration: service.duration,
        // CRITICAL FIX: Store times preserving local timezone (treat as UTC to avoid conversion)
        startTime: formatLocalISO(startTime),
        endTime: formatLocalISO(endTime),
        // Add timezone offset information for debugging
        timezoneOffset: startTime.getTimezoneOffset(),
        originalLocalTime: `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`
      };
    });

    const appointmentDate = bookingFlow.selectedTimeSlot.date || 
                           bookingFlow.selectedDate || 
                           new Date().toISOString().split('T')[0]; // Use date string format

    // Use the actual start time's date instead of hardcoded noon
    // This ensures appointmentDate matches the startTime date
    const appointmentDateObj = bookingFlow.selectedTimeSlot.startTime ? 
                              new Date(bookingFlow.selectedTimeSlot.startTime) : 
                              new Date(`${appointmentDate}T12:00:00.000Z`);

    const bookingPayload = {
      // Include current logged-in user as client
      client: {
        id: currentUser._id || currentUser.id || 'temp_user_id',
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || currentUser.username || currentUser.fullName || 'Client',
        email: currentUser.email || currentUser.username || 'client@example.com',
        phone: currentUser.phone || currentUser.phoneNumber || currentUser.mobile || '',
        userId: currentUser._id || currentUser.id || 'temp_user_id' // backend reference
      },
      services: servicesPayload,
      appointmentDate: appointmentDateObj.toISOString(),
      notes: '',
      selectionMode: bookingFlow.selectionMode || 'perService'
    };

  

    try {
      const response = await bookingsAPI.createBooking(bookingPayload);
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
   const handlePayment = async () => {
    setLoading(true);
    setProcessing(true);
    setError(null);

    try {
      console.log('[PAYMENT] Starting payment process with method:', selectedMethod);

      // Validation: UPI requires VPA
      if (selectedMethod === 'upi' && !upiVpa.trim()) {
        setError('Please enter your UPI ID');
        setLoading(false);
        setProcessing(false);
        return;
      }

      // Handle card payments separately (Stripe component handles these)
      if (selectedMethod === 'card') {
        // For card payments, prepare payment data and let Stripe component handle it
        const paymentData = {
          bookingId: finalBookingData.bookingNumber || finalBookingData.bookingId,
          amount: finalBookingData.totalAmount,
          currency: 'AED',
          paymentMethod: 'card',
          gateway: 'stripe',
          description: `Payment for booking ${finalBookingData.bookingNumber || finalBookingData.bookingId} - ${finalBookingData.serviceNames}`,
          clientInfo: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: user.phone
          }
        };
        console.log('[PAYMENT] Prepared card payment data:', paymentData);
        setPaymentIntent(paymentData);
        setProcessing(false); // Stop generic processing so user can enter card details
        return;
      }

      // For cash and UPI, use the centralized orchestrator function
      const clientInfo = {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone
      };

      const result = await confirmBookingAndPay({
        method: selectedMethod,
        upiVpa: selectedMethod === 'upi' ? upiVpa : undefined,
        clientInfo
      });

      console.log('confirmBookingAndPay result:', result);

      // Handle success
      await handlePaymentSuccess({
        paymentData: result.payment,
        paymentMethod: selectedMethod,
        booking: result.booking
      });

    } catch (error) {
      console.error('[PAYMENT] Payment error:', error);
      console.error('[PAYMENT] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      let errorMessage = 'Payment failed. Please try again.';

      if (error.message && error.message.includes('User not logged in')) {
        errorMessage = 'Please log in to continue with payment.';
      } else if (error.message && error.message.includes('conflicting booking')) {
        errorMessage = 'This time slot is no longer available. Please select a different time.';
      } else if (error.message && (error.message.includes('network') || error.message.includes('fetch'))) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else {
        errorMessage = (error && error.message) ? error.message : 'Payment failed. Please try again.';
      }

      setError(errorMessage);

      // If booking creation failed, navigate to cancel flow
      try {
        const msg = (error && error.message) ? String(error.message).toLowerCase() : '';
        const isBookingCreateError = msg.includes('create booking') || msg.includes('failed to create booking') ||
                                   msg.includes('failed to create') || msg.includes('booking could not') ||
                                   msg.includes('no time slot') || msg.includes('network') || msg.includes('fetch');
        if (isBookingCreateError) {
          navigate('/payment/cancel', { state: { error: error.message, booking: finalBookingData } });
          return;
        }
      } catch (navErr) {
        console.warn('[PAYMENT] Failed to navigate to cancel page:', navErr);
      }

    } finally {
      if (selectedMethod !== 'card') {
        setLoading(false);
        setProcessing(false);
      }
    }
  };

 const handlePaymentSuccess = async (result) => {
    console.log('[PAYMENT] Payment successful:', result);
    
    // Clear booking flow data
    // bookingFlow.clear();

    // Set local success result so UI can render immediately
    setSuccessResult({
      paymentData: result.paymentData,
      paymentMethod: result.paymentMethod,
      summaryText: result.paymentMethod === 'cash' ? 'Please pay at the venue.' : 'Payment processed successfully.'
    });

    // Navigate to centralized success page and pass data
    try {
      navigate('/payment/success', { state: {
        bookingData: finalBookingData,
        paymentData: result.paymentData,
        paymentMethod: result.paymentMethod,
        summaryText: result.paymentMethod === 'cash' ? 'Please pay at the venue.' : 'Payment processed successfully.'
      }});
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error('[PAYMENT] Payment failed:', error);
    setError(error);
    setLoading(false);
    setProcessing(false);

    Swal.fire({
      title: 'Payment Failed',
      text: error || 'Payment could not be processed. Please try again.',
      icon: 'error',
      confirmButtonText: 'Try Again'
    });
  };

  // Calculate values for display
  const servicePrice = finalBookingData.servicePrice || 0;
  const tax = servicePrice * 0.05;
  const totalAmount = servicePrice + tax;

  return (
    <Elements stripe={stripePromise}>
      <div className="payment-container">
        <div className="payment-grid">
          {/* Mobile-First Booking Summary */}
          <div className="payment-right">
            <div className="booking-summary-card">
              <div className="summary-header">
                <h3 className="summary-title">Booking Summary</h3>
              </div>

              <div className="summary-body">
                {/* Service Details - Scrollable List */}
                <div className="summary-section">
                  <div className="service-details">
                    <div className="service-name">Selected Services</div>
                    <div className="selected-services-scroll">
                      {finalBookingData.services && finalBookingData.services.length > 0 ? (
                        finalBookingData.services.map((service, index) => (
                          <div key={service._id || index} className="selected-service-item">
                            <div className="selected-service-info">
                              <div className="selected-service-name">{service.name}</div>
                              <div className="selected-service-duration">{service.duration} min</div>
                            </div>
                            <div className="selected-service-price">AED {(service.price || 0).toFixed(2)}</div>
                          </div>
                        ))
                      ) : (
                        <div className="selected-service-item">
                          <div className="selected-service-info">
                            <div className="selected-service-name">{finalBookingData.serviceNames}</div>
                            <div className="selected-service-duration">{finalBookingData.duration} min</div>
                          </div>
                          <div className="selected-service-price">AED {servicePrice.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                    <div className="service-meta">
                      <span className="service-duration">Total: {finalBookingData.duration} min</span>
                      <span className="service-price">AED {servicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details - Compact */}
                <div className="summary-section">
                  <div className="booking-details">
                    <div className="detail-item">
                      <span className="detail-label">Date & Time</span>
                      <span className="detail-value">{finalBookingData.date} at {finalBookingData.time}</span>
                    </div>

                    {finalBookingData.professionalName && finalBookingData.professionalName !== 'Any professional' && (
                      <div className="detail-item">
                        <span className="detail-label">Professional</span>
                        <span className="detail-value">{finalBookingData.professionalName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary - Minimal */}
                <div className="summary-section">
                  <div className="payment-breakdown">
                    <div className="breakdown-item">
                      <span className="breakdown-label">Service</span>
                      <span className="breakdown-value">AED {servicePrice.toFixed(2)}</span>
                    </div>

                    <div className="breakdown-item">
                      <span className="breakdown-label">Tax (5%)</span>
                      <span className="breakdown-value">AED {tax.toFixed(2)}</span>
                    </div>

                    <div className="breakdown-item total">
                      <span className="breakdown-label">Total</span>
                      <span className="breakdown-value">AED {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Confirm Button */}
                <div className="summary-actions">
                  <button
                    className="btn-confirm-payment"
                    onClick={() => { if (!processing) handlePayment(); }}
                    disabled={processing || loading}
                  >
                    {processing || loading ? 'Processing...' : 'Confirm & Pay'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel - Payment Methods */}
          <div className="payment-left">
            <div className="payment-left-inner">
              <h2 className="payment-title">Payment Method</h2>

              <div className="payment-section">
                <div className="payment-methods-grid">
                  <button
                    type="button"
                    className={`payment-method-btn ${selectedMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('card')}
                  >
                    <span className="method-text">Card</span>
                  </button>

                  {/* <button
                    type="button"
                    className={`payment-method-btn ${selectedMethod === 'upi' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('upi')}
                  >
                    <span className="method-text">UPI</span>
                  </button> */}

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
                        <input type="text" placeholder="CVV" className="form-input" />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod === 'upi' && (
                  <div className="upi-form">
                    <div className="form-group">
                      <label>UPI ID*</label>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        className="form-input"
                        value={upiVpa}
                        onChange={(e) => setUpiVpa(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {selectedMethod === 'cash' && (
                  <div className="cash-info">
                    <p>You can pay in cash when the professional arrives for your appointment.</p>
                  </div>
                )}

                {error && <div className="error-message">{error}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="unified-bottom-bar">
          {/* Summary Section */}
          <div className="unified-bottom-bar__summary">
            <span className="unified-bottom-bar__primary-info">AED {totalAmount.toFixed(2)}</span>
            <span className="unified-bottom-bar__secondary-info">
              {finalBookingData.services?.length || 1} service{(finalBookingData.services?.length || 1) > 1 ? 's' : ''} • {finalBookingData.duration} min
            </span>
          </div>

          {/* Action Button */}
          <button
            className={`unified-bottom-bar__button ${(processing || loading) ? 'processing' : ''}`}
            onClick={handlePayment}
            disabled={processing || loading}
          >
            {processing || loading ? (
              <div className="button-content">
                <Spinner size="sm" className="mr-2" />
                Processing...
              </div>
            ) : (
              <div className="button-content">
                {selectedMethod === 'cash' ? 'Confirm Cash Payment' : 'Confirm & Pay'}
              </div>
            )}
          </button>
        </div>
      </div>
    </Elements>
  );
};

export default Payment;
