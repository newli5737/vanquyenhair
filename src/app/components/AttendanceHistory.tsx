import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Navigation from "./Navigation";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, FileText } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  status: "on-time" | "late" | "absent";
  note?: string;
}

export default function AttendanceHistory() {
  const navigate = useNavigate();
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock attendance data
  const attendanceData: AttendanceRecord[] = [
    { id: "1", date: "17/12/2024", time: "08:15", status: "on-time" },
    { id: "2", date: "16/12/2024", time: "08:12", status: "on-time" },
    { id: "3", date: "15/12/2024", time: "08:35", status: "late", note: "Tắc đường" },
    { id: "4", date: "14/12/2024", time: "08:10", status: "on-time" },
    { id: "5", date: "13/12/2024", time: "-", status: "absent", note: "Ốm" },
    { id: "6", date: "12/12/2024", time: "08:18", status: "on-time" },
    { id: "7", date: "11/12/2024", time: "08:25", status: "late" },
    { id: "8", date: "10/12/2024", time: "08:14", status: "on-time" },
    { id: "9", date: "09/12/2024", time: "08:09", status: "on-time" },
    { id: "10", date: "08/12/2024", time: "08:11", status: "on-time" },
  ];

  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "on-time":
        return <Badge className="bg-green-600">Đúng giờ</Badge>;
      case "late":
        return <Badge className="bg-orange-500">Trễ</Badge>;
      case "absent":
        return <Badge variant="destructive">Vắng</Badge>;
    }
  };

  const getStatusText = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "on-time":
        return "Đúng giờ";
      case "late":
        return "Trễ";
      case "absent":
        return "Vắng";
    }
  };

  // Filter data
  const filteredData = attendanceData.filter((record) => {
    let matchMonth = true;
    let matchStatus = true;

    if (filterMonth !== "all") {
      const recordMonth = record.date.split("/")[1];
      matchMonth = recordMonth === filterMonth;
    }

    if (filterStatus !== "all") {
      matchStatus = record.status === filterStatus;
    }

    return matchMonth && matchStatus;
  });

  // Calculate statistics
  const stats = {
    total: attendanceData.length,
    onTime: attendanceData.filter(r => r.status === "on-time").length,
    late: attendanceData.filter(r => r.status === "late").length,
    absent: attendanceData.filter(r => r.status === "absent").length,
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={() => navigate("/login")} />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">Lịch sử điểm danh</h2>
          <p className="text-gray-600">Xem lại lịch sử điểm danh của bạn</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Tổng số</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
              <p className="text-sm text-gray-600">Đúng giờ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.late}</p>
              <p className="text-sm text-gray-600">Trễ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-sm text-gray-600">Vắng</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Theo tháng</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="12">Tháng 12</SelectItem>
                    <SelectItem value="11">Tháng 11</SelectItem>
                    <SelectItem value="10">Tháng 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Theo trạng thái</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="on-time">Đúng giờ</SelectItem>
                    <SelectItem value="late">Trễ</SelectItem>
                    <SelectItem value="absent">Vắng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách điểm danh</CardTitle>
            <CardDescription>
              {filteredData.length} bản ghi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu điểm danh</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Ngày</th>
                        <th className="text-left py-3 px-2">Thời gian</th>
                        <th className="text-left py-3 px-2">Trạng thái</th>
                        <th className="text-left py-3 px-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((record) => (
                        <tr key={record.id} className="border-b last:border-0">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {record.date}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {record.time}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {record.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredData.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{record.date}</span>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Clock className="w-4 h-4" />
                          <span>{record.time}</span>
                        </div>
                        {record.note && (
                          <p className="text-sm text-gray-600">
                            Ghi chú: {record.note}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
