import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { bookingFlow, apiUtils } from '../services/api';
import '../Layout.css';
import { HeaderTitleProvider, useHeaderTitle } from '../Service/HeaderTitleContext';
import { useAuth } from '../Service/Context';
import alloraLogo from '../assets/alloraLogo.jpg';
import Swal from 'sweetalert2';

// ProfileIcon component - No changes
const ProfileIcon = () => (
  <svg className="profile-avatar" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#e0e0e0" />
    <ellipse cx="20" cy="16" rx="7" ry="7" fill="#bdbdbd" />
    <ellipse cx="20" cy="30" rx="12" ry="7" fill="#bdbdbd" />
  </svg>
);

// GlobalHeader component - No changes
const GlobalHeader = () => {
  const { headerTitle } = useHeaderTitle();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [summaryKey, setSummaryKey] = useState(0);

  const steps = [
    { number: 1, label: 'Service', path: '/' },
    { number: 2, label: 'Professional', path: '/professionals' },
    { number: 3, label: 'Time', path: '/time' },
    { number: 4, label: 'Payment', path: '/payment' }
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const stepIndex = steps.findIndex(step => step.path === currentPath);
    setCurrentStep(stepIndex >= 0 ? stepIndex + 1 : 1);
  }, [location.pathname, steps]); 

  useEffect(() => {
    const loadBookingData = () => {
      bookingFlow.load();

      const currentFirstService = bookingFlow.selectedServices?.[0];
      if (currentFirstService) {
        setSelectedService(currentFirstService);
        const professionalForService = bookingFlow.selectedProfessionals?.[currentFirstService._id];
        if (professionalForService) {
          setSelectedProfessional(professionalForService);
        } else {
          const anyPro = {
            id: "any",
            name: "Any professional",
            subtitle: "for maximum availability",
            icon: "👥",
            isAvailable: true,
          };
          setSelectedProfessional(anyPro);
          bookingFlow.addProfessional(currentFirstService._id, anyPro);
          bookingFlow.save();
        }
      } else {
        setSelectedService(null);
        setSelectedProfessional(null);
      }

      setSummaryKey(k => k + 1);
    };
    
    loadBookingData();
    
    const handleStorageChange = () => {
      loadBookingData();
    };
    
    const handleBookingFlowChange = () => {
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
    bookingFlow.load();
    
    switch (currentStep) {
      case 1:
        if (bookingFlow.selectedServices?.length === 0) {
          Swal.fire({
            title: 'Service Required',
            text: 'Please select at least one service first.',
            icon: 'warning',
            confirmButtonText: 'OK',
            timer: 3000,
            showConfirmButton: true
          });
          return;
        }
        navigate('/professionals');
        break;
      case 2:
        const firstServiceId = bookingFlow.selectedServices?.[0]?._id;
        if (!firstServiceId || !bookingFlow.selectedProfessionals?.[firstServiceId]) {
          Swal.fire({
            title: 'Professional Required',
            text: 'Please select a professional for your service.',
            icon: 'warning',
            confirmButtonText: 'OK',
            timer: 3000,
            showConfirmButton: true
          });
          return;
        }
        navigate('/time');
        break;
      case 3:
        if (!bookingFlow.selectedTimeSlot) {
          Swal.fire({
            title: 'Time Slot Required',
            text: 'Please select an available time slot.',
            icon: 'warning',
            confirmButtonText: 'OK',
            timer: 3000,
            showConfirmButton: true
          });
          return;
        }
        navigate('/payment');
        break;
      case 4:
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
      case 1: 
        navigate('/');
        break;
      case 2: 
        navigate('/');
        break;
      case 3: 
        navigate('/professionals');
        break;
      case 4: 
        navigate('/time');
        break;
      default:
        break;
    }
  };

  const canContinue = () => {
    bookingFlow.load();
    switch (currentStep) {
      case 1:
        return bookingFlow.selectedServices?.length > 0;
      case 2:
        const firstServiceId = bookingFlow.selectedServices?.[0]?._id;
        return firstServiceId && bookingFlow.selectedProfessionals?.[firstServiceId];
      case 3:
        return !!bookingFlow.selectedTimeSlot;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    return steps[currentStep - 1]?.label || 'Booking';
  };

  return (
    <HeaderTitleProvider>
      <>
        <GlobalHeader />
        <div className="layout-with-booking">
          <div className="main-content">
            <div className="page-header" />
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                if (child.type && child.type.name === 'Time') {
                    return React.cloneElement(child, {
                        selectedService: selectedService,
                        selectedProfessional: selectedProfessional,
                    });
                }
                if (child.type && child.type.name === 'SelectProfessional') {
                    return React.cloneElement(child, {
                         selectedDate: bookingFlow.load().selectedDate ? new Date(bookingFlow.load().selectedDate) : new Date(),
                         selectedServices: bookingFlow.selectedServices || [],
                    });
                }
              }
              return child;
            })}
          </div>
          <div className="booking-sidebar">
            <div className="booking-summary" key={summaryKey}>
              <h3>Booking Summary</h3>
              {bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0 ? (
                <div className="selected-services-scroll">
                  <div className="selected-services">
                    {bookingFlow.selectedServices.map((service) => (
                      <div key={service._id} className="selected-service">
                        <div className="service-header">
                          <h4>{service.name}</h4>
                          <button 
                            className="remove-service-btn"
                            onClick={() => {
                              bookingFlow.removeService(service._id);
                              window.dispatchEvent(new CustomEvent('bookingFlowChange'));
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
                          {bookingFlow.selectedProfessionals && bookingFlow.selectedProfessionals[service._id] && (
                            <div className="detail-item">
                              <span className="label">Professional:</span>
                              <span className="value">
                                {bookingFlow.selectedProfessionals[service._id].name}
                                {bookingFlow.selectedProfessionals[service._id].id !== 'any' &&
                                  (bookingFlow.selectedProfessionals[service._id].subtitle || bookingFlow.selectedProfessionals[service._id].position) && (
                                    <span> {bookingFlow.selectedProfessionals[service._id].user.firstName+" "+bookingFlow.selectedProfessionals[service._id].user.lastName}</span>
                                  )}
                              </span>
                            </div>
                          )}
                          {bookingFlow.selectedDate && bookingFlow.selectedTimeSlot && (
                            <div className="detail-item">
                              <span className="label">Date & Time:</span>
                              <span className="value">
                                {new Date(bookingFlow.selectedDate).toLocaleDateString()} at {bookingFlow.selectedTimeSlot}
                              </span>
                            </div>
                          )}
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
                    {currentStep === steps.length ? 'Complete Booking' : 'Continue'}
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