import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import Navigation from "./Navigation";
import { CheckCircle2, XCircle, Camera, Clock } from "lucide-react";
import { studentApi, sessionApi, attendanceApi } from "../services/api";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [registeredSessionId, setRegisteredSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch profile
      const userProfile = await studentApi.getProfile();
      setProfile(userProfile);

      // Fetch today's sessions
      const sessions = await sessionApi.getTodaySessions();
      setTodaySessions(sessions);

      // Fetch attendance history to check status
      const history = await attendanceApi.getMyHistory();
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = history.find((h: any) => h.session.date.startsWith(today) || h.session.date === today);

      if (todayRecord) {
        setAttendance(todayRecord);
      }

      // Check registration status - simpler approach for now:
      // If we could determine registration from sessions list, that would be best.
      // But for now we don't have that flag. 
      // We will rely on attendance record first.

    } catch (error) {
      console.error(error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (sessionId: string) => {
    try {
      setRegistering(sessionId);
      await sessionApi.register(sessionId);
      toast.success("Đăng ký ca học thành công!");
      setRegisteredSessionId(sessionId);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Đăng ký thất bại");
    } finally {
      setRegistering(null);
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

  const isAttended = !!attendance;

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
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {todaySessions.length} <span className="text-sm font-normal text-gray-500">ca học</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Sessions */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
            <Clock className="w-5 h-5 text-indigo-600" />
            Ca học hôm nay
          </h3>
          {todaySessions.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p>Không có ca học nào diễn ra hôm nay.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todaySessions.map((session) => {
                const isRegistered = session.isRegistered || registeredSessionId === session.id;

                return (
                  <Card key={session.id} className={`transition-all duration-300 ${isRegistered ? "border-green-500 ring-1 ring-green-500 shadow-md bg-green-50/30" : "hover:shadow-md border-l-4 border-l-indigo-500"}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="text-xl font-bold text-gray-900">{session.name}</h4>
                            {isAttended && attendance?.sessionId === session.id && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 pl-1 pr-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Đã điểm danh
                              </Badge>
                            )}
                            {isRegistered && (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-white">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Đã đăng ký ca học
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-indigo-500" />
                              <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{session.startTime} - {session.endTime}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <span>Hạn đăng ký:</span>
                              <span className="text-orange-600 font-medium">{new Date(session.registrationDeadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex gap-3">
                          {isAttended && attendance?.sessionId === session.id ? (
                            <div className="text-green-600 font-medium flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Hoàn thành</span>
                            </div>
                          ) : isRegistered ? (
                            <Button
                              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                              onClick={() => navigate("/check-in", { state: { sessionId: session.id } })}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Điểm danh
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                              onClick={() => handleRegister(session.id)}
                              disabled={!!registering || isAttended}
                            >
                              {registering === session.id ? "Đang xử lý..." : "Đăng ký"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
