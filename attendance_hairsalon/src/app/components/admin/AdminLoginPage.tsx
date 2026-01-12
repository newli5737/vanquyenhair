import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Shield, LockKeyhole, ArrowLeft } from "lucide-react";
import { authApi } from "../../services/api";

interface AdminLoginPageProps {
    onLogin: (user: any) => void;
}

export default function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({ phone: "", password: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset errors
        setErrors({ phone: "", password: "" });

        // Validate
        const newErrors = { phone: "", password: "" };

        if (!phone) {
            newErrors.phone = "Vui lòng nhập số điện thoại";
        }

        if (!password) {
            newErrors.password = "Vui lòng nhập mật khẩu";
        }

        if (newErrors.phone || newErrors.password) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.login(phone, password);

            if (response.user.role !== 'ADMIN') {
                toast.error("Bạn không có quyền truy cập trang quản trị");
                setLoading(false);
                return;
            }

            // authApi already saves to sessionStorage
            toast.success("Đăng nhập thành công!");

            // Fix for iOS Safari: wait a bit for cookie to be available
            await new Promise(r => setTimeout(r, 300));

            onLogin(response.user);
            navigate("/admin/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">

            {/* Left Side (Desktop) - Form */}
            <div className="flex items-center justify-center p-6 md:p-12 bg-white relative">
                {/* Back to Student Login Button */}
                <button
                    onClick={() => navigate("/login")}
                    className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Trang học viên</span>
                </button>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-6">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900">Admin Portal</h2>
                        <p className="text-slate-500 mt-2">Đăng nhập để quản lý hệ thống và nhân sự</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Số điện thoại Admin</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="09xxxxxxx"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`h-11 border-slate-200 focus:border-slate-500 focus:ring-slate-500 ${errors.phone ? "border-red-500" : ""}`}
                                disabled={loading}
                            />
                            {errors.phone && (
                                <p className="text-sm text-red-500 font-medium">{errors.phone}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`h-11 border-slate-200 focus:border-slate-500 focus:ring-slate-500 ${errors.password ? "border-red-500" : ""}`}
                                disabled={loading}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500 font-medium">{errors.password}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md hover:shadow-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Đang xác thực...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <LockKeyhole className="w-4 h-4" /> Truy cập Dashboard
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Right Side (Desktop) - Branding */}
            <div className="bg-slate-900 hidden md:flex flex-col justify-center items-center text-white p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>

                <div className="relative z-10 text-center space-y-8 max-w-lg">
                    <div className="w-32 h-32 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto ring-4 ring-slate-700 backdrop-blur-md">
                        <Shield className="w-16 h-16 text-indigo-400" />
                    </div>

                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-4">Bảo mật & Quản lý</h1>
                        <p className="text-slate-300 text-lg">
                            Khu vực dành riêng cho quản trị viên. <br />Vui lòng bảo mật thông tin tài khoản của bạn.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8 opacity-80">
                        <div className="p-4 rounded-lg bg-slate-800/50 backdrop-blur border border-slate-700">
                            <div className="text-2xl font-bold text-white mb-1">24/7</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Giám sát</div>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-800/50 backdrop-blur border border-slate-700">
                            <div className="text-2xl font-bold text-white mb-1">100%</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">An toàn</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
