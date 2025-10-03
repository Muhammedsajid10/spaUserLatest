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
import { formatLocalDateTime, formatTimeRange, formatLocalDate } from '../Utils/timeZoneUtils.js';

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
const Sidebar = ({ activeTab, onTabChange, isOpen, onClose, isMobile, navigateToService }) => {
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
                  className={`sidebar-link ${activeTab === item.key ? "active" : ""
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
        
      </div>
    </div>
  </div>
);

/* -------------------
   Booking Item Component
   ------------------- */

const BookingItem = ({ booking, feedbackList, onGiveRating }) => {
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

  return (
    <div className="booking-item">
      {/* Booking Header */}
      <div className="booking-header">
        <div className="booking-info">
          <h4 className="booking-title">
            Booking Number {booking.bookingNumber}
          </h4>
          <div className="booking-meta">
            <span className="booking-date">
              <Calendar className="w-4 h-4" />
              {formatLocalDateTime(booking.createdAt)}
            </span>
          </div>
        </div>
        <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
          {booking.status || "pending"}
        </span>
      </div>

      {booking.services && booking.services.length > 0 && (
        <div className="booking-services">
          <h5 className="services-title">Services:</h5>
          <div className="services-list">
            {booking.services.map((service, index) => (
              <div key={service.id || service._id || index} className="service-item">
                <div className="service-grid">
                  {/* Service Basic Info */}
                  <div className="service-basic-info">
                    <h4 className="service-name">
                      {service.service?.name || `Service ${index + 1}`}
                    </h4>
                    {service.employee?.user && (
                      <p className="service-professional">
                        {service.employee.user.firstName} {service.employee.user.lastName}
                      </p>
                    )}
                  </div>

                  {/* Service Details */}
                  <div className="service-details">
                    <span className="duration">
                      <Clock className="w-4 h-4" />
                      {service.duration} min
                    </span>
                    <span className="price">
                      {booking.currency || "AED"} {service.price}
                    </span>
                  </div>

                  {/* Service Time */}
                  {service.startTime && service.endTime && (
                    <div className="service-time">
                      <strong>Service Date & Time: </strong>
                      {(() => {
                        // Format both date and time without timezone conversion
                        const formatDateTime = (dateStr) => {
                          const date = new Date(dateStr);

                          // Get date components
                          const dateFormatted = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });

                          // Extract time components to avoid timezone shifts
                          const timeStr = dateStr.split('T')[1]?.split('.')[0] || dateStr;
                          let timeFormatted;

                          if (timeStr.includes(':') && timeStr.length <= 8) {
                            const [hours, minutes] = timeStr.split(':');
                            const localDate = new Date();
                            localDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                            timeFormatted = localDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          } else {
                            const hours = date.getUTCHours();
                            const minutes = date.getUTCMinutes();
                            const localDate = new Date();
                            localDate.setHours(hours, minutes, 0, 0);
                            timeFormatted = localDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          }

                          return { date: dateFormatted, time: timeFormatted };
                        };

                        const startDateTime = formatDateTime(service.startTime);
                        const endDateTime = formatDateTime(service.endTime);

                        // Check if both times are on the same date
                        if (startDateTime.date === endDateTime.date) {
                          return `${startDateTime.date} from ${startDateTime.time} to ${endDateTime.time}`;
                        } else {
                          return `${startDateTime.date} ${startDateTime.time} - ${endDateTime.date} ${endDateTime.time}`;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
              className={`payment-badge ${booking.paymentStatus === "paid" ? "paid" : "pending"
                }`}
            >
              {booking.paymentStatus}
            </span>
          </div>
        )}

        {/* Show Give Rating button only if completed and no rating */}
        {booking.status?.toLowerCase() === "completed" && !booking.hasRating && (
          <button
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => {
              const firstService = booking.services?.[0];
              const serviceId = firstService?.service?._id || firstService?.serviceId;
              const employeeId = firstService?.employee?._id || firstService?.employeeId;
              onGiveRating(booking._id || booking.id, serviceId, employeeId);
            }}
          >
            Give Rating
          </button>
        )}
      </div>

      {/* Client Info with timezone-aware created date */}

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
    </div>

  );
};

/* -------------------
   Enhanced Main Page
   ------------------- */
const SpaProfilePage = () => {
  const navigate = useNavigate(); // Move useNavigate inside component

  const navigateToService = () => {
    navigate("/booking");
  };

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
  const [serviceRatings, setServiceRatings] = useState({}); // { serviceId: number }
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

        // Get all data in parallel
        const [profileRes, bookingsRes, invoicesRes, feedbackRes] = await Promise.allSettled([
          authAPI.getCurrentUser(),
          bookingsAPI.getUserBookings(),
          paymentsAPI.getPaymentHistory(),
          feedbackAPI.getUserFeedback(),
        ]);

        // Get feedback data first to check against bookings
        const feedbackData = feedbackRes.status === "fulfilled" ? feedbackRes.value?.data?.feedback || [] : [];

        // Process bookings data with feedback check
        let bookingsData = [];
        if (bookingsRes.status === "fulfilled") {
          bookingsData = (bookingsRes.value?.data?.bookings || []).map(booking => {
            // Check if this booking has feedback
            const hasFeedback = feedbackData.some(feedback =>
              feedback.booking?._id === booking._id ||
              feedback.booking?.id === booking.id ||
              feedback.bookingId === booking._id ||
              feedback.bookingId === booking.id
            );

            // Return booking with hasRating flag
            return {
              ...booking,
              hasRating: hasFeedback
            };
          });
        }

        // Set states with processed data
        setProfile(profileRes.status === "fulfilled" ? profileRes.value?.data?.user || null : null);
        setBookings(bookingsData);
        setInvoices(invoicesRes.status === "fulfilled" ? invoicesRes.value?.data?.payments || [] : []);
        setFeedback(feedbackData);

        console.log("Processed data:", {
          bookingsWithRatings: bookingsData.map(b => ({
            id: b._id || b.id,
            hasRating: b.hasRating
          })),
          feedbackCount: feedbackData.length
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
  const openRatingPopup = (bookingId) => {
    setRatingBookingId(bookingId);
    setShowRatingPopup(true);
    setServiceRatings({}); // reset ratings
    setRatingComment("");
  };

  const closeRatingPopup = () => {
    setShowRatingPopup(false);
    setRatingBookingId(null);
    setServiceRatings({});
    setRatingComment("");
  };
  const handleServiceRating = (serviceId, value) => {
    setServiceRatings((prev) => ({
      ...prev,
      [serviceId]: value,
    }));
  };
  const handleRatingSubmit = async () => {
  if (isSubmittingRating) return;

  try {
    setIsSubmittingRating(true);

    console.log('[Rating] Starting submission with:', {
      ratingBookingId,
      serviceRatings,
      ratingComment
    });

    const booking = bookings.find((b) => (b._id || b.id) === ratingBookingId);
    
    if (!booking) throw new Error("Booking not found");

    // First, check if all services have ratings
    const unratedServices = booking.services.filter(service => {
      const serviceId = service.service?._id || service._id || service.serviceId;
      return !serviceRatings[serviceId];
    });

    // If any service is unrated, show specific error
    if (unratedServices.length > 0) {
      const unratedServiceNames = unratedServices
        .map(s => s.service?.name || 'Unknown service')
        .join(', ');
      throw new Error(`Please provide ratings for all services: ${unratedServiceNames}`);
    }

    // Convert service ratings to required format
    const ratingItems = booking.services.map(service => {
      const serviceId = service.service?._id || service._id || service.serviceId;
      const employeeId = service.employee?._id || service.employeeId;
      const rating = serviceRatings[serviceId];

      return {
        serviceId,
        employeeId,
        rating
      };
    });

    // Prepare feedback data
    const feedbackData = {
      bookingId: booking._id || booking.id,
      items: ratingItems,
      comment: ratingComment
    };

    console.log('[Rating] Submitting feedback:', feedbackData);

    const response = await fetch('https://api.alloraspadubai.com/api/v1/feedbacks/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(feedbackData)
    });

    const data = await response.json();
   console.log('[Rating] Submission response:', data);
    if (data.success) {
      // Refresh feedback data
      try {
        const feedbackRes = await feedbackAPI.getUserFeedback();
        setFeedback(feedbackRes?.data?.feedback || []);
      } catch (error) {
        console.error('[Rating] Error refreshing feedback:', error);
      }

      closeRatingPopup();
      Swal.fire({
        title: "Thank you!",
        text: "Your feedback has been submitted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      throw new Error(data.message || "Failed to submit feedback");
    }
  } catch (error) {
    console.error('[Rating] Error submitting feedback:', error);
    Swal.fire({
      title: "Error!",
      text: error.message,
      icon: "error",
      confirmButtonText: "OK",
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
                  onClick={navigateToService}
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
        if (feedback?.length > 0) {
          const groupedFeedback = groupFeedbackByBooking(feedback);
          
          return (
            <div className="card">
              <h3 className="card-title">
                <Star className="w-5 h-5" />
                My Feedback
              </h3>
              <div className="space-y-6">
                {Object.entries(groupedFeedback).map(([bookingId, booking]) => (
                  <div key={bookingId} className="feedback-booking-group">
                    <div className="booking-header">
                      <div className="booking-info">
                        <h4>Booking #{booking.bookingNumber}</h4>
                        <div className="feedback-date">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="services-feedback-list">
                      {booking.services.map((service, index) => (
                        <div key={service.serviceId} className="service-feedback-item">
                          <div className="service-info">
                            <h5 className="service-name">{service.serviceName}</h5>
                            <p className="service-provider">
                              Provider: {service.employee?.user?.firstName} {service.employee?.user?.lastName}
                            </p>
                          </div>

                          <div className="service-rating">
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`star ${star <= service.rating ? "filled" : ""}`}
                                />
                              ))}
                            </div>
                            <span className="rating-value">{service.rating}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="booking-feedback-comment">
                      <p>{booking.services[0].comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          return (
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
        }

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
                        `${profile?.firstName || ""} ${profile?.lastName || ""
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
                        className={`badge ${profile?.isActive
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
                        className={`badge ${profile?.isEmailVerified
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
      className={`min-h-screen bg-gray-50 flex ${sidebarOpen && isMobile ? "overflow-hidden" : ""
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
        className={`sidebar-container ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        aria-label="Main navigation"
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isMobile={isMobile}
          navigateToService={navigateToService} // Pass the function as prop
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
          <div className="rating-modal-overlay">
            <div className="rating-modal">
              <div className="rating-modal-header">
                <h3>Rate Your Services</h3>
                <button className="close-btn" onClick={closeRatingPopup}>×</button>
              </div>

              {(() => {
                const booking = bookings.find((b) => (b._id || b.id) === ratingBookingId);
                if (!booking) return <p>No booking selected.</p>;

                console.log('Rating Services:', {
                  services: booking.services,
                  currentRatings: serviceRatings
                });

                return (
                  <>
                    <div className="service-rating-list">
                      {booking.services.map((service) => {
                        const serviceId = service.service?._id || service._id || service.serviceId;
                        const serviceName = service.service?.name || 'Service';
                        const current = serviceRatings[serviceId] || 0;

                        return (
                          <div key={serviceId} className="service-rating-item">
                            <div className="service-info">
                              <h4>{serviceName}</h4>
                              <p className="service-provider">
                                {service.employee?.user?.firstName} {service.employee?.user?.lastName}
                              </p>
                            </div>
                            <div className="rating-stars">
                              <div className="stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`star ${current >= star ? "active" : ""}`}
                                    onClick={() => handleServiceRating(serviceId, star)}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="rating-value">{current > 0 ? `${current}/5` : 'Not rated'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rating-comment">
                      <textarea
                        placeholder="Share your experience with these services..."
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="modal-actions">
                      <button 
                        className="btn-cancel" 
                        onClick={closeRatingPopup}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-submit" 
                        onClick={handleRatingSubmit}
                        disabled={!booking.services.every(service => {
                          const serviceId = service.service?._id || service._id || service.serviceId;
                          return serviceRatings[serviceId];
                        })}
                      >
                        Submit Ratings
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaProfilePage;

// Add this helper function at the top level
const groupFeedbackByBooking = (feedback) => {
  return feedback.reduce((acc, item) => {
    const bookingId = item.booking?._id || item.bookingId;
    if (!acc[bookingId]) {
      acc[bookingId] = {
        bookingNumber: item.booking?.bookingNumber,
        date: item.createdAt,
        services: []
      };
    }
    acc[bookingId].services.push({
      serviceId: item.service?._id,
      serviceName: item.service?.name,
      rating: item.ratings?.overall || item.rating,
      employee: item.employee,
      comment: item.comment
    });
    return acc;
  }, {});
};
