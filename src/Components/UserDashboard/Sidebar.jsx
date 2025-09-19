import { Calendar, CreditCard, Star, User, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Book Service CTA */}
      <div className="p-6 border-b border-gray-200">
        <Button 
          onClick={onBookService}
          className="w-full bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Book a Service</span>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onTabChange(item.key)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                    activeTab === item.key
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
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
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
        
        {/* Mobile Sidebar */}
        <div className={cn(
          "fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className="w-80 bg-white border-r border-gray-200 hidden lg:block">
      {sidebarContent}
    </div>
  );
};

export default Sidebar;

