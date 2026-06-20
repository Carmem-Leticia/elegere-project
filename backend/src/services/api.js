import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let sessionAlertShown = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401 || code === 'SESSION_EXPIRED') {
      error.isSessionExpired = true;

      if (!sessionAlertShown) {
        sessionAlertShown = true;
        alert('Sua sessão expirou. Faça login novamente.');
        localStorage.clear();
        window.location.reload();
      }
    }

    return Promise.reject(error);
  }
);

export default api;