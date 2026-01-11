import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import Navigation from "./Navigation";
import { CheckCircle2, Camera, Clock, GraduationCap } from "lucide-react";
import { studentApi, attendanceApi, enrollmentApi } from "../services/api";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch profile
      const userProfile = await studentApi.getProfile();
      setProfile(userProfile);

      // Fetch classes student is enrolled in
      const classes = await enrollmentApi.getMyClasses();
      setMyClasses(classes);

      // Fetch attendance history to check if already checked in today
      const history = await attendanceApi.getMyHistory();
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = history.find((h: any) => {
        const sessionDate = h.session?.date || '';
        return sessionDate.startsWith(today) || sessionDate === today;
      });

      if (todayRecord) {
        setAttendanceToday(todayRecord);
      }

    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-gray-50">
        <Navigation onLogout={onLogout} />
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const hasAttendedToday = !!attendanceToday && !!attendanceToday.checkInTime;

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-gray-50/50">
      <Navigation onLogout={onLogout} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white shadow-lg">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Xin chào, {profile?.fullName || 'Học viên'}!</h2>
            <p className="text-indigo-100 text-lg">Chúc bạn một ngày học tập hiệu quả.</p>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
        </div>

        {/* Student Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Mã học viên</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{profile?.studentCode}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Trạng thái xác thực</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Badge variant={profile?.faceRegistered ? "default" : "destructive"} className="px-3 py-1 text-sm">
                {profile?.faceRegistered ? "Đã đăng ký khuôn mặt" : "Chưa đăng ký"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-pink-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Điểm danh hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={hasAttendedToday ? "bg-green-600" : "bg-gray-400"}>
                {hasAttendedToday ? "Đã điểm danh" : "Chưa điểm danh"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Status Card */}
        <Card className="mb-6 border-2 border-indigo-100 shadow-lg">
          <CardContent className="p-8">
            {hasAttendedToday ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-700 mb-2">Bạn đã điểm danh hôm nay!</h3>
                  <p className="text-gray-600 mb-1">Ca học: <span className="font-semibold">{attendanceToday.session?.name}</span></p>
                  <p className="text-gray-600">Thời gian: <span className="font-semibold">{new Date(attendanceToday.checkInTime).toLocaleTimeString('vi-VN')}</span></p>
                  {attendanceToday.session?.trainingClass && (
                    <p className="text-gray-600">Lớp: <span className="font-semibold">{attendanceToday.session.trainingClass.name}</span></p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-10 h-10 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Sẵn sàng điểm danh?</h3>
                  <p className="text-gray-600 mb-6">
                    Hệ thống sẽ tự động chọn ca học phù hợp cho bạn trong lớp học đã chọn
                  </p>
                  {!profile?.faceRegistered ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm">
                        ⚠️ Bạn cần đăng ký khuôn mặt trước khi điểm danh
                      </p>
                    </div>
                  ) : myClasses.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm">
                        ⚠️ Bạn chưa được duyệt vào lớp học nào. Vui lòng đăng ký lớp học trước.
                      </p>
                      <Button
                        variant="link"
                        className="text-yellow-700 underline mt-2"
                        onClick={() => navigate("/classes")}
                      >
                        Đăng ký lớp học ngay
                      </Button>
                    </div>
                  ) : myClasses.length === 1 ? (
                    <Button
                      size="lg"
                      className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6 shadow-lg shadow-indigo-200"
                      onClick={() => navigate("/check-in", { state: { classId: myClasses[0].id } })}
                      disabled={!profile?.faceRegistered}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Bắt đầu điểm danh
                    </Button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                      {myClasses.map((cls) => (
                        <Button
                          key={cls.id}
                          size="lg"
                          className="bg-white hover:bg-indigo-50 text-indigo-700 border-2 border-indigo-200 hover:border-indigo-500 h-auto py-4 px-4 flex flex-col items-center gap-2 transition-all shadow-sm"
                          onClick={() => navigate("/check-in", { state: { classId: cls.id } })}
                          disabled={!profile?.faceRegistered}
                        >
                          <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            <span className="font-bold text-lg">{cls.name}</span>
                          </div>
                          <span className="text-xs text-indigo-400 font-normal">Mã lớp: {cls.code}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Classes */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Lớp học của tôi
          </h3>
          {myClasses.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-gray-400" />
                </div>
                <p className="mb-4">Bạn chưa được duyệt vào lớp học nào.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/classes")}
                >
                  Đăng ký lớp học
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myClasses.map((classItem: any) => (
                <Card key={classItem.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <CardDescription>Mã lớp: {classItem.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Loại: <span className="font-medium">{classItem.type}</span></p>
                      <p>Địa điểm: <span className="font-medium">{classItem.location}</span></p>
                      <p>Năm: <span className="font-medium">{classItem.year}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
