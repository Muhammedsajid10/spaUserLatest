import React, { useState, useEffect } from "react";
import "./ProfessionalSelection.css";
import { FaStar } from "react-icons/fa";
import { bookingsAPI, apiUtils, bookingFlow } from "../services/api";
import { useNavigate } from "react-router-dom";

const SelectProfessional = () => {
  const [professionals, setProfessionals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep, setCurrentStep] = useState(2); // Step 2 for professional selection

  const navigate = useNavigate();

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

        const response = await bookingsAPI.getAvailableProfessionals(
          firstService._id,
          formattedDate
        );

        console.log("API response:", response);

        if (response.success) {
          // Check if we have professionals in the response
          if (
            response.results > 0 &&
            response.data.professionals &&
            response.data.professionals.length > 0
          ) {
            // Transform the API response to match our component structure
            const transformedProfessionals = response.data.professionals.map(
              (employee, index) => ({
                id: employee._id,
                name: `${employee.user.firstName} ${employee.user.lastName}`,
                subtitle: employee.position,
                letter: employee.user.firstName.charAt(0),
                rating: employee.performance?.ratings?.average || 0,
                employeeId: employee.employeeId,
                specializations: employee.specializations || [],
                image: null, // Add profile image if available
                isAvailable: true,
                // Store original employee data for booking flow
                employee: employee,
              })
            );

            // Add "Any professional" option at the beginning
            const allProfessionals = [
              {
                id: "any",
                name: "Any professional",
                subtitle: "for maximum availability",
                icon: "👥",
                isAvailable: true,
              },
              ...transformedProfessionals,
            ];

            setProfessionals(allProfessionals);
          } else {
            // No professionals found, show fallback data
            console.log(
              "No professionals found in API response, showing fallback data"
            );
            showFallbackProfessionals();
          }
        } else {
          // API call failed, show fallback data
          console.log("API call failed, showing fallback data");
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
    if (professional.id !== "any") {
      // For sample professionals, create a proper structure
      if (professional.id.startsWith("sample")) {
        const professionalData = {
          id: professional.id,
          _id: professional.id,
          name: professional.name,
          user: professional.employee.user,
          position: professional.employee.position,
          employeeId: professional.employee.employeeId,
        };

        // Assign this professional to all selected services
        bookingFlow.selectedServices.forEach((service) => {
          bookingFlow.selectedProfessionals[service._id] = professionalData;
        });
      } else {
        // Assign this professional to all selected services
        bookingFlow.selectedServices.forEach((service) => {
          bookingFlow.selectedProfessionals[service._id] =
            professional.employee;
        });
      }
    } else {
      // For "any professional", assign to all services
      const anyProfessional = { id: "any", name: "Any professional" };
      bookingFlow.selectedServices.forEach((service) => {
        bookingFlow.selectedProfessionals[service._id] = anyProfessional;
      });
    }

    bookingFlow.save();

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
          <div className="loading-spinner"></div>
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
          <p>Error loading professionals: {error}</p>
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
            className={`professional-card ${
              selectedId === pro.id ? "selected" : ""
            }`}
            onClick={() => handleProfessionalSelect(pro)}
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
            {pro.subtitle && (
              <div className="subtitle-text">{pro.subtitle}</div>
            )}

            {pro.rating > 0 && (
              <div className="rating-display">
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
