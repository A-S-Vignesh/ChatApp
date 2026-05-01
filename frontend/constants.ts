
import type { User, Chat } from './types';
import { MessageStatus } from './types';

export const currentUser: User = {
  id: 'me',
  name: 'Alex Johnson',
  avatarUrl: 'https://picsum.photos/seed/me/200/200',
  isOnline: true,
  about: 'Lead Frontend Engineer at AetherCorp. Turning coffee into clean code.'
};

export const users: { [key: string]: User } = {
  user1: {
    id: 'user1',
    name: 'Aria Montgomery',
    avatarUrl: 'https://picsum.photos/seed/user1/200/200',
    isOnline: true,
  },
  user2: {
    id: 'user2',
    name: 'Spencer Hastings',
    avatarUrl: 'https://picsum.photos/seed/user2/200/200',
    isOnline: false,
    lastSeen: '15m ago',
  },
  user3: {
    id: 'user3',
    name: 'Hanna Marin',
    avatarUrl: 'https://picsum.photos/seed/user3/200/200',
    isOnline: true,
  },
  user4: {
    id: 'user4',
    name: 'Emily Fields',
    avatarUrl: 'https://picsum.photos/seed/user4/200/200',
    isOnline: false,
    lastSeen: 'yesterday',
  },
  user5: {
    id: 'user5',
    name: 'Caleb Rivers',
    avatarUrl: 'https://picsum.photos/seed/user5/200/200',
    isOnline: true,
  }
};

export const mockChats: Chat[] = [
  {
    id: 'chat1',
    user: users['user1'],
    messages: [
      { id: 'msg1', text: 'Hey, how is the project going?', timestamp: '10:30 AM', sender: 'other', status: MessageStatus.READ, reactions: [{ emoji: '👍', users: ['me'] }] },
      { id: 'msg2', text: 'It\'s going great! Should be done by EOD.', timestamp: '10:31 AM', sender: 'me', status: MessageStatus.READ, reactions: [{ emoji: '🎉', users: ['user1'] }] },
      { id: 'msg3', text: 'Awesome, can\'t wait to see it!', timestamp: '10:32 AM', sender: 'other', status: MessageStatus.READ, reactions: [{ emoji: '❤️', users: ['me', 'user1'] }] },
    ],
  },
  {
    id: 'chat2',
    user: users['user2'],
    messages: [
      { id: 'msg4', text: 'Did you get the files I sent?', timestamp: 'Yesterday', sender: 'other', status: MessageStatus.READ },
      { id: 'msg5', text: 'Yes, thanks! I\'ll review them today.', timestamp: '8:15 AM', sender: 'me', status: MessageStatus.DELIVERED },
    ],
  },
  {
    id: 'chat3',
    user: users['user3'],
    messages: [
        { id: 'msg6', text: 'Let\'s catch up for coffee this week.', timestamp: 'Mon', sender: 'other', status: MessageStatus.DELIVERED },
        { id: 'msg7', text: 'Sounds good! How about Wednesday?', timestamp: 'Mon', sender: 'me', status: MessageStatus.SENT },
    ],
  },
  {
    id: 'chat4',
    user: users['user4'],
    messages: [
        { id: 'msg8', text: 'Happy Birthday!! 🎉', timestamp: 'Sun', sender: 'other', status: MessageStatus.READ },
    ],
  },
   {
    id: 'chat5',
    user: users['user5'],
    messages: [
        { id: 'msg9', text: 'The new design looks amazing.', timestamp: '11:00 AM', sender: 'other', status: MessageStatus.DELIVERED },
        { id: 'msg10', text: 'Thanks! I appreciate the feedback.', timestamp: '11:02 AM', sender: 'me', status: MessageStatus.SENT },
    ],
  }
];