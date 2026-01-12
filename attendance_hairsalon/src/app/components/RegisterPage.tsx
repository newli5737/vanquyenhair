import { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";

const RegisterPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value,
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Mật khẩu nhập lại không khớp');
            return;
        }

        setIsLoading(true);

        try {
            const data = await authApi.register({
                fullName: formData.fullName,
                phone: formData.phone,
                email: formData.email || undefined,
                password: formData.password,
                dateOfBirth: formData.dateOfBirth || undefined,
            });

            // authApi already saves to sessionStorage
            toast.success('Đăng ký thành công');

            onLogin(data.user);
            navigate('/');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            {/* Left Side - Branding */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 hidden md:flex flex-col justify-center items-center text-white p-12 relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 text-center space-y-6 max-w-lg">
                    <div className="bg-white/20 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm shadow-xl border border-white/10">
                        <GraduationCap className="w-12 h-12 text-white" />
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight">Tham gia Hệ thống Điểm danh</h1>
                    <p className="text-indigo-100 text-lg leading-relaxed">
                        Đăng ký tài khoản ngay để bắt đầu hành trình học tập và quản lý lịch học hiệu quả.
                    </p>

                    <div className="pt-8 space-y-3 text-left w-fit mx-auto">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-300" />
                            <span>Đăng ký lớp học dễ dàng</span>
                        </div>
                        <div className="flex items-center gap-3 desktop:pb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-300" />
                            <span>Check-in tự động, nhanh chóng</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-300" />
                            <span>Theo dõi tiến độ học tập</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex items-center justify-center p-6 md:p-12 bg-gray-50/50">
                <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Tạo tài khoản mới 🚀</h2>
                        <p className="text-gray-500 mt-2">Nhập thông tin cá nhân của bạn để đăng ký</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Họ và tên</Label>
                            <Input
                                id="fullName"
                                placeholder="Nguyễn Văn A"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Số điện thoại *</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="0123456789"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email (tùy chọn)</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Ngày sinh (tùy chọn)</Label>
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="h-11"
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg transition-all hover:scale-[1.01]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Đang đăng ký...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Đăng ký ngay <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>

                        <p className="text-center text-sm text-gray-500">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="text-indigo-600 font-medium cursor-pointer hover:underline">
                                Đăng nhập
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
