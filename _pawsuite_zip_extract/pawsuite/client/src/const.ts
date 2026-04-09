export function getLoginUrl(returnPath?: string): string {
  // Supabase Auth is handled client-side via the useAuth hook
  // This returns the app root, the login form will be shown by AppLayout
  return '/';
}

export function getSignUpUrl(returnPath?: string): string {
  // Supabase Auth is handled client-side via the useAuth hook
  // This returns the app root, the signup form will be shown by AppLayout
  return '/';
}
