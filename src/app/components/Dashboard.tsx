import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import Navigation from "./Navigation";
import { CheckCircle2, XCircle, Camera } from "lucide-react";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  
  // Mock student data
  const student = {
    name: "Nguyễn Văn An",
    studentId: "SV001",
    class: "CNTT-K18",
    course: "Công nghệ thông tin",
    todayStatus: false, // false = chưa điểm danh
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={onLogout} />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl mb-1">Xin chào, {student.name}!</h2>
          <p className="text-gray-600">Chào mừng bạn đến với hệ thống điểm danh</p>
        </div>

        {/* Student Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin học viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Họ tên</p>
                <p className="font-medium">{student.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mã học viên</p>
                <p className="font-medium">{student.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lớp</p>
                <p className="font-medium">{student.class}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Khóa học</p>
                <p className="font-medium">{student.course}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Trạng thái hôm nay</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {student.todayStatus ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                    <div>
                      <p className="font-medium">Đã điểm danh</p>
                      <p className="text-sm text-gray-600">08:15 - Đúng giờ</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-orange-500" />
                    <div>
                      <p className="font-medium">Chưa điểm danh</p>
                      <p className="text-sm text-gray-600">Vui lòng điểm danh ngay</p>
                    </div>
                  </>
                )}
              </div>
              {!student.todayStatus && (
                <Badge variant="default" className="hidden sm:block">Cần điểm danh</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Action Button */}
        <div className="space-y-4">
          <Button 
            size="lg"
            className="w-full h-14 text-lg gap-2"
            onClick={() => navigate("/check-in")}
            disabled={student.todayStatus}
          >
            <Camera className="w-5 h-5" />
            {student.todayStatus ? "Đã điểm danh hôm nay" : "Điểm danh ngay"}
          </Button>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-green-600">45</p>
                <p className="text-sm text-gray-600">Đúng giờ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-orange-500">3</p>
                <p className="text-sm text-gray-600">Trễ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-red-600">2</p>
                <p className="text-sm text-gray-600">Vắng</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
