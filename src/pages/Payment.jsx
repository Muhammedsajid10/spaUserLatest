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
      
      // Get the first professional (since we're using the same professional for all services)
      const firstServiceId = Object.keys(bookingFlow.selectedProfessionals)[0];
      const selectedProfessional = bookingFlow.selectedProfessionals[firstServiceId];
      
      const bookingData = {
        bookingId: 'BK' + Date.now(),
        serviceNames,
        services: bookingFlow.selectedServices,
        professionalName: selectedProfessional.user?.fullName || 
          `${selectedProfessional.user?.firstName} ${selectedProfessional.user?.lastName}` || 
          selectedProfessional.name,
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
          service: service._id,        // Correct field name
          employee: professional._id || professional.id,  // Correct field name
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
        notes: ''
        // Don't send client data - let the backend use the authenticated user
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

    if (!selectedGateway) {
      setError('Please select a payment gateway');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('DEBUG: Making payment API request with data:', {
        bookingId: finalBookingData.bookingId,
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: 'card',
        gateway: selectedGateway
      });

      // Ensure booking is created in database first
      let bookingId = finalBookingData.bookingId;
      
      // If this is still a temporary booking ID, create the booking first
      if (bookingId.startsWith('BK')) {
        console.log('Creating booking in database before payment...');
        const booking = await createBookingInDatabase();
        bookingId = booking.bookingNumber; // Use bookingNumber for payment API
        console.log('Booking created, using bookingNumber:', bookingId);
      }

      console.log('Creating payment with booking ID:', bookingId);
      console.log('Payment request data:', {
        bookingId: bookingId,
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: 'card',
        gateway: selectedGateway,
        userInfo: {
          id: user._id,
          email: user.email
        }
      });

      console.log('DEBUG: About to make payment API call to /api/v1/payments/create');
      console.log('DEBUG: Using bookingNumber:', bookingId);
      console.log('DEBUG: User token available:', !!token);

      // Create payment intent via backend
      const data = await paymentsAPI.createPayment({
        bookingId: bookingId, // Use the actual booking number
        amount: finalBookingData.totalAmount,
        currency: 'AED',
        paymentMethod: 'card',
        gateway: selectedGateway
      });
      
      console.log('DEBUG: Payment API response:', {
        data: data
      });

      console.log('Payment created successfully:', data);

      // Enhanced debug logging for payment navigation decision
      console.log('DEBUG: Payment navigation logic:');
      console.log('- data.data:', data.data);
      console.log('- data.data.clientSecret exists:', !!data.data.clientSecret);
      console.log('- data.data.paymentUrl exists:', !!data.data.paymentUrl);
      console.log('- selectedGateway:', selectedGateway);

      // If using Stripe and we get a clientSecret, redirect to payment processing
      if (data.data.clientSecret || data.data.paymentUrl) {
        console.log('DEBUG: Navigating to /payment/process with data:', {
          paymentData: data.data,
          bookingData: finalBookingData,
          selectedGateway
        });
        
        // Don't clear booking flow here yet - wait for successful payment completion
        // The booking flow will be cleared in PaymentSuccess component
        
        // Navigate to payment processing page with payment data
        navigate('/payment/process', { 
          state: { 
            paymentData: data.data,
            bookingData: finalBookingData,
            selectedGateway 
          } 
        });
      } else {
        console.log('DEBUG: Navigating to /payment/stripe (fallback)');
        // Default to Stripe payment (renamed from network route for backward compatibility)
        navigate('/payment/stripe', { 
          state: { 
            bookingData: finalBookingData,
            selectedGateway: 'stripe' 
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

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <h2>Complete Your Payment</h2>
          <p>Secure payment powered by Stripe</p>
        </div>

        {/* Stripe Branding */}
        <div className="stripe-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
          </svg>
          <span>Stripe</span>
        </div>

        <div className="payment-details">
          <div className="detail-row" style={{'--delay': 1}}>
            <span>Booking ID:</span>
            <span>{finalBookingData.bookingId}</span>
          </div>
          
          {/* Display multiple services */}
          {finalBookingData.services && finalBookingData.services.length > 0 ? (
            <>
              <div className="detail-row" style={{'--delay': 2}}>
                <span>Services:</span>
                <span>{finalBookingData.serviceNames}</span>
              </div>
              
              {/* Individual service breakdown */}
              <div className="services-breakdown">
                <h4>Service Details:</h4>
                {finalBookingData.services.map((service, index) => (
                  <div key={service._id} className="service-item" style={{'--service-delay': index}}>
                    <div className="service-name">{service.name}</div>
                    <div className="service-price">AED {service.price}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="detail-row" style={{'--delay': 2}}>
              <span>Service:</span>
              <span>{finalBookingData.serviceName}</span>
            </div>
          )}
          
          <div className="detail-row" style={{'--delay': 3}}>
            <span>Professional:</span>
            <span>{finalBookingData.professionalName}</span>
          </div>
          <div className="detail-row" style={{'--delay': 4}}>
            <span>Date:</span>
            <span>{finalBookingData.date}</span>
          </div>
          <div className="detail-row" style={{'--delay': 5}}>
            <span>Time:</span>
            <span>{finalBookingData.time}</span>
          </div>
          <div className="detail-row" style={{'--delay': 6}}>
            <span>Duration:</span>
            <span>{finalBookingData.duration} minutes</span>
          </div>
          <div className="detail-row" style={{'--delay': 7}}>
            <span>Subtotal:</span>
            <span>AED {finalBookingData.servicePrice}</span>
          </div>
          <div className="detail-row" style={{'--delay': 8}}>
            <span>Tax (5%):</span>
            <span>AED {(finalBookingData.servicePrice * 0.05).toFixed(2)}</span>
          </div>
          <div className="detail-row" style={{ borderTop: '2px solid #667eea', paddingTop: '15px', marginTop: '10px', '--delay': 9 }}>
            <span style={{ fontWeight: '700', fontSize: '18px' }}>Total Amount:</span>
            <span style={{ fontWeight: '700', fontSize: '18px', color: '#667eea' }}>
              AED {finalBookingData.totalAmount}
            </span>
          </div>
        </div>

        {/* Payment Gateway Selection */}
        <div className="gateway-selection">
          <h3>Payment Method</h3>
          <div className="gateway-options">
            {availableGateways.map((gateway) => (
              <div 
                key={gateway.name}
                className={`gateway-option ${selectedGateway === gateway.name ? 'selected' : ''}`}
                onClick={() => setSelectedGateway(gateway.name)}
              >
                <div className="gateway-info">
                  <h4>{gateway.displayName}</h4>
                  <p>{gateway.description}</p>
                  <div className="gateway-features">
                    <span>💳 {gateway.supportedMethods.join(', ')}</span>
                    <span>🌍 {gateway.region}</span>
                  </div>
                </div>
                <div className="gateway-radio">
                  <input 
                    type="radio" 
                    name="gateway" 
                    value={gateway.name}
                    checked={selectedGateway === gateway.name}
                    onChange={() => setSelectedGateway(gateway.name)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Actions */}
        <div className="payment-actions">
          <button 
            onClick={handlePayment} 
            className="btn-primary"
            disabled={loading || !selectedGateway}
          >
            {loading ? 'Processing...' : `Pay AED ${finalBookingData.totalAmount}`}
          </button>
          
          <button 
            onClick={handleBackToBooking} 
            className="btn-secondary"
          >
            Back to Booking
          </button>
          
          <button 
            onClick={handleViewBookings} 
            className="btn-outline"
          >
            View My Bookings
          </button>
        </div>

        {/* Payment Security Info */}
        <div className="payment-info">
          <h3>🔒 Secure Payment</h3>
          <ul>
            <li style={{'--li-delay': 0}}>SSL encrypted connection</li>
            <li style={{'--li-delay': 1}}>PCI DSS compliant</li>
            <li style={{'--li-delay': 2}}>Multiple payment methods</li>
            <li style={{'--li-delay': 3}}>UAE & Middle East coverage</li>
            <li style={{'--li-delay': 4}}>24/7 customer support</li>
          </ul>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;