import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { GraduationCap, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { authApi } from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setErrors({ email: "", password: "" });

    // Validate
    const newErrors = { email: "", password: "" };

    if (!email) {
      newErrors.email = "Vui lòng nhập email";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    }

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      const data = await authApi.login(email, password);

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success("Đăng nhập thành công!");
      onLogin(data.user);

      if (data.user.role === 'ADMIN') {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Vui lòng nhập email");
      return;
    }

    try {
      setSendingEmail(true);
      await authApi.forgotPassword(forgotEmail);
      toast.success("Mật khẩu mới đã được gửi vào email của bạn!");
      setShowForgotModal(false);
      setForgotEmail("");
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi yêu cầu");
    } finally {
      setSendingEmail(false);
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

          <h1 className="text-4xl font-bold tracking-tight">Hệ thống Điểm danh Thông minh</h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Quản lý lịch học, theo dõi điểm chuyên cần và check-in nhanh chóng chỉ với vài thao tác đơn giản.
          </p>

          <div className="pt-8 space-y-3 text-left w-fit mx-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-300" />
              <span>Điểm danh bằng khuôn mặt</span>
            </div>
            <div className="flex items-center gap-3 desktop:pb-4">
              <CheckCircle2 className="w-5 h-5 text-green-300" />
              <span>Định vị GPS chính xác</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-300" />
              <span>Thống kê điểm chuyên cần</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-gray-50/50">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center md:text-left">
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chào mừng trở lại! 👋</h2>
            <p className="text-gray-500 mt-2">Nhập email và mật khẩu để truy cập tài khoản của bạn</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-11 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-500 font-medium">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-11 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-500 font-medium">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg transition-all hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Đăng nhập <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-indigo-600 font-medium cursor-pointer hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quên mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập email của bạn để nhận lại mật khẩu mới
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email khôi phục</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={sendingEmail}>
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  "Gửi mật khẩu mới"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotModal(false)}
                className="flex-1"
                disabled={sendingEmail}
              >
                Hủy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
