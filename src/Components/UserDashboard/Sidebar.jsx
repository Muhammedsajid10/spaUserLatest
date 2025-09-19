import { Calendar, CreditCard, Star, User, Plus, X } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeTab, onTabChange, onBookService, isOpen, onClose, isMobile }) => {
  const sidebarItems = [
    { key: 'bookings', label: 'Bookings', icon: Calendar },
    { key: 'invoices', label: 'Invoices & Payments', icon: CreditCard },
    { key: 'feedback', label: 'My Feedback', icon: Star },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          {isMobile && (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Book Service CTA */}
      <div className="p-6 border-b border-gray-200">
        <button 
          onClick={onBookService}
          className="btn btn-primary w-full"
        >
          <Plus className="w-4 h-4" />
          <span>Book a Service</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav flex-1">
        <ul>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onTabChange(item.key)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
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

  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div 
            className={`mobile-overlay ${isOpen ? 'open' : ''}`}
            onClick={onClose}
          />
        )}
        
        {/* Mobile Sidebar */}
        <div className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className="sidebar hidden lg:block">
      {sidebarContent}
    </div>
  );
};

export default Sidebar;

