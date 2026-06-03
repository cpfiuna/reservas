
export interface User {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Venue ids this admin is assigned to manage (empty for non-admins). */
  venues: string[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoggedIn: boolean;
  loading: boolean;
}
