import { useEffect } from "react";

export default function ToastMessage({ message, type = "success", onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}
