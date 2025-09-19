import { useState, useEffect } from 'react';
import { useAuth } from '../Service/Context';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI, authAPI } from '../services/api';
import Swal from 'sweetalert2';
import MobileHeader from '../components/UserDashboard/MobileHeader';
import Sidebar from '../components/UserDashboard/Sidebar';
import ProfileHeader from '../components/UserDashboard/ProfileHeader';
import BookingsTab from '../components/UserDashboard/BookingsTab';
import InvoicesTab from '../components/UserDashboard/InvoicesTab';
import FeedbackTab from '../components/UserDashboard/FeedbackTab';
import ProfileTab from '../components/UserDashboard/ProfileTab';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [profile, setProfile] = useState(null);
  
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();

  // Check authentication on component mount
  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }
    fetchDashboardData();
    
    // Set up window resize listener
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [token, navigate]);

  const isMobile = windowWidth < 1024;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const profileData = await authAPI.getProfile();
      setProfile(profileData.data);
      updateUser(profileData.data);
      
      // Fetch bookings
      const bookingsData = await bookingsAPI.getUserBookings();
      setBookings(bookingsData.data || []);
      
      // Fetch invoices
      const invoicesData = await bookingsAPI.getUserInvoices();
      setInvoices(invoicesData.data || []);
      
      // Fetch feedback
      const feedbackData = await bookingsAPI.getUserFeedback();
      setFeedback(feedbackData.data || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load dashboard data. Please try again.',
        icon: 'error',
        timer: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleBookService = () => {
    navigate('/');
  };

  const handleRate = (booking) => {
    console.log('Rate booking:', booking);
    // Implement rating functionality
  };

  const handleEditProfile = () => {
    setActiveTab('profile');
  };

  const handleChangePassword = () => {
    // Implement password change functionality
    Swal.fire({
      title: 'Change Password',
      text: 'Password change functionality will be implemented here.',
      icon: 'info',
    });
  };

  const handleSaveProfile = async (updatedProfile) => {
    try {
      const response = await authAPI.updateProfile(updatedProfile);
      setProfile(response.data.user);
      updateUser(response.data.user);
      
      Swal.fire({
        title: 'Success!',
        text: 'Profile updated successfully!',
        icon: 'success',
        timer: 3000,
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to update profile',
        icon: 'error',
      });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'bookings':
        return (
          <BookingsTab 
            bookings={bookings} 
            onRate={handleRate}
            onBookService={handleBookService}
          />
        );
      case 'invoices':
        return <InvoicesTab invoices={invoices} />;
      case 'feedback':
        return <FeedbackTab feedback={feedback} />;
      case 'profile':
        return <ProfileTab profile={profile} onSave={handleSaveProfile} />;
      default:
        return <BookingsTab bookings={bookings} onRate={handleRate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader 
        profile={profile || user} 
        onMenuToggle={handleMenuToggle}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onBookService={handleBookService}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-6xl mx-auto p-6">
            {/* Profile Header - Only show on desktop or when not on profile tab */}
            {(!isMobile || activeTab !== 'profile') && (
              <ProfileHeader
                profile={profile || user}
                onEditProfile={handleEditProfile}
                onChangePassword={handleChangePassword}
              />
            )}

            {/* Tab Content */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
