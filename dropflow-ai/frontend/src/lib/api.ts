"use client";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({ baseURL: `${baseURL}/api`, timeout: 30_000 });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dropflow.token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dropflow.token");
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
