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
  createdAt: string;
  updatedAt: string;
}
