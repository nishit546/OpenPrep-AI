import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000, // Max 30 seconds backoff
  randomizationFactor: 0.2,    // 20% jitter
});

// Helper to render reconnection toast notifications in the DOM
const showReconnectionToast = (message, isError = false) => {
  let container = document.getElementById('socket-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'socket-toast-container';
    container.className = 'fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  // Clear previous notifications
  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded shadow-2xl text-xs font-semibold font-inter transition-all duration-300 pointer-events-auto flex items-center gap-2 ${
    isError 
      ? 'bg-red-900/95 text-red-200 border border-red-700/50' 
      : 'bg-neutral-900/95 text-yellow-500 border border-yellow-700/50'
  }`;
  
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove success alerts after 4 seconds
  if (!isError && message.includes('Reconnected')) {
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
};

// Bind reconnection lifecycle event listeners
socket.io.on('reconnect_attempt', (attempt) => {
  showReconnectionToast(`Reconnecting to server... (Attempt ${attempt})`, false);
});

socket.io.on('reconnect', () => {
  showReconnectionToast('Reconnected to server!', false);
});

socket.io.on('reconnect_error', () => {
  showReconnectionToast('Reconnection attempt failed.', true);
});

export const connectSocket = () => {
  socket.auth = {
    token: localStorage.getItem('token'),
  };
  if (!socket.connected) {
    socket.connect();
  }
};