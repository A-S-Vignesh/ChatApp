export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface User {
  id: string;
  name: string;
  image?: string;
  isOnline: boolean;
  lastSeen?: string;
  about?: string;
}

export interface Reaction {
  emoji: string;
  users: string[]; // array of user IDs
}

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'other';
  status: MessageStatus;
  reactions?: Reaction[];
}

export interface Chat {
  id:string;
  user: User;
  messages: Message[];
}

export type Theme = 'light' | 'dark';

export interface NotificationSettings {
  previews: boolean;
  sounds: boolean;
}