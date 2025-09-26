// import { bookingFlow, bookingsAPI, paymentsAPI } from './api';

// // Helper to format local-preserved ISO (keeps local time as-is)
// const formatLocalISO = (date) => {
//   const d = date instanceof Date ? date : new Date(date);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   const hours = String(d.getHours()).padStart(2, '0');
//   const minutes = String(d.getMinutes()).padStart(2, '0');
//   const seconds = String(d.getSeconds()).padStart(2, '0');
//   return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
// };

// export const fetchAvailableGateways = async () => {
//   try {
//     const res = await paymentsAPI.getAvailableGateways();
//     return res.data || res;
//   } catch (err) {
//     console.warn('fetchAvailableGateways failed, returning default', err);
//     return { gateways: ['stripe'] };
//   }
// };

// const buildServicesPayload = () => {
//   bookingFlow.load();
//   const services = bookingFlow.selectedServices || [];
//   const payload = services.map((service, index) => {
//     const prof = bookingFlow.selectedProfessionals?.[service._id];
//     // Calculate sequential times based on startTime
//     const baseStart = bookingFlow.selectedTimeSlot && bookingFlow.selectedTimeSlot.startTime
//       ? new Date(bookingFlow.selectedTimeSlot.startTime)
//       : new Date();
//     const startOffset = services.slice(0, index).reduce((sum, s) => sum + (s.duration || 30), 0);
//     const start = new Date(baseStart.getTime() + startOffset * 60000);
//     const end = new Date(start.getTime() + ((service.duration || 30) * 60000));

//     return {
//       service: service._id,
//       employee: prof && (prof._id || prof.id) ? (prof.id === 'any' ? 'any' : (prof._id || prof.id)) : 'any',
//       price: service.price,
//       duration: service.duration,
//       startTime: formatLocalISO(start),
//       endTime: formatLocalISO(end)
//     };
//   });
//   return payload;
// };

// const createBookingIfNeeded = async () => {
//   bookingFlow.load();
//   console.log('createBookingIfNeeded bookingFlow:', bookingFlow);
//   if (bookingFlow.bookingCreated) {
//     console.log('Booking already created, skipping creation.');
//     return bookingFlow.bookingCreated;
//   }
//   // Minimal booking payload similar to Payment.jsx
//   const appointmentDate = bookingFlow.selectedTimeSlot?.date || bookingFlow.selectedDate || new Date().toISOString().split('T')[0];
//   const servicesPayload = buildServicesPayload();

//   const bookingPayload = {
//     client: {
//       id: null,
//       name: null,
//       email: null,
//       phone: null,
//       userId: null
//     },
//     services: servicesPayload,
//     appointmentDate: bookingFlow.selectedTimeSlot?.startTime ? new Date(bookingFlow.selectedTimeSlot.startTime).toISOString() : `${appointmentDate}T12:00:00.000Z`,
//     notes: '',
//     selectionMode: bookingFlow.selectionMode || 'perService'
//   };

//   try {
//     const resp = await bookingsAPI.createBooking(bookingPayload);
//     return resp.data || resp;
//   } catch (err) {
//     console.error('createBookingIfNeeded error', err);
//     throw err;
//   }
// };

// const simulateTestPayment = async (paymentData, method) => {
//   // simulate delay
//   await new Promise(r => setTimeout(r, 1000));
//   return {
//     success: true,
//     paymentId: `test_${Date.now()}`,
//     status: 'succeeded',
//     paymentData
//   };
// };

// export const confirmBookingAndPay = async ({ method = 'card', upiVpa = '', clientInfo = null } = {}) => {
//   console.log('confirmBookingAndPay called with method:', method, 'upiVpa:', upiVpa, 'clientInfo:', clientInfo);
//   try {
//     bookingFlow.load();
//     console.log('confirmBookingAndPay bookingFlow:', bookingFlow);
//     if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
//       throw new Error('No services selected');
//     }
//     if (!bookingFlow.selectedTimeSlot) {
//       throw new Error('No time slot selected');
//     }

//     // 1. Create booking
//     const created = await createBookingIfNeeded();

//     // derive booking id/number
//     let bookingId = created?.booking?._id || created?._id || created?.id || null;
//     let bookingNumber = created?.booking?.bookingNumber || created?.bookingNumber || bookingId;

//     // 2. Prepare payment data
//     const totalAmount = Math.round((bookingFlow.getTotalPrice() || 0) * 1.05);
//     const paymentData = {
//       bookingId: bookingNumber || bookingId,
//       amount: totalAmount,
//       currency: 'AED',
//       paymentMethod: method === 'upi' ? 'digital_wallet' : method,
//       gateway: 'stripe',
//       ...(method === 'upi' && { upiVpa }),
//       clientInfo
//     };

//     // 3. Handle simple test-mode simulation or call paymentsAPI
//     try {
//       const resp = await paymentsAPI.createPayment(paymentData);
//       return { success: true, booking: created, payment: resp };
//     } catch (err) {
//       console.warn('paymentsAPI.createPayment failed, falling back to test simulation', err);
//       const sim = await simulateTestPayment(paymentData, method);
//       return { success: true, booking: created, payment: sim };
//     }
//   } catch (err) {
//     console.error('confirmBookingAndPay error', err);
//     throw err;
//   }
// };

// export default {
//   fetchAvailableGateways,
//   confirmBookingAndPay
// };









import { bookingFlow, bookingsAPI, paymentsAPI } from './api';

// Helper to format local-preserved ISO (keeps local time as-is)
const formatLocalISO = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
};

export const fetchAvailableGateways = async () => {
  try {
    const res = await paymentsAPI.getAvailableGateways();
    return res.data || res;
  } catch (err) {
    console.warn('fetchAvailableGateways failed, returning default', err);
    return { gateways: ['stripe'] };
  }
};

const buildServicesPayload = () => {
  bookingFlow.load();
  const services = bookingFlow.selectedServices || [];
  const payload = services.map((service, index) => {
    const prof = bookingFlow.selectedProfessionals?.[service._id];
    // Calculate sequential times based on startTime
    const baseStart = bookingFlow.selectedTimeSlot && bookingFlow.selectedTimeSlot.startTime
      ? new Date(bookingFlow.selectedTimeSlot.startTime)
      : new Date();
    const startOffset = services.slice(0, index).reduce((sum, s) => sum + (s.duration || 30), 0);
    const start = new Date(baseStart.getTime() + startOffset * 60000);
    const end = new Date(start.getTime() + ((service.duration || 30) * 60000));

    return {
      service: service._id,
      employee: prof && (prof._id || prof.id) ? (prof.id === 'any' ? 'any' : (prof._id || prof.id)) : 'any',
      price: service.price,
      duration: service.duration,
      startTime: formatLocalISO(start),
      endTime: formatLocalISO(end)
    };
  });
  return payload;
};

const createBookingIfNeeded = async () => {
  bookingFlow.load();
  // Minimal booking payload similar to Payment.jsx
  const appointmentDate = bookingFlow.selectedTimeSlot?.date || bookingFlow.selectedDate || new Date().toISOString().split('T')[0];
  const servicesPayload = buildServicesPayload();

  const bookingPayload = {
    client: {
      id: null,
      name: null,
      email: null,
      phone: null,
      userId: null
    },
    services: servicesPayload,
    appointmentDate: bookingFlow.selectedTimeSlot?.startTime ? new Date(bookingFlow.selectedTimeSlot.startTime).toISOString() : `${appointmentDate}T12:00:00.000Z`,
    notes: '',
    selectionMode: bookingFlow.selectionMode || 'perService'
  };

  try {
    const resp = await bookingsAPI.createBooking(bookingPayload);
    return resp.data || resp;
  } catch (err) {
    console.error('createBookingIfNeeded error', err);
    throw err;
  }
};

const simulateTestPayment = async (paymentData, method) => {
  // simulate delay
  await new Promise(r => setTimeout(r, 1000));
  return {
    success: true,
    paymentId: `test_${Date.now()}`,
    status: 'succeeded',
    paymentData
  };
};

export const confirmBookingAndPay = async ({ method = 'card', upiVpa = '', clientInfo = null } = {}) => {
  try {
    bookingFlow.load();
    if (!bookingFlow.selectedServices || bookingFlow.selectedServices.length === 0) {
      throw new Error('No services selected');
    }
    if (!bookingFlow.selectedTimeSlot) {
      throw new Error('No time slot selected');
    }

    // 1. Create booking
    const created = await createBookingIfNeeded();

    // derive booking id/number
    let bookingId = created?.booking?._id || created?._id || created?.id || null;
    let bookingNumber = created?.booking?.bookingNumber || created?.bookingNumber || bookingId;

    // 2. Prepare payment data
    const totalAmount = Math.round((bookingFlow.getTotalPrice() || 0) * 1.05);
    const paymentData = {
      bookingId: bookingNumber || bookingId,
      amount: totalAmount,
      currency: 'AED',
      paymentMethod: method === 'upi' ? 'digital_wallet' : method,
      gateway: 'stripe',
      ...(method === 'upi' && { upiVpa }),
      clientInfo
    };

    // 3. Handle simple test-mode simulation or call paymentsAPI
    try {
      const resp = await paymentsAPI.createPayment(paymentData);
      return { success: true, booking: created, payment: resp };
    } catch (err) {
      console.warn('paymentsAPI.createPayment failed, falling back to test simulation', err);
      const sim = await simulateTestPayment(paymentData, method);
      return { success: true, booking: created, payment: sim };
    }
  } catch (err) {
    console.error('confirmBookingAndPay error', err);
    throw err;
  }
};

export default {
  fetchAvailableGateways,
  confirmBookingAndPay
};
