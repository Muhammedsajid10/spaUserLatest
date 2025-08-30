import React, { useState, useEffect } from 'react';
import './ClientProfilePage.css'; // Main CSS file
import { authAPI, bookingsAPI, paymentsAPI, feedbackAPI } from '../services/api';
import Swal from 'sweetalert2';
import { IoCalendarClearOutline } from "react-icons/io5";
import { IoCardOutline } from "react-icons/io5";
import { FaRegStar } from "react-icons/fa6";
import { CgProfile } from "react-icons/cg";
import { IoSearch } from "react-icons/io5";
import { FaChevronDown } from "react-icons/fa";
import { FaUnlockAlt } from "react-icons/fa";
import { SlUser } from "react-icons/sl";
// StarRating Component (extracted from pasted_content.txt)
const StarRating = ({ rating = 0, readOnly = false, size = 'medium', showText = true, onRatingChange }) => {
  const sizeClasses = {
    small: 'cpd-star-rating__star--small',
    medium: 'cpd-star-rating__star--medium',
    large: 'cpd-star-rating__star--large'
  };

  const handleStarClick = (starIndex) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  return (
    <div className="cpd-star-rating">
      {[...Array(5)].map((_, index) => (
        <span
          key={index}
          className={`cpd-star-rating__star ${sizeClasses[size]} ${
            index < rating ? 'cpd-star-rating__star--filled' : 'cpd-star-rating__star--empty'
          } ${!readOnly ? 'cpd-star-rating__star--clickable' : ''}`}
          onClick={() => handleStarClick(index)}
        >
          ★
        </span>
      ))}
      {showText && (
        <span className="cpd-star-rating__text">
          {rating}/5
        </span>
      )}
    </div>
  );
};

// FeedbackModal Component (extracted from pasted_content.txt)
const FeedbackModal = ({ isOpen, onClose, booking, onSubmit }) => {
  const [ratings, setRatings] = useState({
    overall: 0,
    service: 0,
    professional: 0,
    value: 0
  });
  
  const [comments, setComments] = useState({
    positive: '',
    improvement: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (category, rating) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      Swal.fire({
        title: 'Error!',
        text: 'Please provide an overall rating',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        bookingId: booking._id,
        ratings,
        comments,
        service: booking.services?.[0]?.service?._id,
        employee: booking.services?.[0]?.employee?._id
      });
      
      setRatings({ overall: 0, service: 0, professional: 0, value: 0 });
      setComments({ positive: '', improvement: '' });
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to submit feedback. Please try again.',
        icon: 'error',
        timer: 5000,
        showConfirmButton: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cpd-feedback-modal__overlay" onClick={onClose}>
      <div className="cpd-feedback-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="cpd-feedback-modal__header">
          <h3 className="cpd-feedback-modal__title">Rate Your Experience</h3>
          <button className="cpd-feedback-modal__close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="cpd-feedback-modal__body">
          <div className="cpd-feedback-modal__rating-section">
            <label className="cpd-feedback-modal__label">Overall Rating *</label>
            <StarRating
              rating={ratings.overall}
              onRatingChange={(rating) => handleRatingChange('overall', rating)}
              size="large"
              showText={false}
            />
          </div>

          <div className="cpd-feedback-modal__rating-section">
            <label className="cpd-feedback-modal__label">Service Quality</label>
            <StarRating
              rating={ratings.service}
              onRatingChange={(rating) => handleRatingChange('service', rating)}
              showText={false}
            />
          </div>

          <div className="cpd-feedback-modal__rating-section">
            <label className="cpd-feedback-modal__label">Professional</label>
            <StarRating
              rating={ratings.professional}
              onRatingChange={(rating) => handleRatingChange('professional', rating)}
              showText={false}
            />
          </div>

          <div className="cpd-feedback-modal__rating-section">
            <label className="cpd-feedback-modal__label">Value for Money</label>
            <StarRating
              rating={ratings.value}
              onRatingChange={(rating) => handleRatingChange('value', rating)}
              showText={false}
            />
          </div>

          <div className="cpd-feedback-modal__form-group">
            <label htmlFor="positive" className="cpd-feedback-modal__label">What did you like?</label>
            <textarea
              id="positive"
              className="cpd-feedback-modal__textarea"
              placeholder="Tell us what you enjoyed about your experience..."
              value={comments.positive}
              onChange={(e) => setComments(prev => ({ ...prev, positive: e.target.value }))}
            />
          </div>

          <div className="cpd-feedback-modal__form-group">
            <label htmlFor="improvement" className="cpd-feedback-modal__label">Any suggestions for improvement?</label>
            <textarea
              id="improvement"
              className="cpd-feedback-modal__textarea"
              placeholder="How can we improve your experience?"
              value={comments.improvement}
              onChange={(e) => setComments(prev => ({ ...prev, improvement: e.target.value }))}
            />
          </div>
        </div>

        <div className="cpd-feedback-modal__footer">
          <button className="cpd-btn cpd-btn--secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="cpd-btn cpd-btn--primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component (ClientProfilePage from pasted_content.txt)
export default function App() {
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState({});
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [userFeedback, setUserFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings');
  const [theme] = useState('dark'); // Always dark mode
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedBookingForFeedback, setSelectedBookingForFeedback] = useState(null);

  // Pagination states
  const [bookingsPage, setBookingsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const itemsPerPage = 5;

  // Search and filter states
  const [bookingsSearch, setBookingsSearch] = useState('');
  const [bookingsFilter, setBookingsFilter] = useState('all');
  const [invoicesSearch, setInvoicesSearch] = useState('');
  const [invoicesFilter, setInvoicesFilter] = useState('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileData, bookingsData, invoicesData, feedbackData] = await Promise.all([
          authAPI.getCurrentUser(),
          bookingsAPI.getUserBookings(),
          paymentsAPI.getPaymentHistory(),
          feedbackAPI.getUserFeedback()
        ]);

        setProfile(profileData.data.user);
        setEditProfile(profileData.data.user);
        
        // Debug bookings data
        console.log('Raw bookings from API:', bookingsData.data.bookings);
        
        // Enhanced deduplication: remove duplicates by _id and bookingNumber
        const rawBookings = bookingsData.data.bookings || [];
        const uniqueBookings = rawBookings.filter((booking, index, self) => {
          // Check if this is the first occurrence of this booking ID
          const firstOccurrence = self.findIndex(b => 
            b._id === booking._id || 
            (b.bookingNumber && booking.bookingNumber && b.bookingNumber === booking.bookingNumber)
          ) === index;
          
          if (!firstOccurrence) {
            console.log('Filtering out duplicate booking:', booking._id, booking.bookingNumber);
          }
          
          return firstOccurrence;
        });
        
        console.log('Deduplicated bookings:', uniqueBookings.length, 'from', rawBookings.length);
        
        setBookings(uniqueBookings);
        setInvoices(invoicesData.data.payments || []);
        setUserFeedback(feedbackData.data.feedback || []);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProfileChange = (e) => {
    setEditProfile({ ...editProfile, [e.target.name]: e.target.value });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const updatedData = await authAPI.updateProfile(editProfile);
      setProfile(updatedData.data.user);
      setEditMode(false);
      Swal.fire({
        title: 'Success!',
        text: 'Profile updated successfully!',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to update profile',
        icon: 'error',
        timer: 5000,
        showConfirmButton: true
      });
    }
  };

  const handleRate = async (booking) => {
    setSelectedBookingForFeedback(booking);
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async (feedbackData) => {
    try {
      await feedbackAPI.createFeedback(feedbackData);
      
      // Update the booking to mark as rated
      setBookings(bookings.map(b => 
        b._id === feedbackData.bookingId ? { ...b, hasRating: true } : b
      ));
      
      Swal.fire({
        title: 'Success!',
        text: 'Thank you for your feedback!',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
      setShowFeedbackModal(false);
      setSelectedBookingForFeedback(null);
      
      // Refresh feedback data
      const feedbackData2 = await feedbackAPI.getUserFeedback();
      setUserFeedback(feedbackData2.data.feedback || []);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to submit feedback. Please try again.',
        icon: 'error',
        timer: 5000,
        showConfirmButton: true
      });
      throw error; // Re-throw to be handled by the modal
    }
  };

  const getBookingFeedback = (bookingId) => {
    return userFeedback.filter(f => f.booking._id === bookingId);
  };

  const sidebarItems = [
    { key: 'bookings', label: 'Bookings', icon: <IoCalendarClearOutline /> },
    { key: 'invoices', label: 'Invoices & Payments', icon: <IoCardOutline />},
    { key: 'feedback', label: 'My Feedback', icon: <FaRegStar /> },
    { key: 'profile', label: 'Profile', icon: <CgProfile />},
  ];

  const handleSidebarTabClick = (key) => {
    setActiveTab(key);
    if (window.innerWidth <= 992) {
      setSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    // Removed - always dark mode
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="cpd-loading">
          <div className="cpd-loading__spinner"></div>
          <p className="cpd-loading__text">Loading...</p>
        </div>
      );
    }

    if (error) {
      Swal.fire({
        title: 'Error!',
        text: `Error: ${error}`,
        icon: 'error',
        timer: 5000,
        showConfirmButton: true
      });
      return (
        <div className="cpd-error">
          <p className="cpd-error__message">Something went wrong. Please try again.</p>
        </div>
      );
    }

    // Filter and search functions
    const filterBookings = () => {
      let filtered = bookings;
      
      if (bookingsSearch) {
        filtered = filtered.filter(booking => 
          getServiceNames(booking).toLowerCase().includes(bookingsSearch.toLowerCase()) ||
          getProfessionalNames(booking).toLowerCase().includes(bookingsSearch.toLowerCase())
        );
      }
      
      if (bookingsFilter !== 'all') {
        const now = new Date();
        if (bookingsFilter === 'upcoming') {
          filtered = filtered.filter(b => new Date(b.appointmentDate || b.date) >= now);
        } else if (bookingsFilter === 'past') {
          filtered = filtered.filter(b => new Date(b.appointmentDate || b.date) < now);
        }
      }
      
      return filtered;
    };

    const filterInvoices = () => {
      let filtered = invoices;
      
      if (invoicesSearch) {
        filtered = filtered.filter(invoice => 
          invoice._id.toLowerCase().includes(invoicesSearch.toLowerCase())
        );
      }
      
      if (invoicesFilter !== 'all') {
        filtered = filtered.filter(invoice => invoice.status === invoicesFilter);
      }
      
      return filtered;
    };

    const filterFeedback = () => {
      let filtered = userFeedback;
      
      if (feedbackSearch) {
        filtered = filtered.filter(feedback => 
          feedback.service?.name?.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
          feedback.employee?.user?.firstName?.toLowerCase().includes(feedbackSearch.toLowerCase())
        );
      }
      
      return filtered;
    };

    // Pagination functions
    const paginateData = (data, page) => {
      const startIndex = (page - 1) * itemsPerPage;
      return data.slice(startIndex, startIndex + itemsPerPage);
    };

    const getTotalPages = (dataLength) => {
      return Math.ceil(dataLength / itemsPerPage);
    };

    const PaginationControls = ({ currentPage, totalPages, onPageChange }) => (
      <div className="cpd-pagination">
        <div className="cpd-pagination__info">
          Page {currentPage} of {totalPages}
        </div>
        <div className="cpd-pagination__controls">
          <button
            className="cpd-btn cpd-btn--outline cpd-btn--small"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          <button
            className="cpd-btn cpd-btn--outline cpd-btn--small"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      </div>
    );

    const SearchAndFilter = ({ searchValue, onSearchChange, filterValue, onFilterChange, filterOptions, placeholder }) => (
      <div className="cpd-search-filter">
        <div className="cpd-search-filter__search-wrapper">
          <input
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="cpd-search-filter__search-input"
          />
          <span className="cpd-search-filter__search-icon"><IoSearch />
</span>
        </div>
        <div className="cpd-search-filter__filter-wrapper">
          <span className="cpd-search-filter__filter-icon"><FaChevronDown />
</span>
          <select 
            value={filterValue} 
            onChange={(e) => onFilterChange(e.target.value)} 
            className="cpd-search-filter__filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );

    switch (activeTab) {
      case 'bookings':
        // Additional deduplication at render time to be extra safe
        const uniqueBookings = bookings.filter((booking, index, self) => 
          index === self.findIndex(b => 
            b._id === booking._id || 
            (b.bookingNumber && booking.bookingNumber && b.bookingNumber === booking.bookingNumber)
          )
        );
        
        const upcomingBookings = uniqueBookings.filter(b => new Date(b.appointmentDate || b.date) >= new Date());
        const pastBookings = uniqueBookings.filter(b => new Date(b.appointmentDate || b.date) < new Date());
        
        console.log('Render - Total unique bookings:', uniqueBookings.length);
        console.log('Render - Past bookings:', pastBookings.length);
        console.log('Render - Upcoming bookings:', upcomingBookings.length);
        
        // Helper function to get service names
        const getServiceNames = (booking) => {
          if (!booking.services || booking.services.length === 0) return 'N/A';
          return booking.services
            .map(s => s.service?.name || s.name || 'Unknown Service')
            .filter(name => name !== 'Unknown Service')
            .join(', ') || 'N/A';
        };
        
        // Helper function to get professional names
        const getProfessionalNames = (booking) => {
          if (!booking.services || booking.services.length === 0) return 'N/A';
          const professionals = booking.services
            .map(s => {
              if (s.employee?.user?.firstName) {
                return `${s.employee.user.firstName} ${s.employee.user.lastName || ''}`.trim();
              }
              return s.employee?.name || s.professionalName || null;
            })
            .filter(name => name && name !== 'null');
          
          // Remove duplicates and return
          const uniqueProfessionals = [...new Set(professionals)];
          return uniqueProfessionals.length > 0 ? uniqueProfessionals.join(', ') : 'N/A';
        };
        
        return (
          <div className="cpd-card">
            <div className="cpd-card__header">
              <h2 className="cpd-card__title"><IoCalendarClearOutline /> My Bookings</h2>
            </div>
            <div className="cpd-card__content">
              <SearchAndFilter
                searchValue={bookingsSearch}
                onSearchChange={setBookingsSearch}
                filterValue={bookingsFilter}
                onFilterChange={setBookingsFilter}
                filterOptions={[
                  { value: 'all', label: 'All Bookings' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'past', label: 'Past' }
                ]}
                placeholder="Search bookings..."
              />
              
              <div className="cpd-table-container">
                <table className="cpd-data-table">
                  <thead className="cpd-data-table__head">
                    <tr className="cpd-data-table__header-row">
                      <th className="cpd-data-table__header-cell">Date</th>
                      <th className="cpd-data-table__header-cell">Service</th>
                      <th className="cpd-data-table__header-cell">Professional</th>
                      <th className="cpd-data-table__header-cell">Status</th>
                      <th className="cpd-data-table__header-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody className="cpd-data-table__body">
                    {paginateData(filterBookings(), bookingsPage).map(booking => (
                      <tr key={booking._id} className="cpd-data-table__row">
                        <td className="cpd-data-table__cell">{new Date(booking.appointmentDate || booking.date).toLocaleDateString()}</td>
                        <td className="cpd-data-table__cell">{getServiceNames(booking)}</td>
                        <td className="cpd-data-table__cell">{getProfessionalNames(booking)}</td>
                        <td className="cpd-data-table__cell">
                          <span className={`cpd-badge cpd-badge--${booking.status === 'completed' ? 'success' : 'secondary'}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="cpd-data-table__cell">
                          {new Date(booking.appointmentDate || booking.date) < new Date() && !getBookingFeedback(booking._id).length ? (
                            <button className="cpd-btn cpd-btn--primary cpd-btn--small" onClick={() => handleRate(booking)}>
                              Rate Experience
                            </button>
                          ) : getBookingFeedback(booking._id).length > 0 ? (
                            <div className="cpd-feedback-display">
                              <StarRating 
                                rating={getBookingFeedback(booking._id)[0]?.ratings?.overall || 0} 
                                readOnly 
                                size="small"
                                showText={false}
                              />
                              <span className="cpd-feedback-display__text">Rated</span>
                            </div>
                          ) : (
                            <span className="cpd-upcoming-text">Upcoming</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <PaginationControls
                currentPage={bookingsPage}
                totalPages={getTotalPages(filterBookings().length)}
                onPageChange={setBookingsPage}
              />
            </div>
          </div>
        );
      case 'invoices':
        return (
          <div className="cpd-card">
            <div className="cpd-card__header">
              <h2 className="cpd-card__title"><IoCardOutline /> Invoices & Payments</h2>
            </div>
            <div className="cpd-card__content">
              <SearchAndFilter
                searchValue={invoicesSearch}
                onSearchChange={setInvoicesSearch}
                filterValue={invoicesFilter}
                onFilterChange={setInvoicesFilter}
                filterOptions={[
                  { value: 'all', label: 'All Invoices' },
                  { value: 'completed', label: 'completed' },
                  { value: 'pending', label: 'Pending' }
                ]}
                placeholder="Search invoices..."
              />
              
              <div className="cpd-table-container">
                <table className="cpd-data-table">
                  <thead className="cpd-data-table__head">
                    <tr className="cpd-data-table__header-row">
                      <th className="cpd-data-table__header-cell">Date</th>
                      <th className="cpd-data-table__header-cell">Invoice #</th>
                      <th className="cpd-data-table__header-cell">Amount</th>
                      <th className="cpd-data-table__header-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="cpd-data-table__body">
                    {paginateData(filterInvoices(), invoicesPage).map(invoice => (
                      <tr key={invoice._id} className="cpd-data-table__row">
                        <td className="cpd-data-table__cell">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                        <td className="cpd-data-table__cell">
                          <span className="cpd-invoice-id">{invoice._id}</span>
                        </td>
                        <td className="cpd-data-table__cell">
                          <span className="cpd-amount">${invoice.amount.toFixed(2)}</span>
                        </td>
                        <td className="cpd-data-table__cell">
                          <span className={`cpd-badge cpd-badge--${invoice.status === 'paid' ? 'success' : 'warning'}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <PaginationControls
                currentPage={invoicesPage}
                totalPages={getTotalPages(filterInvoices().length)}
                onPageChange={setInvoicesPage}
              />
            </div>
          </div>
        );
      case 'feedback':
        // Deduplicate feedback by _id
        const uniqueFeedback = userFeedback.filter((feedback, index, self) => 
          index === self.findIndex(f => f._id === feedback._id)
        );
        
        return (
          <div className="cpd-card">
            <div className="cpd-card__header">
              <h2 className="cpd-card__title"><FaRegStar /> My Feedback & Reviews</h2>
            </div>
            <div className="cpd-card__content">
              <div className="cpd-search-filter">
                <div className="cpd-search-filter__search-wrapper">
                  <input
                    type="text"
                    placeholder="Search feedback..."
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="cpd-search-filter__search-input"
                  />
                  <span className="cpd-search-filter__search-icon"><IoSearch /></span>
                </div>
              </div>
              
              <div className="cpd-table-container">
                <table className="cpd-data-table">
                  <thead className="cpd-data-table__head">
                    <tr className="cpd-data-table__header-row">
                      <th className="cpd-data-table__header-cell">Date</th>
                      <th className="cpd-data-table__header-cell">Service</th>
                      <th className="cpd-data-table__header-cell">Professional</th>
                      <th className="cpd-data-table__header-cell">Rating</th>
                      <th className="cpd-data-table__header-cell">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="cpd-data-table__body">
                    {paginateData(filterFeedback(), feedbackPage).map(feedback => (
                      <tr key={feedback._id} className="cpd-data-table__row">
                        <td className="cpd-data-table__cell">{new Date(feedback.submittedAt).toLocaleDateString()}</td>
                        <td className="cpd-data-table__cell">{feedback.service?.name || feedback.booking?.services?.[0]?.service?.name || 'N/A'}</td>
                        <td className="cpd-data-table__cell">
                          {feedback.employee?.user 
                            ? `${feedback.employee.user.firstName} ${feedback.employee.user.lastName}`
                            : feedback.booking?.services?.[0]?.employee?.user?.firstName || 'N/A'}
                        </td>
                        <td className="cpd-data-table__cell">
                          <StarRating 
                            rating={feedback.ratings?.overall || 0} 
                            readOnly 
                            size="small"
                          />
                        </td>
                        <td className="cpd-data-table__cell cpd-comments-cell">
                          <div className="cpd-comments">
                            {feedback.comments?.positive && (
                              <div className="cpd-comments__positive">
                                <strong>Liked:</strong> {feedback.comments.positive}
                              </div>
                            )}
                            {feedback.comments?.improvement && (
                              <div className="cpd-comments__improvement">
                                <strong>Improvement:</strong> {feedback.comments.improvement}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <PaginationControls
                currentPage={feedbackPage}
                totalPages={getTotalPages(filterFeedback().length)}
                onPageChange={setFeedbackPage}
              />
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="cpd-card">
            <div className="cpd-card__header">
              <h2 className="cpd-card__title"><CgProfile /> My Profile</h2>
            </div>
            <div className="cpd-card__content">
              {editMode ? (
                <form onSubmit={handleProfileSave} className="cpd-profile-form">
                  <div className="cpd-profile-form__grid">
                    <div className="cpd-form-group">
                      <label htmlFor="name" className="cpd-form-group__label">Full Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={editProfile.name || ''}
                        onChange={handleProfileChange}
                        className="cpd-form-group__input"
                        required
                      />
                    </div>
                    <div className="cpd-form-group">
                      <label htmlFor="email" className="cpd-form-group__label">Email Address</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={editProfile.email || ''}
                        onChange={handleProfileChange}
                        className="cpd-form-group__input"
                        required
                      />
                    </div>
                    <div className="cpd-form-group">
                      <label htmlFor="phone" className="cpd-form-group__label">Phone Number</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={editProfile.phone || ''}
                        onChange={handleProfileChange}
                        className="cpd-form-group__input"
                      />
                    </div>
                  </div>
                  
                  <div className="cpd-profile-form__actions">
                    <button type="submit" className="cpd-btn cpd-btn--primary">Save Changes</button>
                    <button 
                      type="button" 
                      className="cpd-btn cpd-btn--secondary"
                      onClick={() => {
                        setEditMode(false);
                        setEditProfile(profile);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="cpd-profile-view">
                  <div className="cpd-profile-view__grid">
                    <div className="cpd-profile-field">
                      <label className="cpd-profile-field__label">Full Name</label>
                      <p className="cpd-profile-field__value">{profile.name}</p>
                    </div>
                    <div className="cpd-profile-field">
                      <label className="cpd-profile-field__label">Email Address</label>
                      <p className="cpd-profile-field__value">{profile.email}</p>
                    </div>
                    <div className="cpd-profile-field">
                      <label className="cpd-profile-field__label">Phone Number</label>
                      <p className="cpd-profile-field__value">{profile.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <button className="cpd-btn cpd-btn--primary" onClick={() => setEditMode(true)}>
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`cpd-app ${theme === 'dark' ? 'cpd-dark-theme' : ''}`}>
      {/* Header */}
      <header className="cpd-header">
        <div className="cpd-header__content">
          <div className="cpd-header__left">
            <button
              className="cpd-header__sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1 className="cpd-header__title">Client Dashboard</h1>
          </div>
          
          <div className="cpd-header__right">
            
            <button className="cpd-header__login-btn">
              <FaUnlockAlt />
 Login
            </button>
          </div>
        </div>
      </header>

      <div className="cpd-main-layout">
        {/* Sidebar */}
        <aside className={`cpd-sidebar ${sidebarOpen ? 'cpd-sidebar--open' : ''}`}>
          <div className="cpd-sidebar__content">
            <div className="cpd-sidebar__user-profile">
              <div className="cpd-sidebar__user-avatar"><SlUser /></div>
              <h3 className="cpd-sidebar__user-name">{profile.name}</h3>
              <p className="cpd-sidebar__user-email">{profile.email}</p>
            </div>
            
            <nav className="cpd-sidebar__nav">
              {sidebarItems.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`cpd-sidebar__nav-item ${activeTab === key ? 'cpd-sidebar__nav-item--active' : ''}`}
                  onClick={() => {
                    handleSidebarTabClick(key);
                  }}
                >
                  <span className="cpd-sidebar__nav-icon">{icon}</span>
                  <span className="cpd-sidebar__nav-label">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="cpd-sidebar__overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="cpd-main-content">
          <div className="cpd-main-content__container">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        booking={selectedBookingForFeedback}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}


