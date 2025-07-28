import React, { useState, useEffect, useRef } from 'react';
import './ProfessionalSelection.css';
import { FaStar } from 'react-icons/fa';
import { bookingsAPI, apiUtils, bookingFlow } from '../services/api';
import { useHeaderTitle } from '../Service/HeaderTitleContext';

const SelectProfessional = ({ selectedDate, onProfessionalSelect }) => {
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const { setHeaderTitle } = useHeaderTitle();
  const headingRef = useRef();

  // Load selected services from booking flow
  useEffect(() => {
    const loadSelectedServices = () => {
      bookingFlow.load();
      setSelectedServices(bookingFlow.selectedServices || []);
    };
    
    loadSelectedServices();
    
    // Listen for changes in booking flow
    const handleBookingFlowChange = () => {
      loadSelectedServices();
    };
    
    window.addEventListener('bookingFlowChange', handleBookingFlowChange);
    
    return () => {
      window.removeEventListener('bookingFlowChange', handleBookingFlowChange);
    };
  }, []);

  // Fetch available professionals when services or date changes
  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!selectedServices.length || !selectedDate) {
        setProfessionals([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the first service to get available professionals
        // In a full implementation, you might want to get professionals for each service
        const firstService = selectedServices[0];
        const formattedDate = apiUtils.formatDate(selectedDate);
        const response = await bookingsAPI.getAvailableProfessionals(
          firstService._id,
          formattedDate
        );

        if (response.success) {
          // Transform the API response to match our component structure
          const transformedProfessionals = response.data.professionals.map((employee, index) => ({
            id: employee._id,
            name: `${employee.user.firstName} ${employee.user.lastName}`,
            subtitle: employee.position,
            letter: employee.user.firstName.charAt(0),
            rating: employee.performance?.ratings?.average || 0,
            employeeId: employee.employeeId,
            specializations: employee.specializations || [],
            image: null, // Add profile image if available
            isAvailable: true
          }));

          // Add "Any professional" option at the beginning
          const allProfessionals = [
            {
              id: 'any',
              name: 'Any professional',
              subtitle: 'for maximum availability',
              icon: '👥',
              isAvailable: true
            },
            ...transformedProfessionals
          ];

          setProfessionals(allProfessionals);
        }
      } catch (err) {
        console.error('Error fetching professionals:', err);
        setError(err.message);
        setProfessionals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [selectedServices, selectedDate]);

  const handleProfessionalSelect = (serviceId, professional) => {
    setSelectedProfessionals(prev => ({
      ...prev,
      [serviceId]: professional
    }));
    
    // Call the parent callback with all selected professionals
    if (onProfessionalSelect) {
      const allSelected = {
        ...selectedProfessionals,
        [serviceId]: professional
      };
      onProfessionalSelect(allSelected);
    }
  };

  const getProfessionalForService = (serviceId) => {
    return selectedProfessionals[serviceId];
  };

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setHeaderTitle('Professionals');
        } else {
          setHeaderTitle('');
        }
      },
      { threshold: 0 }
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, [setHeaderTitle]);

  if (loading) {
    return (
      <div className="select-professional-container">
        <h2 ref={headingRef}>Select professionals</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading available professionals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="select-professional-container">
        <h2 ref={headingRef}>Select professionals</h2>
        <div className="error-container">
          <p>Error loading professionals: {error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!selectedServices.length || !selectedDate) {
    return (
      <div className="select-professional-container">
        <h2 ref={headingRef}>Select professionals</h2>
        <div className="info-container">
          <p>Please select services and date first</p>
        </div>
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="select-professional-container">
        <h2 ref={headingRef}>Select professionals</h2>
        <div className="info-container">
          <p>No professionals available for the selected services and date</p>
        </div>
      </div>
    );
  }
  

  return (
    <div className="select-professional-container">
      <h2 ref={headingRef}>Select professionals for your services</h2>
      
      {selectedServices.map((service, index) => (
        <div key={service._id} className="service-professional-section">
          <div className="service-header">
            <h3>{service.name}</h3>
            <span className="service-duration">{apiUtils.formatDuration(service.duration)}</span>
            <span className="service-price">{apiUtils.formatPrice(service.price)}</span>
          </div>
          
          <div className="professional-grid">
            {professionals.map((pro) => (
              <div
                key={`${service._id}-${pro.id}`}
                className={`professional-card ${getProfessionalForService(service._id)?.id === pro.id ? 'selected' : ''}`}
                onClick={() => handleProfessionalSelect(service._id, pro)}
              >
                {pro.icon && <div className="icon-circle">{pro.icon}</div>}

                {pro.image && (
                  <div className="image-circle">
                    <img src={pro.image} alt={pro.name} />
                    {pro.rating && (
                      <div className="rating-badge">
                        {pro.rating} <FaStar className="star" />
                      </div>
                    )}
                  </div>
                )}

                {pro.letter && <div className="letter-circle">{pro.letter}</div>}

                <div className="name-text">{pro.name}</div>
                {pro.subtitle && <div className="subtitle-text">{pro.subtitle}</div>}
                
                {pro.rating > 0 && (
                  <div className="rating-display">
                    <FaStar className="star" />
                    <span>{pro.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {index < selectedServices.length - 1 && <hr className="service-divider" />}
        </div>
      ))}
      
      <div className="selection-summary">
        <h4>Selection Summary:</h4>
        {selectedServices.map(service => {
          const selectedPro = getProfessionalForService(service._id);
          return (
            <div key={service._id} className="summary-item">
              <span className="service-name">{service.name}</span>
              <span className="professional-name">
                {selectedPro ? selectedPro.name : 'No professional selected'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectProfessional;
