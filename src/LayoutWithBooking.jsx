import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { bookingFlow, apiUtils } from './services/api';
import './Layout.css';
import { HeaderTitleProvider, useHeaderTitle } from './Service/HeaderTitleContext';
import { useAuth } from './Service/Context';
import alloraLogo from './assets/allora-logo-header.svg';
import Swal from 'sweetalert2';

const ProfileIcon = () => (
  <svg className="profile-avatar" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#e0e0e0" />
    <ellipse cx="20" cy="16" rx="7" ry="7" fill="#bdbdbd" />
    <ellipse cx="20" cy="30" rx="12" ry="7" fill="#bdbdbd" />
  </svg>
);

const GlobalHeader = () => {
  const { headerTitle } = useHeaderTitle();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('.user-profile-dropdown')) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className="global-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/" className="logo-link" style={{ textDecoration: 'none' }}>
          <img 
            src={alloraLogo} 
            alt="Allora Spa" 
            className="header-logo"
            style={{ 
              height: '36px', 
              width: 'auto',
              maxWidth: '140px',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          />
        </Link>
        {headerTitle && <span className="header-title">{headerTitle}</span>}
      </div>
      {isAuthenticated && user && (
        <div className={`user-profile-dropdown${dropdownOpen ? ' open' : ''}`}>
          <div
            className="profile-trigger"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            <span>{user.firstName}</span>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                className="profile-avatar"
              />
            ) : (
              <ProfileIcon />
            )}
          </div>
          <div className="dropdown-content">
            {/* <Link to="/profile" onClick={() => setDropdownOpen(false)}>Profile</Link>
            <Link to="/orders" onClick={() => setDropdownOpen(false)}>Orders</Link> */}
            <Link to="/client-profile" onClick={() => setDropdownOpen(false)}>Profile</Link>
            
            <button onClick={() => { logout(); setDropdownOpen(false); }}>Logout</button>
          </div>
        </div>
      )}
    </div>
  );
};

const LayoutWithBooking = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [summaryKey, setSummaryKey] = useState(0);

  // Define the booking flow steps
  const steps = [
    { number: 1, label: 'Service', path: '/' },
    { number: 2, label: 'Professional', path: '/professionals' },
    { number: 3, label: 'Time', path: '/time' },
    { number: 4, label: 'Payment', path: '/payment' }
  ];

  // Determine current step based on location
  useEffect(() => {
    const currentPath = location.pathname;
    const stepIndex = steps.findIndex(step => step.path === currentPath);
    setCurrentStep(stepIndex >= 0 ? stepIndex + 1 : 1);
  }, [location.pathname]);

  // Load selected service from booking flow
  useEffect(() => {
    const loadBookingData = () => {
      console.log('Loading booking data...');
      bookingFlow.load(); // Load data into bookingFlow object
      console.log('Booking flow data:', bookingFlow);
      if (bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0) {
        console.log('Setting selected services:', bookingFlow.selectedServices);
        setSelectedService(bookingFlow.selectedServices[0]); // Keep for backward compatibility
      } else {
        console.log('No services in booking flow, clearing selected service');
        setSelectedService(null);
      }
      // Force re-render of the booking summary
      setSummaryKey(k => k + 1);
    };
    
    loadBookingData();
    
    // Listen for changes in booking flow
    const handleStorageChange = () => {
      console.log('Storage changed, reloading booking data...');
      loadBookingData();
    };
    
    // Listen for custom booking flow changes
    const handleBookingFlowChange = () => {
      console.log('Booking flow change event received, reloading data...');
      loadBookingData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bookingFlowChange', handleBookingFlowChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    };
  }, []);

  const handleContinue = () => {
    switch (currentStep) {
      case 1: // Service selection
        if (bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0) {
          navigate('/professionals');
        } else {
          Swal.fire({
            title: 'Service Required',
            text: 'Please select at least one service first',
            icon: 'warning',
            confirmButtonText: 'OK',
            timer: 3000,
            showConfirmButton: true
          });
        }
        break;
      case 2: // Professional selection
        navigate('/time');
        break;
      case 3: // Time selection
        navigate('/payment');
        break;
      case 4: // Payment
        // Handle payment completion
        Swal.fire({
          title: 'Payment Step',
          text: 'Payment step - implement payment logic',
          icon: 'info',
          confirmButtonText: 'OK',
          timer: 3000,
          showConfirmButton: true
        });
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 1: // Service selection
        // Go back to main page or previous section
        break;
      case 2: // Professional selection
        navigate('/');
        break;
      case 3: // Time selection
        navigate('/professionals');
        break;
      case 4: // Payment
        navigate('/time');
        break;
      default:
        break;
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0;
      case 2:
        bookingFlow.load();
        // Check if all services have professionals selected
        if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
          return false;
        }
        // Check if we have professionals selected for all services
        return bookingFlow.selectedProfessionals && Object.keys(bookingFlow.selectedProfessionals).length > 0;
      case 3:
        bookingFlow.load();
        return bookingFlow.selectedTimeSlot !== null;
      case 4:
        return true; // Payment can always proceed
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Select Service';
      case 2:
        return 'Choose Professional';
      case 3:
        return 'Select Time';
      case 4:
        return 'Payment';
      default:
        return 'Booking';
    }
  };

  return (
    <HeaderTitleProvider>
      <>
        <GlobalHeader />
        <div className="layout-with-booking">
          <div className="main-content">
            <div className="page-header" />
            {children}
          </div>
          <div className="booking-sidebar">
            <div className="booking-summary" key={summaryKey}>
              <h3>Booking Summary</h3>
              {bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0 ? (
                <div className="selected-services-scroll">
                  <div className="selected-services">
                    {bookingFlow.selectedServices.map((service, index) => (
                      <div key={service._id} className="selected-service">
                        <div className="service-header">
                          <h4>{service.name}</h4>
                          <button 
                            className="remove-service-btn"
                            onClick={() => {
                              bookingFlow.removeService(service._id);
                              window.dispatchEvent(new CustomEvent('bookingFlowChange'));
                              setSummaryKey(k => k + 1); // Force re-render
                            }}
                            title="Remove service"
                          >
                            ×
                          </button>
                        </div>
                        <div className="service-details">
                          <div className="detail-item">
                            <span className="label">Duration:</span>
                            <span className="value">{apiUtils.formatDuration(service.duration)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Price:</span>
                            <span className="value">{apiUtils.formatPrice(service.price)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Category:</span>
                            <span className="value">
                              {typeof service.category === 'object' 
                                ? (service.category.displayName || service.category.name || 'N/A')
                                : service.category
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-services">
                  <p>No services selected yet.</p>
                  <p>Choose services to start your booking.</p>
                </div>
              )}
              <div className="sidebar-bottom-fixed">
                <div className="total-summary">
                  <div className="detail-item">
                    <span className="label">Total Duration:</span>
                    <span className="value">{apiUtils.formatDuration(bookingFlow.getTotalDuration())}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Price:</span>
                    <span className="value">{apiUtils.formatPrice(bookingFlow.getTotalPrice())}</span>
                  </div>
                </div>
                <div className="progress-steps">
                  {steps.map((step) => (
                    <div 
                      key={step.number} 
                      className={`step ${step.number === currentStep ? 'active' : ''}`}
                    >
                      <div className="step-number">{step.number}</div>
                      <div className="step-label">{step.label}</div>
                    </div>
                  ))}
                </div>
                <div className="action-buttons">
                  <button 
                    className="btn-back" 
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    Back
                  </button>
                  <button 
                    className={`btn-continue ${!canContinue() ? 'disabled' : ''}`}
                    onClick={handleContinue}
                    disabled={!canContinue()}
                  >
                    {currentStep === 4 ? 'Complete Booking' : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    </HeaderTitleProvider>
  );
};

export default LayoutWithBooking;