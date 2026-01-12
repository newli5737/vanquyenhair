const API_BASE_URL = 'https://missing-overall-cdt-preston.trycloudflare.com';

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
};
const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const tryRefreshToken = async (): Promise<boolean> => {
    if (isRefreshing) {
        return refreshPromise!;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Refresh token failed:', error);
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const accessToken = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            const refreshed = await tryRefreshToken();

            if (refreshed) {
                const newAccessToken = getAccessToken();
                const retryHeaders = {
                    ...headers,
                    'Authorization': `Bearer ${newAccessToken}`,
                };

                const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                    ...options,
                    headers: retryHeaders,
                });

                if (retryResponse.ok) {
                    return retryResponse.json();
                }
            }

            if (window.location.pathname !== '/login' && window.location.pathname !== '/admin/login') {
                localStorage.removeItem('user');
                clearTokens();
                window.location.href = '/login';
            }
        }
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// Auth API
export const authApi = {
    login: async (phone: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An error occurred' }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.accessToken && data.refreshToken) {
            setTokens(data.accessToken, data.refreshToken);
        }

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    },

    register: async (data: { fullName: string; phone: string; email?: string; password: string; dateOfBirth?: string }) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An error occurred' }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.accessToken && result.refreshToken) {
            setTokens(result.accessToken, result.refreshToken);
        }

        if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
        }

        return result;
    },

    changePassword: async (data: any) => {
        return apiCall('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    forgotPassword: async (email: string) => {
        return apiCall('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    getMe: async () => {
        return apiCall('/auth/me');
    },

    logout: async () => {
        const refreshToken = getRefreshToken();
        await apiCall('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
        localStorage.removeItem('user');
        clearTokens();
    },
};

// Training Class API
export const trainingClassApi = {
    getAll: async () => {
        return apiCall('/training-classes');
    },

    getById: async (id: string) => {
        return apiCall(`/training-classes/${id}`);
    },

    create: async (data: any) => {
        return apiCall('/training-classes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: any) => {
        return apiCall(`/training-classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    remove: async (id: string) => {
        return apiCall(`/training-classes/${id}`, {
            method: 'DELETE',
        });
    },

    getAvailableClasses: async () => {
        return apiCall('/training-classes/available');
    },

    removeStudentFromClass: async (classId: string, studentId: string) => {
        return apiCall(`/training-classes/${classId}/students/${studentId}`, {
            method: 'DELETE',
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

    remove: async (id: string) => {
        return apiCall(`/admin/students/${id}`, {
            method: 'DELETE',
        });
    },
};

// Session API
export const sessionApi = {
    getByDate: async (date: string, classId?: string) => {
        return apiCall(`/admin/sessions?date=${date}${classId ? `&classId=${classId}` : ''}`);
    },

    create: async (data: any) => {
        return apiCall('/admin/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    bulkCreate: async (data: any) => {
        return apiCall('/admin/sessions/bulk-create', {
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

    getTodaySessions: async (registeredOnly = false) => {
        return apiCall(`/sessions/today${registeredOnly ? '?registeredOnly=true' : ''}`);
    },

    register: async (sessionId: string) => {
        return apiCall(`/sessions/${sessionId}/register`, {
            method: 'POST',
        });
    },
};

// Attendance API
export const attendanceApi = {
    getRecords: async (date?: string, sessionId?: string, classId?: string) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (sessionId) params.append('sessionId', sessionId);
        if (classId) params.append('classId', classId);

        return apiCall(`/admin/attendance?${params.toString()}`);
    },

    getWeeklyReport: async (startDate: string, endDate: string, classId?: string) => {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (classId) params.append('classId', classId);

        return apiCall(`/admin/attendance/weekly-report?${params.toString()}`);
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

    delete: async (id: string) => {
        return apiCall(`/admin/attendance/${id}`, {
            method: 'DELETE',
        });
    },

    deleteCheckIn: async (id: string) => {
        return apiCall(`/admin/attendance/${id}/check-in`, {
            method: 'DELETE',
        });
    },

    deleteCheckOut: async (id: string) => {
        return apiCall(`/admin/attendance/${id}/check-out`, {
            method: 'DELETE',
        });
    },
};

// Enrollment API
export const enrollmentApi = {
    // Student endpoints
    createRequest: async (classId: string) => {
        return apiCall('/enrollment/request', {
            method: 'POST',
            body: JSON.stringify({ trainingClassId: classId }),
        });
    },

    getMyRequests: async () => {
        return apiCall('/enrollment/my-requests');
    },

    getMyClasses: async () => {
        return apiCall('/enrollment/my-classes');
    },

    // Admin endpoints
    getAllRequests: async (classId?: string, status?: string) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);
        if (status) params.append('status', status);

        const query = params.toString();
        return apiCall(`/admin/enrollment/requests${query ? `?${query}` : ''}`);
    },

    getPendingRequests: async (classId?: string) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);

        const query = params.toString();
        return apiCall(`/admin/enrollment/pending${query ? `?${query}` : ''}`);
    },

    reviewRequest: async (requestId: string, data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => {
        return apiCall(`/admin/enrollment/requests/${requestId}/review`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    getClassStats: async (classId: string) => {
        return apiCall(`/admin/enrollment/stats/${classId}`);
    },
};

// Face Verification API
export const faceVerificationApi = {
    verify: async (selfieUrl: string) => {
        return apiCall('/face-verification/verify', {
            method: 'POST',
            body: JSON.stringify({ selfieUrl }),
        });
    },
};

// Statistics API
export const statisticsApi = {
    getOverview: async (startDate: string, endDate: string, classId?: string) => {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (classId) params.append('classId', classId);

        return apiCall(`/admin/statistics/overview?${params.toString()}`);
    },

    getWeeklyAbsence: async (startDate: string, endDate: string, classId?: string) => {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (classId) params.append('classId', classId);

        return apiCall(`/admin/statistics/weekly-absence?${params.toString()}`);
    },

    getFarCheckIns: async (startDate: string, endDate: string, classId?: string) => {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (classId) params.append('classId', classId);

        return apiCall(`/admin/statistics/far-checkins?${params.toString()}`);
    },
};

