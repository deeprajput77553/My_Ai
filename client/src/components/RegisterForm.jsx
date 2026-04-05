import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./AuthForms.css";

const RegisterForm = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) {
      errors.push("at least 8 characters");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("one uppercase letter");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("one number");
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password complexity
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(", ")}`);
      return;
    }

    setLoading(true);

    const result = await register(email, password, name);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, AuthContext will update and user will be redirected
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Get started with your AI assistant</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your name"
            />
          </div>

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

          <div className="form-group password-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Create a password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={showPassword ? "fi fi-rr-eye-crossed" : "fi fi-rr-eye"}></i>
              </button>
            </div>
            <small className="form-hint">
              Must be 8+ characters with 1 uppercase letter and 1 number
            </small>
          </div>

          <div className="form-group password-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Confirm your password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={showConfirmPassword ? "fi fi-rr-eye-crossed" : "fi fi-rr-eye"}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-links">
          <span>Already have an account?</span>
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
