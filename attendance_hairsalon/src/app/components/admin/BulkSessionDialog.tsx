import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";
import { Calendar, Loader2 } from "lucide-react";
import { sessionApi } from "../../services/api";

interface BulkSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    onSuccess: () => void;
}

export default function BulkSessionDialog({
    open,
    onOpenChange,
    classId,
    onSuccess,
}: BulkSessionDialogProps) {
    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        excludeSaturday: false,
        excludeWeekends: false,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.startDate || !formData.endDate) {
            toast.error("Vui lòng chọn ngày bắt đầu và kết thúc");
            return;
        }

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            toast.error("Ngày bắt đầu phải trước ngày kết thúc");
            return;
        }

        try {
            setLoading(true);
            await sessionApi.bulkCreate({
                trainingClassId: classId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                excludeSaturday: formData.excludeSaturday,
                excludeWeekends: formData.excludeWeekends,
                sessions: [
                    { name: "Ca 1", startTime: "09:00", endTime: "12:00" },
                    { name: "Ca 2", startTime: "13:30", endTime: "17:00" },
                    { name: "Ca 3", startTime: "18:30", endTime: "21:00" },
                ],
            });

            toast.success("Tạo ca học hàng loạt thành công!");
            onOpenChange(false);
            onSuccess();
            setFormData({
                startDate: "",
                endDate: "",
                excludeSaturday: false,
                excludeWeekends: false,
            });
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Tạo ca học hàng loạt
                    </DialogTitle>
                    <DialogDescription>
                        Tự động tạo 3 ca học mỗi ngày trong khoảng thời gian chọn
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, startDate: e.target.value })
                                }
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">Ngày kết thúc *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, endDate: e.target.value })
                                }
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm font-medium text-gray-700">Tùy chọn loại trừ</p>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="excludeSaturday"
                                checked={formData.excludeSaturday}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        excludeSaturday: checked as boolean,
                                        excludeWeekends: false, // Reset excludeWeekends if Saturday is selected
                                    })
                                }
                                disabled={loading || formData.excludeWeekends}
                            />
                            <Label
                                htmlFor="excludeSaturday"
                                className="text-sm font-normal cursor-pointer"
                            >
                                Bỏ thứ 7
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="excludeWeekends"
                                checked={formData.excludeWeekends}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        excludeWeekends: checked as boolean,
                                        excludeSaturday: false, // Reset excludeSaturday if weekends is selected
                                    })
                                }
                                disabled={loading || formData.excludeSaturday}
                            />
                            <Label
                                htmlFor="excludeWeekends"
                                className="text-sm font-normal cursor-pointer"
                            >
                                Bỏ thứ 7 và chủ nhật
                            </Label>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <p className="font-medium mb-1">Mỗi ngày sẽ tạo 3 ca:</p>
                        <ul className="space-y-0.5 ml-4 list-disc">
                            <li>Ca 1: 09:00 - 12:00</li>
                            <li>Ca 2: 13:30 - 17:00</li>
                            <li>Ca 3: 18:30 - 21:00</li>
                        </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                "Tạo ca học"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
