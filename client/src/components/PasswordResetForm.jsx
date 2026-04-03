import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./AuthForms.css";

const PasswordResetForm = ({ onSwitchToLogin }) => {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState("request"); // "request" or "confirm"
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await requestPasswordReset(email);

    if (result.success) {
      setSuccess(result.message);
      // In development, we get the token back
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setStep("confirm");
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password complexity
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(", ")}`);
      return;
    }

    setLoading(true);

    const result = await confirmPasswordReset(resetToken, newPassword);

    if (result.success) {
      setSuccess("Password reset successfully! You can now sign in.");
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          {step === "request"
            ? "Enter your email to receive a reset link"
            : "Enter your new password"}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {step === "request" ? (
          <form onSubmit={handleRequestReset}>
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

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
            <div className="form-group">
              <label htmlFor="resetToken">Reset Token</label>
              <input
                type="text"
                id="resetToken"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                placeholder="Enter reset token"
              />
              <small className="form-hint">
                In production, this would be sent via email
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Create a new password"
              />
              <small className="form-hint">
                Must be 8+ characters with 1 uppercase letter and 1 number
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Confirm your new password"
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="auth-links">
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetForm;
