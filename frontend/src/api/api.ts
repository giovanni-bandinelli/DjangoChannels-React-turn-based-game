// src/api/api.ts

import axios from 'axios';

// Same origin as the page. In development Vite forwards /api to Django (see
// vite.config.ts), in production a reverse proxy does the same job: either way
// the browser only ever talks to one host, so there is nothing to configure.
const BASE_URL = '/api';

// Axios instance with base URL
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token to headers if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Function to perform guest login
export const guestLogin = async (username: string) => {
  try {
    const response = await api.post('/guest-login/', { username });
    const token = response.data.token;
    localStorage.setItem('accessToken', token);
    localStorage.setItem('username', username);
    return token;
  } catch (error) {
    throw new Error('Failed to log in as guest.');
  }
};

// Function to create a game room.
// No body and no headers: the room has nothing to configure yet, and the
// Authorization header is already added by the interceptor above.
export const createRoom = async () => {
    try {
      const response = await api.post('/create-room/', {});
      return response.data;
    } catch (error) {
      // log the real one before replacing it with a friendly message: without
      // this, a refused connection and a 500 look identical from the outside
      console.error('createRoom failed:', error);
      throw new Error('Failed to create room.');
    }
  };
  
// Function to join a game room
export const joinRoom = async (roomName: string, headers: any) => {
  try {
    const response = await api.post(`/join-room/${roomName}/`, {}, headers);
    return response.data.message;
  } catch (error) {
    throw new Error('Failed to join room.');
  }
};

// Function to check if a room exists
export const checkRoomExists = async (roomName: string) => {
  try {
    const response = await api.get(`/check-room/${roomName}/`);
    return response.data.room_exists;
  } catch (error) {
    throw new Error('Failed to check room existence.');
  }
};
