export interface AuthUser {
  /** Supabase auth user id (JWT `sub`). */
  id: string;
  email?: string;
}

export interface AuthenticatedRequest {
  user?: AuthUser;
}
