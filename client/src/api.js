const base = '/api';

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
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  requestReset: (payload) => request('/auth/request-password-reset', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  
  // Inventory APIs
  getInventory: (search = '') => request(`/inventory${search ? `?search=${encodeURIComponent(search)}` : ''}`, { 
    headers: getAuthHeaders() 
  }),
  createCategory: (payload) => request('/inventory/categories', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
  createItem: (payload) => request('/inventory/items', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers: getAuthHeaders()
  }),
  addItemQuantity: (id, amount = 1) => request(`/inventory/items/${id}/add`, { 
    method: 'PUT', 
    body: JSON.stringify({ amount }),
    headers: getAuthHeaders()
  }),
  takeItemQuantity: (id, amount = 1) => request(`/inventory/items/${id}/take`, { 
    method: 'PUT', 
    body: JSON.stringify({ amount }),
    headers: getAuthHeaders()
  }),
  deleteItem: (id) => request(`/inventory/items/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  }),
  deleteCategory: (id) => request(`/inventory/categories/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  }),
  getActivityLogs: (limit = 50, offset = 0, fromDate = null, toDate = null) => {
    let url = `/inventory/activity-logs?limit=${limit}&offset=${offset}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return request(url, { 
      headers: getAuthHeaders() 
    });
  },
  getItemHistory: (itemId, limit = 3, offset = 0) => {
    const url = `/inventory/items/${itemId}/history?limit=${limit}&offset=${offset}`;
    return request(url, { 
      headers: getAuthHeaders() 
    });
  },
  updateCategory: (id, payload) => request(`/inventory/categories/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
  updateItem: (id, payload) => request(`/inventory/items/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(payload),
    headers: { ...getAuthHeaders() }
  }),
};


