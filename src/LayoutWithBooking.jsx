import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { bookingFlow, apiUtils } from './services/api';
import { IoMdTime } from "react-icons/io";

import { CiCalendar } from "react-icons/ci";
import './Layout.css'; // Assuming this CSS file exists
import { HeaderTitleProvider, useHeaderTitle } from './Service/HeaderTitleContext'; // Assuming this context exists
import { useAuth } from './Service/Context'; // Assuming this context exists
import alloraLogo from './assets/alloraLogo.jpg'; // Assuming logo asset exists
import Swal from 'sweetalert2'; // Assuming SweetAlert2 is installed

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
  const [selectedService, setSelectedService] = useState(null); // Managed here
  const [selectedProfessional, setSelectedProfessional] = useState(null); // Managed here
  const [summaryKey, setSummaryKey] = useState(0); // To force re-render of summary

  // Define the booking flow steps (added Confirm as step 5)
  const steps = [
    { number: 1, label: 'Service', path: '/' },
    { number: 2, label: 'Professional', path: '/professionals' },
    { number: 3, label: 'Time', path: '/time' },
    { number: 4, label: 'Payment', path: '/payment' },
    { number: 5, label: 'Confirm', path: '/payment/confirm' }
  ];
  
  // Determine current step based on location (handle /payment and /payment/confirm)
  useEffect(() => {
    const currentPath = location.pathname;
    let stepIndex = steps.findIndex(step => step.path === currentPath);
    if (stepIndex === -1) {
      if (currentPath.startsWith('/payment/confirm')) {
        stepIndex = steps.findIndex(s => s.path === '/payment/confirm');
      } else if (currentPath.startsWith('/payment')) {
        stepIndex = steps.findIndex(s => s.path === '/payment');
      }
    }
    setCurrentStep(stepIndex >= 0 ? stepIndex + 1 : 1);
  }, [location.pathname, steps]); // Add steps to dependency array for completeness

  // Load selected booking data from booking flow and update local states
  useEffect(() => {
    const loadBookingData = () => {
      console.log('Loading booking data...');
      bookingFlow.load(); // Load data into bookingFlow object
      console.log('Booking flow data:', bookingFlow);

      // Update selectedService state
      if (bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0) {
        setSelectedService(bookingFlow.selectedServices[0]);
      } else {
        setSelectedService(null);
      }

      // Update selectedProfessional state from bookingFlow for the *first* service
      if (bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0) {
        const firstServiceId = bookingFlow.selectedServices[0]._id;
        if (bookingFlow.selectedProfessionals && bookingFlow.selectedProfessionals[firstServiceId]) {
          setSelectedProfessional(bookingFlow.selectedProfessionals[firstServiceId]);
        } else {
          // If no specific professional is chosen for the current service, default to "Any professional"
          // This ensures `selectedProfessional` is never null if services are selected.
          setSelectedProfessional({
            id: "any",
            name: "Any professional",
            subtitle: "for maximum availability",
            icon: "👥",
            isAvailable: true,
          });
        }
      } else {
        setSelectedProfessional(null); // No service selected, so no professional context
      }

      // Force re-render of the booking summary to reflect latest changes
      setSummaryKey(k => k + 1);
    };
    
    // Initial load
    loadBookingData();
    
    // Event listeners for booking flow changes
    const handleStorageChange = () => {
      console.log('Storage changed, reloading booking data...');
      loadBookingData();
    };
    
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
    // Before navigating, check if canContinue logic allows
    if (!validateOrAlert()) return;

    switch (currentStep) {
      case 1: // Service selection
        navigate('/professionals');
        break;
      case 2: // Professional selection
        navigate('/time');
        break;
      case 3: // Time selection
        navigate('/payment');
        break;
      case 4: // Payment -> call handlePayment from Payment component
        // Find and call the Payment component's handlePayment method
        // We'll trigger payment processing here
        const event = new CustomEvent('confirmPayment');
        window.dispatchEvent(event);
        break;
      case 5: // Confirm -> proceed to payment processing or finalization
        navigate('/payment/process');
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 1: 
        navigate('/'); // Go to home if this is the first step
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
      case 5: // Confirm
        navigate('/payment');
        break;
      default:
        break;
    }
  };

  // Pure check without side effects to control disabled state
  const canProceed = () => {
    bookingFlow.load();
    switch (currentStep) {
      case 1:
        return !!(bookingFlow.selectedServices && bookingFlow.selectedServices.length);
      case 2: {
        if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) return false;
        const mode = bookingFlow.selectionMode || 'perService';
        if (mode === 'perService') {
          return bookingFlow.selectedServices.every(svc => bookingFlow.selectedProfessionals && bookingFlow.selectedProfessionals[svc._id]);
        }
        if (mode === 'anyAll' || mode === 'oneAll') {
          const firstServiceId = bookingFlow.selectedServices[0]?._id;
          return !!(firstServiceId && bookingFlow.selectedProfessionals && bookingFlow.selectedProfessionals[firstServiceId]);
        }
        return true;
      }
      case 3:
        return !!bookingFlow.selectedTimeSlot;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Validation with SweetAlerts only when user presses Continue
  const validateOrAlert = () => {
    bookingFlow.load();
    switch (currentStep) {
      case 1:
        if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
          Swal.fire({
            title: 'Service Required',
            text: 'Please select at least one service first.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return false;
        }
        return true;
      case 2: {
        if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
          Swal.fire({
            title: 'Service Required',
            text: 'Please select a service first.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return false;
        }
        const mode = bookingFlow.selectionMode || 'perService';
        if (mode === 'perService') {
          const allAssigned = bookingFlow.selectedServices.every(svc => bookingFlow.selectedProfessionals && bookingFlow.selectedProfessionals[svc._id]);
          if (!allAssigned) {
            Swal.fire({
              title: 'Assign Professionals',
              text: 'Please assign a professional (or Any) for each selected service.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            return false;
          }
          return true;
        }
        if (mode === 'anyAll' || mode === 'oneAll') {
          const firstServiceId = bookingFlow.selectedServices[0]?._id;
          if (!firstServiceId || !bookingFlow.selectedProfessionals || !bookingFlow.selectedProfessionals[firstServiceId]) {
            Swal.fire({
              title: 'Professional Required',
              text: 'Please choose a professional option.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            return false;
          }
          return true;
        }
        return true;
      }
      case 3:
        if (!bookingFlow.selectedTimeSlot) {
          Swal.fire({
            title: 'Time Slot Required',
            text: 'Please select an available time slot.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return false;
        }
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  // getStepTitle remains unchanged
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
            {/* This is where you render your main content components (Services, Professionals, Time, Payment)
              based on `location.pathname`. You should use React Router's <Routes> and <Route> here.
              For example:
              <Routes>
                  <Route path="/" element={<Services />} />
                  <Route path="/professionals" element={<ProfessionalsUpdated />} />
                  <Route path="/time" element={<Time selectedService={selectedService} selectedProfessional={selectedProfessional} />} />
                  <Route path="/payment" element={<Payment />} />
              </Routes>
              
              The `children` prop approach you have can work if you're passing a single child
              that changes with routing, but directly using <Routes> is more explicit and common.
              
              For the current `children` pattern, `React.cloneElement` is used to pass props.
              It's important that the components rendered as `children` are the actual components
              like <Time /> in your <App /> or parent routing setup.
            */}
            {/* Render routed child via Outlet. child components can call useOutletContext() to get selectedService/selectedProfessional */}
            <Outlet context={{ selectedService, selectedProfessional }} />
          </div>
          <div className="booking-sidebar">
            <div className="booking-summary" key={summaryKey}>
              <h3>Booking Summary</h3>
             
             {/* Date and Time section with icons - only show on payment route */}
             {bookingFlow.selectedTimeSlot && location.pathname === '/payment' && (
               <div className="booking-datetime">
                 <div className="datetime-item">
                   <span className="datetime-icon"><CiCalendar />
</span>
                   <span className="datetime-text">
                     {(() => {
                       // Handle both date string (YYYY-MM-DD) and Date object
                       const dateStr = bookingFlow.selectedTimeSlot.date;
                       const date = typeof dateStr === 'string' ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr);
                       const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                       const day = date.getDate();
                       const month = date.toLocaleDateString('en-US', { month: 'long' });
                       return `${dayName}, ${day} ${month}`;
                     })()}
                   </span>
                 </div>
                 
                 <div className="datetime-item">
                   <span className="datetime-icon"><IoMdTime />
  </span>
                   <span className="datetime-text">
                     {(() => {
                       const startTime = bookingFlow.selectedTimeSlot.time?.time || '2:30 PM';
                       const totalDuration = bookingFlow.getTotalDuration(); // in minutes
                       const startDate = new Date(`2000-01-01 ${startTime}`);
                       const endDate = new Date(startDate.getTime() + totalDuration * 60000);
                       const endTime = endDate.toLocaleTimeString('en-US', { 
                         hour: 'numeric', 
                         minute: '2-digit', 
                         hour12: true 
                       });
                       const duration = totalDuration >= 60 
                         ? `${Math.floor(totalDuration/60)} hr ${totalDuration%60 ? totalDuration%60 + ' min' : ''}`.trim()
                         : `${totalDuration} min`;
                       return `${startTime} - ${endTime} (${duration}s duration)`;
                     })()}
                   </span>
                 </div>
               </div>
             )}

              {bookingFlow.selectedServices && bookingFlow.selectedServices.length > 0 ? (
                <div className="selected-services-scroll">
                  <div className="selected-services">
                    {bookingFlow.selectedServices.map(service => {
                      const prof = bookingFlow.selectedProfessionals?.[service._id];
                      let profName;
                      if (prof && prof.id !== 'any') {
                        profName = ( `${prof.user?.firstName || ''} ${prof.user?.lastName || ''}`.trim() || prof.name);
                      } else {
                        profName = 'any professional';
                      }
                      const durationMins = service.duration || 0;
                      const displayDuration = durationMins >= 60 
                        ? `${Math.round(durationMins/60 * 10)/10} hr` 
                        : `${durationMins} min`;
                      return (
                        <div key={service._id} className="selected-service simple">
                          <div className="service-row-top">
                            <h4>{service.name}</h4>
                            <div className="service-price">AED {service.price}</div>
                            {/* Removed close button as requested */}
                          </div>
                          <div className="service-row-sub">
                            {displayDuration} with <span style={{ color: '#1976d2', fontWeight: 600 }}>{profName}</span>
                          </div>
                        </div>
                      );
                    })}
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
                    <span className="value">AED {apiUtils.formatPrice(bookingFlow.getTotalPrice())}</span>
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
                  {/* Show only Back and Confirm buttons on payment route */}
                  {location.pathname === '/payment' ? (
                    <>
                      <button 
                        className="btn-back" 
                        onClick={handleBack}
                      >
                        Back
                      </button>
                      <button 
                        className="btn-continue"
                        onClick={handleContinue}
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn-back" 
                        onClick={handleBack}
                        disabled={currentStep === 1}
                      >
                        Back
                      </button>
                      <button 
                        className={`btn-continue ${!canProceed() ? 'disabled' : ''}`}
                        onClick={handleContinue}
                        disabled={false}
                      >
                        {currentStep === steps.length ? 'Complete Booking' : 'Continue'}
                      </button>
                    </>
                  )}
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