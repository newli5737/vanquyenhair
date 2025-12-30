import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
import { enrollmentApi } from "../../services/api";
import { toast } from "sonner";
import {
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Mail,
    Calendar,
    ArrowLeft,
    Phone,
    GraduationCap
} from "lucide-react";

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

export default function ClassEnrollmentPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const classId = searchParams.get('classId');
    const className = searchParams.get('className');

    const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        if (classId) {
            fetchRequests();
        } else {
            navigate('/admin/classes');
        }
    }, [classId]);

    const fetchRequests = async () => {
        if (!classId) return;
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

    // Mobile Card View
    const renderMobileCard = (request: EnrollmentRequest, showActions: boolean = false) => (
        <Card key={request.id} className="mb-4">
            <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                    {request.student.avatarUrl ? (
                        <img
                            src={request.student.avatarUrl}
                            alt={request.student.fullName}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-8 h-8 text-indigo-600" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                            {request.student.fullName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <GraduationCap className="w-4 h-4" />
                            <span>{request.student.studentCode}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="break-all">{request.student.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{request.student.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(request.requestedAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>

                {request.status === 'REJECTED' && request.rejectionReason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-900 mb-1">Lý do từ chối:</p>
                        <p className="text-sm text-red-700">{request.rejectionReason}</p>
                    </div>
                )}

                {showActions && (
                    <div className="flex gap-2 pt-2">
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(request.id)}
                            disabled={reviewingId === request.id}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Duyệt
                        </Button>
                        <Button
                            className="flex-1"
                            variant="destructive"
                            onClick={() => handleRejectClick(request.id)}
                            disabled={reviewingId === request.id}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Từ chối
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Desktop Table Row
    const renderTableRow = (request: EnrollmentRequest, showActions: boolean = false) => (
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
                    <div className="text-sm text-red-600 max-w-xs truncate" title={request.rejectionReason}>
                        {request.rejectionReason}
                    </div>
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
        <div className="min-h-screen bg-gray-50 pb-6">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/admin/classes')}
                            className="flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                                Yêu cầu đăng ký lớp
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 truncate">
                                {className}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <CardTitle className="text-lg">Danh sách yêu cầu</CardTitle>
                            <div className="flex gap-2 text-sm">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Chờ: {pendingRequests.length}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    Duyệt: {approvedRequests.length}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    Từ chối: {rejectedRequests.length}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="pending" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="hidden sm:inline">Chờ duyệt</span>
                                    <span className="sm:hidden">Chờ</span>
                                    <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="approved" className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Đã duyệt</span>
                                    <span className="sm:hidden">Duyệt</span>
                                    <Badge variant="secondary" className="ml-1">{approvedRequests.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="rejected" className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Từ chối</span>
                                    <span className="sm:hidden">Từ chối</span>
                                    <Badge variant="secondary" className="ml-1">{rejectedRequests.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending">
                                {loading ? (
                                    <div className="text-center py-12 text-gray-500">
                                        Đang tải...
                                    </div>
                                ) : pendingRequests.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                        <p>Không có yêu cầu chờ duyệt</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile View */}
                                        <div className="block lg:hidden">
                                            {pendingRequests.map(request => renderMobileCard(request, true))}
                                        </div>

                                        {/* Desktop View */}
                                        <div className="hidden lg:block rounded-md border">
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
                                                    {pendingRequests.map(request => renderTableRow(request, true))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="approved">
                                {approvedRequests.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                        <p>Chưa có yêu cầu được duyệt</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile View */}
                                        <div className="block lg:hidden">
                                            {approvedRequests.map(request => renderMobileCard(request, false))}
                                        </div>

                                        {/* Desktop View */}
                                        <div className="hidden lg:block rounded-md border">
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
                                                    {approvedRequests.map(request => renderTableRow(request, false))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="rejected">
                                {rejectedRequests.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                        <p>Chưa có yêu cầu bị từ chối</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile View */}
                                        <div className="block lg:hidden">
                                            {rejectedRequests.map(request => renderMobileCard(request, false))}
                                        </div>

                                        {/* Desktop View */}
                                        <div className="hidden lg:block rounded-md border">
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
                                                    {rejectedRequests.map(request => renderTableRow(request, false))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Reject Reason Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-md">
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
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectDialog(false)}
                            className="w-full sm:w-auto"
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason.trim() || !!reviewingId}
                            className="w-full sm:w-auto"
                        >
                            Xác nhận từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
