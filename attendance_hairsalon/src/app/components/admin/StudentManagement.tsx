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
} from "../ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { Plus, Edit, CheckCircle2, XCircle, ArrowLeft, GraduationCap } from "lucide-react";
import { studentApi } from "../../services/api";
import { uploadToCloudinary } from "../../services/cloudinary";
import { useNavigate } from "react-router-dom";

export default function StudentManagement() {
    const navigate = useNavigate();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        studentCode: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        avatarUrl: "",
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const data = await studentApi.getAll();
            setStudents(data);
        } catch (error: any) {
            toast.error(error.message || "Không thể tải danh sách học viên");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (student?: any) => {
        if (student) {
            setEditingStudent(student);
            setFormData({
                studentCode: student.studentCode,
                fullName: student.fullName,
                email: student.user.email,
                phone: student.phone,
                password: "",
                avatarUrl: student.avatarUrl || "",
            });
        } else {
            setEditingStudent(null);
            setFormData({
                studentCode: "",
                fullName: "",
                email: "",
                phone: "",
                password: "",
                avatarUrl: "",
            });
        }
        setAvatarFile(null);
        setDialogOpen(true);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let avatarUrl = formData.avatarUrl;

            // Upload avatar if new file selected
            if (avatarFile) {
                avatarUrl = await uploadToCloudinary(avatarFile);
            }

            const submitData = {
                ...formData,
                avatarUrl,
            };

            if (editingStudent) {
                // Update - only send fields that have values
                const updateData: any = {
                    fullName: submitData.fullName,
                    phone: submitData.phone,
                    email: submitData.email,
                };

                // Only include password if it has a value
                if (submitData.password && submitData.password.trim() !== '') {
                    updateData.password = submitData.password;
                }

                // Only include avatarUrl if it has a value
                if (submitData.avatarUrl && submitData.avatarUrl.trim() !== '') {
                    updateData.avatarUrl = submitData.avatarUrl;
                }

                await studentApi.update(editingStudent.id, updateData);
                toast.success("Cập nhật học viên thành công!");
            } else {
                // Create
                await studentApi.create(submitData);
                toast.success("Tạo học viên thành công!");
            }

            setDialogOpen(false);
            loadStudents();
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý học viên</h2>
                    <p className="text-muted-foreground">Danh sách và thống kê học viên</p>
                </div>
            </div>

            <Card className="border-t-4 border-t-indigo-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Danh sách học viên</CardTitle>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm học viên
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingStudent ? "Sửa học viên" : "Thêm học viên mới"}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingStudent
                                        ? "Cập nhật thông tin học viên"
                                        : "Nhập thông tin học viên mới"}
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!editingStudent && (
                                    <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-200">
                                        Mã học viên sẽ được hệ thống tự động sinh theo dạng SXXXX nếu để trống hoặc bạn có thể nhập thủ công.
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="studentCode">Mã học viên *</Label>
                                    <Input
                                        id="studentCode"
                                        value={formData.studentCode}
                                        onChange={(e) =>
                                            setFormData({ ...formData, studentCode: e.target.value })
                                        }
                                        required
                                        disabled={!!editingStudent}
                                        className={editingStudent ? "bg-gray-100" : ""}
                                        placeholder="ST001"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        required
                                        placeholder="student@example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">
                                        {editingStudent ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu *"}
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required={!editingStudent}
                                        minLength={6}
                                        placeholder={editingStudent ? "Nhập mật khẩu mới" : "Tối thiểu 6 ký tự"}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Họ tên *</Label>
                                    <Input
                                        id="fullName"
                                        value={formData.fullName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fullName: e.target.value })
                                        }
                                        required
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Số điện thoại *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        required
                                        placeholder="0123456789"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="avatar">Ảnh đại diện</Label>
                                    <Input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                    {formData.avatarUrl && !avatarFile && (
                                        <img
                                            src={formData.avatarUrl}
                                            alt="Avatar"
                                            className="w-20 h-20 rounded-full object-cover mt-2"
                                        />
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        className="flex-1"
                                        disabled={uploading}
                                    >
                                        Hủy
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={uploading}>
                                        {uploading ? "Đang xử lý..." : editingStudent ? "Cập nhật" : "Tạo mới"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Đang tải...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Chưa có học viên nào
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mã HV</TableHead>
                                            <TableHead>Họ tên</TableHead>
                                            <TableHead className="hidden lg:table-cell">Email</TableHead>
                                            <TableHead className="hidden sm:table-cell">SĐT</TableHead>
                                            <TableHead>Khuôn mặt</TableHead>
                                            <TableHead className="text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {student.studentCode}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {student.avatarUrl && (
                                                            <img
                                                                src={student.avatarUrl}
                                                                alt={student.fullName}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                            />
                                                        )}
                                                        <span className="font-medium">{student.fullName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    {student.user.email}
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    {student.phone}
                                                </TableCell>
                                                <TableCell>
                                                    {student.faceRegistered ? (
                                                        <Badge variant="default" className="gap-1 bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Đã đăng ký
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-500 border-none">
                                                            <XCircle className="w-3 h-3" />
                                                            Chưa có
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenDialog(student)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="w-4 h-4 text-indigo-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden grid grid-cols-1 gap-4">
                                {students.map((student) => (
                                    <Card key={student.id} className="overflow-hidden border-indigo-100/50">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    {student.avatarUrl ? (
                                                        <img
                                                            src={student.avatarUrl}
                                                            alt={student.fullName}
                                                            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-50"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                                                            <GraduationCap className="w-6 h-6 text-indigo-300" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-gray-900">{student.fullName}</p>
                                                        <p className="text-xs text-indigo-600 font-semibold">{student.studentCode}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(student)}
                                                    className="h-8 w-8 p-0 shrink-0"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="mt-4 space-y-2 text-sm border-t pt-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Email:</span>
                                                    <span className="text-gray-900 truncate max-w-[180px]">{student.user.email}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">SĐT:</span>
                                                    <span className="text-gray-900">{student.phone}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">Khuôn mặt:</span>
                                                    {student.faceRegistered ? (
                                                        <Badge variant="default" className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                            Đã đăng ký
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 border-none">
                                                            Chưa có
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
