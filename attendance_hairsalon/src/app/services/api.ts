const API_BASE_URL = 'https://witch-reported-cdt-crop.trycloudflare.com';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        return apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },
};

// Student API
export const studentApi = {
    getAll: async () => {
        return apiCall('/admin/students');
    },

    getById: async (id: string) => {
        return apiCall(`/admin/students/${id}`);
    },

    create: async (data: any) => {
        return apiCall('/admin/students', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: any) => {
        return apiCall(`/admin/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Student-facing endpoints
    getProfile: async () => {
        return apiCall('/student/profile');
    },

    updateProfile: async (data: any) => {
        return apiCall('/student/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// Session API
export const sessionApi = {
    getByDate: async (date: string) => {
        return apiCall(`/admin/sessions?date=${date}`);
    },

    create: async (data: any) => {
        return apiCall('/admin/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: any) => {
        return apiCall(`/admin/sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    remove: async (id: string) => {
        return apiCall(`/admin/sessions/${id}`, {
            method: 'DELETE',
        });
    },

    getTodaySessions: async () => {
        return apiCall('/sessions/today');
    },

    register: async (sessionId: string) => {
        return apiCall(`/sessions/${sessionId}/register`, {
            method: 'POST',
        });
    },
};

// Attendance API
export const attendanceApi = {
    getRecords: async (date?: string, sessionId?: string) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (sessionId) params.append('sessionId', sessionId);

        return apiCall(`/admin/attendance?${params.toString()}`);
    },

    checkIn: async (data: any) => {
        return apiCall('/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    checkOut: async (data: any) => {
        return apiCall('/attendance/check-out', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Student-facing endpoint
    getMyHistory: async () => {
        return apiCall('/student/attendance');
    },
};
