import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Table, Spinner } from 'react-bootstrap';
import './ClientProfilePage.css';
import { authAPI, bookingsAPI, paymentsAPI, feedbackAPI } from '../services/api';
import StarRating from '../Components/StarRating';
import FeedbackModal from '../Components/FeedbackModal';
import Swal from 'sweetalert2';

export default function ClientProfilePage() {
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
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'invoices', label: 'Invoices & Payments', icon: '💳' },
    { key: 'feedback', label: 'My Feedback', icon: '⭐' },
    { key: 'profile', label: 'Profile', icon: '👤' },
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
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
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
        <div className="text-center">
          <p className="text-danger">Something went wrong. Please try again.</p>
        </div>
      );
    }

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
          <Card>
            <h5 className="card-title">Upcoming Bookings</h5>
            <div className="table-responsive">
              {/* <Table striped hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Professional</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
                    <tr key={`upcoming-${b._id}`}>
                      <td>{new Date(b.appointmentDate || b.date).toLocaleDateString()}</td>
                      <td>{getServiceNames(b)}</td>
                      <td>{getProfessionalNames(b)}</td>
                      <td><span className={`badge bg-success`}>{b.status}</span></td>
                    </tr>
                  )) : <tr><td colSpan="4">No upcoming bookings.</td></tr>}
                </tbody>
              </Table> */}
            </div>
            <h5 className="card-title mt-4">Past Bookings</h5>
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Professional</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBookings.length > 0 ? pastBookings.map(b => (
                    <tr key={`past-${b._id}`}>
                      <td>{new Date(b.appointmentDate || b.date).toLocaleDateString()}</td>
                      <td>{getServiceNames(b)}</td>
                      <td>{getProfessionalNames(b)}</td>
                      <td>
                        {getBookingFeedback(b._id).length > 0 ? (
                          <div className="feedback-display">
                            <StarRating 
                              rating={getBookingFeedback(b._id)[0]?.ratings?.overall || 0} 
                              readOnly 
                              size="small"
                              showText={false}
                            />
                            <small className="text-muted">Rated</small>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            onClick={() => handleRate(b)}
                          >
                            Rate Experience
                          </Button>
                        )}
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4">No past bookings.</td></tr>}
                </tbody>
              </Table>
            </div>
          </Card>
        );
      case 'invoices':
        return (
          <Card>
            <h5 className="card-title">Invoices & Payments</h5>
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? invoices.map(inv => (
                    <tr key={inv._id}>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td>{inv._id}</td>
                      <td>${inv.amount.toFixed(2)}</td>
                      <td><span className={`badge ${inv.status === 'paid' ? 'bg-success' : 'bg-warning'}`}>{inv.status}</span></td>
                    </tr>
                  )) : <tr><td colSpan="4">No invoices found.</td></tr>}
                </tbody>
              </Table>
            </div>
          </Card>
        );
      case 'feedback':
        // Deduplicate feedback by _id
        const uniqueFeedback = userFeedback.filter((feedback, index, self) => 
          index === self.findIndex(f => f._id === feedback._id)
        );
        
        return (
          <Card>
            <h5 className="card-title">My Feedback & Reviews</h5>
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Professional</th>
                    <th>Overall Rating</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueFeedback.length > 0 ? uniqueFeedback.map(feedback => (
                    <tr key={feedback._id}>
                      <td>{new Date(feedback.submittedAt).toLocaleDateString()}</td>
                      <td>{feedback.service?.name || feedback.booking?.services?.[0]?.service?.name || 'N/A'}</td>
                      <td>{feedback.employee?.user ? `${feedback.employee.user.firstName} ${feedback.employee.user.lastName}` : feedback.booking?.services?.[0]?.employee?.user?.firstName || 'N/A'}</td>
                      <td>
                        <StarRating 
                          rating={feedback.ratings?.overall || 0} 
                          readOnly 
                          size="small"
                        />
                      </td>
                      <td>
                        <div>
                          {feedback.comments?.positive && (
                            <div><strong>Liked:</strong> {feedback.comments.positive}</div>
                          )}
                          {feedback.comments?.improvement && (
                            <div><strong>Improvement:</strong> {feedback.comments.improvement}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="5">No feedback submitted yet.</td></tr>}
                </tbody>
              </Table>
            </div>
          </Card>
        );
      case 'profile':
        return (
          <Card>
            <h5 className="card-title">My Profile</h5>
            {editMode ? (
              <Form onSubmit={handleProfileSave}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control name="name" value={editProfile.name || ''} onChange={handleProfileChange} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control name="email" type="email" value={editProfile.email || ''} onChange={handleProfileChange} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control name="phone" value={editProfile.phone || ''} onChange={handleProfileChange} />
                </Form.Group>
                <Button type="submit" variant="primary" className="me-2">Save Changes</Button>
                <Button variant="secondary" onClick={() => { setEditMode(false); setEditProfile(profile); }}>Cancel</Button>
              </Form>
            ) : (
              <div>
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone || 'Not provided'}</p>
                <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
              </div>
            )}
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`client-profile-wrapper ${theme}`}>
      <button
        className={`sidebar-toggle-btn ${theme}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        &#9776;
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="client-profile-container">
        <aside className={`client-profile-sidebar ${theme} ${sidebarOpen ? 'open' : ''}`}>
          <div className={`sidebar-header ${theme}`}>
            <h3>My Portal</h3>
          </div>
          <nav className={`sidebar-nav ${theme}`}>
            {sidebarItems.map(item => (
              <button
                key={item.key}
                className={`sidebar-link ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => handleSidebarTabClick(item.key)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className={`client-profile-content ${theme}`}>
          {renderContent()}
        </main>
      </div>

      <FeedbackModal
        show={showFeedbackModal}
        onHide={() => {
          setShowFeedbackModal(false);
          setSelectedBookingForFeedback(null);
        }}
        booking={selectedBookingForFeedback}
        onSubmitFeedback={handleSubmitFeedback}
      />
    </div>
  );
}
