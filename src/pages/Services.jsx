import React, { useEffect, useState, useRef } from "react";
import "./Services.css";
import { servicesAPI, apiUtils, bookingFlow } from "../services/api";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { IoMdTime } from "react-icons/io";
import { CiCalendar } from "react-icons/ci";

// Custom hook to detect screen size
const useScreenSize = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1023);
  
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1023);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return { isDesktop };
};

function Services() {
  // State management
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  
  const [expandedStates, setExpandedStates] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedServicesCount, setSelectedServicesCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const headerRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);
  


  // Refs and hooks
  const sectionRefs = useRef({});
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  // Fetch services from API
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await servicesAPI.getAllServices();
   
      if (response.success) {
        const groupedServices = {};
        response.data.services.forEach((service) => {
          const categoryKey = typeof service.category === 'object' 
            ? (service.category.displayName || service.category.name || service.category._id)
            : service.category;
          
          if (!groupedServices[categoryKey]) {
            groupedServices[categoryKey] = [];
          }

          groupedServices[categoryKey].push({
            id: service._id,
            title: service.name,
            time: apiUtils.formatDuration(service.duration),
            desc: service.description,
            price: apiUtils.formatPrice(service.effectivePrice || service.price),
            originalPrice: service.price,
            discountPrice: service.discountPrice,
            category: categoryKey,
            isPopular: service.isPopular,
            ratings: service.ratings,
            _id: service._id,
            name: service.name,
            duration: service.duration,
            effectivePrice: service.effectivePrice || service.price,
          });
        });

        setServices(groupedServices);
        const categories = Object.keys(groupedServices);
        if (categories.length > 0) {
          setActiveSection(categories[0]);
        }
      } else {
        setError("Failed to fetch services");
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setError(err.message || "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    // Clear any existing booking flow when component mounts
    // bookingFlow.clear();
    
    // Reset local state
    setSelectedService(null);
    setSelectedOption(null);
    setSelectedServicesCount(0);
    
    // Fetch services
    fetchServices();
  }, []);

  // Intersection observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update active section if we're programmatically scrolling
        if (isScrolling) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute('data-key');
            if (key) setActiveSection(key);
          }
        });
      },
      {
        rootMargin: "-150px 0px -50% 0px",
        threshold: 0.1
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [services, isScrolling]);

  // Track selected services count
  useEffect(() => {
    const loadSelectedServicesCount = () => {
      bookingFlow.load();
      setSelectedServicesCount(bookingFlow.selectedServices.length);
    };
    
    loadSelectedServicesCount();
    
    const handleBookingFlowChange = () => {
      loadSelectedServicesCount();
    };
    
    window.addEventListener("bookingFlowChange", handleBookingFlowChange);
    return () => {
      window.removeEventListener("bookingFlowChange", handleBookingFlowChange);
    };
  }, []);

  // Navigation functions
const isManualScroll = useRef(false);

  const scrollToSection = (key) => {
    const element = sectionRefs.current[key];
    if (element) {
      // Set scrolling flag and immediately update active section
      setIsScrolling(true);
      setActiveSection(key);
      
      // Get the fixed header element to calculate its actual height
      const headerWrapper = document.querySelector('.svc-header-wrapper');
      const headerHeight = headerWrapper ? headerWrapper.offsetHeight : 150;
      
      // Add some extra padding to ensure the category title is clearly visible
      const extraPadding = 20;
      const totalOffset = headerHeight + extraPadding;
      
      // Calculate the target scroll position
      const elementPosition = element.offsetTop - totalOffset;
      
      // Debug logging
      console.log('Scrolling to:', key);
      console.log('Element:', element);
      console.log('Element offsetTop:', element.offsetTop);
      console.log('Header height:', headerHeight);
      console.log('Target position:', elementPosition);
      
      // Use scrollTo with smooth behavior and proper offset
      window.scrollTo({
        top: Math.max(0, elementPosition), // Ensure we don't scroll to negative position
        behavior: "smooth"
      });
      
      // Alternative method if the first one doesn't work
      element.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
      
      // Clear scrolling flag after animation completes
      setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    } else {
      console.log('Element not found for key:', key);
      console.log('Available refs:', Object.keys(sectionRefs.current));
    }
  };


  // Service interaction functions
  const toggleReadMore = (category, index) => {
    const key = `${category}-${index}`;
    setExpandedStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isExpanded = (category, index) => {
    const key = `${category}-${index}`;
    return expandedStates[key];
  };

  const handleServiceClick = (service) => {
    bookingFlow.load();
    const currentCount = bookingFlow.selectedServices.length;
    if (currentCount >= 15) {
      Swal.fire({
        title: 'Limit reached',
        text: 'You can only select up to 15 services.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setSelectedService(service);
    setShowModal(true);
    setSelectedOption(null);
  };

  const isServiceSelected = (serviceId) => {
    bookingFlow.load();
    return bookingFlow.selectedServices.some(svc => svc._id === serviceId);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedService(null);
    setSelectedOption(null);
  };

  const handleAddToBooking = () => {
    bookingFlow.load();
    const currentCount = bookingFlow.selectedServices.length;
    if (currentCount >= 15) {
      Swal.fire({
        title: 'Limit reached',
        text: 'You can only select up to 15 services.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      handleCloseModal();
      return;
    }

    if (selectedService && selectedOption) {
      let finalPrice = selectedService.effectivePrice;
      if (selectedOption === "couple") {
        finalPrice = selectedService.effectivePrice * 2;
      }
      
      const serviceForBooking = {
        _id: selectedService._id,
        name: selectedService.title,
        duration: selectedService.duration,
        price: finalPrice,
        description: selectedService.desc,
        category: selectedService.category,
        option: selectedOption,
      };
      
      bookingFlow.addService(serviceForBooking);
      bookingFlow.load();
      handleCloseModal();
      
      const newCount = bookingFlow.selectedServices.length;
      setSelectedServicesCount(newCount);
      
      try {
        window.dispatchEvent(new CustomEvent('bookingFlowChange'));
      } catch (e) {
        console.warn('Failed to dispatch bookingFlowChange event');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        background: '#fff',
        borderRadius: '8px',
        margin: '2rem'
      }}>
        <h3>Error Loading Services</h3>
        <p>{error}</p>
        <button 
          className="btn btn-primary" 
          onClick={fetchServices}
          style={{
            background: '#000',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="services-page-wrapper">
      {/* Services Main Content */}
      <div className="services-main-content">
        {/* Header Section */}
        <div className="svc-header-wrapper">
          <div className="svc-header">
            <h2>Services</h2>
          </div>
          
          {/* Navigation */}
          <nav className="svc-nav">
             {Object.keys(services).map((category) => (
            <button
              key={category}
              className={activeSection === category ? "active" : ""}
              onClick={() => scrollToSection(category)}
            >
              {category}
            </button>
          ))}
          </nav>
        </div>

        {/* Services Container */}
        <div className="svc-container">
          {Object.entries(services).map(([category, servicesList]) => (
            <div
              key={category}
              id={category.replace(/\s+/g, "-").toLowerCase()}
              className="svc-category-section"
              data-key={category}
              ref={(el) => (sectionRefs.current[category] = el)}
            >
              <h3 className="svc-category-title">{category}</h3>
              <div className="svc-list">
                {servicesList.map((item, idx) => {
                  const isOpen = isExpanded(category, idx);
                  const shortDesc = item.desc.length > 100 
                    ? item.desc.slice(0, 100) + "..." 
                    : item.desc;
                  const selected = isServiceSelected(item._id);
                  
                  return (
                    <div
                      className={`svc-item ${selected ? 'svc-item-selected' : ''}`}
                      key={idx}
                      onClick={() => !selected && handleServiceClick(item)}
                    >
                      <div className="svc-info">
                        <h4>{item.title}</h4>
                        <span className="time">{item.time}</span>
                        <p>
                          {isOpen ? item.desc : shortDesc}
                          {item.desc.length > 100 && (
                            <span
                              className="svc-read-more"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReadMore(category, idx);
                              }}
                              style={{
                                color: '#000',
                                fontWeight: '500',
                                cursor: 'pointer',
                                marginLeft: '5px'
                              }}
                            >
                              {isOpen ? " Read less" : " Read more"}
                            </span>
                          )}
                        </p>
                        <span className="svc-price">
                          from AED {item.price.replace(/^(AED |\$)?/, '')}
                        </span>
                        {item.discountPrice && item.discountPrice < item.originalPrice && (
                          <span
                            style={{
                              textDecoration: "line-through",
                              color: "#999",
                              marginLeft: "10px",
                            }}
                          >
                            AED {apiUtils.formatPrice(item.originalPrice)}
                          </span>
                        )}
                      </div>
                      
                      {selected ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            bookingFlow.removeService(item._id);
                            window.dispatchEvent(new CustomEvent('bookingFlowChange'));
                          }}
                          style={{ 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove from booking"
                        >
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="20" fill="#1976d2" />
                            <path 
                              d="M12 20.5L18 26L28 16" 
                              stroke="#fff" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          </svg>
                        </div>
                      ) : (
                        <button
                          className="svc-add-btn"
                          onClick={(e) => {
                            // e.stopPropagation();
                            handleServiceClick(item);
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Booking Sidebar */}
      {isDesktop && (
        <BookingSidebar currentStep={currentStep} navigate={navigate} />
      )}

      {/* Mobile Bottom Bar */}
      {!isDesktop && selectedServicesCount > 0 && (
        <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
      )}

      {/* Service Selection Modal */}
      {showModal && selectedService && (
        <ServiceModal
          service={selectedService}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          onClose={handleCloseModal}
          onAdd={handleAddToBooking}
        />
      )}
    </div>
  );
}

// Booking Sidebar Component (Desktop Only)
function BookingSidebar({ currentStep = 1, navigate }) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [summaryKey, setSummaryKey] = useState(0);

  useEffect(() => {
    const loadBookingData = () => {
      bookingFlow.load();
      setSelectedServices(bookingFlow.selectedServices || []);
      setSummaryKey(k => k + 1);
    };

    loadBookingData();

    const handleBookingFlowChange = () => {
      loadBookingData();
    };

    window.addEventListener("bookingFlowChange", handleBookingFlowChange);
    return () => window.removeEventListener("bookingFlowChange", handleBookingFlowChange);
  }, []);

  const steps = [
    { number: 1, label: 'Service' },
    { number: 2, label: 'Professional' },
    { number: 3, label: 'Time' },
    { number: 4, label: 'Payment' },
    { number: 5, label: 'Confirm' }
  ];

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      Swal.fire({
        title: 'Service Required',
        text: 'Please select at least one service.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    navigate("/professionals");
  };

  const totalDuration = selectedServices.reduce((sum, svc) => sum + (svc.duration || 0), 0);
  const totalRate = selectedServices.reduce((sum, svc) => sum + (svc.price || 0), 0);


}

export default Services;

// Service Bottom Bar Component (Mobile/Tablet Only)
function ServiceBottomBar({ currentStep = 1, navigate }) {
  const [selectedServices, setSelectedServices] = useState([]);
  
  useEffect(() => {
    bookingFlow.load();
    setSelectedServices(bookingFlow.selectedServices || []);
    
    const handler = () => {
      bookingFlow.load();
      setSelectedServices(bookingFlow.selectedServices || []);
    };
    
    window.addEventListener("bookingFlowChange", handler);
    return () => window.removeEventListener("bookingFlowChange", handler);
  }, []);

  const totalDuration = selectedServices.reduce((sum, svc) => sum + (svc.duration || 0), 0);
  const totalRate = selectedServices.reduce((sum, svc) => sum + (svc.price || 0), 0);
  
  const canContinue = () => selectedServices.length > 0;
  
  const handleContinue = () => {
    if (canContinue()) {
      navigate("/professionals");
    } else {
      Swal.fire({
        title: 'Service Required',
        text: 'Please select at least one service.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <div className="unified-bottom-bar">
    {/* Summary Section */}
    <div className="unified-bottom-bar__summary">
      <span className="unified-bottom-bar__primary-info">AED {totalRate}</span>
      <span className="unified-bottom-bar__secondary-info">
        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} • {totalDuration} min
      </span>
    </div>

    <button
      className="unified-bottom-bar__button"
      onClick={handleContinue}
      disabled={!canContinue()}
    >
      Continue
    </button>
  </div>
  );
}

// Service Modal Component
function ServiceModal({ service, selectedOption, setSelectedOption, onClose, onAdd }) {
  return (
    <div className="svc-popup-overlay" onClick={onClose}>
      <div className="svc-popup" onClick={(e) => e.stopPropagation()}>
        <div className="svc-popup-header">
          <h2>{service.title}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="svc-popup-body">
          <p className="svc-popup-desc">
            {service.desc.slice(0, 160)}...
            <span className="read-more"> Read more</span>
          </p>
          
          <h4 className="svc-popup-subtitle">
            Select an option <span className="required">*</span>
          </h4>
          
          <div className="svc-option-list">
            <label className="svc-option-item">
              <input
                type="radio"
                name="svcOption"
                value="single"
                checked={selectedOption === "single"}
                onChange={() => setSelectedOption("single")}
              />
              <div>
                <strong>{service.title}</strong>
                <div className="svc-option-time">{service.time}</div>
                <div className="svc-option-price">
                  AED {service.price.replace(/^(AED |\$)?/, '')}
                </div>
              </div>
            </label>
            
            <hr />
            
            <label className="svc-option-item">
              <input
                type="radio"
                name="svcOption"
                value="couple"
                checked={selectedOption === "couple"}
                onChange={() => setSelectedOption("couple")}
              />
              <div>
                <strong>Couple</strong>
                <div className="svc-option-time">{service.time}</div>
                <div className="svc-option-price">
                  AED {apiUtils.formatPrice(service.effectivePrice * 2).replace(/^(AED |\$)?/, '')}
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <div className="svc-popup-footer">
          <button
            className={selectedOption ? "btn-enabled" : "btn-disabled"}
            disabled={!selectedOption}
            onClick={onAdd}
          >
            Add to booking
          </button>
        </div>
      </div>
    </div>
  );
}