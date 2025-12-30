import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { enrollmentApi } from "../../services/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Mail, Calendar } from "lucide-react";

interface EnrollmentRequest {
    id: string;
    studentId: string;
    trainingClassId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    student: {
        studentCode: string;
        fullName: string;
        phone: string;
        avatarUrl?: string;
        user: {
            email: string;
        };
    };
}

interface ClassEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
}

export default function ClassEnrollmentModal({
    isOpen,
    onClose,
    classId,
    className,
}: ClassEnrollmentModalProps) {
    const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && classId) {
            fetchRequests();
        }
    }, [isOpen, classId]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await enrollmentApi.getAllRequests(classId);
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        setReviewingId(requestId);
        try {
            await enrollmentApi.reviewRequest(requestId, { status: 'APPROVED' });
            toast.success('Đã duyệt yêu cầu thành công');
            fetchRequests();
        } catch (error: any) {
            toast.error(error.message || 'Duyệt yêu cầu thất bại');
        } finally {
            setReviewingId(null);
        }
    };

    const handleRejectClick = (requestId: string) => {
        setSelectedRequestId(requestId);
        setRejectionReason("");
        setShowRejectDialog(true);
    };

    const handleRejectConfirm = async () => {
        if (!selectedRequestId) return;

        if (!rejectionReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        setReviewingId(selectedRequestId);
        try {
            await enrollmentApi.reviewRequest(selectedRequestId, {
                status: 'REJECTED',
                rejectionReason: rejectionReason,
            });
            toast.success('Đã từ chối yêu cầu');
            setShowRejectDialog(false);
            setSelectedRequestId(null);
            setRejectionReason("");
            fetchRequests();
        } catch (error: any) {
            toast.error(error.message || 'Từ chối yêu cầu thất bại');
        } finally {
            setReviewingId(null);
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const approvedRequests = requests.filter(r => r.status === 'APPROVED');
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED');

    const renderRequestRow = (request: EnrollmentRequest, showActions: boolean = false) => (
        <TableRow key={request.id}>
            <TableCell>
                <div className="flex items-center gap-3">
                    {request.student.avatarUrl ? (
                        <img
                            src={request.student.avatarUrl}
                            alt={request.student.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium text-gray-900">{request.student.fullName}</div>
                        <div className="text-sm text-gray-500">{request.student.studentCode}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {request.student.user.email}
                </div>
            </TableCell>
            <TableCell>
                <div className="text-sm text-gray-600">{request.student.phone}</div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(request.requestedAt).toLocaleDateString('vi-VN')}
                </div>
            </TableCell>
            {request.status === 'REJECTED' && (
                <TableCell>
                    <div className="text-sm text-red-600">{request.rejectionReason}</div>
                </TableCell>
            )}
            {showActions && (
                <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(request.id)}
                            disabled={reviewingId === request.id}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Duyệt
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(request.id)}
                            disabled={reviewingId === request.id}
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Từ chối
                        </Button>
                    </div>
                </TableCell>
            )}
        </TableRow>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Yêu cầu đăng ký lớp: {className}</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Chờ duyệt ({pendingRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Đã duyệt ({approvedRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="rejected" className="flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Từ chối ({rejectedRequests.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="mt-4">
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Không có yêu cầu chờ duyệt
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Học viên</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>SĐT</TableHead>
                                                <TableHead>Ngày đăng ký</TableHead>
                                                <TableHead className="text-right">Hành động</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingRequests.map(request => renderRequestRow(request, true))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="approved" className="mt-4">
                            {approvedRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Chưa có yêu cầu được duyệt
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Học viên</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>SĐT</TableHead>
                                                <TableHead>Ngày đăng ký</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {approvedRequests.map(request => renderRequestRow(request, false))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="rejected" className="mt-4">
                            {rejectedRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Chưa có yêu cầu bị từ chối
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Học viên</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>SĐT</TableHead>
                                                <TableHead>Ngày đăng ký</TableHead>
                                                <TableHead>Lý do từ chối</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rejectedRequests.map(request => renderRequestRow(request, false))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Reject Reason Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối yêu cầu đăng ký</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Lý do từ chối *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Nhập lý do từ chối..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason.trim() || !!reviewingId}
                        >
                            Xác nhận từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
