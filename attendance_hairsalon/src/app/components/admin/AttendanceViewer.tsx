import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { Calendar as CalendarIcon, MapPin, ArrowLeft, School } from "lucide-react";
import { attendanceApi, sessionApi, trainingClassApi } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function AttendanceViewer() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [selectedSession, setSelectedSession] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedDate && selectedClassId) {
            loadSessions();
        } else {
            setSessions([]);
            setSelectedSession("");
        }
    }, [selectedDate, selectedClassId]);

    useEffect(() => {
        loadAttendances();
    }, [selectedDate, selectedSession]);

    const fetchClasses = async () => {
        try {
            const data = await trainingClassApi.getAll();
            setClasses(data);
            if (data.length > 0 && !selectedClassId) {
                setSelectedClassId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const loadSessions = async () => {
        if (!selectedClassId) return;
        try {
            const data = await sessionApi.getByDate(selectedDate, selectedClassId);
            setSessions(data);
            if (data.length > 0) {
                setSelectedSession(data[0].id);
            } else {
                setSelectedSession("");
            }
        } catch (error: any) {
            toast.error(error.message || "Không thể tải danh sách ca học");
        }
    };

    const loadAttendances = async () => {
        try {
            setLoading(true);
            const data = await attendanceApi.getRecords(selectedDate, selectedSession, selectedClassId);
            setAttendances(data);
        } catch (error: any) {
            toast.error(error.message || "Không thể tải dữ liệu điểm danh");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PRESENT":
                return <Badge className="bg-green-600">Đúng giờ</Badge>;
            case "LATE":
                return <Badge className="bg-orange-500">Trễ</Badge>;
            case "ABSENT":
                return <Badge variant="destructive">Vắng</Badge>;
            default:
                return <Badge variant="secondary">Chưa rõ</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Xem điểm danh</h2>
                    <p className="text-muted-foreground">Theo dõi lịch sử và trạng thái điểm danh</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date" className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" />
                                    Chọn ngày:
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="class" className="flex items-center gap-2">
                                    <School className="w-4 h-4" />
                                    Chọn lớp học:
                                </Label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn lớp học" />
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

                            <div className="space-y-2">
                                <Label htmlFor="session">Chọn ca học:</Label>
                                <Select value={selectedSession} onValueChange={setSelectedSession}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn ca học" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((session) => (
                                            <SelectItem key={session.id} value={session.id}>
                                                {session.name} ({session.startTime} - {session.endTime})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách điểm danh</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Đang tải...</div>
                        ) : attendances.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Chưa có dữ liệu điểm danh
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mã HV</TableHead>
                                            <TableHead>Họ tên</TableHead>
                                            <TableHead>Check-in</TableHead>
                                            <TableHead>Check-out</TableHead>
                                            <TableHead className="hidden md:table-cell text-center">Face Score</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendances.map((attendance) => (
                                            <TableRow key={attendance.id}>
                                                <TableCell className="font-medium">
                                                    {attendance.student.studentCode}
                                                </TableCell>
                                                <TableCell>{attendance.student.fullName}</TableCell>
                                                <TableCell>
                                                    {attendance.checkInTime ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {new Date(attendance.checkInTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {attendance.checkInLat && (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {attendance.checkInLat.toFixed(4)}, {attendance.checkInLng?.toFixed(4)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {attendance.checkOutTime ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {new Date(attendance.checkOutTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {attendance.checkOutLat && (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {attendance.checkOutLat.toFixed(4)}, {attendance.checkOutLng?.toFixed(4)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-center">
                                                    {attendance.checkInFaceScore ? (
                                                        <Badge variant="outline" className={
                                                            attendance.checkInFaceScore > 0.9 ? "text-green-600 border-green-200 bg-green-50" : "text-yellow-600"
                                                        }>
                                                            {(attendance.checkInFaceScore * 100).toFixed(0)}%
                                                        </Badge>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(attendance.status)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
