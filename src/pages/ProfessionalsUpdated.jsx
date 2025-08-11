import React, { useState, useEffect, useRef } from "react";
import "./ProfessionalSelection.css"; // This CSS file for SelectProfessional
import { FaStar } from "react-icons/fa";
import { bookingsAPI, apiUtils, bookingFlow } from "../services/api";
import { useNavigate } from "react-router-dom";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const SelectProfessional = () => {
  const [professionals, setProfessionals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeServiceId, setActiveServiceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep] = useState(2);
  const previousServicesRef = useRef([]);
  const [lastSelectedProfessional, setLastSelectedProfessional] = useState(null);
  const [selectionMode, setSelectionMode] = useState(bookingFlow.load().selectionMode || 'perService');
  const backupPerServiceRef = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadSelectedServices = () => {
      const savedData = bookingFlow.load();
      const newServices = savedData.selectedServices || [];
      setSelectedServices(newServices);

      // Restore activeServiceId or set to first service if it's not set
      if (!activeServiceId && newServices.length && selectionMode === 'perService') {
        setActiveServiceId(newServices[0]._id);
      }

      // Restore last selected professional for 'oneAll' mode from bookingFlow
      if (savedData.selectionMode === 'oneAll' && newServices.length > 0) {
        const firstServiceProfessional = savedData.selectedProfessionals?.[newServices[0]._id];
        if (firstServiceProfessional) {
          setLastSelectedProfessional(firstServiceProfessional);
          setSelectedId(firstServiceProfessional._id || firstServiceProfessional.id);
        }
      }

      previousServicesRef.current = newServices;
    };

    loadSelectedServices();

    const handleBookingFlowChange = () => {
      const currentServices = bookingFlow.load().selectedServices || [];
      const servicesChanged = JSON.stringify(currentServices) !== JSON.stringify(previousServicesRef.current);

      if (servicesChanged) {
        console.log('Services changed, reloading professionals...');
        setSelectedServices(currentServices);
        if (!activeServiceId && currentServices.length) {
          setActiveServiceId(currentServices[0]._id);
        }
        previousServicesRef.current = currentServices;
      }

      // Update the selected professional ID based on the new bookingFlow state
      const currentFlow = bookingFlow.load();
      if (currentFlow.selectionMode === 'oneAll' && currentFlow.selectedServices.length > 0) {
        const firstProf = currentFlow.selectedProfessionals?.[currentFlow.selectedServices[0]._id];
        if (firstProf) {
          setSelectedId(firstProf._id || firstProf.id);
          setLastSelectedProfessional(firstProf);
        } else {
          setSelectedId(null);
          setLastSelectedProfessional(null);
        }
      } else if (currentFlow.selectionMode === 'anyAll') {
        setSelectedId('mode-any');
      } else if (currentFlow.selectionMode === 'perService' && activeServiceId) {
        const prof = currentFlow.selectedProfessionals?.[activeServiceId];
        setSelectedId(prof?._id || prof?.id || null);
      } else {
        setSelectedId(null);
      }
    };

    window.addEventListener("bookingFlowChange", handleBookingFlowChange);
    return () => {
      window.removeEventListener("bookingFlowChange", handleBookingFlowChange);
    };
  }, [activeServiceId, selectionMode]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!selectedServices.length) {
        setProfessionals([]);
        return;
      }

      setLoading(true);
      setError(null);

      const modeCards = [
        {
          id: 'mode-any',
          name: 'Any professional',
          subtitle: 'for maximum availability',
          icon: '👥',
          _mode: 'anyAll'
        },
        {
          id: 'mode-per-service',
          name: 'Select professional per service',
          subtitle: 'assign each separately',
          icon: '👥+',
          _mode: 'perService'
        },
        {
          id: 'mode-one-all',
          name: 'Same professional for all',
          subtitle: 'choose once, apply to all',
          icon: '👤→∞',
          _mode: 'oneAll'
        }
      ];

      try {
        const data = bookingFlow.load();
        const selectedDate = data.selectedDate ? new Date(data.selectedDate) : new Date();
        const formattedDate = apiUtils.formatDate(selectedDate);
        const firstService = selectedServices[0];
        console.log("Fetching professionals for service:", firstService._id, "date:", formattedDate);
        const response = await bookingsAPI.getAvailableProfessionals(firstService._id, formattedDate);
        console.log("API response:", response);

        if (response.success && response.data?.professionals?.length > 0) {
          const transformedProfessionals = response.data.professionals.map(
            (employee) => ({
              id: employee._id,
              name: `${employee.user.firstName} ${employee.user.lastName}`,
              subtitle: employee.position,
              letter: employee.user.firstName.charAt(0),
              rating: employee.performance?.ratings?.average || 0,
              employeeId: employee.employeeId,
              specializations: employee.specializations || [],
              image: null,
              isAvailable: true,
              employee: employee,
            })
          );
          setProfessionals([...modeCards, ...transformedProfessionals]);
        } else {
          console.log("Only mode cards available");
          setProfessionals(modeCards);
        }
      } catch (err) {
        console.error("Error fetching professionals:", err);
        setError("Failed to load professionals. Please try again.");
        setProfessionals(modeCards);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessionals();
  }, [selectedServices]);

  const applyAnyAll = () => {
    selectedServices.forEach(s => bookingFlow.addProfessional(s._id, { id: 'any', name: 'Any professional'}));
    bookingFlow.save();
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
  };

  const applyOneAll = (profPayload) => {
    selectedServices.forEach(s => bookingFlow.addProfessional(s._id, profPayload));
    bookingFlow.save();
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
  };

  const handleProfessionalSelect = (professional) => {
    // Mode card clicked
    if (professional._mode) {
      const newMode = professional._mode;
      setSelectionMode(newMode);
      bookingFlow.selectionMode = newMode;
      bookingFlow.save();
      setSelectedId(professional.id);

      if (newMode === 'anyAll') {
        backupPerServiceRef.current = { ...bookingFlow.selectedProfessionals };
        applyAnyAll();
        setLastSelectedProfessional(null);
      } else if (newMode === 'perService') {
        if (Object.keys(backupPerServiceRef.current).length) {
          bookingFlow.selectedServices.forEach(s => {
            if (backupPerServiceRef.current[s._id]) {
              bookingFlow.addProfessional(s._id, backupPerServiceRef.current[s._id]);
            } else {
              bookingFlow.removeProfessional(s._id);
            }
          });
        } else {
          // If no backup, clear all and start fresh in perService mode
          bookingFlow.selectedServices.forEach(s => bookingFlow.removeProfessional(s._id));
        }
        bookingFlow.save();
        window.dispatchEvent(new CustomEvent('bookingFlowChange'));
        setActiveServiceId(selectedServices[0]?._id);
        setLastSelectedProfessional(null);
        setSelectedId(bookingFlow.selectedProfessionals?.[selectedServices[0]?._id]?._id || bookingFlow.selectedProfessionals?.[selectedServices[0]?._id]?.id || null);
      } else if (newMode === 'oneAll') {
        backupPerServiceRef.current = { ...bookingFlow.selectedProfessionals };
        bookingFlow.selectedServices.forEach(s => bookingFlow.removeProfessional(s._id));
        bookingFlow.save();
        window.dispatchEvent(new CustomEvent('bookingFlowChange'));
        setLastSelectedProfessional(null);
        setSelectedId(null);
      }
      return;
    }

    // Professional card clicked
    if (!selectedServices.length) return;
    let profPayload;
    if (professional.id.startsWith('sample')) {
      profPayload = {
        id: professional.id,
        _id: professional.id,
        name: professional.name,
        user: professional.employee.user,
        position: professional.employee.position,
        employeeId: professional.employee.employeeId
      };
    } else {
      profPayload = professional.employee;
    }

    if (selectionMode === 'oneAll') {
      applyOneAll(profPayload);
      setLastSelectedProfessional(profPayload);
      setSelectedId(profPayload._id || profPayload.id);
      return;
    }
    
    if (selectionMode === 'anyAll' || selectionMode === 'perService') {
      // If we are in 'anyAll' mode and a specific professional is chosen, switch to 'oneAll'
      if (selectionMode === 'anyAll') {
        setSelectionMode('oneAll');
        bookingFlow.selectionMode = 'oneAll';
        bookingFlow.save();
        applyOneAll(profPayload);
        setLastSelectedProfessional(profPayload);
        setSelectedId(profPayload._id || profPayload.id);
        return;
      }
      
      // perService mode logic
      if (!activeServiceId) return;
      bookingFlow.addProfessional(activeServiceId, profPayload);
      bookingFlow.save();
      window.dispatchEvent(new CustomEvent('bookingFlowChange'));
      
      const unassigned = (bookingFlow.selectedServices || []).find(s => !bookingFlow.selectedProfessionals[s._id]);
      if (unassigned) {
        setActiveServiceId(unassigned._id);
        setSelectedId(null); // Clear selected state for the new active tab
      } else {
        setSelectedId(profPayload._id || profPayload.id);
      }
    }
  };

  if (loading) {
    const numberOfSkeletons = 6;
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="professional-grid">
          {Array.from({ length: numberOfSkeletons }).map((_, index) => (
            <div key={index} className="professional-card skeleton-card">
              <Skeleton circle={true} height={60} width={60} style={{ marginBottom: '10px' }} />
              <Skeleton width="80%" height={16} style={{ marginBottom: '8px' }} />
              <Skeleton width="60%" height={14} style={{ marginBottom: '15px' }} />
              <Skeleton width={40} height={12} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="info-container error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">Try Again</button>
        </div>
      </div>
    );
  }

  if (!selectedServices.length) {
    return (
      <div className="select-professional-container">
        <h2>Select professional</h2>
        <div className="info-container">
          <p>Please select services first to see available professionals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="select-professional-container">
      <h2>Select professional</h2>

      {selectionMode === 'perService' && selectedServices.length > 1 && (
        <div className="service-tabs" role="tablist">
          {selectedServices.map(svc => {
            const assigned = bookingFlow.selectedProfessionals?.[svc._id];
            return (
              <button
                key={svc._id}
                role="tab"
                aria-selected={activeServiceId === svc._id}
                className={`service-tab ${activeServiceId === svc._id ? 'active' : ''} ${assigned ? 'assigned' : ''}`}
                onClick={() => {
                  setActiveServiceId(svc._id);
                  const prof = bookingFlow.selectedProfessionals?.[svc._id];
                  setSelectedId(prof?._id || prof?.id || null);
                }}
              >
                <span className="svc-name">{svc.name}</span>
                {assigned && <span className="svc-assigned-dot" title="Professional selected" />}
              </button>
            );
          })}
        </div>
      )}
      {selectionMode === 'perService' && activeServiceId && selectedServices.length > 1 && (
        <div className="active-service-hint">Assigning professional for: <strong>{selectedServices.find(s => s._id === activeServiceId)?.name}</strong></div>
      )}

      {selectionMode !== 'perService' && selectedServices.length > 1 && (
        <div className="active-service-hint" style={{ marginTop: 8 }}>
          {selectionMode === 'anyAll' && 'All services set to Any professional'}
          {selectionMode === 'oneAll' && (lastSelectedProfessional ? `All services: ${lastSelectedProfessional.name}` : 'Choose a professional to apply to all services')}
        </div>
      )}

      <div className="professional-grid">
        {professionals.map(pro => {
          const isModeCard = !!pro._mode;
          let isSelected = false;

          if (isModeCard) {
            isSelected = selectionMode === pro._mode;
          } else if (selectionMode === 'perService' && activeServiceId) {
            const assignedProfId = bookingFlow.selectedProfessionals?.[activeServiceId]?._id || bookingFlow.selectedProfessionals?.[activeServiceId]?.id;
            isSelected = pro.id === assignedProfId;
          } else if (selectionMode === 'oneAll' && lastSelectedProfessional) {
            isSelected = pro.id === (lastSelectedProfessional._id || lastSelectedProfessional.id);
          } else if (selectionMode === 'anyAll') {
            // A specific professional cannot be selected in this mode
            isSelected = false;
          }

          return (
            <div key={pro.id} className={`professional-card ${isSelected ? 'selected' : ''} ${isModeCard ? 'mode-card' : ''}`} onClick={() => handleProfessionalSelect(pro)}>
              {pro.icon && <div className="icon-circle">{pro.icon}</div>}
              {!pro.icon && !isModeCard && pro.letter && <div className="letter-circle">{pro.letter}</div>}
              <div className="name-text">{pro.name}</div>
              {pro.subtitle && <div className="subtitle-text">{pro.subtitle}</div>}
              {pro.rating > 0 && !isModeCard && (
                <div className="rating-display">
                  <FaStar className="star" />
                  <span>{pro.rating}</span>
                </div>
              )}
              {isModeCard && (
                <div style={{ fontSize: '0.65rem', marginTop: 6, fontWeight: 500, color: '#555' }}>
                  {pro._mode === 'anyAll' && 'Fastest'}
                  {pro._mode === 'perService' && 'Full control'}
                  {pro._mode === 'oneAll' && 'Consistent'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <ServiceBottomBar currentStep={currentStep} navigate={navigate} />
      )}
    </div>
  );
};

function ServiceBottomBar({ currentStep = 2, navigate }) {
  const [selectedServices, setSelectedServices] = React.useState([]);
  const [selectionMode, setSelectionMode] = React.useState('perService');

  React.useEffect(() => {
    bookingFlow.load();
    setSelectedServices(bookingFlow.selectedServices || []);
    setSelectionMode(bookingFlow.selectionMode || 'perService');
    const handler = () => {
      bookingFlow.load();
      setSelectedServices(bookingFlow.selectedServices || []);
      setSelectionMode(bookingFlow.selectionMode || 'perService');
    };
    window.addEventListener("bookingFlowChange", handler);
    return () => window.removeEventListener("bookingFlowChange", handler);
  }, []);

  const totalDuration = selectedServices.reduce((sum, svc) => sum + (svc.duration || 0), 0);
  const totalRate = selectedServices.reduce((sum, svc) => sum + (svc.price || 0), 0);
  
  const canContinue = () => {
    const currentFlow = bookingFlow.load();
    if (!currentFlow.selectedServices || currentFlow.selectedServices.length === 0) return false;
    
    const assignedCount = currentFlow.selectedServices.filter(s => currentFlow.selectedProfessionals && currentFlow.selectedProfessionals[s._id]).length;
    return assignedCount === currentFlow.selectedServices.length;
  };

  const handleContinue = () => {
    if (canContinue()) {
      navigate("/time");
    } else {
      alert("Please select a professional.");
    }
  };

  const assignedCount = (bookingFlow.selectedServices || []).filter(s => bookingFlow.selectedProfessionals?.[s._id]).length;

  return (
    <div className="service-bottom-bar">
      <span>{totalDuration} min</span>
      <span>{selectedServices.length} services</span>
      <span>{assignedCount}/{selectedServices.length} assigned</span>
      <span>AED {totalRate}</span>
      <button
        className={`btn-continue ${!canContinue() ? "disabled" : ""}`}
        onClick={handleContinue}
        disabled={!canContinue()}
      >
        Continue
      </button>
    </div>
  );
}

export default SelectProfessional;