import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE_URL = "http://localhost:5000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Set up axios interceptor to include token in all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          setUser(response.data.user);
        } catch (error) {
          console.error("Failed to load user:", error);
          // Token is invalid, clear it
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const register = async (email, password, name) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name,
      });

      const { user, token } = response.data;
      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || "Registration failed",
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { user, token } = response.data;
      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
      });

      return {
        success: true,
        message: response.data.message,
        resetToken: response.data.resetToken, // For development only
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || "Password reset request failed",
      };
    }
  };

  const confirmPasswordReset = async (resetToken, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password/confirm`, {
        resetToken,
        newPassword,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || "Password reset failed",
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
