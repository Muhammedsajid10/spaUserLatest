import React, { useState, useEffect, useRef } from 'react';
import Services from './Services';
import TimeWithAPI from './TimeWithAPI';
import { bookingsAPI, bookingFlow } from '../services/api';
import { useHeaderTitle } from '../Service/HeaderTitleContext';
// import './BookingFlow.css';

const BookingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTimeData, setSelectedTimeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const { setHeaderTitle } = useHeaderTitle();
  const headingRef = useRef();

  // Load saved booking flow state
  useEffect(() => {
    bookingFlow.load();
    if (bookingFlow.selectedService) {
      setSelectedService(bookingFlow.selectedService);
    }
    if (bookingFlow.selectedTimeSlot) {
      setSelectedTimeData(bookingFlow.selectedTimeSlot);
    }
  }, []);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setHeaderTitle('Booking');
        } else {
          setHeaderTitle('');
        }
      },
      { threshold: 0 }
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, [setHeaderTitle]);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    bookingFlow.selectedService = service;
    bookingFlow.save();
    setCurrentStep(2);
  };

  const handleTimeSelect = (timeData) => {
    setSelectedTimeData(timeData);
    bookingFlow.selectedTimeSlot = timeData;
    bookingFlow.save();
    setCurrentStep(3);
  };

  const handleBookingConfirmation = async () => {
    if (!selectedService || !selectedTimeData) {
      setError('Please complete all selections before confirming');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const confirmationData = {
        serviceId: selectedService._id,
        employeeId: selectedTimeData.professional.id,
        appointmentDate: selectedTimeData.date.toISOString().split('T')[0],
        startTime: selectedTimeData.time.startTime,
        clientNotes: '',
        specialRequests: ''
      };

      const response = await bookingsAPI.createBookingConfirmation(confirmationData);
      
      if (response.success) {
        setBookingConfirmation(response.data.bookingConfirmation);
        bookingFlow.bookingConfirmation = response.data.bookingConfirmation;
        bookingFlow.save();
        setCurrentStep(4);
      }
    } catch (err) {
      console.error('Error creating booking confirmation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!bookingConfirmation) {
      setError('No booking confirmation found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        confirmationToken: bookingConfirmation.confirmationToken,
        paymentMethod: 'card', // Default payment method
        clientNotes: '',
        specialRequests: ''
      };

      const response = await bookingsAPI.completeBooking(bookingData);
      
      if (response.success) {
        // Reset booking flow
        bookingFlow.reset();
        setCurrentStep(5); // Success step
      }
    } catch (err) {
      console.error('Error completing booking:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    bookingFlow.reset();
    setSelectedService(null);
    setSelectedTimeData(null);
    setBookingConfirmation(null);
    setCurrentStep(1);
    setError(null);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="booking-step">
            <h2 ref={headingRef}>Step 1: Select Service</h2>
            <Services onServiceSelect={handleServiceSelect} />
          </div>
        );

      case 2:
        return (
          <div className="booking-step">
            <h2 ref={headingRef}>Step 2: Select Professional & Time</h2>
            <div className="selected-service-info">
              <h3>Selected Service: {selectedService?.name}</h3>
              <p>Duration: {selectedService?.duration} minutes</p>
              <p>Price: ${selectedService?.price}</p>
            </div>
            <TimeWithAPI 
              selectedService={selectedService}
              onTimeSelect={handleTimeSelect}
            />
          </div>
        );

      case 3:
        return (
          <div className="booking-step">
            <h2 ref={headingRef}>Step 3: Review & Confirm</h2>
            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-item">
                <strong>Service:</strong> {selectedService?.name}
              </div>
              <div className="summary-item">
                <strong>Professional:</strong> {selectedTimeData?.professional?.name}
              </div>
              <div className="summary-item">
                <strong>Date:</strong> {selectedTimeData?.date?.toLocaleDateString()}
              </div>
              <div className="summary-item">
                <strong>Time:</strong> {selectedTimeData?.time?.time}
              </div>
              <div className="summary-item">
                <strong>Duration:</strong> {selectedService?.duration} minutes
              </div>
              <div className="summary-item total">
                <strong>Total:</strong> ${selectedService?.price}
              </div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="booking-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setCurrentStep(2)}
              >
                Back
              </button>
              <button 
                className="btn-primary" 
                onClick={handleBookingConfirmation}
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="booking-step">
            <h2 ref={headingRef}>Step 4: Complete Booking</h2>
            <div className="confirmation-info">
              <h3>Booking Confirmed!</h3>
              <p>Your booking has been confirmed. Please login or signup to complete your booking.</p>
              
              <div className="confirmation-details">
                <div className="detail-item">
                  <strong>Confirmation Token:</strong> {bookingConfirmation?.confirmationToken}
                </div>
                <div className="detail-item">
                  <strong>Service:</strong> {bookingConfirmation?.service?.name}
                </div>
                <div className="detail-item">
                  <strong>Professional:</strong> {bookingConfirmation?.employee?.employeeId}
                </div>
                <div className="detail-item">
                  <strong>Date:</strong> {new Date(bookingConfirmation?.appointmentDate).toLocaleDateString()}
                </div>
                <div className="detail-item">
                  <strong>Time:</strong> {new Date(bookingConfirmation?.startTime).toLocaleTimeString()}
                </div>
                <div className="detail-item">
                  <strong>Total Amount:</strong> ${bookingConfirmation?.totalAmount}
                </div>
              </div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="booking-actions">
              <button 
                className="btn-secondary" 
                onClick={resetBooking}
              >
                Start New Booking
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCompleteBooking}
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Booking'}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="booking-step">
            <h2 ref={headingRef}>Booking Successful!</h2>
            <div className="success-message">
              <div className="success-icon">✅</div>
              <h3>Your booking has been completed successfully!</h3>
              <p>You will receive a confirmation email shortly.</p>
              <p>Thank you for choosing our spa services!</p>
            </div>
            
            <div className="booking-actions">
              <button 
                className="btn-primary" 
                onClick={resetBooking}
              >
                Book Another Service
              </button>
            </div>
          </div>
        );

      default:
        return <div>Invalid step</div>;
    }
  };

  return (
    <div className="booking-flow-container">
      <div className="booking-header">
        <h1>Spa Booking</h1>
        <div className="step-indicator">
          {[1, 2, 3, 4, 5].map((step) => (
            <div 
              key={step}
              className={`step-dot ${currentStep >= step ? 'active' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="booking-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default BookingFlow; 