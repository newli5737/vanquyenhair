import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import Navigation from "./Navigation";
import { toast } from "sonner";
import { Camera, MapPin, CheckCircle2, XCircle, Loader2, GraduationCap, ChevronRight } from "lucide-react";
import { attendanceApi, enrollmentApi } from "../services/api";
import { useLocation } from "react-router-dom";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface CheckInPageProps {
  onLogout?: () => void;
}

export default function CheckInPage({ onLogout }: CheckInPageProps) {
  const navigate = useNavigate();

  const locState = useLocation();
  const [selectedClassId, setSelectedClassId] = useState<string>(locState.state?.classId || "");
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [step, setStep] = useState(selectedClassId ? 1 : 0); // Step 0: Select Class, Step 1: Camera
  const [faceStatus, setFaceStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    if (!selectedClassId) {
      fetchMyClasses();
    }
  }, []);

  const fetchMyClasses = async () => {
    try {
      const classes = await enrollmentApi.getMyClasses();
      setMyClasses(classes);
      if (classes.length === 1) {
        setSelectedClassId(classes[0].id);
        setStep(1);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách lớp học");
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
      console.error("Camera access error:", error);
      let errorMessage = "Không thể truy cập camera";

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Bạn đã chặn quyền truy cập camera. Vui lòng kiểm tra cài đặt trình duyệt.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = "Không tìm thấy camera trên thiết bị này.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = "Camera đang được sử dụng bởi ứng dụng khác.";
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        errorMessage = "Camera chỉ hoạt động trên HTTPS hoặc localhost.";
      }

      toast.error(errorMessage);
      setFaceStatus("idle");
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Apply mirror effect to canvas
        context.translate(canvas.width, 0);
        context.scale(-1, 1);

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);

        // Stop camera
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }

        setFaceStatus("success");
        setTimeout(() => setStep(2), 500);
      }
    }
  };

  const getLocation = () => {
    setGpsStatus("processing");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          setGpsStatus("success");
          toast.success("Đã lấy được vị trí");
        },
        (error) => {
          console.error(error);
          setGpsStatus("error");
          toast.error("Không thể lấy vị trí: " + error.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("error");
      toast.error("Trình duyệt không hỗ trợ Geolocation");
    }
  };

  const skipLocation = () => {
    const defaultLoc = { lat: 0, lng: 0, accuracy: 0 };
    setLocation(defaultLoc);
    setGpsStatus("success");
    toast.warning("Đã bỏ qua xác định vị trí");
  };

  // Auto advance from step 2 if location success
  useEffect(() => {
    if (step === 2 && gpsStatus === "success") {
      setTimeout(() => setStep(3), 1000);
    }
  }, [step, gpsStatus]);

  const submitCheckIn = async () => {
    if (!capturedImage || !location) {
      toast.error("Thiếu thông tin điểm danh");
      return;
    }

    // Không cần sessionId - backend tự tìm dựa trên trainingClassId
    const checkInData = {
      imageBase64: capturedImage,
      lat: location.lat,
      lng: location.lng,
      trainingClassId: selectedClassId
    };

    setCheckInLoading(true);
    try {
      const response = await attendanceApi.checkIn(checkInData);

      toast.success(response.message || "Điểm danh thành công!");

      // Hiển thị thông tin ca học đã được tự động chọn
      if (response.data?.session) {
        const { session } = response.data;
        toast.info(`Ca học: ${session.name} - ${session.className}`, { duration: 5000 });
      }

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Điểm danh thất bại");
      // If failed, reset to step 1 to retake photo
      setCapturedImage(null);
      setFaceStatus("idle");
      setStep(1);
    } finally {
      setCheckInLoading(false);
    }
  };

  const totalSteps = selectedClassId ? 3 : 4;
  const currentStepDisplay = selectedClassId ? step : step + 1;
  const progressValue = (currentStepDisplay / totalSteps) * 100;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={onLogout || (() => navigate("/login"))} />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Điểm danh</h2>
            <span className="text-sm text-gray-600">Bước {currentStepDisplay}/{totalSteps}</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step 0: Select Class (only if not selected) */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <CardTitle>Chọn lớp học</CardTitle>
              </div>
              <CardDescription>
                Vui lòng chọn lớp học bạn muốn điểm danh hôm nay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="class-select">Danh sách lớp học của bạn</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="class-select" className="h-12">
                    <SelectValue placeholder="Chọn lớp học..." />
                  </SelectTrigger>
                  <SelectContent>
                    {myClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {myClasses.length === 0 && !checkInLoading && (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                  ⚠️ Bạn chưa có lớp học nào được duyệt.
                </div>
              )}

              <Button
                className="w-full h-12"
                disabled={!selectedClassId}
                onClick={() => setStep(1)}
              >
                Tiếp tục <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Face Recognition */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <CardTitle>Bước 1: Chụp ảnh khuôn mặt</CardTitle>
              </div>
              <CardDescription>
                Vui lòng chụp ảnh khuôn mặt của bạn để xác thực
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!capturedImage ? (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] md:aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {!cameraStream && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Camera chưa được bật</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!cameraStream ? (
                    <Button onClick={startCamera} className="w-full">
                      <Camera className="w-4 h-4 mr-2" />
                      Bật camera
                    </Button>
                  ) : (
                    <Button onClick={capturePhoto} className="w-full">
                      Chụp ảnh
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] md:aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captured face"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {faceStatus === "success" && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Ảnh đã sẵn sàng</span>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setCapturedImage(null);
                      setFaceStatus("idle");
                      startCamera();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Chụp lại
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: GPS Location */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <CardTitle>Bước 2: Xác định vị trí</CardTitle>
              </div>
              <CardDescription>
                Vui lòng cho phép truy cập vị trí của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {location ? (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vĩ độ:</span>
                    <span className="font-mono">{location.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kinh độ:</span>
                    <span className="font-mono">{location.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sai số:</span>
                    <span className="font-mono">{Math.round(location.accuracy)}m</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có thông tin vị trí</p>
                </div>
              )}

              {gpsStatus === "processing" && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang lấy vị trí...</span>
                </div>
              )}

              {gpsStatus === "error" && (
                <div className="flex gap-3">
                  <Button onClick={getLocation} variant="outline" className="flex-1">
                    Thử lại
                  </Button>
                  <Button onClick={skipLocation} variant="secondary" className="flex-1 text-orange-600 bg-orange-50 hover:bg-orange-100">
                    Bỏ qua
                  </Button>
                </div>
              )}

              {gpsStatus === "idle" && (
                <Button onClick={getLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Lấy vị trí hiện tại
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <CardTitle>Bước 3: Xác nhận điểm danh</CardTitle>
              </div>
              <CardDescription>
                Hệ thống sẽ tự động chọn ca học phù hợp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Ảnh đã được chụp</p>
                    <p className="text-sm text-green-700">Đã sẵn sàng gửi</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Vị trí đã xác định</p>
                    <p className="text-sm text-green-700">Độ chính xác: {location ? Math.round(location.accuracy) : 0}m</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    💡 Hệ thống sẽ tự động chọn ca học phù hợp với thời gian hiện tại
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={submitCheckIn} className="w-full" size="lg" disabled={checkInLoading}>
                  {checkInLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Xác nhận điểm danh
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        {step > 1 && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setStep(step - 1)}
          >
            Quay lại bước trước
          </Button>
        )}
      </div>
    </div>
  );
}
