import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import Navigation from "./Navigation";
import { toast } from "sonner";
import { User, Mail, Phone, IdCard, CheckCircle2, XCircle, Save } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Mock student data
  const [profile, setProfile] = useState({
    name: "Nguyễn Văn An",
    studentId: "SV001",
    email: "nguyenvanan@university.edu.vn",
    phone: "0912345678",
    class: "CNTT-K18",
    course: "Công nghệ thông tin",
    faceRegistered: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: "Đang cập nhật thông tin...",
        success: () => {
          setIsEditing(false);
          return "Cập nhật thông tin thành công!";
        },
        error: "Cập nhật thất bại, vui lòng thử lại",
      }
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={() => navigate("/login")} />
      
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">Hồ sơ học viên</h2>
          <p className="text-gray-600">Quản lý thông tin cá nhân của bạn</p>
        </div>

        {/* Profile Picture */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{profile.name}</h3>
              <p className="text-gray-600">{profile.studentId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Thông tin chi tiết về học viên</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ tên</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId">Mã học viên</Label>
                  <Input
                    id="studentId"
                    value={profile.studentId}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Họ tên</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IdCard className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Mã học viên</p>
                    <p className="font-medium">{profile.studentId}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Số điện thoại</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Lớp</span>
                    <span className="font-medium">{profile.class}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Khóa học</span>
                    <span className="font-medium">{profile.course}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Face Data Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dữ liệu khuôn mặt</CardTitle>
            <CardDescription>
              Trạng thái đăng ký dữ liệu nhận diện khuôn mặt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {profile.faceRegistered ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium">Đã đăng ký</p>
                      <p className="text-sm text-gray-600">
                        Dữ liệu khuôn mặt đã được đăng ký vào hệ thống
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="font-medium">Chưa đăng ký</p>
                      <p className="text-sm text-gray-600">
                        Vui lòng đăng ký dữ liệu khuôn mặt để sử dụng tính năng điểm danh
                      </p>
                    </div>
                  </>
                )}
              </div>
              {profile.faceRegistered ? (
                <Badge className="bg-green-600">Đã kích hoạt</Badge>
              ) : (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  Chưa kích hoạt
                </Badge>
              )}
            </div>
            
            {!profile.faceRegistered && (
              <Button className="w-full mt-4">
                Đăng ký dữ liệu khuôn mặt
              </Button>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">
              Dữ liệu khuôn mặt và vị trí chỉ được sử dụng cho mục đích điểm danh
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
