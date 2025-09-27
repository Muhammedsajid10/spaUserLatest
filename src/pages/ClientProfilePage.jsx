import { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Star,
  CreditCard,
  MessageSquare,
  Edit,
  X,
  Plus,
  Key,
  Sun,
  Moon,
  Menu,
  Clock,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import Swal from "sweetalert2";
import "./ClientProfilePage.css";
import {
  authAPI,
  bookingsAPI,
  paymentsAPI,
  feedbackAPI,
} from "../services/api";
import { useNavigate } from "react-router-dom";

/* -------------------
   Utility UI States
   ------------------- */
const LoadingState = () => (
  <div className="empty-state">
    <div className="empty-state-card">
      <div className="spinner-border mx-auto mb-4"></div>
      <h3 className="empty-state-title">Loading...</h3>
      <p className="empty-state-description">
        Please wait while we load your dashboard.
      </p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="empty-state">
    <div className="empty-state-card error">
      <MessageSquare className="empty-state-icon" />
      <h3 className="empty-state-title">Something went wrong</h3>
      <p className="empty-state-description">{message}</p>
      <div className="empty-state-actions">
        <button onClick={onRetry} className="btn btn-primary">
          Retry
        </button>
      </div>
    </div>
  </div>
);

/* -------------------
   Enhanced Sidebar
   ------------------- */
const Sidebar = ({ activeTab, onTabChange, isOpen, onClose, isMobile }) => {
  const sidebarItems = [
    { key: "bookings", label: "Bookings", icon: Calendar },
    { key: "invoices", label: "Invoices & Payments", icon: CreditCard },
    { key: "feedback", label: "My Feedback", icon: Star },
    { key: "profile", label: "Profile", icon: User },
  ];

  const handleTabChange = (tab) => {
    onTabChange(tab);
    if (isMobile) {
      onClose();
    }
  };
  const navigate = useNavigate();
  const navigateToService = () => {
    navigate("/booking");
  };

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        {isMobile && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="p-6 border-b border-gray-200">
        <button onClick={navigateToService} className="btn btn-primary w-full">
          <Plus className="w-4 h-4" />
          <span>Book a Service</span>
        </button>
      </div>
      <nav className="sidebar-nav flex-1">
        <ul>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => handleTabChange(item.key)}
                  className={`sidebar-link ${
                    activeTab === item.key ? "active" : ""
                  }`}
                  aria-current={activeTab === item.key ? "page" : undefined}
                >
                  <Icon className="icon" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return sidebarContent;
};

/* -------------------
   Enhanced Profile Header
   ------------------- */
const ProfileHeader = ({ profile }) => (
  <div className="profile-header">
    <div className="flex items-center space-x-6">
      <div className="profile-avatar">
        {profile?.profileImage ? (
          <img
            src={profile.profileImage}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <User className="w-10 h-10 text-gray-400" />
        )}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900">
          {profile?.fullName ||
            `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()}
        </h1>
        <p className="profile-meta">
          Member since{" "}
          {new Date(profile?.createdAt || new Date()).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
            }
          )}
        </p>
        <p className="profile-email">{profile?.email}</p>
        {profile?.phone && (
          <p className="profile-phone">
            <Phone className="w-4 h-4 inline mr-1" />
            {profile.phone}
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        {/* <button 
          className="btn btn-secondary btn-sm"
          onClick={() => Swal.fire({
            title: "Edit Profile",
            text: "Profile editing functionality would be implemented here.",
            icon: "info"
          })}
        >
          <Edit className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => Swal.fire({
            title: "Change Password",
            text: "Password change functionality would be implemented here.",
            icon: "info"
          })}
        >
          <Key className="w-4 h-4" />
          <span>Change Password</span>
        </button> */}
      </div>
    </div>
  </div>
);

/* -------------------
   Booking Item Component
   ------------------- */

const BookingItem = ({ booking, feedbackList, onGiveRating }) => {
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "badge-default";
      case "pending":
        return "badge-secondary";
      case "cancelled":
        return "badge-destructive";
      default:
        return "badge-secondary";
    }
  };

  // ✅ Check if feedback exists for this booking
  const bookingFeedback = feedbackList?.find(
    (f) =>
      f.bookingId === booking._id ||
      f.bookingId === booking.id ||
      f.booking?._id === booking._id
  );

  const hasRating =
    bookingFeedback?.ratings?.overall > 0 || bookingFeedback?.rating > 0;

  return (
    <div className="booking-item">
      {/* Booking Header */}
      <div className="booking-header">
        <div className="booking-info">
          <h4 className="booking-title">
            Booking #{booking.bookingNumber || booking.id || booking._id}
          </h4>
          <div className="booking-meta">
            <span className="booking-date">
              <Calendar className="w-4 h-4" />
              {formatDate(booking.appointmentDate || booking.createdAt)}
            </span>
            {booking.appointmentDate && (
              <span className="booking-time">
                <Clock className="w-4 h-4" />
                {formatTime(booking.appointmentDate)}
              </span>
            )}
          </div>
        </div>
        <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
          {booking.status || "pending"}
        </span>
      </div>

      {/* Services */}
      {booking.services && booking.services.length > 0 && (
        <div className="booking-services">
          <h5 className="services-title">Services:</h5>
          <div className="services-list">
            {booking.services.map((service, index) => (
              <div
                key={service.id || service._id || index}
                className="service-item"
              >
                <div className="service-info">
                  <span className="service-name">
                    {service.service?.name || `Service ${index + 1}`}
                  </span>
                  <span className="service-duration">{service.duration} min</span>
                </div>
                <div className="service-details">
                  <span className="service-price">
                    {booking.currency || "AED"} {service.price}
                  </span>
                  {service.employee?.user && (
                    <span className="service-employee">
                      with {service.employee.user.firstName}{" "}
                      {service.employee.user.lastName}
                    </span>
                  )}
                </div>
                {service.startTime && service.endTime && (
                  <div className="service-time">
                    {formatTime(service.startTime)} - {formatTime(service.endTime)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="booking-footer">
        <div className="booking-total">
          <span className="total-label">Total Amount:</span>
          <span className="total-amount">
            {booking.currency || "AED"}{" "}
            {booking.finalAmount || booking.totalAmount || 0}
          </span>
        </div>

        {booking.paymentStatus && (
          <div className="payment-status">
            <span className="payment-label">Payment:</span>
            <span
              className={`payment-badge ${
                booking.paymentStatus === "paid" ? "paid" : "pending"
              }`}
            >
              {booking.paymentStatus}
            </span>
          </div>
        )}

        {/* ✅ Give Rating button - disabled if rating already exists */}
        <button
          className="btn btn-secondary btn-sm mt-2"
          disabled={hasRating}
          onClick={() => {
            if (hasRating) return; // prevent click if already rated
            const firstService = booking.services?.[0];
            const serviceId =
              firstService?.service?._id || firstService?.serviceId;
            const employeeId =
              firstService?.employee?._id || firstService?.employeeId;
            onGiveRating(booking._id || booking.id, serviceId, employeeId);
          }}
        >
          Give Rating
        </button>
      </div>

      {/* Client Info */}
      {booking.client && (
        <div className="booking-client">
          <h6 className="client-title">Client Information:</h6>
          <div className="client-info">
            <span className="client-name">
              <User className="w-4 h-4" />
              {booking.client.fullName ||
                `${booking.client.firstName} ${booking.client.lastName}`}
            </span>
            <span className="client-email">
              <Mail className="w-4 h-4" />
              {booking.client.email}
            </span>
            {booking.client.phone && (
              <span className="client-phone">
                <Phone className="w-4 h-4" />
                {booking.client.phone}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


/* -------------------
   Invoice Item Component (Expanded)
   ------------------- */
const InvoiceItem = ({ invoice }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "completed":
        return "badge-default";
      case "pending":
        return "badge-secondary";
      case "failed":
      case "cancelled":
        return "badge-destructive";
      default:
        return "badge-secondary";
    }
  };

  return (
    <div className="invoice-item">
      {/* Invoice Header */}
      <div className="invoice-header">
        <div className="invoice-date">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(invoice.createdAt)}</span>
        </div>
        <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
          {invoice.status || "pending"}
        </span>
      </div>

      {/* Invoice Core Info */}
      <div className="invoice-content">
        <div className="invoice-details">
          <h4 className="invoice-id">Invoice #{invoice.id}</h4>
          <p className="invoice-description">
            Payment via {invoice.paymentMethod || "N/A"} •{" "}
            {invoice.paymentGateway || "N/A"}
          </p>
          {invoice.booking && (
            <p className="invoice-booking">
              Booking: {invoice.booking.id || "N/A"} •{" "}
              <span
                className={`badge ${getStatusBadgeClass(
                  invoice.booking.status
                )}`}
              >
                {invoice.booking.status}
              </span>
            </p>
          )}
        </div>

        <div className="invoice-amount">
          <div className="invoice-price">
            <span className="amount-value">
              {invoice.currency || "AED"}{" "}
              {invoice.amount ? invoice.amount.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      </div>

      {/* Services Section */}
      {invoice.booking?.services?.length > 0 && (
        <div className="booking-services">
          <h5 className="services-title">Services:</h5>
          <div className="services-list">
            {invoice.booking.services.map((service, index) => (
              <div key={service.id || index} className="service-item">
                <div className="service-info">
                  <span className="service-name">
                    {service.service?.name || `Service ${index + 1}`}
                  </span>
                  <span className="service-duration">
                    {service.duration} min
                  </span>
                </div>
                <div className="service-details">
                  <span className="service-price">
                    {invoice.currency || "AED"} {service.price}
                  </span>
                  {service.employee?.user && (
                    <span className="service-employee">
                      with {service.employee.user.fullName}
                    </span>
                  )}
                </div>
                {service.startTime && service.endTime && (
                  <div className="service-time">
                    {formatTime(service.startTime)} -{" "}
                    {formatTime(service.endTime)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Section */}
      {invoice.booking?.client && (
        <div className="booking-client">
          <h6 className="client-title">Client Information:</h6>
          <div className="client-info">
            <span className="client-name">
              <User className="w-4 h-4" />
              {invoice.booking.client.fullName}
            </span>
            <span className="client-email">
              <Mail className="w-4 h-4" />
              {invoice.booking.client.email}
            </span>
            {invoice.booking.client.phone && (
              <span className="client-phone">
                <Phone className="w-4 h-4" />
                {invoice.booking.client.phone}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------
   Enhanced Main Page
   ------------------- */
const SpaProfilePage = () => {
  const [activeTab, setActiveTab] = useState("bookings");
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [ratingServiceId, setRatingServiceId] = useState(null);
  const [ratingEmployeeId, setRatingEmployeeId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(true);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editFeedbackValue, setEditFeedbackValue] = useState(0);
  const [editFeedbackComment, setEditFeedbackComment] = useState("");

  // Enhanced responsive check with debouncing
  useEffect(() => {
    let timeoutId;

    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newIsMobile = window.innerWidth < 1024;
        setIsMobile(newIsMobile);

        // Auto-close sidebar when switching to desktop
        if (!newIsMobile && sidebarOpen) {
          setSidebarOpen(false);
        }
      }, 100);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      clearTimeout(timeoutId);
    };
  }, [sidebarOpen]);

  // Enhanced data fetching with better error handling - USING ACTUAL API CALLS
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Starting to fetch profile data...");
        setLoading(true);
        setError(null);

        console.log("Making API requests...");
        const [profileRes, bookingsRes, invoicesRes, feedbackRes] =
          await Promise.allSettled([
            authAPI.getCurrentUser(),
            bookingsAPI.getUserBookings(),
            paymentsAPI.getPaymentHistory(),
            feedbackAPI.getUserFeedback(),
          ]);

        console.log("API Responses:", {
          profile:
            profileRes.status === "fulfilled"
              ? profileRes.value?.data
              : profileRes.reason,
          bookings:
            bookingsRes.status === "fulfilled"
              ? bookingsRes.value?.data
              : bookingsRes.reason,
          payments:
            invoicesRes.status === "fulfilled"
              ? invoicesRes.value?.data
              : invoicesRes.reason,
          feedback:
            feedbackRes.status === "fulfilled"
              ? feedbackRes.value?.data
              : feedbackRes.reason,
        });

        // Set states with proper fallbacks and error handling
        setProfile(
          profileRes.status === "fulfilled"
            ? profileRes.value?.data?.user || null
            : null
        );
        setBookings(
          bookingsRes.status === "fulfilled"
            ? bookingsRes.value?.data?.bookings || []
            : []
        );
        setInvoices(
          invoicesRes.status === "fulfilled"
            ? invoicesRes.value?.data?.payments || []
            : []
        );
        setFeedback(
          feedbackRes.status === "fulfilled"
            ? feedbackRes.value?.data?.feedback || []
            : []
        );

        console.log("State after update:", {
          profile:
            profileRes.status === "fulfilled"
              ? profileRes.value?.data?.user || null
              : null,
          bookingsCount:
            bookingsRes.status === "fulfilled"
              ? bookingsRes.value?.data?.bookings?.length || 0
              : 0,
          invoicesCount:
            invoicesRes.status === "fulfilled"
              ? invoicesRes.value?.data?.payments?.length || 0
              : 0,
          feedbackCount:
            feedbackRes.status === "fulfilled"
              ? feedbackRes.value?.data?.feedback?.length || 0
              : 0,
        });
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred while loading data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize editProfile when profile data loads
  useEffect(() => {
    if (profile) {
      setEditProfile(profile);
    }
  }, [profile]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await authAPI.updateProfile(editProfile);
      setProfile(response.data.user);
      setEditMode(false);
      Swal.fire({
        title: "Success!",
        text: "Profile updated successfully",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Update failed:", error);
      Swal.fire({
        title: "Error!",
        text: error.response?.data?.message || "Failed to update profile",
        icon: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. Handler functions for rating popup
  const openRatingPopup = (bookingId, serviceId = null, employeeId = null) => {
    setRatingBookingId(bookingId);
    setRatingServiceId(serviceId);
    setRatingEmployeeId(employeeId);
    setShowRatingPopup(true);
    setRatingValue(0);
    setRatingComment("");
  };

  const closeRatingPopup = () => {
    setShowRatingPopup(false);
    setRatingBookingId(null);
    setRatingServiceId(null);
    setRatingEmployeeId(null);
    setRatingValue(0);
    setRatingComment("");
  };

  const handleRatingSubmit = async () => {
    if (isSubmittingRating) return; // Prevent double submission
    
    try {
      setIsSubmittingRating(true);
      
      // Get the booking to extract service and employee information if not provided
      const booking = bookings.find((b) => (b._id || b.id) === ratingBookingId);
      
      // Use provided IDs or extract from booking
      const serviceId = ratingServiceId || booking?.services?.[0]?.service?._id || booking?.services?.[0]?.serviceId;
      const employeeId = ratingEmployeeId || booking?.services?.[0]?.employee?._id || booking?.services?.[0]?.employeeId;
      
      // Validate required fields
      if (!ratingBookingId) {
        throw new Error("Booking ID is required");
      }
      if (!serviceId) {
        throw new Error("Service ID is required");
      }
      if (!employeeId) {
        throw new Error("Employee ID is required");
      }
      
      const feedbackData = {
        // Basic references
        bookingId: ratingBookingId,
        serviceId: serviceId,
        employeeId: employeeId,
        // Include client/server-visible booking/service/employee snapshots so backend stores exact context
        booking: booking
          ? {
              _id: booking._id || booking.id,
              id: booking._id || booking.id,
              bookingNumber: booking.bookingNumber || null,
              appointmentDate: booking.appointmentDate || booking.createdAt || null,
              status: booking.status || null,
              currency: booking.currency || null,
              finalAmount: booking.finalAmount || booking.totalAmount || null,
            }
          : null,
        service: booking?.services?.[0]?.service || null,
        employee: booking?.services?.[0]?.employee || null,
        client: booking?.client || profile || null,
        // Main user inputs
        ratings: {
          overall: ratingValue,
        },
        comment: ratingComment,
        // Extra metadata: client-side timestamp + timezone (server may override)
        createdAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Dummy / compatibility fields
        comments: "",
        wouldRecommend: true,
        wouldReturnAsCustomer: true,
        visitFrequency: "first-time",
        discoveryMethod: "friend-referral",
        suggestions: ""
       };

      console.log('Submitting feedback:', feedbackData);
      console.log('Available booking data:', booking);
      console.log('Service ID extracted:', serviceId);
      console.log('Employee ID extracted:', employeeId);

      // Call the API to create feedback
      const response = await feedbackAPI.createFeedback(feedbackData);
      
      if (response.success) {
        // Add the new feedback to local state for immediate UI update
        const newFeedback = {
          ...response.data,
          serviceName: booking?.services?.[0]?.service?.name || "Service",
          date: new Date()
        };
        setFeedback((prev) => [newFeedback, ...prev]);
        
        closeRatingPopup();
        Swal.fire({
          title: "Thank you!",
          text: "Your feedback has been submitted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to submit feedback. Please try again.",
        icon: "error",
        confirmButtonText: "OK"
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Start editing feedback
  const handleEditFeedback = (item) => {
    setEditingFeedbackId(item._id || item.id);
    setEditFeedbackValue(item.rating || 0);
    setEditFeedbackComment(item.comment || "");
  };

  // Save edited feedback using API
  const handleSaveEditedFeedback = async () => {
    try {
      const feedbackData = {
        // Main user inputs
        ratings: { 
          overall: editFeedbackValue
        },
        comment: editFeedbackComment,
        // Dummy fields with proper types
        comments: "",
        wouldRecommend: true,
        wouldReturnAsCustomer: true,
        visitFrequency: "first-time",
        discoveryMethod: "friend-referral",
        suggestions: ""
      };

      console.log('Updating feedback:', editingFeedbackId, feedbackData);

      // Call the API to update feedback
      const response = await feedbackAPI.updateFeedback(editingFeedbackId, feedbackData);
      
      if (response.success) {
        // Update the local state with the updated feedback
        setFeedback((prev) =>
          prev.map((item) =>
            (item._id || item.id) === editingFeedbackId
              ? { ...item, rating: editFeedbackValue, comment: editFeedbackComment }
              : item
          )
        );
        
        setEditingFeedbackId(null);
        setEditFeedbackValue(0);
        setEditFeedbackComment("");
        
        Swal.fire({
          title: "Updated!",
          text: "Your feedback has been updated successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "Failed to update feedback");
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to update feedback. Please try again.",
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };

  // Cancel editing
  const handleCancelEditFeedback = () => {
    setEditingFeedbackId(null);
    setEditFeedbackValue(0);
    setEditFeedbackComment("");
  };

  // Enhanced sidebar management
  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Enhanced outside click handler
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;

    const handleClickOutside = (event) => {
      const sidebar = document.querySelector(".sidebar-container");
      const toggleButton = document.querySelector(".mobile-menu-button");

      if (
        sidebar &&
        !sidebar.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target)
      ) {
        closeSidebar();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isMobile, sidebarOpen]);

  // Enhanced body scroll lock
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add("menu-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
    }

    return () => {
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
    };
  }, [isMobile, sidebarOpen]);

  // Enhanced content renderer with better accessibility
  const renderContent = () => {
    console.log("Rendering content, current state:", {
      loading,
      error,
      activeTab,
      hasProfile: !!profile,
      bookingsCount: bookings?.length || 0,
      invoicesCount: invoices?.length || 0,
      feedbackCount: feedback?.length || 0,
    });

    if (loading) {
      console.log("Showing loading state");
      return <LoadingState />;
    }

    if (error) {
      console.log("Showing error state:", error);
      return (
        <ErrorState
          message={error}
          onRetry={() => {
            console.log("Retry button clicked");
            window.location.reload();
          }}
        />
      );
    }

    console.log(`Rendering tab: ${activeTab}`);

    switch (activeTab) {
      case "bookings":
        console.log("Bookings data:", bookings);
        return bookings?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <Calendar className="w-5 h-5" />
              Bookings ({bookings.length})
            </h3>
            <div className="space-y-4">
              {bookings.map((booking, index) => (
                <BookingItem
                  key={booking._id || booking.id || `booking-${index}`}
                  booking={booking}
                  onGiveRating={openRatingPopup}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <Calendar className="empty-state-icon" />
              <h3 className="empty-state-title">No Bookings Found</h3>
              <p className="empty-state-description">
                You don't have any bookings yet. Book your first service to get
                started!
              </p>
              <div className="empty-state-actions">
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    Swal.fire({
                      title: "Book Service",
                      text: "Service booking functionality would be implemented here.",
                      icon: "info",
                    })
                  }
                >
                  <Plus className="w-4 h-4" />
                  Book a Service
                </button>
              </div>
            </div>
          </div>
        );

      case "invoices":
        console.log("Invoices data:", invoices);
        return invoices?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <CreditCard className="w-5 h-5" />
              Invoices & Payments ({invoices.length})
            </h3>
            <div className="space-y-4">
              {invoices.map((invoice, index) => (
                <InvoiceItem
                  key={invoice.id || `invoice-${index}`}
                  invoice={invoice}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <CreditCard className="empty-state-icon" />
              <h3 className="empty-state-title">No Invoices Found</h3>
              <p className="empty-state-description">
                Your payment history will appear here once you complete a
                booking.
              </p>
            </div>
          </div>
        );

      case "feedback":
        console.log("Feedback data:", feedback);
        return feedback?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <Star className="w-5 h-5" />
              My Feedback ({feedback.length})
            </h3>
            <div className="space-y-6">
              {feedback.map((item, index) => {
                const isEditing = (item._id || item.id) === editingFeedbackId;
                return (
                  <div
                    key={item._id || item.id || `feedback-${index}`}
                    className="feedback-item"
                  >
                    {isEditing ? (
                      <div>
                        <div className="feedback-header">
                          <div>
                            <h4 className="feedback-title">
                              {item.booking?.services?.[0]?.service?.name || 
                               item.service?.name || 
                               item.serviceName || 
                               `Service ${index + 1}`}
                            </h4>
                            <div className="feedback-professional">
                              Professional: {item.employee?.user?.firstName} {item.employee?.user?.lastName}
                            </div>
                          </div>
                          <div className="feedback-rating">
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`star ${
                                    star <= editFeedbackValue ? "filled" : ""
                                  } cursor-pointer`}
                                  onClick={() => setEditFeedbackValue(star)}
                                />
                              ))}
                            </div>
                            <span className="feedback-rating-text">
                              {editFeedbackValue}/5
                            </span>
                          </div>
                        </div>
                        <textarea
                          className="w-full border border-gray-200 rounded-lg p-3 mb-2"
                          rows={3}
                          value={editFeedbackComment}
                          onChange={(e) => setEditFeedbackComment(e.target.value)}
                          maxLength={300}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleSaveEditedFeedback}
                            disabled={editFeedbackValue === 0}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleCancelEditFeedback}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="feedback-header">
                          <div>
                            <h4 className="feedback-title">
                              {item.booking?.services?.[0]?.service?.name || 
                               item.service?.name || 
                               item.serviceName || 
                               `Service ${index + 1}`}
                            </h4>
                            <div className="feedback-professional">
                              Professional: {item.employee?.user?.firstName} {item.employee?.user?.lastName}
                            </div>
                            <div className="feedback-date">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleDateString()
                                  : item.date
                                  ? new Date(item.date).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="feedback-rating">
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`star ${
                                    star <= (item.ratings?.overall || item.rating || 0) ? "filled" : ""
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="feedback-rating-text">
                              {item.ratings?.overall || item.rating || 0}/5
                            </span>
                          </div>
                        </div>
                        {(item.comment || item.comments) && (
                          <div className="feedback-comment">
                            <p>{item.comment || item.comments}</p>
                          </div>
                        )}
                      </>
                    )}
                    {/* ...existing breakdown code if any... */}
                    {item.breakdown && !isEditing && (
                      <div className="feedback-breakdown">
                        {Object.entries(item.breakdown).map(([key, value]) => (
                          <div key={key} className="feedback-breakdown-item">
                            <span className="feedback-breakdown-label">
                              {key}
                            </span>
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`star ${
                                    star <= value ? "filled" : ""
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <Star className="empty-state-icon" />
              <h3 className="empty-state-title">No Feedback Yet</h3>
              <p className="empty-state-description">
                Your feedback will appear here after you complete a booking and
                leave a review.
              </p>
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="card relative">
            <h3 className="card-title flex justify-between items-center">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </span>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </h3>

            {editMode ? (
              <form
                onSubmit={handleProfileSave}
                className="edit-profile-form grid grid-cols-2 gap-6"
              >
                <div className="form-group">
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editProfile.firstName || ""}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editProfile.lastName || ""}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editProfile.email || ""}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={editProfile.phone || ""}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>

                <div className="form-actions flex gap-4 mt-6 col-span-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <User className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Full Name</p>
                    <p className="info-value">
                      {profile?.fullName ||
                        `${profile?.firstName || ""} ${
                          profile?.lastName || ""
                        }`.trim()}
                    </p>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Mail className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Email</p>
                    <p className="info-value">
                      {profile?.email || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Phone className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Phone</p>
                    <p className="info-value">
                      {profile?.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Calendar className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Member Since</p>
                    <p className="info-value">
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="profile-info-item">
                  <Star className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Account Status</p>
                    <p className="info-value">
                      <span
                        className={`badge ${
                          profile?.isActive
                            ? "badge-default"
                            : "badge-destructive"
                        }`}
                      >
                        {profile?.isActive ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="profile-info-item">
                  <MessageSquare className="profile-info-icon" />
                  <div className="profile-info-content">
                    <p className="info-label">Email Verified</p>
                    <p className="info-value">
                      <span
                        className={`badge ${
                          profile?.isEmailVerified
                            ? "badge-default"
                            : "badge-secondary"
                        }`}
                      >
                        {profile?.isEmailVerified ? "Verified" : "Not Verified"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        console.log("Unknown tab:", activeTab);
        return (
          <div className="empty-state">
            <div className="empty-state-card">
              <MessageSquare className="empty-state-icon" />
              <h3 className="empty-state-title">Page Not Found</h3>
              <p className="empty-state-description">
                The requested page could not be found.
              </p>
              <div className="empty-state-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab("bookings")}
                >
                  Go to Bookings
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 flex ${
        sidebarOpen && isMobile ? "overflow-hidden" : ""
      }`}
    >
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className={`mobile-overlay ${sidebarOpen ? "open" : ""}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Enhanced Sidebar */}
      <aside
        className={`sidebar-container ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Main navigation"
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isMobile={isMobile}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Enhanced Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={toggleSidebar}
              className="mobile-menu-button"
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <div className="w-10"></div> {/* For alignment */}
          </div>
        </header>

        {/* Enhanced Page content */}
        <main className="flex-1 overflow-y-auto" role="main">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {!isMobile && <ProfileHeader profile={profile || {}} />}
            {renderContent()}
          </div>
        </main>
        {/* Rating Popup */}
        {showRatingPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div
              className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in"
              style={{
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "30px",
              }}
            >
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 
                   flex items-center justify-center
                   w-9 h-9 bg-white text-black
                   hover:bg-black hover:text-white
                   shadow-sm transition-all duration-200 ease-in-out"
                onClick={closeRatingPopup}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">
                Give Rating
              </h3>
              <p className="mb-4 text-center text-gray-500 text-sm">
                How was your experience?
              </p>

              {/* Service Information */}
              {ratingBookingId && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Rating for:</p>
                  <p className="font-semibold text-gray-800">
                    {(() => {
                      const booking = bookings.find((b) => (b._id || b.id) === ratingBookingId);
                      const serviceName = booking?.services?.[0]?.service?.name || "Service";
                      const employeeName = booking?.services?.[0]?.employee?.user 
                        ? `${booking.services[0].employee.user.firstName} ${booking.services[0].employee.user.lastName}`
                        : booking?.services?.[0]?.employee?.name || "Staff Member";
                      return `${serviceName} with ${employeeName}`;
                    })()}
                  </p>
                </div>
              )}

              {/* Rating Stars */}
              <div className="flex items-center justify-center mb-4 gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-9 h-9 cursor-pointer transition-transform duration-150 ${
                      star <= ratingValue
                        ? "text-yellow-400 scale-110 drop-shadow"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                    onClick={() => setRatingValue(star)}
                    fill={star <= ratingValue ? "#facc15" : "none"}
                    style={{ transition: "color 0.2s, transform 0.2s" }}
                  />
                ))}
              </div>

              {/* Comment Box */}
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                rows={3}
                placeholder="Write your feedback..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                maxLength={300}
              />

              {/* Submit Button */}
              <button
                className={`w-full py-2 text-lg font-semibold shadow transition 
                   ${ratingValue === 0 || isSubmittingRating ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={handleRatingSubmit}
                disabled={ratingValue === 0 || isSubmittingRating}
                style={{
                  background: "#000", // pure black background
                  color: "#fff", // white text
                  border: "none", // no border
                  borderRadius: "5px", // no border radius
                }}
              >
                {isSubmittingRating ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaProfilePage;
