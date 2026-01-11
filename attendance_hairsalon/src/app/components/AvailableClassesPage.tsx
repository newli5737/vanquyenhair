import { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { trainingClassApi, enrollmentApi } from '../services/api';
import Navigation from './Navigation';
import { Search, Users, MapPin, Calendar, GraduationCap, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface TrainingClass {
    id: string;
    code: string;
    name: string;
    type: string;
    location: string;
    year: string;
    studentCount: number;
}

interface EnrollmentRequest {
    id: string;
    trainingClassId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
    trainingClass?: any;
}

const AvailableClassesPage = ({ onLogout }: { onLogout: () => void }) => {
    const [classes, setClasses] = useState<TrainingClass[]>([]);
    const [filteredClasses, setFilteredClasses] = useState<TrainingClass[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
        fetchMyRequests();
    }, []);

    useEffect(() => {
        const filtered = classes.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredClasses(filtered);
    }, [searchTerm, classes]);

    const fetchClasses = async () => {
        try {
            const data = await trainingClassApi.getAvailableClasses();
            setClasses(data);
            setFilteredClasses(data);
        } catch (error) {
            console.error('Failed to fetch classes', error);
            toast.error('Không thể tải danh sách lớp học');
        }
    };

    const fetchMyRequests = async () => {
        try {
            const requests = await enrollmentApi.getMyRequests();
            setEnrollmentRequests(requests);
        } catch (error) {
            console.error('Failed to fetch enrollment requests', error);
        }
    };

    const getRequestForClass = (classId: string) => {
        return enrollmentRequests.find(req => req.trainingClassId === classId);
    };

    const hasPendingRequest = (classId: string) => {
        return enrollmentRequests.some(req => req.trainingClassId === classId && req.status === 'PENDING');
    };

    const hasApprovedRequest = (classId: string) => {
        return enrollmentRequests.some(req => req.trainingClassId === classId && req.status === 'APPROVED');
    };

    const handleRegister = async (classId: string) => {
        if (hasApprovedRequest(classId)) {
            toast.error('Bạn đã được duyệt vào lớp học này rồi');
            return;
        }

        if (hasPendingRequest(classId)) {
            toast.error('Bạn đã có yêu cầu đang chờ duyệt cho lớp này');
            return;
        }

        setIsLoading(true);
        try {
            await enrollmentApi.createRequest(classId);
            toast.success('Gửi yêu cầu đăng ký thành công! Vui lòng chờ admin phê duyệt.');
            fetchMyRequests(); // Refresh requests
        } catch (error: any) {
            toast.error(error.message || 'Gửi yêu cầu thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'NAIL':
                return 'bg-pink-100 text-pink-800 border-pink-200';
            case 'HAIR':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'TATTOO':
                return 'bg-slate-100 text-slate-800 border-slate-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getLocationText = (location: string) => {
        return location === 'CAN_THO' ? 'Cần Thơ' : 'Hồ Chí Minh';
    };

    const renderEnrollmentStatus = (classId: string) => {
        const request = getRequestForClass(classId);

        if (!request) {
            return (
                <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleRegister(classId)}
                    disabled={isLoading}
                >
                    {isLoading ? 'Đang xử lý...' : 'Đăng ký ngay'}
                </Button>
            );
        }

        switch (request.status) {
            case 'PENDING':
                return (
                    <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600"
                        disabled
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Chờ duyệt
                    </Button>
                );
            case 'APPROVED':
                return (
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Đã được duyệt
                    </Button>
                );
            case 'REJECTED':
                return (
                    <div className="space-y-2">
                        {request.rejectionReason && (
                            <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    {request.rejectionReason}
                                </AlertDescription>
                            </Alert>
                        )}
                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleRegister(classId)}
                            disabled={isLoading}
                        >
                            Đăng ký lại
                        </Button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen pb-20 md:pb-0 bg-gradient-to-br from-gray-50 to-gray-100">
            <Navigation onLogout={onLogout || (() => navigate("/login"))} />

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                        <GraduationCap className="w-8 h-8 text-indigo-600" />
                        Danh sách lớp học
                    </h1>
                    <p className="text-gray-500">Chọn lớp học phù hợp với bạn</p>
                </div>
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Tìm kiếm theo tên, mã lớp hoặc loại..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Classes Grid */}
                {filteredClasses.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                                {searchTerm ? 'Không tìm thấy lớp học phù hợp' : 'Chưa có lớp học nào'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClasses.map((cls) => {
                            const request = getRequestForClass(cls.id);
                            const isApproved = request?.status === 'APPROVED';
                            const isPending = request?.status === 'PENDING';
                            const isRejected = request?.status === 'REJECTED';

                            return (
                                <Card
                                    key={cls.id}
                                    className={`hover:shadow-lg transition-all duration-200 ${isApproved ? 'ring-2 ring-green-500 border-green-200' :
                                        isPending ? 'ring-2 ring-yellow-500 border-yellow-200' :
                                            'hover:border-indigo-300'
                                        }`}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge className={`${getTypeColor(cls.type)} border`}>
                                                {cls.type}
                                            </Badge>
                                            {isPending && (
                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Chờ duyệt
                                                </Badge>
                                            )}
                                            {isApproved && (
                                                <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Đã duyệt
                                                </Badge>
                                            )}
                                            {isRejected && (
                                                <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" />
                                                    Từ chối
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900">
                                            {cls.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium text-gray-500">
                                            Mã lớp: {cls.code}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 text-indigo-600" />
                                            <span>{getLocationText(cls.location)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 text-indigo-600" />
                                            <span>Năm {cls.year}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Users className="w-4 h-4 text-indigo-600" />
                                            <span>{cls.studentCount} học viên</span>
                                        </div>

                                        <div className="pt-3">
                                            {renderEnrollmentStatus(cls.id)}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailableClassesPage;
