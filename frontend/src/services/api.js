import axios from 'axios';

const API_BASE = 'http://localhost:8080';

export const getAttacks = (page = 0, size = 20, sortBy = 'timestamp', direction = 'desc') =>
    axios.get(`${API_BASE}/attacks`, { params: { page, size, sortBy, direction } });

export const searchAttacks = (params) =>
    axios.get(`${API_BASE}/attacks/search`, { params });

export const getAuthLogs = (page = 0, size = 20, sortBy = 'timestamp', direction = 'desc') =>
    axios.get(`${API_BASE}/auth-logs`, { params: { page, size, sortBy, direction } });

export const searchAuthLogs = (params) =>
    axios.get(`${API_BASE}/auth-logs/search`, { params });

export const getCommandLogs = (page = 0, size = 20, sortBy = 'timestamp', direction = 'desc') =>
    axios.get(`${API_BASE}/command-logs`, { params: { page, size, sortBy, direction } });

export const searchCommandLogs = (params) =>
    axios.get(`${API_BASE}/command-logs/search`, { params });