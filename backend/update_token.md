IMPLEMENTATION.md - JWT Authentication cho iOS Web App
Mục tiêu
Xây dựng hệ thống authentication sử dụng JWT token cho web app, tối ưu cho iOS Safari/Chrome:

✅ Không bắt login lại khi đóng/mở browser trên iOS
✅ Không bị redirect loop khi restart backend trong quá trình dev
✅ Không cần bảo mật cao, ưu tiên UX tốt
✅ Backend: NestJS
✅ Frontend: Next.js (deploy lên Vercel)
✅ Sử dụng token only (KHÔNG dùng cookie)


PHẦN 1: BACKEND (NestJS)
1.1. Environment Variables
bash# .env
JWT_SECRET=your-super-secret-key-never-change-in-dev-12345678
JWT_REFRESH_SECRET=your-refresh-secret-key-never-change-87654321

# QUAN TRỌNG: Không để auto-generate, phải cố định
# Restart backend không làm token cũ invalid
1.2. Auth Module Setup
typescript// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: '90d', // Token sống 90 ngày - ít login hơn
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
1.3. Auth Service
typescript// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    // private userService: UserService, // Inject your user service
  ) {}

  async login(loginDto: { email: string; password: string }, req: any) {
    // Validate user credentials
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Tạo device fingerprint (optional, chỉ để audit)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    const payload = {
      sub: user.id,
      email: user.email,
      deviceHash: this.hashDevice(deviceInfo), // Optional
    };

    // Access token - 90 ngày
    const accessToken = this.jwtService.sign(payload);

    // Refresh token - 180 ngày
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '180d',
      }
    );

    // Lưu refresh token vào DB (optional)
    await this.saveRefreshToken(user.id, refreshToken, deviceInfo);

    return {
      accessToken,
      refreshToken,
      expiresIn: 90 * 24 * 60 * 60, // seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify refresh token còn trong DB
      const isValid = await this.verifyRefreshToken(payload.sub, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Issue token mới
      const newAccessToken = this.jwtService.sign({
        sub: payload.sub,
        email: payload.email,
      });

      const newRefreshToken = this.jwtService.sign(
        { sub: payload.sub, type: 'refresh' },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '180d',
        }
      );

      // Update refresh token trong DB
      await this.updateRefreshToken(payload.sub, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(email: string, password: string) {
    // TODO: Implement your user validation logic
    // const user = await this.userService.findByEmail(email);
    // if (user && await bcrypt.compare(password, user.password)) {
    //   return user;
    // }
    // return null;
    
    // Mock implementation
    return { id: '1', email, name: 'Test User' };
  }

  private hashDevice(deviceInfo: any): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(deviceInfo))
      .digest('hex');
  }

  private async saveRefreshToken(userId: string, token: string, deviceInfo: any) {
    // TODO: Save to database
    // await this.db.refreshToken.create({
    //   userId,
    //   token,
    //   deviceInfo,
    //   expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    // });
  }

  private async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    // TODO: Check token exists in DB
    // const found = await this.db.refreshToken.findFirst({
    //   where: { userId, token, expiresAt: { gt: new Date() } }
    // });
    // return !!found;
    return true; // Mock
  }

  private async updateRefreshToken(userId: string, newToken: string) {
    // TODO: Update token in DB
    // await this.db.refreshToken.updateMany({
    //   where: { userId },
    //   data: { token: newToken }
    // });
  }
}
1.4. Auth Controller
typescript// src/auth/auth.controller.ts
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: { email: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService.login(loginDto, req);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    // TODO: Invalidate refresh token in DB
    // const userId = req.user.sub;
    // await this.authService.revokeRefreshTokens(userId);
    
    return { message: 'Logged out successfully' };
  }
}
1.5. JWT Auth Guard
typescript// src/auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
1.6. Main.ts - CORS Setup
typescript// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // CORS cho Vercel
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://your-app.vercel.app', // Thay bằng domain Vercel của bạn
      'https://*.vercel.app', // Cho preview deployments
    ],
    credentials: true,
  });

  await app.listen(3001);

  console.log('🚀 Backend running on port 3001');
  console.log('📝 JWT_SECRET loaded from env');
}
bootstrap();

PHẦN 2: FRONTEND (Next.js)
2.1. Auth Storage Utility
typescript// lib/auth-storage.ts
export const authStorage = {
  setToken: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  getToken: () => {
    const token = localStorage.getItem('accessToken');
    const timestamp = localStorage.getItem('tokenTimestamp');

    // DEV ONLY: Nếu token quá 1 giờ và đang dev -> clear
    if (process.env.NODE_ENV === 'development' && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const oneHour = 60 * 60 * 1000;

      if (age > oneHour) {
        console.warn('⚠️ Token quá cũ, có thể backend đã restart. Clearing...');
        authStorage.clearTokens();
        return null;
      }
    }

    return token;
  },

  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenTimestamp');
  },

  hasToken: () => {
    return !!localStorage.getItem('accessToken');
  }
};
2.2. Axios Instance với Auto-Refresh
typescript// lib/axios.ts
import axios from 'axios';
import { authStorage } from './auth-storage';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 và auto-refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu không phải 401 hoặc đã retry -> fail luôn
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Nếu request là refresh hoặc login -> fail luôn, không retry
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      authStorage.clearTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Nếu đang refresh -> queue request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = authStorage.getRefreshToken();

    if (!refreshToken) {
      authStorage.clearTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken }
      );

      authStorage.setToken(data.accessToken, data.refreshToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

      processQueue(null, data.accessToken);

      originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      authStorage.clearTokens();

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
2.3. Auth Context Provider
typescript// contexts/auth-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { authStorage } from '@/lib/auth-storage';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Auto-restore session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = authStorage.getToken();
      
      if (token) {
        try {
          // Verify token bằng cách gọi API /me hoặc tương tự
          const { data } = await apiClient.get('/auth/me');
          setUser(data);
        } catch (error) {
          console.error('Token invalid, clearing...', error);
          authStorage.clearTokens();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      
      authStorage.setToken(data.accessToken, data.refreshToken);
      setUser(data.user);
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authStorage.clearTokens();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
2.4. Root Layout
typescript// app/layout.tsx
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
2.5. Login Page
typescript// app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { authStorage } from '@/lib/auth-storage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Clear tokens khi vào trang login (tránh redirect loop)
  useEffect(() => {
    authStorage.clearTokens();
  }, []);

  // Redirect nếu đã login
  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect handled by AuthContext
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Login</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
2.6. Protected Dashboard Page
typescript// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?returnUrl=/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4">
            <p>Welcome, {user.name}!</p>
            <p className="text-gray-600">Email: {user.email}</p>
            <p className="text-sm text-green-600">
              ✅ Token được lưu trong localStorage
            </p>
            <p className="text-sm text-green-600">
              ✅ Đóng Safari/Chrome rồi mở lại sẽ KHÔNG cần login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
2.7. Middleware (Optional)
typescript// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Note: Không thể access localStorage ở middleware
  // Chỉ có thể check cookie (nếu dùng cookie)
  // Vì dùng localStorage nên skip middleware check
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};
2.8. Environment Variables
bash# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

# Production (Vercel)
# NEXT_PUBLIC_API_URL=https://your-backend-api.com

PHẦN 3: CHECKLIST TRIỂN KHAI
Backend Checklist

 Cài đặt packages: @nestjs/jwt, @nestjs/config, bcrypt
 Tạo file .env với JWT_SECRET và JWT_REFRESH_SECRET CỐ ĐỊNH
 Implement AuthModule, AuthService, AuthController
 Implement JwtAuthGuard
 Setup CORS trong main.ts cho Vercel domain
 Tạo endpoint: POST /auth/login, POST /auth/refresh, POST /auth/logout
 (Optional) Tạo bảng refresh_tokens trong database
 Test restart backend → token cũ vẫn valid

Frontend Checklist

 Cài đặt packages: axios
 Tạo lib/auth-storage.ts - localStorage utility
 Tạo lib/axios.ts - axios instance với auto-refresh interceptor
 Tạo contexts/auth-context.tsx - Auth provider
 Wrap app/layout.tsx với <AuthProvider>
 Tạo app/login/page.tsx
 Tạo app/dashboard/page.tsx (protected page)
 Setup .env.local với NEXT_PUBLIC_API_URL
 Test: Đóng browser → mở lại → KHÔNG cần login
 Test: Restart backend → login lại → KHÔNG bị redirect loop

Testing Checklist

 Test 1: Token persistence trên iOS

Login trên Safari iOS
Đóng Safari hoàn toàn (swipe up)
Mở Safari lại → Vẫn đăng nhập ✅


 Test 2: Restart backend không gây loop

Login trên frontend (Vercel)
Restart backend
Refresh page → Redirect login (1 lần) → Login lại → OK ✅


 Test 3: Auto token refresh

Login → Đợi 89 ngày (hoặc modify expiry ngắn để test)
Gọi API → Token tự refresh → Không cần login lại ✅


 Test 4: Multiple tabs

Mở 2 tabs cùng app
Login ở tab 1
Tab 2 tự detect token → Authenticated ✅