import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { toast } from "sonner";
import { statisticsApi, trainingClassApi } from "../../services/api";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  AlertTriangle,
  Table as TableIcon,
  Navigation,
  MapPinOff,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "../ui/skeleton";

interface OverviewStats {
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalAttendances: number;
  presentCount: number;
  absentCount: number;
  farCheckInCount: number;
  presentRate: number;
  absentRate: number;
  farCheckInRate: number;
}

interface AttendanceMatrix {
  startDate: string;
  endDate: string;
  dates: string[];
  students: {
    student: {
      id: string;
      studentCode: string;
      fullName: string;
      avatarUrl?: string;
    };
    dailyStatus: {
      date: string;
      status: 'PRESENT' | 'ABSENT' | 'NO_SESSION';
    }[];
    presentCount: number;
    absentCount: number;
    totalDays: number;
    attendanceRate: number;
  }[];
  totalStudents: number;
  totalDays: number;
}

interface FarCheckInDetails {
  startDate: string;
  endDate: string;
  students: {
    student: {
      id: string;
      studentCode: string;
      fullName: string;
      avatarUrl?: string;
    };
    farCheckIns: {
      date: string;
      sessionName: string;
      checkInTime: string;
      locationNote: string;
      distance: number;
      lat: number;
      lng: number;
    }[];
    noGpsCheckIns: {
      date: string;
      sessionName: string;
      checkInTime: string;
      reason: string;
    }[];
    totalFarCheckIns: number;
    totalNoGpsCheckIns: number;
  }[];
  totalStudentsWithIssues: number;
}

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Date range - default to this week
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

  // Stats data
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [attendanceMatrix, setAttendanceMatrix] = useState<AttendanceMatrix | null>(null);
  const [farCheckInDetails, setFarCheckInDetails] = useState<FarCheckInDetails | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStats();
    }
  }, [startDate, endDate, selectedClassId]);

  const fetchClasses = async () => {
    try {
      const data = await trainingClassApi.getAll();
      setClasses(data);
      // Auto-select first class if available
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách lớp học");
    }
  };

  const fetchStats = async () => {
    if (!selectedClassId) return;

    try {
      setLoading(true);

      const [overviewData, matrixData, farDetailsData] = await Promise.all([
        statisticsApi.getOverview(startDate, endDate, selectedClassId),
        statisticsApi.getAttendanceMatrix(startDate, endDate, selectedClassId),
        statisticsApi.getFarCheckInDetails(startDate, endDate, selectedClassId),
      ]);

      setOverview(overviewData);
      setAttendanceMatrix(matrixData);
      setFarCheckInDetails(farDetailsData);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  const setDateRange = (range: 'today' | 'week' | 'month') => {
    const today = new Date();
    switch (range) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString + 'T00:00:00'), 'dd/MM', { locale: vi });
    } catch (e) {
      return dateString;
    }
  };

  if (loading && !overview) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Thống kê điểm danh chi tiết
          </h1>
          <p className="text-gray-500 mt-1">Bảng điểm danh theo ngày cho từng học viên</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={startDate === format(new Date(), 'yyyy-MM-dd') ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange('today')}
          >
            Hôm nay
          </Button>
          <Button
            variant={startDate === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange('week')}
          >
            Tuần này
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange('month')}
          >
            30 ngày
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-indigo-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Lớp học *</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClassId ? (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-400">
              <TableIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Vui lòng chọn lớp học để xem thống kê</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Tổng quan</span>
              <span className="sm:hidden">Tổng quan</span>
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex items-center gap-2">
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Bảng điểm danh</span>
              <span className="sm:hidden">Điểm danh</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Chi tiết Check-in</span>
              <span className="sm:hidden">Chi tiết</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tổng ca học</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalSessions}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tổng số học viên</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{attendanceMatrix?.totalStudents || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Có mặt</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {overview.presentRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{overview.presentCount} lượt</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Vắng</p>
                        <p className="text-3xl font-bold text-red-600 mt-2">
                          {overview.absentRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{overview.absentCount} lượt</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Check-in xa</p>
                        <p className="text-3xl font-bold text-amber-600 mt-2">
                          {overview.farCheckInRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{overview.farCheckInCount} lượt</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Summary Information */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <BarChart3 className="w-5 h-5" />
                  Thông tin tổng hợp
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Thời gian thống kê
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Từ ngày:</span>{" "}
                        {format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Đến ngày:</span>{" "}
                        {format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Tổng số ngày:</span>{" "}
                        {attendanceMatrix?.totalDays || 0} ngày
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Cảnh báo
                    </h3>
                    <div className="bg-amber-50 p-4 rounded-lg space-y-2">
                      <p className="text-sm text-amber-900">
                        <span className="font-medium">Check-in xa:</span>{" "}
                        {farCheckInDetails?.students.reduce((sum, s) => sum + s.totalFarCheckIns, 0) || 0} lượt
                      </p>
                      <p className="text-sm text-red-900">
                        <span className="font-medium">Không có GPS:</span>{" "}
                        {farCheckInDetails?.students.reduce((sum, s) => sum + s.totalNoGpsCheckIns, 0) || 0} lượt
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Học viên có vấn đề:</span>{" "}
                        {farCheckInDetails?.totalStudentsWithIssues || 0} người
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Attendance Matrix */}
          <TabsContent value="matrix">
            {attendanceMatrix && (
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <TableIcon className="w-5 h-5" />
                    Bảng điểm danh chi tiết ({attendanceMatrix.totalStudents} học viên)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {attendanceMatrix.students.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Không có học viên trong lớp này</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="sticky left-0 z-10 bg-gray-50 border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                              Học viên
                            </th>
                            {attendanceMatrix.dates.map((date) => (
                              <th
                                key={date}
                                className="border border-gray-300 px-2 py-3 text-center text-sm font-semibold text-gray-700 min-w-[60px]"
                              >
                                {formatDate(date)}
                              </th>
                            ))}
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]">
                              Tỷ lệ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceMatrix.students.map((student) => (
                            <tr key={student.student.id} className="hover:bg-gray-50 transition-colors">
                              <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    {student.student.avatarUrl ? (
                                      <img
                                        src={student.student.avatarUrl}
                                        alt={student.student.fullName}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      <Users className="w-4 h-4 text-indigo-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">
                                      {student.student.fullName}
                                    </p>
                                    <p className="text-xs text-gray-500">{student.student.studentCode}</p>
                                  </div>
                                </div>
                              </td>
                              {student.dailyStatus.map((day, idx) => (
                                <td
                                  key={idx}
                                  className={`border border-gray-300 text-center py-3 ${day.status === 'PRESENT'
                                    ? 'bg-green-50'
                                    : day.status === 'ABSENT'
                                      ? 'bg-red-50'
                                      : 'bg-gray-50'
                                    }`}
                                >
                                  {day.status === 'PRESENT' ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : day.status === 'ABSENT' ? (
                                    <span className="text-red-600 font-bold text-lg">✗</span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="border border-gray-300 text-center py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge
                                    variant={
                                      student.attendanceRate >= 80
                                        ? 'default'
                                        : student.attendanceRate >= 50
                                          ? 'secondary'
                                          : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {student.attendanceRate.toFixed(0)}%
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {student.presentCount}/{student.totalDays}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 3: Far Check-in Details */}
          <TabsContent value="details">
            {farCheckInDetails && farCheckInDetails.students.length > 0 ? (
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <Navigation className="w-5 h-5" />
                    Chi tiết Check-in Xa & Không có GPS ({farCheckInDetails.totalStudentsWithIssues} học viên)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {farCheckInDetails.students.map((student) => (
                      <Card key={student.student.id} className="border-2 hover:border-amber-300 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                              {student.student.avatarUrl ? (
                                <img
                                  src={student.student.avatarUrl}
                                  alt={student.student.fullName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <Users className="w-6 h-6 text-amber-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{student.student.fullName}</h4>
                              <p className="text-sm text-gray-600">{student.student.studentCode}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end">
                              {student.totalFarCheckIns > 0 && (
                                <Badge className="bg-amber-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {student.totalFarCheckIns} lần xa
                                </Badge>
                              )}
                              {student.totalNoGpsCheckIns > 0 && (
                                <Badge variant="destructive">
                                  <MapPinOff className="w-3 h-3 mr-1" />
                                  {student.totalNoGpsCheckIns} lần không GPS
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Far Check-ins */}
                            {student.farCheckIns.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  Check-in xa lớp học:
                                </h5>
                                <div className="space-y-2">
                                  {student.farCheckIns.map((checkIn, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs">
                                            {format(new Date(checkIn.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: vi })}
                                          </Badge>
                                          <span className="text-sm font-medium">{checkIn.sessionName}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {new Date(checkIn.checkInTime).toLocaleTimeString("vi-VN")}
                                        </p>
                                        <Badge className="mt-1 bg-amber-600 text-xs">
                                          {checkIn.distance}m
                                        </Badge>
                                      </div>
                                      <a
                                        href={`https://www.google.com/maps?q=${checkIn.lat},${checkIn.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                      >
                                        <MapPin className="w-5 h-5" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* No GPS Check-ins */}
                            {student.noGpsCheckIns.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                  <MapPinOff className="w-4 h-4" />
                                  Check-in không có GPS:
                                </h5>
                                <div className="space-y-2">
                                  {student.noGpsCheckIns.map((checkIn, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs">
                                            {format(new Date(checkIn.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: vi })}
                                          </Badge>
                                          <span className="text-sm font-medium">{checkIn.sessionName}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {new Date(checkIn.checkInTime).toLocaleTimeString("vi-VN")}
                                        </p>
                                        <Badge variant="destructive" className="mt-1 text-xs">
                                          {checkIn.reason}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-400" />
                    <p className="text-lg font-medium text-green-600">Không có vấn đề check-in nào</p>
                    <p className="text-sm text-gray-500 mt-2">Tất cả học viên đều check-in đúng vị trí và có GPS</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
