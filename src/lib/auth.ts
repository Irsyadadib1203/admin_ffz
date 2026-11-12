export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tier: string;
  balance: number;
}

export const getStoredUser = (): AdminUser | null => {
  if (typeof window === "undefined") return null;
  const userJson = localStorage.getItem("topup_admin_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const setAuthSession = (token: string, user: AdminUser) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("topup_admin_token", token);
  localStorage.setItem("topup_admin_user", JSON.stringify(user));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("topup_admin_token");
  localStorage.removeItem("topup_admin_user");
  window.location.href = "/login";
};
