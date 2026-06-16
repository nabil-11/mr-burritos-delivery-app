const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('delivery_token');
}

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('delivery_token', data.token);
      localStorage.setItem('delivery_user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
  },

  getCurrentUser: (): AuthUser | null => {
    try {
      const raw = localStorage.getItem('delivery_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => !!localStorage.getItem('delivery_token'),
};

export interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  type: 'delivery' | 'pickup';
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  assignedDelivery?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  items?: Array<{
    productName: { fr: string; ar: string } | string;
    quantity: number;
    unitPrice: number;
    supplements?: Array<{ name: { fr: string; ar: string }; price: number }>;
    notes?: string;
  }>;
  notes?: string;
  deliveryCompany?: { name: string; commission: number };
  createdAt: string;
  confirmedAt?: string;
  preparationDuration?: number;
}

export const ordersService = {
  getConfirmed: async (): Promise<Order[]> => {
    return apiFetch<Order[]>('/orders?status=confirmed&type=delivery');
  },

  getMyOrders: async (userId: string): Promise<Order[]> => {
    return apiFetch<Order[]>(`/orders?assignedDelivery=${userId}`);
  },

  acceptOrder: async (id: string): Promise<Order> => {
    return apiFetch<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ acceptOrder: true }),
    });
  },

  markDelivered: async (id: string): Promise<Order> => {
    return apiFetch<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'delivered' }),
    });
  },

  getAll: async (params?: Record<string, string>): Promise<Order[]> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Order[]>(`/orders${qs}`);
  },

  getOne: async (id: string): Promise<Order> => {
    return apiFetch<Order>(`/orders/${id}`);
  },

  updateStatus: async (id: string, status: string): Promise<Order> => {
    return apiFetch<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
