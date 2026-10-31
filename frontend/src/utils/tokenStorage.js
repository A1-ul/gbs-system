export function getAccessToken() {
  return localStorage.getItem("gbs_token") || null;
}

export function getRefreshToken() {
  return localStorage.getItem("gbs_refresh_token") || null;
}

export function getUser() {
  try {
    const raw = localStorage.getItem("gbs_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveAuthSession(data = {}) {
  const accessToken = data.accessToken || data.token || null;
  const refreshToken = data.refreshToken || null;
  const user = data.user || null;

  if (accessToken) {
    localStorage.setItem("gbs_token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("gbs_refresh_token", refreshToken);
  }

  if (user?.tenantId) {
    localStorage.setItem("gbs_tenant_id", String(user.tenantId));
  }

  if (user) {
    localStorage.setItem("gbs_user", JSON.stringify(user));
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("gbs_token");
  localStorage.removeItem("gbs_refresh_token");
  localStorage.removeItem("gbs_user");
  localStorage.removeItem("gbs_tenant_id");
}
