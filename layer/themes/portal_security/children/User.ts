/**
 * User type definitions for web security
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  roles: UserRole[];
  profile?: UserProfile;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: any;
}