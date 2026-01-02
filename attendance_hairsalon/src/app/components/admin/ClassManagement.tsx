import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, BookOpen, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { trainingClassApi } from "../../services/api";

interface TrainingClass {
    id: string;
    code: string;
    name: string;
    type: string;
    location: string;
    year: string;
    createdAt: string;
    pendingCount?: number;
}

export default function ClassManagement() {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<TrainingClass[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState<TrainingClass | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "NAIL",
        location: "CAN_THO",
        year: new Date().getFullYear().toString(),
        latitude: 10.022098,
        longitude: 105.788826,
    });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const data = await trainingClassApi.getAll();
            setClasses(data);
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const resetForm = () => {
        setFormData({
            name: "",
            type: "NAIL",
            location: "CAN_THO",
            year: new Date().getFullYear().toString(),
            latitude: 10.022098,
            longitude: 105.788826,
        });
        setCurrentClass(null);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await trainingClassApi.create(formData);
            fetchClasses();
            setIsAddModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to create class:", error);
            alert("Failed to create class");
        }
    };

    const handleEditClick = (cls: TrainingClass) => {
        setCurrentClass(cls);
        setFormData({
            name: cls.name,
            type: cls.type,
            location: cls.location,
            year: cls.year || new Date().getFullYear().toString(),
            latitude: (cls as any).latitude || 10.022098,
            longitude: (cls as any).longitude || 105.788826,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClass) return;
        try {
            await trainingClassApi.update(currentClass.id, formData);
            fetchClasses();
            setIsEditModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to update class:", error);
            alert("Failed to update class");
        }
    };

    const handleDeleteClick = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lớp học này không?")) {
            try {
                await trainingClassApi.remove(id);
                fetchClasses();
            } catch (error) {
                console.error("Failed to delete class:", error);
                alert("Failed to delete class");
            }
        }
    };

    const filteredClasses = classes.filter(
        (cls) =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản lý Lớp học</h2>
                    <p className="text-muted-foreground">Theo dõi và quản lý các lớp đào tạo.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm lớp mới
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium">Danh sách lớp học</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm tên hoặc mã lớp..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Desktop Table View */}
                        <div className="hidden md:block rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Mã lớp</TableHead>
                                        <TableHead>Tên lớp</TableHead>
                                        <TableHead>Năm</TableHead>
                                        <TableHead>Loại</TableHead>
                                        <TableHead>Địa điểm</TableHead>
                                        <TableHead className="text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClasses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                Không tìm thấy lớp học nào.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClasses.map((cls) => (
                                            <TableRow key={cls.id}>
                                                <TableCell className="font-medium">{cls.code}</TableCell>
                                                <TableCell>{cls.name}</TableCell>
                                                <TableCell>{cls.year}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls.type === 'NAIL' ? 'bg-pink-100 text-pink-800' :
                                                        cls.type === 'HAIR' ? 'bg-indigo-100 text-indigo-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        {cls.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1 text-sm text-gray-600">
                                                        {cls.location === 'CAN_THO' ? 'Cần Thơ' : 'Hồ Chí Minh'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            navigate(`/admin/class-enrollment?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`);
                                                        }} title="Xem yêu cầu đăng ký" className="relative h-8 w-8">
                                                            <Users className="w-4 h-4 text-green-600" />
                                                            {cls.pendingCount ? (
                                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                                                    {cls.pendingCount}
                                                                </span>
                                                            ) : null}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(cls)} className="h-8 w-8">
                                                            <Edit className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(cls.id)} className="h-8 w-8">
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {filteredClasses.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50/50">
                                    Không tìm thấy lớp học nào.
                                </div>
                            ) : (
                                filteredClasses.map((cls) => (
                                    <Card key={cls.id} className="overflow-hidden border-indigo-100/50">
                                        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                                            <div className="space-y-1">
                                                <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 border-indigo-200">
                                                    {cls.code}
                                                </Badge>
                                                <CardTitle className="text-base font-bold">{cls.name}</CardTitle>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    navigate(`/admin/class-enrollment?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`);
                                                }} className="h-8 w-8 relative">
                                                    <Users className="w-4 h-4 text-green-600" />
                                                    {cls.pendingCount ? (
                                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                                            {cls.pendingCount}
                                                        </span>
                                                    ) : null}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(cls)} className="h-8 w-8">
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t pt-3">
                                                <div className="space-y-1">
                                                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Loại lớp</p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cls.type === 'NAIL' ? 'bg-pink-100 text-pink-800' :
                                                        cls.type === 'HAIR' ? 'bg-indigo-100 text-indigo-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        {cls.type}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Địa điểm</p>
                                                    <p className="font-medium text-gray-700">
                                                        {cls.location === 'CAN_THO' ? 'Cần Thơ' : 'Hồ Chí Minh'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-gray-500 text-[10px] uppercase font-semibold">Năm</p>
                                                    <p className="font-medium text-gray-700">{cls.year}</p>
                                                </div>
                                                <div className="flex justify-end items-end">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(cls.id)} className="h-8 w-8 text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>




            {/* Add Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm lớp học mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên lớp</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="VD: K30 Nail Cơ bản"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Năm học</Label>
                            <Input
                                id="year"
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                                placeholder="VD: 2025"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Loại</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => handleSelectChange("type", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NAIL">Nail</SelectItem>
                                        <SelectItem value="HAIR">Tóc</SelectItem>
                                        <SelectItem value="TATTOO">Tattoo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Địa điểm</Label>
                                <Select
                                    value={formData.location}
                                    onValueChange={(value) => handleSelectChange("location", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn địa điểm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CAN_THO">Cần Thơ</SelectItem>
                                        <SelectItem value="HO_CHI_MINH">Hồ Chí Minh</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit">Thêm mới</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Tên lớp</Label>
                            <Input
                                id="edit-name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-year">Năm học</Label>
                            <Input
                                id="edit-year"
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">Loại</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => handleSelectChange("type", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NAIL">Nail</SelectItem>
                                        <SelectItem value="HAIR">Tóc</SelectItem>
                                        <SelectItem value="TATTOO">Tattoo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-location">Địa điểm</Label>
                                <Select
                                    value={formData.location}
                                    onValueChange={(value) => handleSelectChange("location", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn địa điểm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CAN_THO">Cần Thơ</SelectItem>
                                        <SelectItem value="HO_CHI_MINH">Hồ Chí Minh</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit">Lưu thay đổi</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
}
