
export type Role = 'user' | 'model';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'read';
}

export interface CompanionProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  personality: string;
  onlineStatus: string;
}
