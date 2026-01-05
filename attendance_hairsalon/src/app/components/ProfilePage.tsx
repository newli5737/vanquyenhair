import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import Navigation from "./Navigation";
import { toast } from "sonner";
import { User, Mail, Phone, IdCard, CheckCircle2, XCircle, Save, Camera, Upload, Loader2, ScanFace, Lock, ShieldCheck, LogOut } from "lucide-react";
import { studentApi, faceVerificationApi, authApi } from "../services/api";
import { uploadToCloudinary } from "../services/cloudinary";
import { Skeleton } from "./ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ProfilePageProps {
  onLogout?: () => void;
}

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera & Photo States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [photoAction, setPhotoAction] = useState<'avatar' | 'verification' | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Change Password States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Cleanup camera when modal closes
  useEffect(() => {
    if (!showCameraModal && cameraStream) {
      stopCamera();
    }
  }, [showCameraModal]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getProfile();
      setProfile(data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải thông tin hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentApi.updateProfile({
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        identityCard: profile.identityCard,
      });
      toast.success("Cập nhật thông tin thành công!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error("Cập nhật thất bại: " + error.message);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploadingAvatar(true);
        const url = await uploadToCloudinary(file);
        // Update profile with new avatar URL
        await studentApi.updateProfile({ avatarUrl: url });
        setProfile((prev: any) => ({ ...prev, avatarUrl: url }));
        toast.success("Cập nhật ảnh đại diện thành công");
      } catch (error: any) {
        toast.error("Lỗi khi tải ảnh: " + error.message);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // --- Face Verification Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error("Không thể truy cập camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleProcessPhoto = async () => {
    if (!capturedImage || !photoAction) return;

    setProcessingPhoto(true);
    try {
      const file = dataURLtoFile(capturedImage, "photo.jpg");
      const url = await uploadToCloudinary(file);

      if (photoAction === 'avatar') {
        // Update Avatar
        await studentApi.updateProfile({ avatarUrl: url });
        setProfile((prev: any) => ({ ...prev, avatarUrl: url }));
        toast.success("Cập nhật ảnh đại diện thành công");
        setShowCameraModal(false);
        setPhotoAction(null);
      } else if (photoAction === 'verification') {
        // Verify Face
        const result = await faceVerificationApi.verify(url);
        if (result.verified) {
          toast.success(result.message);
          setProfile((prev: any) => ({ ...prev, faceRegistered: true }));
          setShowCameraModal(false);
          setPhotoAction(null);
        } else {
          toast.error(result.message || "Xác thực thất bại, vui lòng thử lại");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }

    try {
      setChangingPassword(true);
      await authApi.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      toast.success("Đổi mật khẩu thành công!");
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Đổi mật khẩu thất bại");
    } finally {
      setChangingPassword(false);
    }
  };

  const openCamera = (action: 'avatar' | 'verification') => {
    setPhotoAction(action);
    setShowOptionModal(false);
    setShowCameraModal(true);
    startCamera();
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Navigation onLogout={() => navigate("/login")} />
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={onLogout || (() => navigate("/login"))} />

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">Hồ sơ học viên</h2>
          <p className="text-gray-600">Quản lý thông tin cá nhân của bạn</p>
        </div>

        {/* Profile Picture */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                      <User className="w-16 h-16 text-white" />
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full shadow-md"
                  onClick={() => setShowOptionModal(true)}
                  disabled={uploadingAvatar}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              <h3 className="text-xl font-semibold">{profile.fullName}</h3>
              <p className="text-gray-600">{profile.studentCode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Thông tin chi tiết về học viên</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ tên</Label>
                  <Input
                    id="name"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId">Mã học viên</Label>
                  <Input
                    id="studentId"
                    value={profile.studentCode}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.user?.email || ''}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : ''}
                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value + 'T00:00:00.000Z' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identityCard">Căn cước công dân</Label>
                  <Input
                    id="identityCard"
                    type="text"
                    value={profile.identityCard || ''}
                    onChange={(e) => setProfile({ ...profile, identityCard: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Họ tên</p>
                    <p className="font-medium">{profile.fullName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IdCard className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Mã học viên</p>
                    <p className="font-medium">{profile.studentCode}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{profile.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Số điện thoại</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Face Data Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dữ liệu khuôn mặt</CardTitle>
            <CardDescription>
              Trạng thái đăng ký dữ liệu nhận diện khuôn mặt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {profile.faceRegistered ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium">Đã đăng ký</p>
                      <p className="text-sm text-gray-600">
                        Dữ liệu khuôn mặt đã được đăng ký vào hệ thống
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="font-medium">Chưa đăng ký</p>
                      <p className="text-sm text-gray-600">
                        Vui lòng đăng ký bộ dữ liệu khuôn mặt để sử dụng tính năng điểm danh
                      </p>
                    </div>
                  </>
                )}
              </div>
              {profile.faceRegistered ? (
                <Badge className="bg-green-600">Đã kích hoạt</Badge>
              ) : (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  Chưa kích hoạt
                </Badge>
              )}
            </div>

            {!profile.faceRegistered && (
              <Button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => openCamera('verification')}
              >
                <ScanFace className="w-4 h-4 mr-2" />
                Xác thực khuôn mặt ngay
              </Button>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">
              Hệ thống sẽ so sánh ảnh chụp selfie hiện tại của bạn với ảnh đại diện hồ sơ
            </p>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Bảo mật
            </CardTitle>
            <CardDescription>Quản lý mật khẩu và an toàn tài khoản</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Mật khẩu đăng nhập</p>
                  <p className="text-sm text-gray-500">Thay đổi mật khẩu định kỳ để bảo vệ tài khoản</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                Đổi mật khẩu
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <div className="md:hidden">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={onLogout || (() => navigate("/login"))}
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </Button>
        </div>
      </div>

      {/* Option Modal */}
      <Dialog open={showOptionModal} onOpenChange={setShowOptionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật ảnh đại diện</DialogTitle>
            <DialogDescription>
              Chọn phương thức cập nhật ảnh của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowOptionModal(false);
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-8 h-8 opacity-50" />
              Tải ảnh lên
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => openCamera('avatar')}
            >
              <Camera className="w-8 h-8 opacity-50" />
              Chụp ảnh
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generic Camera Modal */}
      <Dialog open={showCameraModal} onOpenChange={(open) => {
        if (!open) stopCamera();
        setShowCameraModal(open);
        setCapturedImage(null);
      }}>
        <DialogContent className="sm:max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {photoAction === 'avatar' ? 'Chụp ảnh đại diện' : 'Xác thực khuôn mặt'}
            </DialogTitle>
            <DialogDescription>
              Vui lòng giữ khuôn mặt ở giữa khung hình
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  {!cameraStream && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <p>Đang khởi động camera...</p>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2">
              {!capturedImage ? (
                <Button onClick={capturePhoto} className="w-full" disabled={!cameraStream}>
                  <Camera className="w-4 h-4 mr-2" />
                  Chụp ảnh
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setCapturedImage(null)}
                    className="flex-1"
                    disabled={processingPhoto}
                  >
                    Chụp lại
                  </Button>
                  <Button
                    onClick={handleProcessPhoto}
                    className="flex-1"
                    disabled={processingPhoto}
                  >
                    {processingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {photoAction === 'avatar' ? 'Lưu ảnh' : 'Xác nhận'}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mật khẩu mới của bạn
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
              <Input
                id="oldPassword"
                type="password"
                required
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Cập nhật mật khẩu"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1"
                disabled={changingPassword}
              >
                Hủy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
