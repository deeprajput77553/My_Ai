import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./AuthForms.css";

const LoginForm = ({ onSwitchToRegister, onSwitchToReset }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, AuthContext will update and user will be redirected
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue to your AI assistant</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-links">
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToReset}
          >
            Forgot password?
          </button>
          <span className="auth-divider">•</span>
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToRegister}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
