import React, { useState, useEffect, useRef } from "react";
import "./ProfessionalsUpdated.css"; // This CSS file for SelectProfessional
import { FaStar } from "react-icons/fa";
import { bookingsAPI, bookingFlow } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
// import { fetchAvailableProfessionalsForServiceByWeek } from '../bookingUtils';

const SelectProfessional = ({ onProfessionalSelected }) => {
  const [professionals, setProfessionals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeServiceId, setActiveServiceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentStep] = useState(2);
  const previousServicesRef = useRef([]);
  const backupPerServiceRef = useRef({});
  const [lastSelectedProfessional, setLastSelectedProfessional] = useState(null);
  // don't auto-select a mode; only set when user clicks a mode card
  const [selectionMode, setSelectionMode] = useState(bookingFlow.load().selectionMode || null);

  // state for the assign modal
  const [assignModal, setAssignModal] = useState({ open: false, service: null, applyToAll: false, showGrid: false });
  const navigate = useNavigate();
  const location = useLocation();

  // NEW: show per-service assignment only (hide professional grid)
  const [showPerServiceAssignmentOnly, setShowPerServiceAssignmentOnly] = useState(false);

  // helper: list of actual employee cards (exclude mode cards)
  const availableEmployeeCards = professionals.filter(p => !p._mode);

  const openAssignModal = (service, opts = {}) => {
    console.log('[SelectProfessional] openAssignModal', service?._id, opts);
    setAssignModal({ open: true, service, applyToAll: false, showGrid: !!opts.showGrid });
  };
  const closeAssignModal = () => setAssignModal({ open: false, service: null, applyToAll: false, showGrid: false });

  const pickRandomEmployee = () => {
    const employees = availableEmployeeCards;
    if (!employees.length) return null;
    return employees[Math.floor(Math.random() * employees.length)];
  };

  const assignProfessionalToService = (service, card, applyToAll = false) => {
    console.log('[SelectProfessional] assignProfessionalToService', { serviceId: service._id, cardId: card?.id, applyToAll });
    let profPayload;
    if (!card) {
      // no card => treat as Any professional (random)
      const random = pickRandomEmployee();
      if (!random) {
        alert('No available employees to assign.');
        return;
      }
      profPayload = random.employee;
    } else if (card.id === 'mode-any' || card.id === 'any') {
      // explicit Any professional button clicked -> random pick
      const random = pickRandomEmployee();
      if (!random) {
        alert('No available employees to assign.');
        return;
      }
      profPayload = random.employee;
    } else {
      profPayload = card.employee;
    }

    if (!profPayload) {
      console.warn('[SelectProfessional] no profPayload derived, abort');
      return;
    }

    if (applyToAll) {
      bookingFlow.selectedServices.forEach(s => bookingFlow.addProfessional(s._id, profPayload));
    } else {
      bookingFlow.addProfessional(service._id, profPayload);
    }
    bookingFlow.save();
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
    // Update UI selected id / lastSelectedProfessional
    setLastSelectedProfessional(profPayload);
    setSelectedId(profPayload._id || profPayload.id);
    closeAssignModal();
  };
  
  // helper: pick and assign a random available professional for a service
  const assignRandomToService = (service) => {
    const employeesOnly = professionals.filter(p => !p._mode);
    if (!employeesOnly || employeesOnly.length === 0) {
      // nothing to assign
      closeAssignModal();
      return;
    }
    const picked = employeesOnly[Math.floor(Math.random() * employeesOnly.length)];
    // picked has shape same as professional card in list
    assignProfessionalToService(service, picked, assignModal?.applyToAll);
    closeAssignModal();
  };
  
  useEffect(() => {
    const loadSelectedServices = () => {
      const savedData = bookingFlow.load();
      const newServices = savedData.selectedServices || [];
      setSelectedServices(newServices);

      // Do not force selectionMode for single-service; keep user choice.
      if (!activeServiceId && newServices.length && selectionMode === 'perService') {
        setActiveServiceId(newServices[0]._id);
      }
      // restore professional for the single service if previously saved
      if (newServices.length === 1) {
        const singleProf = bookingFlow.selectedProfessionals?.[newServices[0]._id];
        if (singleProf) {
          setLastSelectedProfessional(singleProf);
          setSelectedId(singleProf._id || singleProf.id);
        } else {
          setLastSelectedProfessional(null);
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

      // Removed oneAll handling here (no longer supported)
      if (currentFlow.selectionMode === 'anyAll') {
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
      if (!selectedServices || selectedServices.length === 0) {
        setProfessionals([]);
        return;
      }

      setLoading(true);
      setError(null);

      const firstService = selectedServices[0];
      const serviceId = firstService?._id || firstService?.id;
      const saved = bookingFlow.load();
      const targetDate = saved?.selectedDate ? new Date(saved.selectedDate) : new Date();

      console.log('[SelectProfessional] fetching available professionals for service', { serviceId, targetDateIso: targetDate.toISOString().split('T')[0], selectedServicesCount: selectedServices.length });

      try {
        // Use the appropriate PUBLIC booking API for user-side application
        const available = await bookingsAPI.getAvailableProfessionals(serviceId, targetDate);
        console.log('[SelectProfessional] getAvailableProfessionals result:', available);

        // Backend returns: { success: true, data: { professionals: [...] } }
        const professionals = available.data?.professionals || [];
        
        if (professionals.length > 0) {
          // Mode cards shown first
          const modeCards = [
            { id: 'mode-any', name: 'Any professional', subtitle: 'for maximum availability', icon: '👥', _mode: 'anyAll' },
          ];

          const transformed = professionals.map(item => {
            const emp = item || {};
            console.log('Processing professional:', emp);
            const name = emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : (emp.name || '');
            return {
              id: emp._id || emp.id || `emp-${Math.random().toString(36).slice(2,7)}`,
              name,
              subtitle: emp.position || '',
              letter: (emp.user?.firstName || emp.name || ' ')[0] || '',
              employee: emp,
              availableSlots: [] // Will be populated when needed
            };
          });
          setProfessionals([...modeCards, ...transformed]);
          console.log("Transformed professionals:", transformed);
        } else {
          // Show mode cards even if no professionals available
          setProfessionals([
            { id: 'mode-any', name: 'Any professional', subtitle: 'for maximum availability', icon: '👥', _mode: 'anyAll' },
          ]);
        }
      } catch (err) {
        console.error('[SelectProfessional] error fetching professionals', err);
        setError('Failed to load professionals');
        setProfessionals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [selectedServices]);

  // keep applyAnyAll
  const applyAnyAll = () => {
    console.log('[SelectProfessional] applyAnyAll - backing up per-service assignments', bookingFlow.selectedProfessionals);
    selectedServices.forEach(s => {
      const payload = { id: 'any', name: 'Any professional' };
      console.log('[SelectProfessional] applyAnyAll - assigning', { serviceId: s._id, payload });
      bookingFlow.addProfessional(s._id, payload);
    });
    bookingFlow.save();
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
  };

  const handleProfessionalSelect = (professional) => {
    console.log('[SelectProfessional] professional clicked', { professional, selectionMode, activeServiceId });

    // Mode card clicked
    if (professional._mode) {
      const newMode = professional._mode;
      console.log('[SelectProfessional] mode card selected', newMode);
      setSelectionMode(newMode);
      bookingFlow.selectionMode = newMode;
      bookingFlow.save();
      setSelectedId(professional.id);

      if (newMode === 'anyAll') {
        backupPerServiceRef.current = { ...bookingFlow.selectedProfessionals };
        
        // Instead of just setting "any", immediately assign random professionals to all services
        console.log('[SelectProfessional] "Any professional" selected - assigning random professionals to all services');
        const employeesOnly = professionals.filter(p => !p._mode);
        
        if (employeesOnly.length > 0) {
          selectedServices.forEach(service => {
            // Pick a random professional for each service
            const randomEmployee = employeesOnly[Math.floor(Math.random() * employeesOnly.length)];
            const profPayload = randomEmployee.employee;
            
            console.log('[SelectProfessional] Randomly assigned to service', {
              serviceId: service._id,
              serviceName: service.name,
              professionalId: profPayload._id,
              professionalName: profPayload.user ? 
                `${profPayload.user.firstName} ${profPayload.user.lastName}` : 
                profPayload.name
            });
            
            bookingFlow.addProfessional(service._id, profPayload);
          });
          
          bookingFlow.save();
          window.dispatchEvent(new CustomEvent('bookingFlowChange'));
          
          // Set the last selected professional to one of the randomly assigned ones
          const firstAssignment = Object.values(bookingFlow.selectedProfessionals)[0];
          setLastSelectedProfessional(firstAssignment);
          setSelectedId(firstAssignment?._id || firstAssignment?.id);
          
          // Call the callback to trigger popup auto-close
          if (onProfessionalSelected) {
            onProfessionalSelected();
          }
        } else {
          // Fallback to the original behavior if no employees available
          applyAnyAll();
          setLastSelectedProfessional(null);
          
          // Call the callback to trigger popup auto-close
          if (onProfessionalSelected) {
            onProfessionalSelected();
          }
        }
      } else if (newMode === 'perService') {
        // Immediately switch UI to per-service-assignment (hide professional grid)
        localStorage.setItem('showPerServiceAssignment', 'true');
        sessionStorage.setItem('perServiceToggled', 'true');
        setShowPerServiceAssignmentOnly(true);

        if (Object.keys(backupPerServiceRef.current).length) {
          bookingFlow.selectedServices.forEach(s => {
            console.log('[SelectProfessional] restoring per-service backup for', s._id, backupPerServiceRef.current[s._id]);
            if (backupPerServiceRef.current[s._id]) {
              bookingFlow.addProfessional(s._id, backupPerServiceRef.current[s._id]);
            } else {
              bookingFlow.removeProfessional(s._id);
            }
          });
        } else {
          // If no backup, clear all and start fresh in perService mode
          bookingFlow.selectedServices.forEach(s => {
            console.log('[SelectProfessional] clearing assignment for', s._id);
            bookingFlow.removeProfessional(s._id);
          });
        }
        bookingFlow.save();
        window.dispatchEvent(new CustomEvent('bookingFlowChange'));
        setActiveServiceId(selectedServices[0]?._id);
        setLastSelectedProfessional(null);
        setSelectedId(bookingFlow.selectedProfessionals?.[selectedServices[0]?._id]?._id || bookingFlow.selectedProfessionals?.[selectedServices[0]?._id]?.id || null);
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

    console.log('[SelectProfessional] profPayload prepared', profPayload);

    // DEFAULT BEHAVIOR: ALWAYS assign the professional to ALL services with one click
    // This implements the "one professional for all services" feature
    console.log('[SelectProfessional] DEFAULT: One professional for ALL services - applying to all', {
      professionalId: profPayload._id || profPayload.id,
      professionalName: profPayload.user ? 
        `${profPayload.user.firstName} ${profPayload.user.lastName}` : 
        profPayload.name,
      servicesToAssign: selectedServices.map(s => ({ id: s._id, name: s.name })),
      totalServices: selectedServices.length,
      currentSelectionMode: selectionMode
    });
    
    selectedServices.forEach(service => {
      console.log('[SelectProfessional] Assigning professional to service:', {
        serviceId: service._id,
        serviceName: service.name,
        professionalId: profPayload._id || profPayload.id,
        professionalName: profPayload.user ? 
          `${profPayload.user.firstName} ${profPayload.user.lastName}` : 
          profPayload.name
      });
      bookingFlow.addProfessional(service._id, profPayload);
    });
    
    bookingFlow.selectionMode = 'anyAll'; // Set mode to reflect the behavior
    bookingFlow.save();
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
    setLastSelectedProfessional(profPayload);
    setSelectedId(profPayload._id || profPayload.id);
    setSelectionMode('anyAll'); // Update local state
    
    console.log('[SelectProfessional] SUCCESS: Professional assigned to all services', {
      professionalName: profPayload.user ? 
        `${profPayload.user.firstName} ${profPayload.user.lastName}` : 
        profPayload.name,
      assignedToServices: selectedServices.length,
      assignments: selectedServices.map(s => ({
        service: s.name,
        professional: profPayload.user ? 
          `${profPayload.user.firstName} ${profPayload.user.lastName}` : 
          profPayload.name
      }))
    });
    
    // Call the callback to trigger popup auto-close
    if (onProfessionalSelected) {
      onProfessionalSelected();
    }
    return;
    
    // Note: Removed perService mode logic - all professionals are now assigned to ALL services with one click
  };

  // restore whether user previously clicked Continue (show per-service assignment only)
  useEffect(() => {
    const stored = localStorage.getItem('showPerServiceAssignment') === 'true';
    // If coming back from Time: show panels if stored but DO NOT auto-select a mode card.
    if (location?.state?.from === 'time') {
      setShowPerServiceAssignmentOnly(stored);
      // clear any visual mode selection so no card appears selected
      setSelectionMode(null);
      setSelectedId(null);
      // keep bookingFlow.selectionMode untouched (don't force 'perService')
    } else {
      setShowPerServiceAssignmentOnly(stored);
    }
  }, [location?.state]);

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

      {/* show either the professional grid OR the per-service summary panels (never both) */}
      {showPerServiceAssignmentOnly ? (
        /* summary-only: per-service panels (full-width, professional grid hidden) */
        selectionMode === 'perService' && selectedServices.length > 0 && (
          <div className="per-service-assignment summary-only">
            {selectedServices.map(svc => {
              const assigned = bookingFlow.selectedProfessionals?.[svc._id];
              const assignedName = assigned ? ((assigned.user?.firstName ? `${assigned.user.firstName} ${assigned.user.lastName}` : assigned.name) || 'Assigned') : 'Any professional';
              const avatarLetter = assigned ? ((assigned.user?.firstName || assigned.name || ' ')[0]) : 'A';
              return (
                <div key={svc._id} className="service-panel">
                  <div className="service-panel-left">
                    <div className="service-title">{svc.name}</div>
                    <div className="service-sub">{(svc.duration || 0) + ' min'}</div>
                  </div>
                  <div className="service-panel-right">
                    <button
                      className="service-select"
                      onClick={() => openAssignModal(svc, { showGrid: true })}
                      aria-haspopup="dialog"
                      aria-label={`Choose professional for ${svc.name}`}
                    >
                      <span className="select-avatar">{avatarLetter}</span>
                      <span className="select-text">{assignedName}</span>
                      <span className="select-caret">▾</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* default: show the professional grid (per-service panels not rendered below) */
        <div className="professional-grid">
          {professionals.map(pro => {
            const isModeCard = !!pro._mode;
            let isSelected = false;

            if (isModeCard) {
              isSelected = selectionMode === pro._mode;
            } else if (selectionMode === 'perService' && activeServiceId) {
              const assignedProfId = bookingFlow.selectedProfessionals?.[activeServiceId]?._id || bookingFlow.selectedProfessionals?.[activeServiceId]?.id;
              isSelected = pro.id === assignedProfId;
            } else if (lastSelectedProfessional) {
              // if a professional was applied to all (via anyAll -> chosen pro), highlight them
              isSelected = pro.id === (lastSelectedProfessional._id || lastSelectedProfessional.id);
            } else if (selectionMode === 'anyAll') {
              // A specific professional cannot be selected in this mode unless one was assigned to all
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
                    {pro._mode === 'anyAll'}
                    {pro._mode === 'perService' }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign modal */}
      {assignModal.open && (
        <div
          className="assign-modal-overlay"
          onClick={(e) => {
            // only handle clicks on the backdrop itself (not children)
            if (e.target !== e.currentTarget) return;
            // if modal opened for a specific service, treat backdrop click as "pick random available"
            if (assignModal?.service) {
              assignRandomToService(assignModal.service);
            } else {
              // otherwise just close
              closeAssignModal();
            }
          }}
        >
          <div
            className="assign-modal spa-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choose professional"
          >
             {/** header etc **/}
            <button className="modal-close" aria-label="Close" onClick={closeAssignModal}>✕</button>
 
             {/** professional grid inside modal **/}
             <div className="modal-professional-grid" role="list">
              {(() => {
                // show only employees when modal is service-specific
                const list = assignModal?.service ? professionals.filter(p => !p._mode) : professionals;
                if (!list || list.length === 0) {
                  return <div style={{ padding: 12 }}>No professionals available</div>;
                }
                
                // if service-specific, add an explicit "Any professional" card (picks random) as first item
                const nodes = [];
                if (assignModal?.service) {
                  nodes.push(
                    <button
                      key="any-random"
                      className="modal-professional-card mode-card"
                      onClick={() => {
                        assignRandomToService(assignModal.service);
                      }}
                      role="listitem"
                      title="Any professional (pick random)"
                    >
                      <div className="letter-circle" style={{ background: '#f7f7f7', color: '#111' }}>?</div>
                      <div className="modal-prof-name">Any professional</div>
                      <div className="modal-prof-sub">Pick a random available</div>
                    </button>
                  );
                }

                list.forEach((pro) => {
                  const isModeCard = !!pro._mode;
                  const name = pro.name || (isModeCard ? 'Any professional' : 'Employee');
                  nodes.push(
                    <button
                      key={pro.id || `p-${name}`}
                      className={`modal-professional-card ${isModeCard ? 'mode-card' : ''}`}
                      onClick={() => {
                        if (assignModal?.service) {
                          // service-specific: assign employee to that service
                          assignProfessionalToService(assignModal.service, pro, assignModal.applyToAll);
                        } else {
                          // global: change selection mode or set global professional
                          handleProfessionalSelect(pro);
                        }
                        closeAssignModal();
                      }}
                      role="listitem"
                    >
                      {!isModeCard && pro.letter && <div className="letter-circle">{pro.letter}</div>}
                      <div className="modal-prof-name">{name}</div>
                      {pro.subtitle && <div className="modal-prof-sub">{pro.subtitle}</div>}
                    </button>
                  );
                });

                return nodes;
              })()}
             </div>
          </div>
        </div>
      )}

      {selectedServices.length > 0 && (
        <ServiceBottomBar
          currentStep={currentStep}
          navigate={navigate}
          setShowSummary={(v) => setShowPerServiceAssignmentOnly(v)}
          selectionMode={selectionMode}
          showSummary={showPerServiceAssignmentOnly}
        />
      )}

      {showPerServiceAssignmentOnly && selectionMode === 'perService' && (
        <div style={{ maxWidth: 880, margin: '0 auto 14px', padding: '0 8px' }}>
          <button
            className="back-to-grid"
            onClick={() => {
              // clear the per-service-only flags and show the professional grid again
              localStorage.removeItem('showPerServiceAssignment');
              sessionStorage.removeItem('perServiceToggled');
              setShowPerServiceAssignmentOnly(false);
            }}
            aria-label="Back to professional grid"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0b0b0b',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 8,
              borderColor: 'black'
            }}
          >
            ← Back to professionals
          </button>
        </div>
      )}
    </div>
  );
};

function ServiceBottomBar({ currentStep = 2, navigate, setShowSummary, selectionMode, showSummary }) {
  const [selectedServices, setSelectedServices] = React.useState([]);
  const toggledOnceRef = React.useRef(sessionStorage.getItem('perServiceToggled') === 'true');

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

  const totalDuration = selectedServices.reduce((sum, svc) => sum + (svc.duration || 0), 0);
  const totalRate = selectedServices.reduce((sum, svc) => sum + (svc.price || 0), 0);

  const canContinue = () => {
    const currentFlow = bookingFlow.load();
    if (!currentFlow.selectedServices || currentFlow.selectedServices.length === 0) return false;
    const assignedCount = currentFlow.selectedServices.filter(s => currentFlow.selectedProfessionals && currentFlow.selectedProfessionals[s._id]).length;
    return assignedCount === currentFlow.selectedServices.length;
  };

  const handleContinue = () => {
    const mode = selectionMode || bookingFlow.selectionMode || 'perService';
    const summaryVisible = !!showSummary;

    // If perService mode and panels are NOT visible yet, toggle panels on first Continue.
    // Use a session flag so this occurs only once per user session even if localStorage was set earlier.
    if (mode === 'perService' && !summaryVisible && !toggledOnceRef.current) {
      // show panels (parent state + persist)
      localStorage.setItem('showPerServiceAssignment', 'true');
      sessionStorage.setItem('perServiceToggled', 'true');
      toggledOnceRef.current = true;
      if (typeof setShowSummary === 'function') setShowSummary(true);
      // do NOT navigate yet — user needs to assign professionals per service first
      return;
    }

    // require all services to be assigned before navigating
    if (!canContinue()) {
      alert("Please select a professional for each service before continuing.");
      return;
    }

    // proceed to Time page
    navigate("/time", { state: { from: 'professionals', selectionMode: mode } });
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
        // allow the initial perService toggle even if not all services assigned
        disabled={!canContinue() && !(selectionMode === 'perService' && !showSummary && !toggledOnceRef.current)}
      >
        Continue
      </button>
    </div>
  );
}

export default SelectProfessional;