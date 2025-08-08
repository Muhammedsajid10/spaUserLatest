import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { bookingFlow, bookingsAPI, paymentsAPI, apiUtils } from '../services/api';
import './Payment.css';
import { useAuth } from '../Service/Context';
import Swal from 'sweetalert2';
import { FaTimes } from 'react-icons/fa';

const Payment = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableGateways, setAvailableGateways] = useState([
        { 
            name: 'card', 
            displayName: 'Credit / Debit Card', 
            description: 'Visa, Mastercard, etc.', 
            icon: 'https://www.svgrepo.com/show/532386/credit-card-up-simple.svg'
        },
        { 
            name: 'upi', 
            displayName: 'UPI', 
            description: 'Pay via UPI apps', 
            icon: 'https://www.svgrepo.com/show/360877/upi.svg'
        },
        { 
            name: 'cash', 
            displayName: 'Cash on Service', 
            description: 'Pay directly at the spa', 
            icon: 'https://www.svgrepo.com/show/435160/money-cash.svg'
        }
    ]);
    const [selectedGateway, setSelectedGateway] = useState('card');
    const [finalBookingData, setFinalBookingData] = useState({});

    useEffect(() => {
        const createBookingData = () => {
            bookingFlow.load();
            
            if (bookingFlow.selectedServices?.length > 0 && 
                bookingFlow.selectedProfessionals && Object.keys(bookingFlow.selectedProfessionals).length > 0 && 
                bookingFlow.selectedTimeSlot) {
              
                const totalPrice = bookingFlow.getTotalPrice();
                const totalDuration = bookingFlow.getTotalDuration();
                const serviceNames = bookingFlow.selectedServices.map(s => s.name).join(', ');
                
                const firstServiceId = Object.keys(bookingFlow.selectedProfessionals)[0];
                const selectedProfessional = bookingFlow.selectedProfessionals[firstServiceId];
                
                return {
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
                    totalAmount: Math.round(totalPrice * 1.05)
                };
            }
            return JSON.parse(localStorage.getItem('bookingData') || '{}');
        };
        
        const data = createBookingData();
        setFinalBookingData(data);

        const handleBookingFlowChange = () => {
            const updatedData = createBookingData();
            setFinalBookingData(updatedData);
        };
        window.addEventListener('bookingFlowChange', handleBookingFlowChange);
        return () => window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    }, []);

    const createBookingInDatabase = async () => { /* ... (unchanged) ... */ };

    useEffect(() => {
        if (!user || !token) {
            navigate('/login', { state: { from: { pathname: '/payment' } } });
            return;
        }

        if (!finalBookingData.bookingId) {
            navigate('/booking');
            return;
        }
        
        const initializePayment = async () => {
            try {
                if (finalBookingData.bookingId.startsWith('BK')) {
                    await createBookingInDatabase();
                }
                fetchAvailableGateways();
            } catch (error) {
                console.error('Error initializing payment:', error);
                setError('Failed to create booking. Please try again.');
            }
        };
        
        initializePayment();
    }, [user, token, navigate, finalBookingData.bookingId]);

    const fetchAvailableGateways = async () => {
        try {
            const data = await paymentsAPI.getAvailableGateways();
            setAvailableGateways(data.data.gateways);
        } catch (error) {
            console.error('Error fetching gateways (backend might not be running):', error);
        }
    };

    const handlePayment = async () => {
        if (!selectedGateway) {
            setError('Please select a payment gateway');
            return;
        }
        if (!finalBookingData.totalAmount || finalBookingData.totalAmount <= 0) {
            setError('Booking amount is invalid.');
            return;
        }
        
        try {
            setLoading(true);
            setError('');
            
            let bookingId = finalBookingData.bookingId;
            if (bookingId.startsWith('BK')) {
                const booking = await createBookingInDatabase();
                bookingId = booking.bookingNumber;
            }
            
            if (!bookingId || !finalBookingData.totalAmount || !selectedGateway) {
                throw new Error('Required payment data is missing. Please try again from the start.');
            }

            const data = await paymentsAPI.createPayment({
                bookingId: bookingId,
                amount: finalBookingData.totalAmount,
                currency: 'AED',
                paymentMethod: selectedGateway,
                userInfo: {
                    id: user._id,
                    email: user.email
                }
            });
            
            if (data.data.clientSecret || data.data.paymentUrl) {
                navigate('/payment/process', { 
                    state: { 
                        paymentData: data.data,
                        bookingData: finalBookingData,
                        selectedGateway
                    } 
                });
            } else {
                navigate('/payment/stripe', { 
                    state: { 
                        bookingData: finalBookingData,
                        selectedGateway: 'stripe' 
                    } 
                });
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToBooking = () => { navigate('/booking'); };
    const handleViewBookings = () => { navigate('/dashboard'); };
    
    if (!finalBookingData.bookingId) {
        return (
            <div className="payment-container fallback-container">
                <div className="payment-card">
                    <div className="payment-header">
                        <h2>Payment Unavailable</h2>
                        <p>No valid booking data was found. Please start a new booking.</p>
                    </div>
                </div>
            </div>
        );
    }
    
    const hasServices = finalBookingData.services && finalBookingData.services.length > 0;

    return (
        <div className="payment-container">
            <div className="payment-card">
                <div className="payment-header">
                    <h2>Complete Your Payment</h2>
                    <p>Booking ID: <strong>{finalBookingData.bookingId}</strong></p>
                </div>
                
                <div className="booking-summary-details">
                    <h3>Booking Summary</h3>
                    <div className="summary-list">
                        {hasServices ? (
                            <div className="summary-services-scroll">
                                {finalBookingData.services.map((service) => (
                                    <div key={service._id} className="summary-service-item">
                                        <div className="service-info">
                                            <strong>{service.name}</strong>
                                            <p>{apiUtils.formatDuration(service.duration)}</p>
                                        </div>
                                        <div className="service-actions">
                                            <span className="service-price">{apiUtils.formatPrice(service.price)}</span>
                                            <button 
                                                className="remove-service-btn"
                                                onClick={() => handleRemoveService(service._id)}
                                                title="Remove service"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-services-message">
                                <p>No services selected. Please go back and choose a service.</p>
                            </div>
                        )}
                        
                        <div className="summary-footer">
                            <div className="summary-item">
                                <span>Subtotal:</span>
                                <strong>AED {finalBookingData.servicePrice}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Tax (5%):</span>
                                <strong>AED {(finalBookingData.servicePrice * 0.05).toFixed(2)}</strong>
                            </div>
                            <div className="summary-item total-row">
                                <span>Total Amount:</span>
                                <strong>AED {finalBookingData.totalAmount}</strong>
                            </div>
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
                                disabled={loading || !hasServices}
                            >
                                <img src={gateway.icon} alt={gateway.displayName} className="gateway-icon-svg" />
                                <h4>{gateway.displayName}</h4>
                                <p>{gateway.description}</p>
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
                        <strong>AED {finalBookingData.totalAmount}</strong>
                    </div>
                    <button
                        onClick={handlePayment}
                        className="pay-button"
                        disabled={loading || !selectedGateway || !hasServices}
                    >
                        {loading ? 'Processing...' : 'Pay Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Payment;