import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { FileText, Download, Calendar } from "lucide-react";
import { attendanceApi, trainingClassApi } from "../../services/api";
import { useEffect } from "react";

export default function WeeklyReportPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("all");
    const [classes, setClasses] = useState<any[]>([]);
    const [report, setReport] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const data = await trainingClassApi.getAll();
            setClasses(data);
        } catch (error) {
            toast.error("Không thể tải danh sách lớp");
        }
    };

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            toast.error("Vui lòng chọn ngày bắt đầu và kết thúc");
            return;
        }

        try {
            setLoading(true);
            const data = await attendanceApi.getWeeklyReport(
                startDate,
                endDate,
                selectedClassId === "all" ? undefined : selectedClassId
            );
            setReport(data);
            toast.success(`Tìm thấy ${data.length} bản ghi vắng mặt`);
        } catch (error: any) {
            toast.error(error.message || "Không thể tạo báo cáo");
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (report.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        const headers = ["Mã SV", "Tên SV", "Lớp", "Mã lớp", "Ngày", "Ca học", "Giờ"];
        const rows = report.map((r) => [
            r.studentCode,
            r.studentName,
            r.className,
            r.classCode,
            r.date,
            r.sessionName,
            r.sessionTime,
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `bao_cao_vang_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Đã xuất file CSV");
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Báo cáo điểm danh tuần</h2>
                <p className="text-muted-foreground">
                    Xem danh sách học viên không check-in trong khoảng thời gian
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Tùy chọn báo cáo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Ngày bắt đầu</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">Ngày kết thúc</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="classFilter">Lọc theo lớp</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger id="classFilter">
                                    <SelectValue placeholder="Chọn lớp..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả lớp</SelectItem>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name} ({cls.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleGenerateReport}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            {loading ? "Đang tạo..." : "Tạo báo cáo"}
                        </Button>

                        {report.length > 0 && (
                            <Button variant="outline" onClick={exportToCSV}>
                                <Download className="w-4 h-4 mr-2" />
                                Xuất CSV
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {report.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Kết quả báo cáo</CardTitle>
                            <Badge variant="secondary">{report.length} bản ghi</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Mã SV</TableHead>
                                        <TableHead>Tên học viên</TableHead>
                                        <TableHead>Lớp học</TableHead>
                                        <TableHead>Ngày</TableHead>
                                        <TableHead>Ca học</TableHead>
                                        <TableHead>Giờ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.map((record, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">
                                                {record.studentCode}
                                            </TableCell>
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>
                                                {record.className}
                                                <span className="text-xs text-gray-500 ml-1">
                                                    ({record.classCode})
                                                </span>
                                            </TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell>{record.sessionName}</TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {record.sessionTime}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {report.length === 0 && !loading && startDate && endDate && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Không có học viên vắng mặt trong khoảng thời gian này</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
