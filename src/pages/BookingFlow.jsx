import React, { useEffect, useState } from 'react';
import Base_url from '../Service/Base_url.jsx';
import {
  fetchServices,
  fetchEmployees,
  fetchAppointmentsForDate,
  getAvailableProfessionalsForService,
  getAvailableTimeSlotsForProfessional
} from '../services/bookingUtils.js';

// Simple 3-step public booking flow: Service -> Professional -> Time Slot
const BookingFlow = () => {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(new Date());
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [availableProfessionals, setAvailableProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 1: load services
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const svc = await fetchServices(Base_url);
        setServices(svc);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // When service chosen -> fetch employees + appointments for date then compute available professionals
  const handleSelectService = async (service) => {
    setSelectedService(service);
    setSelectedProfessional(null);
    setSelectedSlot(null);
    setAvailableTimeSlots([]);
    setLoading(true); setError(null);
    try {
      const [emps, appts] = await Promise.all([
        fetchEmployees(Base_url),
        fetchAppointmentsForDate(Base_url, date.toISOString().split('T')[0])
      ]);
      setEmployees(emps);
      setAppointments(appts);
      const professionals = getAvailableProfessionalsForService(service._id, date, emps, appts, services);
      setAvailableProfessionals(professionals);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Step 2 choose professional -> compute slots
  const handleSelectProfessional = (prof) => {
    setSelectedProfessional(prof);
    const serviceDuration = selectedService?.duration || 30;
    const slots = getAvailableTimeSlotsForProfessional(prof, date, serviceDuration, appointments);
    setAvailableTimeSlots(slots);
    setStep(3);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    // Continue to next action: collect user details / confirm (not implemented here)
    alert(`Selected ${selectedService?.name} with ${selectedProfessional?.user?.firstName || selectedProfessional?.name} at ${new Date(slot.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedSlot(null);
    setAvailableProfessionals([]);
    setAvailableTimeSlots([]);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h2>User Booking</h2>
      <p>Step {step} of 3</p>
      {error && <div style={{ color:'red' }}>{error}</div>}
      {loading && <div>Loading...</div>}
      {step === 1 && (
        <div>
          <h3>Select a Service</h3>
            <ul style={{ listStyle:'none', padding:0 }}>
              {services.map(s => (
                <li key={s._id} style={{ marginBottom:8 }}>
                  <button onClick={() => handleSelectService(s)} style={{ width:'100%' }}>
                    {s.name} ({s.duration} mins)
                  </button>
                </li>
              ))}
            </ul>
        </div>
      )}
      {step === 2 && (
        <div>
          <h3>Select a Professional</h3>
          <button onClick={resetFlow}>Back</button>
          <ul style={{ listStyle:'none', padding:0 }}>
            {availableProfessionals.map(p => (
              <li key={p._id || p.id} style={{ marginBottom:8 }}>
                <button onClick={() => handleSelectProfessional(p)} style={{ width:'100%' }}>
                  {p.user ? `${p.user.firstName} ${p.user.lastName}` : p.name}
                </button>
              </li>
            ))}
            {availableProfessionals.length === 0 && !loading && <li>No professionals available for this date.</li>}
          </ul>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3>Select a Time</h3>
          <button onClick={() => setStep(2)}>Back</button>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
            {availableTimeSlots.map(slot => (
              <button key={slot.startTime} onClick={() => handleSelectSlot(slot)}>
                {new Date(slot.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </button>
            ))}
            {availableTimeSlots.length === 0 && !loading && <div>No free slots.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingFlow;