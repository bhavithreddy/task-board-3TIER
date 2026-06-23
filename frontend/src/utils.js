export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getErrorMessage(error, fallback = "Failed to connect to the backend") {
  if (!error) {
    return fallback;
  }

  const responseError = error.response?.data?.error;
  if (responseError) {
    return responseError;
  }

  if (error.code === "ECONNABORTED") {
    return "Request timed out — is the backend running?";
  }

  if (error.message === "Network Error") {
    return "Cannot reach backend. Start the backend server (npm start in /backend)";
  }

  return error.message || fallback;
}
