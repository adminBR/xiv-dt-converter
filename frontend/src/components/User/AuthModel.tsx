// src/components/AuthModal.tsx
import { useState } from "react";
import { AuthModalProps, FormErrors } from "../../interfaces/Auth";

const AuthModal = ({ isOpen, onClose, mode, onSuccess }: AuthModalProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper to render field errors
  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;

    const errorMessages = Array.isArray(errors[field])
      ? (errors[field] as string[])
      : [errors[field] as string];

    return (
      <div className="text-red-400 text-sm mt-1">
        {errorMessages.map((msg, i) => (
          <div key={`${field}-error-${i}`}>{msg}</div>
        ))}
      </div>
    );
  };

  const clearErrors = () => {
    setErrors({});
    setGeneralError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    // Additional validation for registration mode
    if (mode === "register" && password !== confirmPassword) {
      setErrors({ confirm_password: "Passwords do not match" });
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("user_name", username);
      formData.append("user_pass", password);

      const endpoint = mode === "login" ? "/me/login/" : "/me/register/";
      const response = await fetch(
        import.meta.env.VITE_API_URL + `${endpoint}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle different error formats
        if (data.errors) {
          // Structured field errors from our enhanced backend
          setErrors(data.errors);
        } else if (data.error) {
          // Single error message
          setGeneralError(data.error);
        } else {
          // Fallback for unexpected error format
          setGeneralError("An unexpected error occurred");
        }
        return;
      }

      // Success handling
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("username", data.user?.username || username);

      // Call success handler
      onSuccess(data.token, data.user?.username || username);

      // Reset form and close modal
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      onClose();
    } catch {
      setGeneralError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal mode changes
  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    clearErrors();
  };

  // Close modal handler with form reset
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96 border border-purple-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-purple-300">
            {mode === "login" ? "Login" : "Register"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {generalError && (
          <div className="bg-red-900 bg-opacity-40 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 flex items-start">
            <svg
              className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v2a1 1 0 102 0V8a1 1 0 00-1-1zm0 6a1 1 0 100 2 1 1 0 000-2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded focus:outline-none focus:ring-1 text-white
                                ${
                                  errors.user_name
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                                }`}
              aria-invalid={!!errors.user_name}
              aria-describedby={errors.user_name ? "username-error" : undefined}
              required
            />
            {renderFieldError("user_name")}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded focus:outline-none focus:ring-1 text-white
                                ${
                                  errors.user_pass
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                                }`}
              aria-invalid={!!errors.user_pass}
              aria-describedby={errors.user_pass ? "password-error" : undefined}
              required
            />
            {renderFieldError("user_pass")}
            {mode === "register" && (
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 6 characters and contain both letters
                and numbers.
              </p>
            )}
          </div>

          {mode === "register" && (
            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded focus:outline-none focus:ring-1 text-white
                                    ${
                                      errors.confirm_password
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                        : "border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                                    }`}
                aria-invalid={!!errors.confirm_password}
                required
              />
              {renderFieldError("confirm_password")}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-medium transition-colors
                            ${
                              isLoading
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                {mode === "login" ? "Logging in..." : "Registering..."}
              </span>
            ) : (
              <>{mode === "login" ? "Login" : "Register"}</>
            )}
          </button>

          <div className="mt-4 text-center text-gray-400 text-sm">
            {mode === "login" ? (
              <p>Don't have an account? Contact admin to register.</p>
            ) : (
              <p>Already have an account? Use the login option.</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
