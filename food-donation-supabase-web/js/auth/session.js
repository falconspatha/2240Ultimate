import { DEMO_USERS } from "./demoUsers.js";

const SESSION_KEY = "fdms_demo_session";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login(username, password) {
  const normalized = String(username || "").trim().toLowerCase();
  const user = DEMO_USERS.find(
    (u) => u.username.toLowerCase() === normalized && u.password === String(password || ""),
  );
  if (!user) return null;
  const session = {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return Boolean(getSession());
}
