
// Use the backend user object structure
export type DisplayUser = {
  id?: string | number;
  username?: string;
};

export const getUserDisplayName = (
  user?: DisplayUser | null,
  fallback = "System",
) => {
  if (!user) return fallback;
  if (user.username) return user.username;
  return fallback;
};
