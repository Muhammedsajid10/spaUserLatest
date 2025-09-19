import { User, Edit, Key } from 'lucide-react';
import './ProfileHeader.css';
// import '../.././Layout.css'
const ProfileHeader = ({ profile, onEditProfile, onChangePassword }) => {
  return (
    <div className="profile-header">
      <div className="flex items-center space-x-6">
        <div className="profile-avatar-unique">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="profile-meta">
            Member since {new Date(profile.createdAt || '2024-01-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </p>
          <p className="profile-email">{profile.email}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onEditProfile}
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onChangePassword}
          >
            <Key className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;

