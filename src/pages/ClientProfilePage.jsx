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
import { authAPI, bookingsAPI, paymentsAPI, feedbackAPI } from "../services/api";

/* -------------------
   Theme Hook
   ------------------- */
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('spa-theme');
    if (savedTheme) return savedTheme;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spa-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};

/* -------------------
   Theme Toggle Button - Only visible on mobile/tablet
   ------------------- */
const ThemeToggle = ({ theme, onToggle }) => (
  <button
    onClick={onToggle}
    className="theme-toggle mobile-tablet-only"
    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
  >
    {theme === 'light' ? <Moon /> : <Sun />}
  </button>
);

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

  const navigateToService = () => {
    // navigate('/booking');
    Swal.fire({
      title: "Book Service",
      text: "Service booking functionality would be implemented here.",
      icon: "info"
    });
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
        <button
          onClick={navigateToService}
          className="btn btn-primary w-full"
        >
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
          {profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()}
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
        <button 
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
        </button>
      </div>
    </div>
  </div>
);

/* -------------------
   Booking Item Component
   ------------------- */
const BookingItem = ({ booking }) => {
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
      case 'confirmed':
        return 'badge-default';
      case 'pending':
        return 'badge-secondary';
      case 'cancelled':
        return 'badge-destructive';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="booking-item">
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
          {booking.status || 'pending'}
        </span>
      </div>

      {booking.services && booking.services.length > 0 && (
        <div className="booking-services">
          <h5 className="services-title">Services:</h5>
          <div className="services-list">
            {booking.services.map((service, index) => (
              <div key={service.id || service._id || index} className="service-item">
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
                    {booking.currency || 'AED'} {service.price}
                  </span>
                  {service.employee?.user && (
                    <span className="service-employee">
                      with {service.employee.user.firstName} {service.employee.user.lastName}
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

      <div className="booking-footer">
        <div className="booking-total">
          <span className="total-label">Total Amount:</span>
          <span className="total-amount">
            {booking.currency || 'AED'} {booking.finalAmount || booking.totalAmount || 0}
          </span>
        </div>
        {booking.paymentStatus && (
          <div className="payment-status">
            <span className="payment-label">Payment:</span>
            <span className={`payment-badge ${booking.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
              {booking.paymentStatus}
            </span>
          </div>
        )}
      </div>

      {booking.client && (
        <div className="booking-client">
          <h6 className="client-title">Client Information:</h6>
          <div className="client-info">
            <span className="client-name">
              <User className="w-4 h-4" />
              {booking.client.fullName || `${booking.client.firstName} ${booking.client.lastName}`}
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
   Invoice Item Component
   ------------------- */
const InvoiceItem = ({ invoice }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'badge-default';
      case 'pending':
        return 'badge-secondary';
      case 'failed':
      case 'cancelled':
        return 'badge-destructive';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="invoice-item">
      <div className="invoice-header">
        <div className="invoice-date">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(invoice.createdAt)}</span>
        </div>
        <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
          {invoice.status || 'pending'}
        </span>
      </div>
      
      <div className="invoice-content">
        <div className="invoice-details">
          <h4 className="invoice-id">Invoice #{invoice.id}</h4>
          <p className="invoice-description">
            Payment via {invoice.paymentMethod || 'card'} • {invoice.paymentGateway || 'stripe'}
          </p>
          {invoice.booking && (
            <p className="invoice-booking">
              Booking: {invoice.booking.bookingNumber || invoice.booking.id || invoice.booking._id}
            </p>
          )}
        </div>
        
        <div className="invoice-amount">
          <div className="invoice-price">
            <span className="amount-value">
              {invoice.currency || 'AED'} {invoice.amount ? invoice.amount.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
      </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { theme, toggleTheme } = useTheme();

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
        console.log('Starting to fetch profile data...');
        setLoading(true);
        setError(null);

        console.log('Making API requests...');
        const [profileRes, bookingsRes, invoicesRes, feedbackRes] =
          await Promise.allSettled([
            authAPI.getCurrentUser(),
            bookingsAPI.getUserBookings(),
            paymentsAPI.getPaymentHistory(),
            feedbackAPI.getUserFeedback(),
          ]);

        console.log('API Responses:', {
          profile: profileRes.status === 'fulfilled' ? profileRes.value?.data : profileRes.reason,
          bookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value?.data : bookingsRes.reason,
          payments: invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data : invoicesRes.reason,
          feedback: feedbackRes.status === 'fulfilled' ? feedbackRes.value?.data : feedbackRes.reason
        });

        // Set states with proper fallbacks and error handling
        setProfile(
          profileRes.status === 'fulfilled' 
            ? profileRes.value?.data?.user || null 
            : null
        );
        setBookings(
          bookingsRes.status === 'fulfilled' 
            ? bookingsRes.value?.data?.bookings || [] 
            : []
        );
        setInvoices(
          invoicesRes.status === 'fulfilled' 
            ? invoicesRes.value?.data?.payments || [] 
            : []
        );
        setFeedback(
          feedbackRes.status === 'fulfilled' 
            ? feedbackRes.value?.data?.feedback || [] 
            : []
        );
        
        console.log('State after update:', {
          profile: profileRes.status === 'fulfilled' ? profileRes.value?.data?.user || null : null,
          bookingsCount: bookingsRes.status === 'fulfilled' ? bookingsRes.value?.data?.bookings?.length || 0 : 0,
          invoicesCount: invoicesRes.status === 'fulfilled' ? invoicesRes.value?.data?.payments?.length || 0 : 0,
          feedbackCount: feedbackRes.status === 'fulfilled' ? feedbackRes.value?.data?.feedback?.length || 0 : 0
        });
      } catch (err) {
        console.error('Unexpected error:', err);
        setError("An unexpected error occurred while loading data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Enhanced sidebar management
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Enhanced outside click handler
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;

    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.sidebar-container');
      const toggleButton = document.querySelector('.mobile-menu-button');
      
      if (sidebar && 
          !sidebar.contains(event.target) && 
          toggleButton &&
          !toggleButton.contains(event.target)) {
        closeSidebar();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isMobile, sidebarOpen]);

  // Enhanced body scroll lock
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }

    return () => {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  // Enhanced content renderer with better accessibility
  const renderContent = () => {
    console.log('Rendering content, current state:', {
      loading,
      error,
      activeTab,
      hasProfile: !!profile,
      bookingsCount: bookings?.length || 0,
      invoicesCount: invoices?.length || 0,
      feedbackCount: feedback?.length || 0
    });

    if (loading) {
      console.log('Showing loading state');
      return <LoadingState />;
    }
    
    if (error) {
      console.log('Showing error state:', error);
      return (
        <ErrorState
          message={error}
          onRetry={() => {
            console.log('Retry button clicked');
            window.location.reload();
          }}
        />
      );
    }

    console.log(`Rendering tab: ${activeTab}`);
    
    switch (activeTab) {
      case "bookings":
        console.log('Bookings data:', bookings);
        return bookings?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <Calendar className="w-5 h-5" />
              Bookings ({bookings.length})
            </h3>
            <div className="space-y-4">
              {bookings.map((booking, index) => (
                <BookingItem key={booking._id || booking.id || `booking-${index}`} booking={booking} />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <Calendar className="empty-state-icon" />
              <h3 className="empty-state-title">No Bookings Found</h3>
              <p className="empty-state-description">
                You don't have any bookings yet. Book your first service to get started!
              </p>
              <div className="empty-state-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => Swal.fire({
                    title: "Book Service",
                    text: "Service booking functionality would be implemented here.",
                    icon: "info"
                  })}
                >
                  <Plus className="w-4 h-4" />
                  Book a Service
                </button>
              </div>
            </div>
          </div>
        );
        
      case "invoices":
        console.log('Invoices data:', invoices);
        return invoices?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <CreditCard className="w-5 h-5" />
              Invoices & Payments ({invoices.length})
            </h3>
            <div className="space-y-4">
              {invoices.map((invoice, index) => (
                <InvoiceItem key={invoice.id || `invoice-${index}`} invoice={invoice} />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <CreditCard className="empty-state-icon" />
              <h3 className="empty-state-title">No Invoices Found</h3>
              <p className="empty-state-description">
                Your payment history will appear here once you complete a booking.
              </p>
            </div>
          </div>
        );
        
      case "feedback":
        console.log('Feedback data:', feedback);
        return feedback?.length > 0 ? (
          <div className="card">
            <h3 className="card-title">
              <Star className="w-5 h-5" />
              My Feedback ({feedback.length})
            </h3>
            <div className="space-y-6">
              {feedback.map((item, index) => (
                <div key={item._id || item.id || `feedback-${index}`} className="feedback-item">
                  <div className="feedback-header">
                    <div>
                      <h4 className="feedback-title">
                        {item.serviceName || `Service ${index + 1}`}
                      </h4>
                      <div className="feedback-date">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="feedback-rating">
                      <div className="star-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`star ${star <= (item.rating || 0) ? 'filled' : ''}`}
                          />
                        ))}
                      </div>
                      <span className="feedback-rating-text">
                        {item.rating || 0}/5
                      </span>
                    </div>
                  </div>
                  {item.comment && (
                    <div className="feedback-comment">
                      <p>{item.comment}</p>
                    </div>
                  )}
                  {item.breakdown && (
                    <div className="feedback-breakdown">
                      {Object.entries(item.breakdown).map(([key, value]) => (
                        <div key={key} className="feedback-breakdown-item">
                          <span className="feedback-breakdown-label">{key}</span>
                          <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`star ${star <= value ? 'filled' : ''}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-card">
              <Star className="empty-state-icon" />
              <h3 className="empty-state-title">No Feedback Yet</h3>
              <p className="empty-state-description">
                Your feedback will appear here after you complete a booking and leave a review.
              </p>
            </div>
          </div>
        );
        
      case "profile":
        console.log('Profile data:', profile);
        return (
          <div className="card">
            <h3 className="card-title">
              <User className="w-5 h-5" />
              Profile Information
            </h3>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <User className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Full Name</p>
                  <p className="info-value">{profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()}</p>
                </div>
              </div>
              <div className="profile-info-item">
                <Mail className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Email</p>
                  <p className="info-value">{profile?.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="profile-info-item">
                <Phone className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Phone</p>
                  <p className="info-value">{profile?.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="profile-info-item">
                <Calendar className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Member Since</p>
                  <p className="info-value">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <div className="profile-info-item">
                <Star className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Account Status</p>
                  <p className="info-value">
                    <span className={`badge ${profile?.isActive ? 'badge-default' : 'badge-destructive'}`}>
                      {profile?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="profile-info-item">
                <MessageSquare className="profile-info-icon" />
                <div className="profile-info-content">
                  <p className="info-label">Email Verified</p>
                  <p className="info-value">
                    <span className={`badge ${profile?.isEmailVerified ? 'badge-default' : 'badge-secondary'}`}>
                      {profile?.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        console.log('Unknown tab:', activeTab);
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
                  onClick={() => setActiveTab('bookings')}
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
    <div className={`min-h-screen bg-gray-50 flex ${sidebarOpen && isMobile ? 'overflow-hidden' : ''}`}>
      {/* Theme Toggle - Only visible on mobile/tablet */}
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      
      {/* Mobile overlay */}
      {isMobile && (
        <div 
          className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Enhanced Sidebar */}
      <aside 
        className={`sidebar-container ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
      </div>
    </div>
  );
};

export default SpaProfilePage;

