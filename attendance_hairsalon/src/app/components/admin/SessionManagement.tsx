import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "../ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { Plus, Clock, Edit2, Trash2, Calendar as CalendarIcon, AlertCircle, School, CalendarRange } from "lucide-react";
import { sessionApi, trainingClassApi } from "../../services/api";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import BulkSessionDialog from "./BulkSessionDialog";

export default function SessionManagement() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Edit/Delete state
    const [editingSession, setEditingSession] = useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<any>(null);

    // Class selection
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        startTime: "",
        endTime: "",
    });

    // Bulk session dialog
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

    // Need to format date as YYYY-MM-DD for API
    const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (formattedDate && selectedClassId) {
            loadSessions();
        } else {
            setSessions([]);
        }
    }, [formattedDate, selectedClassId]);

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
            setLoading(true);
            const data = await sessionApi.getByDate(formattedDate, selectedClassId);
            setSessions(data);
        } catch (error: any) {
            toast.error(error.message || "Không thể tải danh sách ca học");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (session?: any) => {
        if (session) {
            setEditingSession(session);
            setFormData({
                name: session.name,
                startTime: session.startTime,
                endTime: session.endTime,
            });
        } else {
            setEditingSession(null);
            setFormData({ name: "", startTime: "", endTime: "" });
        }
        setDialogOpen(true);
    };

    const handleDeleteClick = (session: any) => {
        setSessionToDelete(session);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        try {
            await sessionApi.remove(sessionToDelete.id);
            toast.success("Xóa ca học thành công");
            setDeleteConfirmOpen(false);
            setSessionToDelete(null);
            loadSessions();
        } catch (error: any) {
            toast.error("Không thể xóa ca học. Vui lòng thử lại.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingSession && sessions.length >= 3) {
            toast.error("Mỗi ngày chỉ được tạo tối đa 3 ca học");
            return;
        }

        try {
            const data = {
                date: formattedDate,
                trainingClassId: selectedClassId,
                ...formData,
            };

            if (editingSession) {
                await sessionApi.update(editingSession.id, data);
                toast.success("Cập nhật ca học thành công!");
            } else {
                await sessionApi.create(data);
                toast.success("Tạo ca học thành công!");
            }

            setDialogOpen(false);
            loadSessions();
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Quản lý ca học</h2>
                <p className="text-muted-foreground">Thiết lập và lên lịch các ca học</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    {/* Class Selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <School className="w-5 h-5 text-indigo-600" />
                                Chọn lớp học
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn lớp học..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name} ({cls.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Calendar Selector */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                Chọn ngày
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center p-0 pb-4">
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={vi}
                                className="border rounded-md p-2 shadow-sm bg-white"
                                modifiersClassNames={{
                                    selected: "bg-indigo-600 text-white hover:bg-indigo-500",
                                    today: "text-indigo-600 font-bold"
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Sessions List */}
                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <CardTitle>
                                    Chi tiết ngày {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "..."}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {sessions.length}/3 ca học đã tạo
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setBulkDialogOpen(true)}
                                    disabled={!selectedClassId}
                                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                    <CalendarRange className="w-4 h-4 mr-2" />
                                    Tạo hàng loạt
                                </Button>

                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            disabled={!selectedDate || sessions.length >= 3}
                                            onClick={() => handleOpenDialog()}
                                            className="bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Thêm ca học
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {editingSession ? "Chỉnh sửa ca học" : "Tạo ca học mới"}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {selectedDate && format(selectedDate, "'Ngày' dd 'tháng' MM 'năm' yyyy", { locale: vi })}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Tên ca học *</Label>
                                                <Select
                                                    value={formData.name}
                                                    onValueChange={(value) =>
                                                        setFormData({ ...formData, name: value })
                                                    }
                                                    required
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn ca học" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Ca 1">Ca 1</SelectItem>
                                                        <SelectItem value="Ca 2">Ca 2</SelectItem>
                                                        <SelectItem value="Ca 3">Ca 3</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="startTime">Giờ bắt đầu *</Label>
                                                    <Input
                                                        id="startTime"
                                                        type="time"
                                                        value={formData.startTime}
                                                        onChange={(e) =>
                                                            setFormData({ ...formData, startTime: e.target.value })
                                                        }
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="endTime">Giờ kết thúc *</Label>
                                                    <Input
                                                        id="endTime"
                                                        type="time"
                                                        value={formData.endTime}
                                                        onChange={(e) =>
                                                            setFormData({ ...formData, endTime: e.target.value })
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setDialogOpen(false)}
                                                    className="flex-1"
                                                >
                                                    Hủy
                                                </Button>
                                                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                                    {editingSession ? "Cập nhật" : "Tạo mới"}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                    <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                    <p>Chưa có ca học nào trong ngày này</p>
                                    <Button
                                        variant="link"
                                        onClick={() => handleOpenDialog()}
                                        className="text-indigo-600"
                                    >
                                        Tạo ca học ngay
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sessions.map((session) => (
                                        <Card key={session.id} className="group border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
                                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-bold text-gray-900">{session.name}</h3>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {session.startTime} - {session.endTime}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            <span>Đăng ký trước: {new Date(session.registrationDeadline).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => handleOpenDialog(session)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDeleteClick(session)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {sessions.length >= 3 && (
                                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold">Đã đạt giới hạn số ca học</p>
                                        <p>Mỗi ngày chỉ được phép tạo tối đa 3 ca học. Vui lòng xóa bớt nếu muốn thêm mới.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa ca học này? Hành động này không thể hoàn tác nếu đã có dữ liệu điểm danh liên quan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Xóa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Session Dialog */}
            <BulkSessionDialog
                open={bulkDialogOpen}
                onOpenChange={setBulkDialogOpen}
                classId={selectedClassId}
                onSuccess={loadSessions}
            />
        </div>
    );
}
