import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token Storage Helpers ────────────────────────────────────────────────────

export const tokenStore = {
  getAccess:    () => localStorage.getItem('token'),
  getRefresh:   () => localStorage.getItem('refresh_token'),
  setAccess:    (t) => localStorage.setItem('token', t),
  setRefresh:   (t) => localStorage.setItem('refresh_token', t),
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// ─── Refresh State ────────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue  = [];   // Queue of { resolve, reject } for requests waiting on refresh

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
}

// ─── Request Interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Auto Refresh on 401 ──────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't been retried yet
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request was itself the refresh call
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Already refreshing — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry   = true;
    isRefreshing      = true;

    const refreshToken = tokenStore.getRefresh();

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error, null);
      tokenStore.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = res.data;

      tokenStore.setAccess(access_token);
      tokenStore.setRefresh(newRefreshToken);

      // Update user in storage if returned
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      // Resolve all queued requests with the new token
      processQueue(null, access_token);

      // Retry the original request
      original.headers.Authorization = `Bearer ${access_token}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenStore.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
