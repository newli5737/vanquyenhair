import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import Navigation from "./Navigation";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, MapPin, LogIn, LogOut, GraduationCap } from "lucide-react";
import { attendanceApi, enrollmentApi } from "../services/api";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import "react-day-picker/dist/style.css";

// Interface for Props
interface AttendanceHistoryProps {
  onLogout?: () => void;
}

interface AttendanceRecord {
  id: string;
  rawDate: string; // ISO string for comparison
  date: string; // Formatted string
  checkInTime: string;
  checkOutTime: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "LEFT_EARLY";
  note?: string;
  locationNote?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkInFaceScore?: number;
  checkInImageUrl?: string;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutFaceScore?: number;
  checkOutImageUrl?: string;
  sessionName?: string;
  trainingClassId?: string;
}

interface TrainingClass {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  year: string;
}

export default function AttendanceHistory({ onLogout }: AttendanceHistoryProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [myClasses, setMyClasses] = useState<TrainingClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Create a map for styling dates in calendar
  const [modifiers, setModifiers] = useState<any>({
    present: [],
    late: [],
    absent: []
  });

  useEffect(() => {
    fetchMyClasses();
    fetchHistory();
  }, []);

  const fetchMyClasses = async () => {
    try {
      setLoadingClasses(true);
      const data = await enrollmentApi.getMyClasses();
      setMyClasses(data);
    } catch (error) {
      toast.error("Không thể tải danh sách lớp học");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getMyHistory();

      const presentDates: Date[] = [];
      const lateDates: Date[] = [];
      const absentDates: Date[] = [];

      const formattedData = data.map((item: any) => {
        const dateObj = new Date(item.session.date);

        if (item.status === 'PRESENT') presentDates.push(dateObj);
        else if (item.status === 'LATE') lateDates.push(dateObj);
        else if (item.status === 'ABSENT') absentDates.push(dateObj);

        // Format Check-in Time
        let checkInStr = "--:--";
        if (item.checkInTime) {
          try {
            checkInStr = new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          } catch (e) { console.error(e); }
        }

        // Format Check-out Time
        let checkOutStr = "--:--";
        if (item.checkOutTime) {
          try {
            checkOutStr = new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          } catch (e) { console.error(e); }
        }

        return {
          id: item.id,
          rawDate: item.session.date,
          date: format(dateObj, 'dd/MM/yyyy', { locale: vi }),
          checkInTime: checkInStr,
          checkOutTime: checkOutStr,
          status: item.status,
          note: item.notes,
          locationNote: item.locationNote,
          checkInLat: item.checkInLat,
          checkInLng: item.checkInLng,
          checkInFaceScore: item.checkInFaceScore,
          checkInImageUrl: item.checkInImageUrl,
          checkOutLat: item.checkOutLat,
          checkOutLng: item.checkOutLng,
          checkOutFaceScore: item.checkOutFaceScore,
          checkOutImageUrl: item.checkOutImageUrl,
          sessionName: item.session.name,
          trainingClassId: item.session.trainingClassId
        };
      });

      setHistory(formattedData);
      setModifiers({
        present: presentDates,
        late: lateDates,
        absent: absentDates
      });

    } catch (error) {
      console.error(error);
      toast.error("Không thể tải lịch sử điểm danh");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge className="bg-green-600 hover:bg-green-700">Đúng giờ</Badge>;
      case "LATE":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Đi muộn</Badge>;
      case "ABSENT":
        return <Badge variant="destructive">Vắng mặt</Badge>;
      case "LEFT_EARLY":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Về sớm</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  // Filter records by selected date and class
  const filteredHistory = selectedClassId === "all"
    ? history
    : history.filter(h => h.trainingClassId === selectedClassId);

  const selectedRecords = selectedDate
    ? filteredHistory.filter(h => isSameDay(parseISO(h.rawDate), selectedDate))
    : [];

  const css = `
    .rdp-day_selected { 
      background-color: #4f46e5 !important; 
      color: white !important; 
      font-weight: bold;
    }
    .rdp-day_today { 
      color: #4f46e5; 
      font-weight: bold; 
    }
    .rdp-day_present:not(.rdp-day_selected) {
       border-bottom: 2px solid #16a34a;
    }
    .rdp-day_late:not(.rdp-day_selected) {
       border-bottom: 2px solid #f97316;
    }
    .rdp-day_absent:not(.rdp-day_selected) {
       border-bottom: 2px solid #ef4444;
    }
  `;

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-gray-50/50">
        <Navigation onLogout={onLogout || (() => navigate("/login"))} />
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-gray-50/50">
      <style>{css}</style>
      <Navigation onLogout={onLogout || (() => navigate("/login"))} />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử điểm danh</h2>
          <p className="text-gray-500">Xem lại chi tiết thời gian và địa điểm điểm danh của bạn</p>
        </div>

        {/* Class Filter */}
        <div className="mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="class-filter" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Lọc theo lớp học
                </Label>
                {loadingClasses ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger id="class-filter">
                      <SelectValue placeholder="Chọn lớp học..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả lớp học</SelectItem>
                      {myClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Calendar Section */}
          <div className="md:col-span-5 lg:col-span-4">
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-indigo-600 text-white p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-200" />
                  Chọn ngày xem
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex justify-center bg-white">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={vi}
                  modifiers={modifiers}
                  modifiersClassNames={{
                    present: 'rdp-day_present',
                    late: 'rdp-day_late',
                    absent: 'rdp-day_absent'
                  }}
                  styles={{
                    caption: { color: '#4f46e5' },
                    head_cell: { color: '#6b7280' }
                  }}
                />
              </CardContent>
              <div className="p-4 bg-gray-50 border-t flex flex-wrap gap-3 text-xs text-gray-600 justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div> Đúng giờ
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div> Đi muộn
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Vắng
                </div>
              </div>
            </Card>
          </div>

          {/* Details Section */}
          <div className="md:col-span-7 lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedDate
                  ? `Danh sách ca học ngày ${format(selectedDate, 'dd/MM/yyyy', { locale: vi })}`
                  : "Chọn một ngày để xem chi tiết"}
              </h3>
              <Badge variant="secondary" className="px-3">
                {selectedRecords.length} kết quả
              </Badge>
            </div>

            {selectedRecords.length > 0 ? (
              <div className="grid gap-4">
                {selectedRecords.map((record) => (
                  <Card key={record.id} className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4">
                        {/* Header: Session Name + Status */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold text-gray-900">{record.sessionName || "Ca học"}</h4>
                          {getStatusBadge(record.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                          {/* Check In Column */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-700 font-bold border-b pb-2">
                              <LogIn className="w-5 h-5" /> CHECK-IN
                            </div>
                            <div className="flex gap-4">
                              {/* Image */}
                              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                                {record.checkInImageUrl ? (
                                  <img src={record.checkInImageUrl} alt="Check-in" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(record.checkInImageUrl, '_blank')} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                )}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="text-2xl font-bold text-gray-800">{record.checkInTime}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {record.checkInLat ? (
                                    <a href={`https://www.google.com/maps?q=${record.checkInLat},${record.checkInLng}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 underline">
                                      Xem vị trí
                                    </a>
                                  ) : "Không có vị trí"}
                                </div>
                                {record.checkInFaceScore !== undefined && (
                                  <Badge variant="outline" className={record.checkInFaceScore > 0.9 ? "text-green-600 bg-green-50" : "text-yellow-600"}>
                                    Score: {(record.checkInFaceScore * 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Check Out Column */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-orange-700 font-bold border-b pb-2">
                              <LogOut className="w-5 h-5" /> CHECK-OUT
                            </div>
                            <div className="flex gap-4">
                              {/* Image */}
                              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                                {record.checkOutImageUrl ? (
                                  <img src={record.checkOutImageUrl} alt="Check-out" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(record.checkOutImageUrl, '_blank')} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                )}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="text-2xl font-bold text-gray-800">{record.checkOutTime}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {record.checkOutLat ? (
                                    <a href={`https://www.google.com/maps?q=${record.checkOutLat},${record.checkOutLng}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 underline">
                                      Xem vị trí
                                    </a>
                                  ) : "Không có vị trí"}
                                </div>
                                {record.checkOutFaceScore !== undefined && (
                                  <Badge variant="outline" className={record.checkOutFaceScore > 0.9 ? "text-green-600 bg-green-50" : "text-yellow-600"}>
                                    Score: {(record.checkOutFaceScore * 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location Note */}
                        {record.locationNote && (
                          <div className="mt-3 pt-3 border-t">
                            <Badge
                              variant="outline"
                              className={`text-xs ${record.locationNote.includes('xa lớp học')
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                  : 'bg-gray-50 text-gray-600 border-gray-300'
                                }`}
                            >
                              📍 {record.locationNote}
                            </Badge>
                          </div>
                        )}

                        {record.note && (
                          <div className="mt-2 pt-2 border-t border-dashed text-sm text-gray-500 italic">
                            Ghi chú: "{record.note}"
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 flex flex-col items-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="w-8 h-8 opacity-20" />
                  </div>
                  <p>Không có dữ liệu điểm danh cho ngày này</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
