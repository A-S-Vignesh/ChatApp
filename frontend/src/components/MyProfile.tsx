import React, { useEffect, useState } from "react";
import {
  X,
  Pencil,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Cake,
  UserRound,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { UserType } from "../types/user";
import Avatar from "./Avatar";
import { useProfile, useUpdateProfile, type ProfileUpdate } from "../hooks/useProfile";

interface MyProfileProps {
  /* The session-level user (from better-auth). Used as a fallback for the
     hero block while the full profile fetches. */
  user: UserType;
  onClose: () => void;
}

/* HTML <input type="date"> wants YYYY-MM-DD. Strip the time portion. */
function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDob(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const MyProfile: React.FC<MyProfileProps> = ({ user, onClose }) => {
  /* Full profile (including extended fields) lives at /profile/me. The session
     user only has what better-auth exposes (name/email/image/verified). */
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile();

  const view = {
    name: profile?.name ?? user.name,
    image: profile?.image ?? user.image,
    email: profile?.email ?? user.email,
    emailVerified: profile?.emailVerified ?? user.emailVerified,
    isOnline: profile?.isOnline ?? user.isOnline,
    about: profile?.about ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    dob: profile?.dob ?? null,
    createdAt: profile?.createdAt ?? user.createdAt,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: view.name,
    about: view.about,
    phone: view.phone,
    location: view.location,
    dob: toDateInputValue(view.dob),
  });

  /* Whenever the underlying profile changes (server response, refetch, or
     after we exit edit mode) re-seed the form. Skip while editing so we
     don't overwrite the user's keystrokes. */
  useEffect(() => {
    if (isEditing) return;
    setFormData({
      name: view.name,
      about: view.about,
      phone: view.phone,
      location: view.location,
      dob: toDateInputValue(view.dob),
    });
    setError(null);
  }, [profile, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* Build a minimal patch — only fields that actually changed. Avoids
     trampling concurrent updates and reduces server work. */
  const buildPatch = (): ProfileUpdate => {
    const patch: ProfileUpdate = {};
    const trimmedName = formData.name.trim();
    if (trimmedName !== (view.name ?? "").trim()) patch.name = trimmedName;
    if (formData.about.trim() !== (view.about ?? "").trim())
      patch.about = formData.about.trim();
    if (formData.phone.trim() !== (view.phone ?? "").trim())
      patch.phone = formData.phone.trim();
    if (formData.location.trim() !== (view.location ?? "").trim())
      patch.location = formData.location.trim();

    const currentDob = toDateInputValue(view.dob);
    if (formData.dob !== currentDob) {
      patch.dob = formData.dob === "" ? null : formData.dob;
    }
    return patch;
  };

  const handleSave = async () => {
    setError(null);

    if (formData.name.trim().length < 1) {
      setError("Name can't be empty.");
      return;
    }

    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await updateProfile(patch);
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to save");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setFormData({
      name: view.name,
      about: view.about,
      phone: view.phone,
      location: view.location,
      dob: toDateInputValue(view.dob),
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
        {!isEditing && !isLoading && (
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
          <div className="h-28 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-700" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
            <Avatar
              src={view.image}
              alt={view.name}
              isOnline={view.isOnline}
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
              maxLength={60}
              className="text-xl font-bold text-center w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              aria-label="Display name"
            />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {view.name}
              </h3>
              {view.emailVerified && (
                <CheckCircle2
                  size={17}
                  className="text-blue-500 shrink-0"
                  aria-label="Verified"
                />
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                view.isOnline
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  view.isOnline ? "bg-green-500" : "bg-slate-400"
                }`}
              />
              {view.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Inline error banner (only while editing) */}
        {error && isEditing && (
          <div className="mx-4 mt-3 p-2.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
            {error}
          </div>
        )}

        {/* Info sections */}
        <div className="px-4 py-5 space-y-2">
          {/* About / Bio */}
          <Section
            label="About"
            icon={<UserRound size={15} className="text-blue-500" />}
          >
            {isEditing ? (
              <textarea
                name="about"
                value={formData.about}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                placeholder="Tell something about yourself…"
                className="w-full text-sm bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
              />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed wrap-break-word whitespace-pre-wrap">
                {view.about || (
                  <span className="text-slate-400 italic">No bio yet</span>
                )}
              </p>
            )}
          </Section>

          {/* Email — read only */}
          <InfoRow
            icon={<Mail size={15} className="text-blue-500" />}
            label="Email"
            bg="bg-blue-50 dark:bg-blue-900/20"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {view.email}
              </span>
              {view.emailVerified ? (
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
                maxLength={30}
                placeholder="Add phone number"
                className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none pb-0.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
              />
            ) : (
              <span
                className={`text-sm font-medium ${
                  view.phone
                    ? "text-slate-800 dark:text-slate-200"
                    : "text-slate-400 italic"
                }`}
              >
                {view.phone || "Not added"}
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
                maxLength={120}
                placeholder="Add your location"
                className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none pb-0.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
              />
            ) : (
              <span
                className={`text-sm font-medium ${
                  view.location
                    ? "text-slate-800 dark:text-slate-200"
                    : "text-slate-400 italic"
                }`}
              >
                {view.location || "Not added"}
              </span>
            )}
          </InfoRow>

          {/* Date of Birth */}
          <InfoRow
            icon={<Cake size={15} className="text-pink-500" />}
            label="Date of birth"
            bg="bg-pink-50 dark:bg-pink-900/20"
          >
            {isEditing ? (
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                max={toDateInputValue(new Date().toISOString())}
                className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none pb-0.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition scheme-light dark:scheme-dark"
              />
            ) : (
              <span
                className={`text-sm font-medium ${
                  view.dob
                    ? "text-slate-800 dark:text-slate-200"
                    : "text-slate-400 italic"
                }`}
              >
                {formatDob(view.dob) ?? "Not added"}
              </span>
            )}
          </InfoRow>

          {/* Member since — read only */}
          {view.createdAt && (
            <InfoRow
              icon={<CalendarDays size={15} className="text-slate-500" />}
              label="Member since"
              bg="bg-slate-100 dark:bg-slate-700/40"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {new Date(view.createdAt).toLocaleDateString("en-US", {
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
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/30 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={16} />
                Save changes
              </>
            )}
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
    <div className={`p-2 rounded-lg ${bg} shrink-0`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
        {label}
      </p>
      {children}
    </div>
  </div>
);

export default MyProfile;
