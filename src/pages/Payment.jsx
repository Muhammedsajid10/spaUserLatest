import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Service/Context';
import { bookingFlow, bookingsAPI, paymentsAPI } from '../services/api';
import './Payment.css';

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
    console.log('Creating booking in database...');
    
    // Get current logged-in user data
    console.log('[DEBUG] Current logged-in user:', user);
    
    if (!user || !user.email) {
      throw new Error('User not logged in or missing user data');
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
      appointmentDate: new Date(bookingFlow.selectedTimeSlot.date).toISOString(),
      notes: '',
      selectionMode: bookingFlow.selectionMode || 'perService'
    };

    console.log('[DEBUG] Booking payload with client data:', {
      clientName: bookingPayload.client.name,
      clientEmail: bookingPayload.client.email,
      servicesCount: bookingPayload.services.length
    });

    try {
      const response = await bookingsAPI.createBooking(bookingPayload);
      console.log('Booking created successfully:', response);
      return response.data || response;
    } catch (error) {
      console.error('Error creating booking:', error);
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

      // Validation: Card requires fields (commented out for bypass)
      // if (selectedMethod === 'card') {
      //   if (!cardData.holderName || !cardData.number || !cardData.expiry || !cardData.cvv) {
      //     setError('Please fill all card details');
      //     return;
      //   }
      // }

      // 1. Ensure booking exists in database
      let bookingData = finalBookingData;
      if (!bookingData.bookingId || bookingData.bookingId.toString().startsWith('BK')) {
        console.log('[PAYMENT] Creating booking in database first...');
        const createdBooking = await createBookingInDatabase();
        bookingData = {
          ...bookingData,
          bookingId: createdBooking.booking._id || createdBooking.booking.bookingNumber,
          bookingNumber: createdBooking.booking.bookingNumber
        };
      }

      // 2. Prepare payment data
      const paymentData = {
        bookingId: bookingData.bookingId,
        bookingNumber: bookingData.bookingNumber,
        amount: bookingData.totalAmount,
        currency: 'AED',
        paymentMethod: selectedMethod,
        gateway: selectedMethod === 'upi' ? 'razorpay' : (selectedMethod === 'card' ? 'stripe' : 'cash'),
        
        // Include method-specific data
        ...(selectedMethod === 'upi' && { upiVpa }),
        // ...(selectedMethod === 'card' && { cardData }), // Commented for bypass
        
        // Client info
        clientInfo: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phone: user.phone
        }
      };

      console.log('[PAYMENT] Payment data prepared:', paymentData);

      // 3. Process payment (BYPASSED)
      const paymentResponse = await paymentsAPI.createPayment(paymentData);
      
      console.log('[PAYMENT] Payment response:', paymentResponse);

      if (paymentResponse.success) {
        // 4. Clear booking flow data
        bookingFlow.clear();
        
        // 5. Success handling
        await Swal.fire({
          title: 'Booking Confirmed!',
          text: `Your booking has been confirmed. ${selectedMethod === 'cash' ? 'Please pay at the venue.' : 'Payment processed successfully.'}`,
          icon: 'success',
          confirmButtonText: 'View Booking',
          timer: 5000
        });

        // 6. Navigate to success page
        navigate('/dashboard', { 
          state: { 
            bookingData,
            paymentData: paymentResponse.data,
            paymentBypassed: true 
          } 
        });

      } else {
        throw new Error(paymentResponse.message || 'Payment failed');
      }

    } catch (error) {
      console.error('[PAYMENT] Payment error:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.message.includes('conflicting booking')) {
        errorMessage = 'This time slot is no longer available. Please select a different time.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      
      // COMMENT OUT: Actual payment failure handling
      // if (paymentResponse?.data?.paymentUrl) {
      //   window.location.href = paymentResponse.data.paymentUrl;
      // }
      
    } finally {
      setLoading(false);
    }
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
              {/* <span className="method-icon">💳</span> */}
              <span className="method-text">Card</span>
            </button>
            
            <button
              type="button"
              className={`payment-method-btn ${selectedMethod === 'upi' ? 'selected' : ''}`}
              onClick={() => setSelectedMethod('upi')}
            >
              {/* <span className="method-icon"></span> */}
              <span className="method-text">UPI</span>
            </button>
            
            <button
              type="button"
              className={`payment-method-btn ${selectedMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setSelectedMethod('cash')}
            >
              {/* <span className="method-icon"> </span> */}
              <span className="method-text">Cash</span>
            </button>
          </div>

          {selectedMethod === 'card' && (
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
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Payment;