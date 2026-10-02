import { useSocket } from '../context/SocketContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <span>
            {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
