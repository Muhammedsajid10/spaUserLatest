import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      Swal.fire("Error", "Please fill in all fields.", "error");
      return;
    }
    if (password !== confirmPassword) {
      Swal.fire("Error", "Passwords do not match.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.alloraspadubai.com/api/v1/auth/reset-password/${token}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const data = await response.json();
      if (data.success) {
        Swal.fire({
          title: "Password Reset Successful",
          text: "You can now sign in with your new password.",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
        setTimeout(() => navigate("/"), 1200);
      } else {
        Swal.fire("Error", data.message || "Reset failed.", "error");
      }
    } catch (err) {
      Swal.fire("Error", err.message || "Reset failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-wrapper">
      <div className="modern-auth-container">
        <div className="modern-auth-header">
          <h1 className="modern-auth-title">Reset Your Password</h1>
          <p className="modern-auth-subtitle">
            Enter your new password below to reset your account password.
          </p>
        </div>
        <form className="modern-auth-form" onSubmit={handleSubmit}>
          <div className="modern-field-group">
            <label className="modern-field-label">New Password</label>
            <input
              type="password"
              className="modern-input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={loading}
            />
          </div>
          <div className="modern-field-group">
            <label className="modern-field-label">Confirm Password</label>
            <input
              type="password"
              className="modern-input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={`modern-primary-btn ${loading ? "modern-btn-loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
