import { User, Edit, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ProfileHeader = ({ profile, onEditProfile, onChangePassword }) => {
  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center space-x-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-gray-600 mt-1">
            Member since {new Date(profile.createdAt || '2024-01-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </p>
          <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEditProfile}
            className="flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onChangePassword}
            className="flex items-center space-x-2"
          >
            <Key className="w-4 h-4" />
            <span>Change Password</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProfileHeader;

