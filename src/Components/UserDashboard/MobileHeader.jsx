import { Menu, User } from 'lucide-react';
import './MobileHeader.css';

const MobileHeader = ({ profile, onMenuToggle }) => {
  return (
    <div className="mobile-header">
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost btn-sm" onClick={onMenuToggle}>
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;

