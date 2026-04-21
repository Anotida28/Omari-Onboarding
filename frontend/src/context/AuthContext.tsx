import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import {
  AuthenticatedUser,
  ChangePasswordPayload,
  InternalLoginPayload,
  LoginPayload,
  RegisterPayload,
  getCurrentUser,
  changeCurrentPassword,
  loginInternalUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentProfile,
  UpdateProfilePayload
} from "../services/api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthenticatedUser>;
  loginInternal: (payload: InternalLoginPayload) => Promise<AuthenticatedUser>;
  register: (payload: RegisterPayload) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthenticatedUser | null>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthenticatedUser>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({
  children
}: {
  children: ReactNode;
}): JSX.Element => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await getCurrentUser();

        if (isMounted) {
          setUser(response.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async (): Promise<AuthenticatedUser | null> => {
    const response = await getCurrentUser();
    setUser(response.user);
    return response.user;
  };

  const login = async (payload: LoginPayload): Promise<AuthenticatedUser> => {
    const response = await loginUser(payload);

    if (!response.user) {
      throw new Error("Login did not return a valid user session.");
    }

    setUser(response.user);
    return response.user;
  };

  const loginInternal = async (
    payload: InternalLoginPayload
  ): Promise<AuthenticatedUser> => {
    const response = await loginInternalUser(payload);

    if (!response.user) {
      throw new Error("Internal login did not return a valid user session.");
    }

    setUser(response.user);
    return response.user;
  };

  const register = async (
    payload: RegisterPayload
  ): Promise<AuthenticatedUser> => {
    const response = await registerUser(payload);

    if (!response.user) {
      throw new Error("Registration did not return a valid user session.");
    }

    setUser(response.user);
    return response.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  const updateProfileDetails = async (
    payload: UpdateProfilePayload
  ): Promise<AuthenticatedUser> => {
    const response = await updateCurrentProfile(payload);

    if (!response.user) {
      throw new Error("Profile update did not return a valid user.");
    }

    setUser(response.user);
    return response.user;
  };

  const changePassword = async (
    payload: ChangePasswordPayload
  ): Promise<void> => {
    await changeCurrentPassword(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        loginInternal,
        register,
        logout,
        refreshUser,
        updateProfile: updateProfileDetails,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};
