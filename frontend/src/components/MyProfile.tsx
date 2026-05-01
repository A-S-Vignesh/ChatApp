import React, { useState, useEffect } from "react";
import type { User } from "../../types";
import {
  X,
  Edit3,
  Save,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { UserType } from "../types/user";

interface MyProfileProps {
  user: UserType;
  onClose: () => void;
  onUpdateProfile: (updatedUser: User) => void;
}

const MyProfile: React.FC<MyProfileProps> = ({
  user,
  onClose,
  onUpdateProfile,
}: MyProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    about: user.about || "",
    phone: user.phone || "",
    location: user.location || "",
  });

  useEffect(() => {
    if (!isEditing) {
      setFormData({
        name: user.name,
        about: user.about || "",
        phone: user.phone || "",
        location: user.location || "",
      });
    }
  }, [user, isEditing]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdateProfile({ ...user, ...formData });
    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close profile"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            My Profile
          </h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
        )}
      </div>

      {/* Content - Non-scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Profile Picture & Basic Info */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img
              className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
              src={user.image}
              alt={user.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name
                )}&background=3b82f6&color=fff&size=112`;
              }}
            />
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-3 border-white dark:border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Edit your name"
                />
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {user.name}
                  </h2>
                  {user.emailVerified && (
                    <CheckCircle
                      size={18}
                      className="text-blue-500"
                      title="Verified account"
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.isOnline
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {user.isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UserIcon
              size={16}
              className="text-slate-500 dark:text-slate-400"
            />
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              About
            </h3>
          </div>
          {isEditing ? (
            <textarea
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              rows={3}
              className="w-full text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              placeholder="Tell something about yourself..."
            />
          ) : (
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
              {user.about || "No bio yet"}
            </p>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Email
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {user.email}
                </p>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                    <CheckCircle size={10} />
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Phone
                size={16}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Phone
              </p>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full text-sm text-slate-800 dark:text-slate-200 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none pb-1"
                  placeholder="Add phone number"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user.phone || "Not added"}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MapPin
                size={16}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Location
              </p>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full text-sm text-slate-800 dark:text-slate-200 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none pb-1"
                  placeholder="Add location"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user.location || "Not added"}
                </p>
              )}
            </div>
          </div>

          {/* Member Since */}
          {user.createdAt && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <div className="p-2 bg-slate-200 dark:bg-slate-600 rounded-lg">
                <Calendar
                  size={16}
                  className="text-slate-600 dark:text-slate-300"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Member since
                </p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Footer */}
      {isEditing && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2.5 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
