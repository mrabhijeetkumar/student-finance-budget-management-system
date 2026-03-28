const DASHBOARD_CACHE_KEY = "dashboard_overview_cache";
const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;

export const getDashboardCache = (month) => {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.month !== month || !parsed.payload || !parsed.cachedAt) {
      return null;
    }

    if (Date.now() - parsed.cachedAt > DASHBOARD_CACHE_TTL_MS) {
      sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
};

export const setDashboardCache = (month, payload) => {
  if (!payload) {
    return;
  }

  sessionStorage.setItem(
    DASHBOARD_CACHE_KEY,
    JSON.stringify({
      month,
      payload,
      cachedAt: Date.now(),
    })
  );
};

export const clearDashboardCache = () => {
  sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
};
