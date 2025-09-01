// API service for spa backend
// Always use deployed backend
const API_BASE_URL = 'https://spabackend-0tko.onrender.com/api/v1';
// const API_BASE_URL = ' http://localhost:3000/api/v1';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjhiODQ0ZTE5MDc2MmNhNjkzZDk0MiIsImlhdCI6MTc1NjY0OTM5NCwiZXhwIjoxNzY0NDI1Mzk0fQ.-aMkdC55lk2JfYSK-qwO3Wi2YQwcyBtUeQwP0_kHaM0'
  };
};

// helper: format to local YYYY-MM-DD
const formatLocalYYYYMMDD = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Auth API calls
export const authAPI = {
  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  // Register user
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/auth/update-me`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(response);
  },

  // Update (reset) password for logged in user
  updatePassword: async ({ currentPassword, newPassword }) => {
    const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ passwordCurrent: currentPassword, password: newPassword })
    });
    return handleResponse(response);
  },

  // Logout user
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Services API calls
export const servicesAPI = {
  // Get all services
  getAllServices: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_BASE_URL}/services?${queryString}` : `${API_BASE_URL}/services`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get service by ID
  getService: async (id) => {
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get services by category
  getServicesByCategory: async (category) => {
    const response = await fetch(`${API_BASE_URL}/services/category/${category}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get service categories
  getCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/services/categories`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Search services
  searchServices: async (query) => {
    const response = await fetch(`${API_BASE_URL}/services/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get popular services
  getPopularServices: async () => {
    const response = await fetch(`${API_BASE_URL}/services/popular`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get services with availability
  getServicesWithAvailability: async (date) => {
    const response = await fetch(`${API_BASE_URL}/services/with-availability?date=${date}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Bookings API calls
export const bookingsAPI = {
  // Create booking
  createBooking: async (bookingData) => {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData)
    });
    return handleResponse(response);
  },

  // Get user bookings
  getUserBookings: async (formattedDate) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/all?start=${formattedDate}&end=${formattedDate}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get booking by ID
  getBooking: async (id) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Cancel booking
  cancelBooking: async (id) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Reschedule booking
  rescheduleBooking: async (id, newDateTime) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}/reschedule`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newDateTime })
    });
    return handleResponse(response);
  },

  // Get available services (public)
  getAvailableServices: async () => {
    const response = await fetch(`${API_BASE_URL}/bookings/services`);
    return handleResponse(response);
  },

  // Get available professionals for a service (public)
  getAvailableProfessionals: async (serviceId, date) => {
    const dateStr = formatLocalYYYYMMDD(date);
    const url = `${API_BASE_URL}/employees?weekStartDate=${dateStr}`;
    const response = await fetch(url,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );
    console.log(response.data)
    return handleResponse(response);
  },

  // Fetch bookings in an admin range (used to compute occupied slots)
  getBookingsForRange: async (startDate, endDate) => {
    const s = formatLocalYYYYMMDD(startDate);
    const e = formatLocalYYYYMMDD(endDate);
    const url = `${API_BASE_URL}/bookings?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get available time slots for a professional (public)
  getAvailableTimeSlots: async (employeeId, serviceId, date) => {
    const params = new URLSearchParams({ employeeId, serviceId, date });
    const url = `${API_BASE_URL}/bookings/time-slots?${params}`;
    console.log('Calling time slots API with URL:', url);
    console.log('Parameters:', { employeeId, serviceId, date });
    
    try {
      const response = await fetch(url);
      console.log('Time slots API response status:', response.status);
      console.log('Time slots API response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Time slots API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await handleResponse(response);
      console.log('Time slots API result:', result);
      return result;
    } catch (error) {
      console.error('Time slots API fetch error:', error);
      throw error;
    }
  },

  // Create booking confirmation (public)
  createBookingConfirmation: async (confirmationData) => {
    const response = await fetch(`${API_BASE_URL}/bookings/confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(confirmationData)
    });
    return handleResponse(response);
  },

  // Complete booking after authentication
  completeBooking: async (bookingData) => {
    // Prepare services data for the backend
    const services = bookingData.selectedServices.map(service => ({
      serviceId: service._id,
      employeeId: bookingData.selectedProfessional._id,
      startTime: bookingData.selectedTimeSlot.startTime,
      endTime: bookingData.selectedTimeSlot.endTime,
      notes: ''
    }));

    const bookingPayload = {
      services,
      appointmentDate: bookingData.selectedDate,
      notes: bookingData.notes || ''
    };

    const response = await fetch(`${API_BASE_URL}/bookings/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingPayload)
    });
    return handleResponse(response);
  }
};

// Employees API calls
export const employeesAPI = {
  // Get available employees for service
  getAvailableEmployees: async (serviceId, date) => {
    const response = await fetch(`${API_BASE_URL}/employees/available/${serviceId}?date=${date}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get employees for a given week start (weekStartDate = YYYY-MM-DD)
  getEmployeesByWeekStart: async (weekStartDate) => {
    const q = formatLocalYYYYMMDD(weekStartDate);
    const url = `${API_BASE_URL}/employees?weekStartDate=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get employee profile
  getEmployeeProfile: async (id) => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get all employees (admin only)
  getAllEmployees: async () => {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get employee by ID (admin only)
  getEmployee: async (id) => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get user role
  getUserRole: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role;
  },

  // Format date for API
  formatDate: (date) => {
    // Use local YYYY-MM-DD to match localDateKey and booking indexing (avoid UTC shift)
    const dt = date instanceof Date ? date : new Date(date);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // Format time for API
  formatTime: (date) => {
    return date.toISOString();
  },

  // Parse time slot to readable format
  parseTimeSlot: (timeSlot) => {
    const date = new Date(timeSlot.startTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  },

  // Format duration in minutes to readable format
  formatDuration: (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${remainingMinutes} min`;
  },

  // Format price to currency
  formatPrice: (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
};

// Booking flow state management
export const bookingFlow = {
  // Store selected services (array for multiple services)
  selectedServices: [],
  
  // Store selected professionals (object with serviceId as key)
  selectedProfessionals: {},
  
  // Store selected date
  selectedDate: null,
  
  // Store selected time slot
  selectedTimeSlot: null,
  
  // Store booking confirmation
  bookingConfirmation: null,

  // Store selection mode for professionals ('perService' | 'anyAll' | 'oneAll')
  selectionMode: 'perService',
  
  // Reset booking flow
  reset: () => {
    bookingFlow.selectedServices = [];
    bookingFlow.selectedProfessionals = {};
    bookingFlow.selectedDate = null;
    bookingFlow.selectedTimeSlot = null;
    bookingFlow.bookingConfirmation = null;
  bookingFlow.selectionMode = 'perService';
    
    // Clear localStorage as well
    localStorage.removeItem('bookingFlow');
    localStorage.removeItem('bookingData');
    localStorage.removeItem('currentBooking');
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
    
    console.log('BookingFlow: Reset completed - all data cleared');
  },
  
  // Add service to booking
  addService: (service) => {
    // Check if service already exists
    const existingService = bookingFlow.selectedServices.find(s => s._id === service._id);
    if (!existingService) {
      bookingFlow.selectedServices.push(service);
      bookingFlow.save();
    }
  },
  
  // Remove service from booking
  removeService: (serviceId) => {
    bookingFlow.selectedServices = bookingFlow.selectedServices.filter(s => s._id !== serviceId);
    // Also remove the associated professional
    delete bookingFlow.selectedProfessionals[serviceId];
    bookingFlow.save();
  },
  
  // Add professional for a specific service
  addProfessional: (serviceId, professional) => {
    bookingFlow.selectedProfessionals[serviceId] = professional;
    bookingFlow.save();
  },
  
  // Get professional for a specific service
  getProfessional: (serviceId) => {
    return bookingFlow.selectedProfessionals[serviceId];
  },
  
  // Get total price of all selected services
  getTotalPrice: () => {
    return bookingFlow.selectedServices.reduce((total, service) => total + service.price, 0);
  },
  
  // Get total duration of all selected services
  getTotalDuration: () => {
    return bookingFlow.selectedServices.reduce((total, service) => total + service.duration, 0);
  },
  
  // Save to localStorage
  save: () => {
    localStorage.setItem('bookingFlow', JSON.stringify({
      selectedServices: bookingFlow.selectedServices,
      selectedProfessionals: bookingFlow.selectedProfessionals,
      selectedDate: bookingFlow.selectedDate,
      selectedTimeSlot: bookingFlow.selectedTimeSlot,
  bookingConfirmation: bookingFlow.bookingConfirmation,
  selectionMode: bookingFlow.selectionMode
    }));
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('bookingFlowChange'));
  },
  
  // Load from localStorage
  load: () => {
    const saved = localStorage.getItem('bookingFlow');
    if (saved) {
      const data = JSON.parse(saved);
      // Handle migration from old single service to new multiple services
      if (data.selectedService && !data.selectedServices) {
        bookingFlow.selectedServices = [data.selectedService];
      } else {
        bookingFlow.selectedServices = data.selectedServices || [];
      }
      
      // Handle migration from old single professional to new multiple professionals
      if (data.selectedProfessional && !data.selectedProfessionals) {
        // If we have multiple services, assign the professional to the first service
        if (bookingFlow.selectedServices.length > 0) {
          bookingFlow.selectedProfessionals = {
            [bookingFlow.selectedServices[0]._id]: data.selectedProfessional
          };
        }
      } else {
        bookingFlow.selectedProfessionals = data.selectedProfessionals || {};
      }
      
      bookingFlow.selectedDate = data.selectedDate;
      bookingFlow.selectedTimeSlot = data.selectedTimeSlot;
      bookingFlow.bookingConfirmation = data.bookingConfirmation;
  bookingFlow.selectionMode = data.selectionMode || 'perService';
      return data;
    }
    return {
      selectedServices: [],
      selectedProfessionals: {},
      selectedDate: null,
      selectedTimeSlot: null,
  bookingConfirmation: null,
  selectionMode: 'perService'
    };
  }
};

// Payment API calls
export const paymentsAPI = {
  // Get payment history
  getPaymentHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/payments/history`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get payment by ID
  getPaymentById: async (paymentId) => {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get payment status
  getPaymentStatus: async (paymentId) => {
    const response = await fetch(`${API_BASE_URL}/payments/status/${paymentId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Confirm payment
  confirmPayment: async (gateway, paymentData) => {
    const response = await fetch(`${API_BASE_URL}/payments/confirm/${gateway}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(response);
  },

  // Get available payment gateways
  getAvailableGateways: async () => {
    const response = await fetch(`${API_BASE_URL}/payments/gateways/available`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Create payment
  createPayment: async (paymentData) => {
    // Temporarily bypass payment gateway: return a successful mock so booking can be created without payment.
    // Original implementation kept commented for reference.
    /*
    const response = await fetch(`${API_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(response);
    */

    console.log('[paymentsAPI] createPayment bypassed - returning mock success', { paymentData });
    return Promise.resolve({
      success: true,
      data: {
        status: 'bypassed',
        message: 'Payment step bypassed in client (no external payment performed).',
        clientSecret: null,
        paymentUrl: null,
        paymentId: null
      }
    });
  }
};

// Feedback API calls
export const feedbackAPI = {
  // Create feedback
  createFeedback: async (feedbackData) => {
    const response = await fetch(`${API_BASE_URL}/feedback/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(feedbackData)
    });
    return handleResponse(response);
  },

  // Get user's feedback
  getUserFeedback: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/feedback/my-feedback?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get feedback by booking
  getFeedbackByBooking: async (bookingId) => {
    const response = await fetch(`${API_BASE_URL}/feedback/booking/${bookingId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Update feedback
  updateFeedback: async (feedbackId, feedbackData) => {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(feedbackData)
    });
    return handleResponse(response);
  },

  // Delete feedback
  deleteFeedback: async (feedbackId) => {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Get feedback by ID
  getFeedbackById: async (feedbackId) => {
    const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export default {
  auth: authAPI,
  services: servicesAPI,
  bookings: bookingsAPI,
  employees: employeesAPI,
  payments: paymentsAPI,
  feedback: feedbackAPI,
  utils: apiUtils
};