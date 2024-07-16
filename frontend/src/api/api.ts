// src/api/api.ts

import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';  

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

// Function to create a game room
export const createRoom = async (roomSettings: any, headers: any) => {
    try {
      const response = await api.post('/create-room/', roomSettings, headers);
      return response.data; 
    } catch (error) {
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
