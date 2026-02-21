
export type Role = 'user' | 'model' | 'system';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'read';
  callType?: 'voice' | 'video';
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
