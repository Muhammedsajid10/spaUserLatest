import React, { useState, useEffect, useRef } from "react";
import "./ProfessionalSelection.css";
import { FaStar } from "react-icons/fa";
import { bookingsAPI, apiUtils, bookingFlow } from "../services/api";
import { fetchAvailableProfessionalsForService } from '../services/bookingUtils';
import { useNavigate } from "react-router-dom";
import Loading from '../states/Loading';
import Error500Page from '../states/ErrorPage.jsx';
import API_BASE_URL from '../services/api';



const BOOKING_API_URL = `${API_BASE_URL}/bookings`;
const EMPLOYEES_API_URL = `${API_BASE_URL}/employees`;
const SelectProfessional = () => {
  const [professionals, setProfessionals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep, setCurrentStep] = useState(2); // Step 2 for professional selection
  const previousServicesRef = useRef([]);

  const navigate = useNavigate();

  // Load selected services from booking flow
  useEffect(() => {
    const loadSelectedServices = () => {
      const savedData = bookingFlow.load();
      const newServices = savedData.selectedServices || [];
      setSelectedServices(newServices);
      previousServicesRef.current = newServices;
    };

    loadSelectedServices();

    // Listen for changes in booking flow - only reload if services actually change
    const handleBookingFlowChange = () => {
      const currentServices = bookingFlow.selectedServices || [];
      const servicesChanged = JSON.stringify(currentServices) !== JSON.stringify(previousServicesRef.current);
      
      if (servicesChanged) {
        console.log('Services changed, reloading professionals...');
        setSelectedServices(currentServices);
        previousServicesRef.current = currentServices;
      }
    };

    window.addEventListener("bookingFlowChange", handleBookingFlowChange);

    return () => {
      window.removeEventListener("bookingFlowChange", handleBookingFlowChange);
    };
  }, []);

  // Fetch available professionals when services are available
  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!selectedServices.length) {
        setProfessionals([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use selected date from booking flow or today's date as fallback
        const data = bookingFlow.load();
        const selectedDate = data.selectedDate
          ? new Date(data.selectedDate)
          : new Date();
        const formattedDate = apiUtils.formatDate(selectedDate);

        // Use the first service to get available professionals
        const firstService = selectedServices[0];
        console.log(
          "Fetching professionals for service:",
          firstService._id,
          "date:",
          formattedDate
        );

        // Use bookingUtils which will fetch employees + bookings and filter by shifts/bookings
        const availableEmployees = await fetchAvailableProfessionalsForService(formattedDate, firstService._id);
        console.log('bookingUtils returned', availableEmployees.length, 'employees');

        if (availableEmployees && availableEmployees.length > 0) {
          const transformedProfessionals = availableEmployees.map((employee) => ({
            id: employee._id || employee.id,
            name: employee.user ? `${employee.user.firstName} ${employee.user.lastName}` : employee.name,
            subtitle: employee.position || employee.role,
            letter: employee.user ? employee.user.firstName.charAt(0) : (employee.name ? employee.name.charAt(0) : '?'),
            rating: employee.performance?.ratings?.average || 0,
            employeeId: employee.employeeId || employee._id || employee.id,
            specializations: employee.specializations || [],
            image: null,
            isAvailable: true,
            employee: employee,
          }));

          const perServiceCard = {
            id: 'per-service',
            name: 'Select professional per service',
            subtitle: 'assign per service',
            icon: '👥➕',
            isAvailable: true,
          };

          const allProfessionals = [
            { id: "any", name: "Any professional", subtitle: "for maximum availability", icon: "👥", isAvailable: true },
            perServiceCard,
            ...transformedProfessionals,
          ];

          setProfessionals(allProfessionals);
        } else {
          console.log('No available employees from bookingUtils, showing fallback');
          showFallbackProfessionals();
        }
      } catch (err) {
        console.error("Error fetching professionals:", err);
        setError(err.message);

        // Show fallback data on error
        console.log("Error occurred, showing fallback data");
        showFallbackProfessionals();
      } finally {
        setLoading(false);
      }
    };

    // Function to show fallback professionals for testing
    const showFallbackProfessionals = () => {
      const fallbackProfessionals = [
        {
          id: "any",
          name: "Any professional",
          subtitle: "for maximum availability",
          icon: "👥",
          isAvailable: true,
        },
        {
          id: 'per-service',
          name: 'Select professional per service',
          subtitle: 'assign per service',
          icon: '👥➕',
          isAvailable: true,
        },
        {
          id: "sample1",
          name: "Sarah Johnson",
          subtitle: "Senior Therapist",
          letter: "S",
          rating: 4.8,
          employeeId: "EMP001",
          specializations: ["Massage Therapy", "Aromatherapy"],
          image: null,
          isAvailable: true,
          employee: {
            _id: "sample1",
            user: { firstName: "Sarah", lastName: "Johnson" },
            position: "Senior Therapist",
            employeeId: "EMP001",
          },
        },
        {
          id: "sample2",
          name: "Michael Chen",
          subtitle: "Spa Specialist",
          letter: "M",
          rating: 4.9,
          employeeId: "EMP002",
          specializations: ["Facial Treatments", "Body Treatments"],
          image: null,
          isAvailable: true,
          employee: {
            _id: "sample2",
            user: { firstName: "Michael", lastName: "Chen" },
            position: "Spa Specialist",
            employeeId: "EMP002",
          },
        },
        {
          id: "sample3",
          name: "Emma Davis",
          subtitle: "Wellness Coach",
          letter: "E",
          rating: 4.7,
          employeeId: "EMP003",
          specializations: ["Yoga Therapy", "Meditation"],
          image: null,
          isAvailable: true,
          employee: {
            _id: "sample3",
            user: { firstName: "Emma", lastName: "Davis" },
            position: "Wellness Coach",
            employeeId: "EMP003",
          },
        },
      ];

  setProfessionals(fallbackProfessionals);
    };

    fetchProfessionals();
  }, [selectedServices]);

  const handleProfessionalSelect = (professional) => {
    setSelectedId(professional.id);

    // Save selected professional to booking flow using the new structure
    // Handle special cases
    if (professional.id === 'any') {
      const anyProfessional = { id: "any", name: "Any professional" };
      bookingFlow.selectedServices.forEach((service) => {
        bookingFlow.addProfessional(service._id, anyProfessional);
      });
    } else if (professional.id === 'per-service') {
      // Mark services to use per-service selection. We'll store a special marker.
      bookingFlow.selectedServices.forEach((service) => {
        bookingFlow.addProfessional(service._id, { id: 'per-service', name: 'Select professional per service' });
      });
    } else if (professional.id.startsWith('sample')) {
      const professionalData = {
        id: professional.id,
        _id: professional.id,
        name: professional.name,
        user: professional.employee.user,
        position: professional.employee.position,
        employeeId: professional.employee.employeeId,
      };
      bookingFlow.selectedServices.forEach((service) => {
        bookingFlow.addProfessional(service._id, professionalData);
      });
    } else {
      bookingFlow.selectedServices.forEach((service) => {
        bookingFlow.addProfessional(service._id, professional.employee);
      });
    }

    console.log("Professional selected:", professional);
    console.log(
      "Updated bookingFlow.selectedProfessionals:",
      bookingFlow.selectedProfessionals
    );
  };

  if (loading) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="loading-container">
          <Loading  />
          <p>Loading available professionals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="error-container">
          <Error500Page/>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!selectedServices.length) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="info-container">
          <p>Please select services first</p>
        </div>
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="info-container">
          <p>No professionals available for the selected service</p>
        </div>
      </div>
    );
  }

  return (
    <div className="select-professional-container">
      <h2>Select professional</h2>

      <div className="professional-grid">
        {professionals.map((pro) => (
          <div
            key={pro.id}
            className={`professional-card compact ${
              selectedId === pro.id ? "selected" : ""
            }`}
            onClick={() => handleProfessionalSelect(pro)}
          >
            {pro.icon && (
              <div className="icon-circle small">{pro.icon}</div>
            )}

            {pro.image && (
              <div className="image-circle small">
                <img src={pro.image} alt={pro.name} />
                {pro.rating && (
                  <div className="rating-badge">
                    {pro.rating} <FaStar className="star" />
                  </div>
                )}
              </div>
            )}

            {pro.letter && <div className="letter-circle blue">{pro.letter}</div>}

            <div className="name-text small">{pro.name}</div>

            {pro.rating > 0 && (
              <div className="rating-display small">
                <FaStar className="star" />
                <span>{pro.rating}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Bar for mobile */}
      {typeof window !== "undefined" &&
        window.innerWidth <= 600 &&
        selectedServices.length > 0 && (
          <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
        )}

      {/* Bottom Bar for desktop - always show if services selected */}
      {selectedServices.length > 0 && (
        <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
      )}
    </div>
  );
};

// Bottom Bar Component
function ServiceBottomBar({ currentStep = 2, navigate }) {
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
          alert("Please select at least one service.");
        }
        break;
      case 2:
        navigate("/time");
        break;
      case 3:
        navigate("/payment");
        break;
      case 4:
        alert("Complete payment logic here.");
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

export default SelectProfessional;
