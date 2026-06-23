import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export function getApiErrorMessage(err, fallback = "Failed to connect to the backend") {
  if (!err) {
    return fallback;
  }

  if (err.response?.data?.error) {
    return err.response.data.error;
  }

  if (err.code === "ECONNABORTED") {
    return "Request timed out — is the backend running?";
  }

  if (err.message === "Network Error") {
    return "Cannot reach backend. Start the backend server (npm start in /backend)";
  }

  return err.message || fallback;
}

export default api;
