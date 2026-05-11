export interface UserType {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;

  isOnline: boolean;
  phone?: string;
  location?: string;
  lastSeen?: string;
  about?: string;
  /* ISO date string (YYYY-MM-DD or full ISO). */
  dob?: string | null;
  createdAt: string;
  updatedAt: string;
}
