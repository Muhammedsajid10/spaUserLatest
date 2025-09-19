import { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X } from 'lucide-react';

const ProfileTab = ({ profile, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    try {
      await onSave(editedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isEditing) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="card-title">
              <Edit className="w-5 h-5" />
              <span>Edit Profile</span>
            </h3>
            <div className="form-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="edit-profile-form">
            <div className="form-group">
              <label className="label" htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                className="input"
                value={editedProfile.firstName || ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            
            <div className="form-group">
              <label className="label" htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                className="input"
                value={editedProfile.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            
            <div className="form-group">
              <label className="label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                value={editedProfile.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label className="label" htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                className="input"
                value={editedProfile.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className="form-group">
              <label className="label" htmlFor="address">Address</label>
              <input
                id="address"
                className="input"
                value={editedProfile.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Enter your address"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="card-title">
            <User className="w-5 h-5" />
            <span>Profile Information</span>
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>
      <div className="card-content">
        <div className="profile-info-grid">
          <div className="space-y-4">
            <div className="profile-info-item">
              <User className="profile-info-icon" />
              <div className="profile-info-content">
                <p>Full Name</p>
                <p>
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
            </div>
            
            <div className="profile-info-item">
              <Mail className="profile-info-icon" />
              <div className="profile-info-content">
                <p>Email Address</p>
                <p>{profile.email}</p>
              </div>
            </div>
            
            <div className="profile-info-item">
              <Phone className="profile-info-icon" />
              <div className="profile-info-content">
                <p>Phone Number</p>
                <p>{profile.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="profile-info-item">
              <MapPin className="profile-info-icon" />
              <div className="profile-info-content">
                <p>Address</p>
                <p>{profile.address || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="profile-info-item">
              <Calendar className="profile-info-icon" />
              <div className="profile-info-content">
                <p>Member Since</p>
                <p>
                  {new Date(profile.createdAt || '2024-01-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;

