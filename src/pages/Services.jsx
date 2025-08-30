import React, { useEffect, useState, useRef } from "react";
import "./Services.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button } from "react-bootstrap";
import { servicesAPI, apiUtils, bookingFlow } from "../services/api";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';

function Services() {
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef({});
  const [expandedStates, setExpandedStates] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedServicesCount, setSelectedServicesCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(1); // Can be updated based on flow

  const navigate = useNavigate();

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await servicesAPI.getAllServices();

      if (response.success) {
        const groupedServices = {};
        response.data.services.forEach((service) => {
          // Handle category as object or string
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

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute("data-title"));
          }
        });
      },
      { rootMargin: "-50% 0px -40% 0px", threshold: 0.1 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [services]);

  const scrollToSection = (key) => {
    const element = sectionRefs.current[key];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
    setSelectedService(service);
    setShowModal(true);
    setSelectedOption(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedService(null);
    setSelectedOption(null);
  };

  // const handleAddToBooking = () => {
  //   if (selectedService && selectedOption) {
  //     // Calculate the price based on selected option
  //     let finalPrice = selectedService.effectivePrice;
  //     if (selectedOption === "couple") {
  //       finalPrice = selectedService.effectivePrice * 2;
  //     }

  //     const serviceForBooking = {
  //       _id: selectedService._id,
  //       name: selectedService.title,
  //       duration: selectedService.duration,
  //       price: finalPrice,
  //       description: selectedService.desc,
  //       category: selectedService.category,
  //       option: selectedOption, // Store the selected option for reference
  //     };

  //     bookingFlow.addService(serviceForBooking);
  //     handleCloseModal();

  //     const newCount = bookingFlow.selectedServices.length;
  //     alert(
  //       `Service added to booking! You now have ${newCount} service${newCount > 1 ? "s" : ""
  //       } selected. You can add more services or click Continue in the sidebar to proceed.`
  //     );
  //   }
  // };




  const handleAddToBooking = () => {
  if (selectedService && selectedOption) {
    // Calculate the price based on selected option
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
    // mark as selected (checkbox)
    setSelectedServiceIds(prev => {
      if (!prev.includes(selectedService._id)) return [...prev, selectedService._id];
      return prev;
    });

    handleCloseModal();

    const newCount = bookingFlow.selectedServices.length;

    Swal.fire({
      title: 'Service Added!',
      text: `Service added to booking! You now have ${newCount} service${newCount > 1 ? "s" : ""} selected.`,
      icon: 'success',
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-right',
      timerProgressBar: true
    });

    // notify sidebar and other components
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
  }
};

  // Toggle service selection (checkbox / plus behavior)
  const handleServiceToggle = (service) => {
    bookingFlow.load();
    const exists = bookingFlow.selectedServices && bookingFlow.selectedServices.find(s => s._id === service._id);
    if (exists) {
      bookingFlow.removeService(service._id);
      setSelectedServiceIds(prev => prev.filter(id => id !== service._id));
    } else {
      const serviceForBooking = {
        _id: service._id,
        name: service.title,
        duration: service.duration,
        price: service.effectivePrice,
        description: service.desc,
        category: service.category,
        option: 'single',
      };
      bookingFlow.addService(serviceForBooking);
      setSelectedServiceIds(prev => [...prev, service._id]);
    }
    // Notify others and update count
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
    setSelectedServicesCount((bookingFlow.selectedServices || []).length);
  };


  useEffect(() => {
    const loadSelectedServicesCount = () => {
      bookingFlow.load();
      setSelectedServicesCount(bookingFlow.selectedServices.length || 0);
      setSelectedServiceIds((bookingFlow.selectedServices || []).map(s => s._id));
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

  if (loading) {
    return (
      <div className="svc-container">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{ marginTop: "20px" }}>Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="svc-container">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h3>Error Loading Services</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchServices}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="svc-container">
        <div
          className="svc-header"
          style={{
            position: 'sticky',
            top: '0px',
            zIndex: 30,
            background: '#fff',
            padding: '12px 0',
            borderBottom: '1px solid rgba(0,0,0,0.06)'
          }}
        >
          <h2>Services</h2>
          {selectedServicesCount > 0 && (
            <div className="svc-cart-indicator">
              <span className="cart-count">{selectedServicesCount}</span>
              <span className="cart-text">services selected</span>
            </div>
          )}
        </div>

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

      {Object.entries(services).map(([category, servicesList]) => (
        <div
          key={category}
          id={category.replace(/\s+/g, "-").toLowerCase()}
          className="svc-category-section"
          data-title={category}
          ref={(el) => (sectionRefs.current[category] = el)}
        >
          <h3
            className="svc-category-title"
            style={{
              position: 'sticky',
              top: '72px',
              background: '#fff',
              zIndex: 20,
              margin: 0,
              padding: '10px 0',
              borderBottom: '1px solid rgba(0,0,0,0.06)'
            }}
          >
            {category}
          </h3>
          <div className="svc-list">
            {servicesList.map((item, idx) => {
              const isOpen = isExpanded(category, idx);
              const shortDesc =
                item.desc.length > 100
                  ? item.desc.slice(0, 100) + "..."
                  : item.desc;
              const checked = selectedServiceIds.includes(item._id);
              return (
                <div
                  className={`svc-item ${checked ? 'selected' : ''}`}
                  key={idx}
                  onClick={() => handleServiceClick(item)}
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
                        >
                          {isOpen ? " Read less" : " Read more"}
                        </span>
                      )}
                    </p>
                    <span className="svc-price">{item.price}</span>
                    {item.discountPrice &&
                      item.discountPrice < item.originalPrice && (
                        <span
                          className="svc-original-price"
                          style={{
                            textDecoration: "line-through",
                            color: "#999",
                            marginLeft: "10px",
                          }}
                        >
                          {apiUtils.formatPrice(item.originalPrice)}
                        </span>
                      )}
                  </div>
                  {/* show + when not selected, checkbox when selected */}
                  {!checked ? (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px' }}>
                      <button
                        className="svc-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // open modal to choose single/couple option
                          handleServiceClick(item);
                        }}
                        aria-label={`Add ${item.title} to booking`}
                        style={{ width: '34px', height: '34px', borderRadius: '6px' }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px' }}
                    >
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleServiceToggle(item);
                          }}
                          aria-label={`Remove ${item.title} from selection`}
                          style={{
                            width: '28px',
                            height: '28px',
                            accentColor: '#5000e6ff',
                            borderRadius: '100px',
                            
                            boxSizing: 'border-box',
                          }}
                        />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Service Modal */}
      {showModal && selectedService && (
        <div className="svc-popup-overlay" onClick={handleCloseModal}>
          <div className="svc-popup" onClick={(e) => e.stopPropagation()}>
            <div className="svc-popup-header">
              <h2>{selectedService.title}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="svc-popup-body">
              <p className="svc-popup-desc">
                {selectedService.desc.slice(0, 160)}...
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
                    <strong>{selectedService.title}</strong>
                    <div className="svc-option-time">
                      {selectedService.time}
                    </div>
                    <div className="svc-option-price">
                      {selectedService.price}
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
                    <div className="svc-option-time">
                      {selectedService.time}
                    </div>
                    <div className="svc-option-price">
                      {apiUtils.formatPrice(selectedService.effectivePrice * 2)}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="svc-popup-footer">
              <button
                className={selectedOption ? "btn-enabled" : "btn-disabled"}
                disabled={!selectedOption}
                onClick={handleAddToBooking}
              >
                Add to booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar for mobile */}
      {typeof window !== "undefined" &&
        window.innerWidth <= 600 &&
        selectedServicesCount > 0 && (
          <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
        )}
    </div>
  );
}

// ✅ Updated Bottom Bar Component
function ServiceBottomBar({ currentStep = 1, navigate }) {
  const [selectedServices, setSelectedServices] = React.useState([]);

  React.useEffect(() => {
    bookingFlow.load();
    setSelectedServices(bookingFlow.selectedServices || []);
    const handler = () => {
      bookingFlow.load();
      setSelectedServices(bookingFlow.selectedServices || []);
    };
    window.addEventListener("bookingFlowChange", handler);
    return () => window.removeEventListener("bookingFlowChange", handler);
  }, []);

  const totalDuration = selectedServices.reduce(
    (sum, svc) => sum + (svc.duration || 0),
    0
  );
  const totalRate = selectedServices.reduce(
    (sum, svc) => sum + (svc.price || 0),
    0
  );

  const canContinue = () => selectedServices.length > 0;

  const handleContinue = () => {
    switch (currentStep) {
      case 1:
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
        break;
      case 2:
        navigate("/time");
        break;
      case 3:
        navigate("/payment");
        break;
      case 4:
        Swal.fire({
          title: 'Complete Booking',
          text: 'Complete payment logic here.',
          icon: 'info',
          confirmButtonText: 'OK'
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="service-bottom-bar">
      <span>{totalDuration} min</span>
      <span>{selectedServices.length} services</span>
      <span>AED {totalRate}</span>
      <button
        className={`btn-continue ${!canContinue() ? "disabled" : ""}`}
        onClick={handleContinue}
        disabled={!canContinue()}
      >
        {currentStep === 4 ? "Complete Booking" : "Continue"}
      </button>
    </div>
  );
}

export default Services;
