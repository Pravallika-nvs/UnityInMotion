import React, { useEffect, useState } from 'react';
import { API_SERVER_URL, apiFetch } from '../../services/api';

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  createdAt?: string;
  profileImage?: string;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const data = await apiFetch('/donor/profile');

      if (data?.user) {
        setProfile(data.user);

        setFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phoneNumber: data.user.phoneNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      alert('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const data = await apiFetch('/donor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        }),
      });

      if (data?.user) {
        setProfile(data.user);

        setFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phoneNumber: data.user.phoneNumber || '',
        });

        setEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;

    setFormData({
      fullName: profile.fullName || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
    });

    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-lg text-gray-600">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-lg text-gray-600">
          Unable to load profile.
        </div>
      </div>
    );
  }

  const profileImage = profile.profileImage
    ? profile.profileImage.startsWith('http')
      ? profile.profileImage
      : `${API_SERVER_URL}${profile.profileImage}`
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
          <h1 className="text-3xl font-bold text-white">
            My Profile
          </h1>
          <p className="text-blue-100 mt-1">
            Manage your personal information
          </p>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-8">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-4xl font-bold text-blue-600">
                  {profile.fullName?.charAt(0)?.toUpperCase() || 'D'}
                </span>
              </div>
            )}

            <h2 className="text-2xl font-semibold text-gray-800 mt-4">
              {profile.fullName}
            </h2>

            <span className="mt-2 px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium capitalize">
              {profile.role}
            </span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Full Name
              </label>

              {editing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                  {profile.fullName || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email
              </label>

              {editing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                  {profile.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Phone Number
              </label>

              {editing ? (
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                  {profile.phoneNumber || 'Not provided'}
                </div>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Account Type
              </label>

              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800 capitalize">
                {profile.role}
              </div>
            </div>
          </div>

          {/* Account Created */}
          {profile.createdAt && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Account Created
              </label>

              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;