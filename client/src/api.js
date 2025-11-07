const base = import.meta.env.VITE_API_URL || 'https://inventory-bzh0.onrender.com';

async function request(path, options = {}) {
  const url = `${base}${path}`;
  const { headers: customHeaders, body, ...restOptions } = options;
  const config = {
    ...restOptions,
    headers: { 
      'Content-Type': 'application/json', 
      ...(customHeaders || {}) 
    },
    credentials: 'include',
    ...(body ? { body } : {}),
  };
  
  try {
    const bodyPreview = config.body ? (typeof config.body === 'string' && config.body.length > 100 ? config.body.substring(0, 100) + '...' : config.body) : undefined;
    console.log('Making request to:', url, 'method:', config.method || 'GET', 'body:', bodyPreview);
  } catch (e) {
    // Ignore logging errors
  }
  
  const res = await fetch(url, config);
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('Request failed:', res.status, data);
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Add /api prefix to all auth routes
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  requestReset: (payload) => request('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  
  // Add /api prefix to all inventory routes
  getInventory: (search = '') => request(`/api/inventory${search ? `?search=${encodeURIComponent(search)}` : ''}`, { 
    headers: getAuthHeaders() 
  }),
  createCategory: (payload) => request('/api/inventory/categories', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
  createItem: (payload) => request('/api/inventory/items', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers: getAuthHeaders()
  }),
  addItemQuantity: (id, amount = 1) => request(`/api/inventory/items/${id}/add`, { 
    method: 'PUT', 
    body: JSON.stringify({ amount }),
    headers: getAuthHeaders()
  }),
  takeItemQuantity: (id, amount = 1) => request(`/api/inventory/items/${id}/take`, { 
    method: 'PUT', 
    body: JSON.stringify({ amount }),
    headers: getAuthHeaders()
  }),
  deleteItem: (id) => request(`/api/inventory/items/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  }),
  deleteCategory: (id) => request(`/api/inventory/categories/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  }),
  getActivityLogs: (limit = 50, offset = 0, fromDate = null, toDate = null) => {
    let url = `/api/inventory/activity-logs?limit=${limit}&offset=${offset}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return request(url, { 
      headers: getAuthHeaders() 
    });
  },
  getItemHistory: (itemId, limit = 3, offset = 0) => {
    const url = `/api/inventory/items/${itemId}/history?limit=${limit}&offset=${offset}`;
    return request(url, { 
      headers: getAuthHeaders() 
    });
  },
  updateCategory: (id, payload) => request(`/api/inventory/categories/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
  updateItem: (id, payload) => request(`/api/inventory/items/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
};