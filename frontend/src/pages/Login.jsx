import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API, { setAuthToken } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await API.post("/login", {
        email,
        password,
      });

      const token = res.data.data.token;

      localStorage.setItem("token", token);
      setAuthToken(token);

      alert("Login successful ✅");
    } catch (err) {
      alert("Login failed ❌");
    }
    navigate("/dashboard");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      /><br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}