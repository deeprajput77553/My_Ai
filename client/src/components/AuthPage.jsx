import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import PasswordResetForm from "./PasswordResetForm";

const AuthPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState("login"); // "login", "register", "reset"

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #0b0f1a, #020617)",
        gap: "16px"
      }}>
        <div className="dots">
          <span style={{ background: "#38bdf8" }}></span>
          <span style={{ background: "#38bdf8" }}></span>
          <span style={{ background: "#38bdf8" }}></span>
        </div>
        <div style={{ fontSize: "16px", color: "#94a3b8", fontWeight: 500 }}>
          Loading...
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {mode === "login" && (
        <LoginForm
          onSwitchToRegister={() => setMode("register")}
          onSwitchToReset={() => setMode("reset")}
        />
      )}
      {mode === "register" && (
        <RegisterForm onSwitchToLogin={() => setMode("login")} />
      )}
      {mode === "reset" && (
        <PasswordResetForm onSwitchToLogin={() => setMode("login")} />
      )}
    </>
  );
};

export default AuthPage;
