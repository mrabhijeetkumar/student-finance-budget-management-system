import { Navigate } from "react-router-dom";
import { setAuthToken } from "../../services/api";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  setAuthToken(token);
  return children;
}
