import React, { useState, useEffect } from "react";
import type { User } from "../../types";
import {
  X,
  Pencil,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { UserType } from "../types/user";
import Avatar from "./Avatar";

interface MyProfileProps {
  user: UserType;
  onClose: () => void;
  onUpdateProfile: (updatedUser: User) => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ user, onClose, onUpdateProfile }) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdateProfile({ ...user, ...formData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user.name,
      about: user.about || "",
      phone: user.phone || "",
      location: user.location || "",
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            My Profile
          </h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Hero section */}
        <div className="relative">
          {/* Banner */}
          <div className="h-28 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-700" />

          {/* Avatar — straddles banner/content boundary */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
            <Avatar
              src={user.image}
              alt={user.name}
              isOnline={user.isOnline}
              size="lg"
              className="ring-4 ring-white dark:ring-slate-800 shadow-xl"
            />
          </div>
        </div>

        {/* Identity block */}
        <div className="pt-16 pb-6 px-6 text-center border-b border-slate-100 dark:border-slate-700">
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="text-xl font-bold text-center w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              aria-label="Display name"
            />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {user.name}
              </h3>
              {user.emailVerified && (
                <CheckCircle2 size={17} className="text-blue-500 shrink-0" title="Verified" />
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.isOnline
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user.isOnline ? "bg-green-500" : "bg-slate-400"
                }`}
              />
              {user.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Info sections */}
        <div className="px-4 py-5 space-y-2">

          {/* About */}
          <Section label="About" icon={<UserRound size={15} className="text-blue-500" />}>
            {isEditing ? (
              <textarea
                name="about"
                value={formData.about}
                onChange={handleChange}
                rows={3}
                placeholder="Tell something about yourself…"
                className="w-full text-sm bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
              />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {user.about || <span className="text-slate-400 italic">No bio yet</span>}
              </p>
            )}
          </Section>

          {/* Email */}
          <InfoRow
            icon={<Mail size={15} className="text-blue-500" />}
            label="Email"
            bg="bg-blue-50 dark:bg-blue-900/20"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {user.email}
              </span>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium shrink-0">
                  <ShieldCheck size={10} />
                  Verified
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium shrink-0">
                  Unverified
                </span>
              )}
            </div>
          </InfoRow>

          {/* Phone */}
          <InfoRow
            icon={<Phone size={15} className="text-emerald-500" />}
            label="Phone"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
          >
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Add phone number"
                className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none pb-0.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
              />
            ) : (
              <span className={`text-sm font-medium ${user.phone ? "text-slate-800 dark:text-slate-200" : "text-slate-400 italic"}`}>
                {user.phone || "Not added"}
              </span>
            )}
          </InfoRow>

          {/* Location */}
          <InfoRow
            icon={<MapPin size={15} className="text-purple-500" />}
            label="Location"
            bg="bg-purple-50 dark:bg-purple-900/20"
          >
            {isEditing ? (
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Add your location"
                className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none pb-0.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
              />
            ) : (
              <span className={`text-sm font-medium ${user.location ? "text-slate-800 dark:text-slate-200" : "text-slate-400 italic"}`}>
                {user.location || "Not added"}
              </span>
            )}
          </InfoRow>

          {/* Member since */}
          {user.createdAt && (
            <InfoRow
              icon={<CalendarDays size={15} className="text-slate-500" />}
              label="Member since"
              bg="bg-slate-100 dark:bg-slate-700/40"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* Sticky edit footer */}
      {isEditing && (
        <div className="shrink-0 flex gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/30"
          >
            <Check size={16} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Small layout helpers ── */

const Section: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
    {children}
  </div>
);

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  bg: string;
  children: React.ReactNode;
}> = ({ icon, label, bg, children }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
    <div className={`p-2 rounded-lg ${bg} shrink-0`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

export default MyProfile;
