import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ studentId: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({ studentId: "", password: "" });
    
    // Validate
    const newErrors = { studentId: "", password: "" };
    
    if (!studentId) {
      newErrors.studentId = "Vui lòng nhập mã học viên";
    }
    
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    }
    
    if (newErrors.studentId || newErrors.password) {
      setErrors(newErrors);
      return;
    }
    
    // Mock authentication - accept any non-empty credentials
    if (studentId && password) {
      toast.success("Đăng nhập thành công!");
      onLogin();
      navigate("/");
    } else {
      toast.error("Mã học viên hoặc mật khẩu không đúng");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Hệ thống điểm danh</CardTitle>
          <CardDescription>Đăng nhập để tiếp tục</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Mã học viên</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="Nhập mã học viên"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={errors.studentId ? "border-red-500" : ""}
              />
              {errors.studentId && (
                <p className="text-sm text-red-500">{errors.studentId}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full">
              Đăng nhập
            </Button>
            
            <div className="text-center">
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Quên mật khẩu?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
