import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MobileHeader = ({ profile, onMenuToggle }) => {
  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onMenuToggle}>
          <Menu className="w-6 h-6" />
        </Button>
        
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

