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
    try {
      console.log('Creating booking in database with data:', finalBookingData);
      console.log('User creating booking:', {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      });
      
      // Prepare services data for the API
      console.log('DEBUG: finalBookingData.services:', finalBookingData.services);
      console.log('DEBUG: bookingFlow.selectedProfessionals:', bookingFlow.selectedProfessionals);
      
  const services = finalBookingData.services.map(service => {
        // Get the professional for this service
        const professional = bookingFlow.selectedProfessionals[service._id];
        
        console.log('DEBUG: Processing service:', {
          serviceId: service._id,
          serviceName: service.name,
          servicePrice: service.price,
          serviceDuration: service.duration,
          professional: professional
        });
        
        // Validate required fields
        if (!service._id) {
          throw new Error(`Service ID is missing for service: ${service.name}`);
        }
        if (!professional || (!professional._id && !professional.id)) {
          throw new Error(`Professional is missing for service: ${service.name}`);
        }
        if (!service.price) {
          throw new Error(`Price is missing for service: ${service.name}`);
        }
        if (!service.duration) {
          throw new Error(`Duration is missing for service: ${service.name}`);
        }
        
        // Calculate start and end times
        const appointmentDate = new Date(bookingFlow.selectedTimeSlot.date);
        const timeString = bookingFlow.selectedTimeSlot.time?.time || '10:00 AM';
        const [time, period] = timeString.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        appointmentDate.setHours(hour, parseInt(minutes), 0, 0);
        const startTime = new Date(appointmentDate);
        const endTime = new Date(appointmentDate.getTime() + service.duration * 60 * 1000);
        
        const serviceData = {
          service: service._id,        // backend expects 'service'
          employee: professional.id === 'any' ? 'any' : (professional._id || professional.id),
          price: service.price,        // Add required price field
          duration: service.duration,  // Add required duration field
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes: ''
        };
        
        console.log('DEBUG: Prepared service data:', serviceData);
        return serviceData;
      });
      
      const bookingData = {
        services,
        appointmentDate: new Date(bookingFlow.selectedTimeSlot.date).toISOString(),
        notes: '',
        selectionMode: bookingFlow.selectionMode || 'perService'
      };
      
      console.log('DEBUG: Final booking data being sent to API:');
      console.log('- Services count:', services.length);
      console.log('- First service structure:', services[0]);
      console.log('- No client data sent - backend will use authenticated user');
      console.log('- Full booking data:', JSON.stringify(bookingData, null, 2));
      
      console.log('Sending booking data to API:', bookingData);
      
      // Use the API service instead of direct fetch
      const result = await bookingsAPI.createBooking(bookingData);
      
      console.log('Booking created successfully:', result);
      console.log('Booking client ID:', result.data.booking.client);
      console.log('Booking number:', result.data.booking.bookingNumber);
      
      // Update the booking data with the database ID
      finalBookingData.bookingId = result.data.booking._id;
      finalBookingData.bookingNumber = result.data.booking.bookingNumber;
      
      // Save the updated booking data to localStorage
      localStorage.setItem('currentBooking', JSON.stringify(finalBookingData));
      
      return result.data.booking;
      
    } catch (error) {
      console.error('Error creating booking in database:', error);
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
      console.log('Testing backend connectivity...');
      
      const data = await paymentsAPI.getAvailableGateways();

      console.log('Backend is running! Available gateways:', data.data.gateways);
      setAvailableGateways(data.data.gateways);

  // Force gateway to stripe (only supported)
  setSelectedGateway('stripe');
    } catch (error) {
      console.error('Error fetching gateways (backend might not be running):', error);
    }
  };

  const handlePayment = async () => {
    console.log('DEBUG: handlePayment function called');
    console.log('DEBUG: Current state:', {
      loading,
      selectedGateway,
      finalBookingData
    });

    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const methodForApi = selectedMethod === 'card' ? 'card' : (selectedMethod === 'upi' ? 'digital_wallet' : selectedMethod);

      if (selectedMethod === 'upi') {
        if (!upiVpa) { setError('Please enter your UPI ID'); setLoading(false); return; }
        const valid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiVpa);
        if (!valid) { setError('Invalid UPI ID format'); setLoading(false); return; }
      }

      const gatewayForApi = 'stripe'; // Force stripe gateway
      console.log('DEBUG: Making payment API request with data:', {
        bookingId: finalBookingData.bookingId,
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: methodForApi,
        gateway: gatewayForApi
      });

      // Ensure booking is created in database first
      let bookingId = finalBookingData.bookingId;
      
      // If this is still a temporary booking ID, create the booking first
      if (bookingId.startsWith('BK')) {
        console.log('Creating booking in database before payment (bypass payment) ...');
        try {
          const booking = await createBookingInDatabase();
          bookingId = booking.bookingNumber || booking._id || booking.bookingNumber;
          console.log('Booking created successfully (no payment):', bookingId);
          // Navigate to dashboard or booking confirmation after successful creation
          // Keep existing flow intact by returning early to skip payment creation.
          navigate('/dashboard');
          return;
        } catch (err) {
          console.error('Failed to create booking before payment bypass:', err);
          setError('Failed to create booking. Please try again.');
          setLoading(false);
          return;
        }
      }

      console.log('Creating payment with booking ID:', bookingId);
      console.log('Payment request data:', {
        bookingId: bookingId,
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: methodForApi,
        gateway: gatewayForApi,
        userInfo: {
          id: user._id,
          email: user.email
        }
      });

      console.log('DEBUG: About to make payment API call to /api/v1/payments/create');
      console.log('DEBUG: Using bookingNumber:', bookingId);
      console.log('DEBUG: User token available:', !!token);

      // Cash flow: no Stripe needed, go to process page with cash instructions
      if (selectedMethod === 'cash') {
        console.log('Selected method is CASH. Skipping Stripe and showing cash instructions.');
        navigate('/payment/process', {
          state: {
            paymentData: { isCash: true },
            bookingData: finalBookingData,
            selectedGateway,
            selectedMethod
          }
        });
        return;
      }

      // Create payment intent via backend
      const data = await paymentsAPI.createPayment({
        bookingId: bookingId,
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: methodForApi,
        gateway: gatewayForApi,
        ...(selectedMethod === 'upi' && { upiVpa })
      });
      
      console.log('DEBUG: Payment API response:', { data });
      console.log('Payment created successfully:', data);

      // If using Stripe and we get a clientSecret, redirect to payment processing
      const hasSecretOrUrl = !!(data.data?.clientSecret || data.data?.paymentUrl);
      if (hasSecretOrUrl) {
        navigate('/payment/process', { 
          state: { 
            paymentData: data.data,
            bookingData: finalBookingData,
            selectedGateway,
            selectedMethod
          } 
        });
      } else {
        // Fallback
        navigate('/payment/stripe', { 
          state: { 
            bookingData: finalBookingData,
            selectedGateway: 'stripe',
            selectedMethod
          } 
        });
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message);
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
    <div className="payment-container">
      <div className="payment-card" style={{ maxWidth: 720, margin: '18px auto', padding: 20 }}>
        <h2 style={{ margin: 0 }}>Payment</h2>
        <p style={{ marginTop: 6, color: '#666' }}>Choose a payment method</p>

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className={`gateway-button ${selectedMethod === 'card' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('card')}
          >
            Debit / Credit card
          </button>
          <button
            type="button"
            className={`gateway-button ${selectedMethod === 'upi' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('upi')}
          >
            UPI
          </button>
          <button
            type="button"
            className={`gateway-button ${selectedMethod === 'cash' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('cash')}
          >
            Cash
          </button>
        </div>

        {selectedMethod === 'upi' && (
          <div style={{ marginTop: 10 }}>
            <input
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              placeholder="name@bank"
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e6e6e6' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={handleBackToBooking} className="btn-back" disabled={loading}>Back</button>
          <button onClick={handlePayment} className="btn-confirm" disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? 'Processing…' : (selectedMethod === 'upi' ? 'Pay via UPI' : 'Confirm & Pay')}
          </button>
        </div>

        {error && <div style={{ marginTop: 12, color: '#b00020' }}>{error}</div>}
      </div>
    </div>
  );
};

export default Payment;