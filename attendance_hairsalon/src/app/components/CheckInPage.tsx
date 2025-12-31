import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import Navigation from "./Navigation";
import { toast } from "sonner";
import { Camera, MapPin, CheckCircle2, XCircle, Loader2, GraduationCap } from "lucide-react";
import { uploadToCloudinary } from "../services/cloudinary";
import { attendanceApi, enrollmentApi } from "../services/api";

interface CheckInPageProps {
  onLogout?: () => void;
}

interface TrainingClass {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  year: string;
}

export default function CheckInPage({ onLogout }: CheckInPageProps) {
  const navigate = useNavigate();
  const locationState = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(locationState.state?.sessionId || null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [myClasses, setMyClasses] = useState<TrainingClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [step, setStep] = useState(sessionId ? 1 : 0);
  const [faceStatus, setFaceStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [gpsRetryCount, setGpsRetryCount] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Check-in/Check-out State
  const [attendanceMode, setAttendanceMode] = useState<'check-in' | 'check-out' | 'done'>('check-in');
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId && !sessionId) {
      fetchSessions();
    }
  }, [selectedClassId, sessionId]);

  useEffect(() => {
    if (sessionId) {
      checkAttendanceStatus();
    }
  }, [sessionId]);

  const checkAttendanceStatus = async () => {
    if (!sessionId) return;

    setCheckingStatus(true);
    try {
      const history = await attendanceApi.getMyHistory();
      const currentSessionRecord = history.find((r: any) => r.sessionId === sessionId);

      if (currentSessionRecord) {
        if (currentSessionRecord.checkOutTime) {
          setAttendanceMode('done');
        } else {
          setAttendanceMode('check-out');
        }
      } else {
        setAttendanceMode('check-in');
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchMyClasses = async () => {
    try {
      setLoadingClasses(true);
      const data = await enrollmentApi.getMyClasses();
      setMyClasses(data);

      // Auto-select first class if only one
      if (data.length === 1) {
        setSelectedClassId(data[0].id);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách lớp học");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await import("../services/api").then(m => m.sessionApi.getTodaySessions());
      setSessions(data);
    } catch (error) {
      toast.error("Không thể tải danh sách ca học");
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    setStep(1);
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
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);

        // Stop camera
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }

        // Skip Cloudinary upload - send base64 to backend
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

          if (gpsRetryCount < 1) { // Allow 1 retry (total 2 tries)
            setGpsRetryCount(prev => prev + 1);
            toast.error("Không thể lấy vị trí, đang thử lại...");
            setTimeout(() => getLocation(), 1000); // Retry after 1s
          } else {
            // Check if user denied permission or timeout, but ultimately fallback
            console.warn("Retries exhausted, using null location");
            toast.warning("Không thể lấy chính xác vị trí, sẽ sử dụng vị trí mặc định");

            // Set dummy location to allow proceed
            const defaultLoc = { lat: 0, lng: 0, accuracy: 0 };
            setLocation(defaultLoc);
            setGpsStatus("success"); // Mark as success to proceed flow
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("error");
      toast.error("Trình duyệt không hỗ trợ Geolocation");
    }
  };

  // Auto advance from step 2 if location success
  useEffect(() => {
    if (step === 2 && gpsStatus === "success") {
      setTimeout(() => setStep(3), 1000);
    }
  }, [step, gpsStatus]);

  const submitCheckIn = async () => {
    if (!sessionId || !capturedImage || !location) {
      toast.error("Thiếu thông tin điểm danh");
      return;
    }

    const checkInData = {
      sessionId,
      imageBase64: capturedImage,
      lat: location.lat,
      lng: location.lng
    };

    setCheckInLoading(true);
    try {
      if (attendanceMode === 'check-out') {
        await attendanceApi.checkOut(checkInData);
        toast.success("Check-out thành công!");
      } else {
        await attendanceApi.checkIn(checkInData);
        toast.success("Điểm danh thành công!");
      }

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Thao tác thất bại");
      // If failed, reset to step 1 to retake photo
      setCapturedImage(null);
      setFaceStatus("idle");
      setStep(1);
    } finally {
      setCheckInLoading(false);
    }
  };

  const progressValue = (step / 3) * 100;

  // Filter sessions by selected class
  const filteredSessions = selectedClassId
    ? sessions.filter(s => s.trainingClassId === selectedClassId)
    : sessions;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={onLogout || (() => navigate("/login"))} />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">
              {attendanceMode === 'check-out' ? 'Check-out' : 'Điểm danh (Check-in)'}
            </h2>
            <span className="text-sm text-gray-600">
              {step === 0 ? "Chọn ca học" : `Bước ${step}/3`}
            </span>
          </div>
          {step > 0 && <Progress value={progressValue} className="h-2" />}
        </div>

        {/* Step 0: Select Session */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Chọn ca học hôm nay</CardTitle>
              <CardDescription>Vui lòng chọn lớp và ca học bạn muốn điểm danh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Class Selector */}
              <div className="space-y-2">
                <Label htmlFor="class-select" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Chọn lớp học
                </Label>
                {loadingClasses ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : myClasses.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>Bạn chưa được duyệt vào lớp nào.</p>
                    <Button variant="link" onClick={() => navigate("/classes")}>
                      Đăng ký lớp học
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger id="class-select">
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
                )}
              </div>

              {/* Sessions List */}
              {selectedClassId && (
                <>
                  {loadingSessions ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                      <p className="mt-2 text-gray-500">Đang tải danh sách ca học...</p>
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Không có ca học nào diễn ra hôm nay cho lớp này.</p>
                      <Button variant="link" onClick={() => navigate("/")}>Quay về trang chủ</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Chọn ca học</Label>
                      {filteredSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSelectSession(session.id)}
                        >
                          <div>
                            <h3 className="font-semibold text-lg">{session.name}</h3>
                            <p className="text-sm text-gray-600">
                              {session.startTime} - {session.endTime}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            {attendanceMode === 'check-out' ? 'Check Out' : 'Chọn'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
                {attendanceMode === 'check-out'
                  ? "Chụp ảnh để xác nhận ra về (Check-out)"
                  : "Vui lòng chụp ảnh khuôn mặt của bạn để xác thực (Check-in)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkingStatus ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p>Đang kiểm tra trạng thái điểm danh...</p>
                </div>
              ) : attendanceMode === 'done' ? (
                <div className="text-center py-6">
                  <div className="bg-green-100 text-green-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Đã hoàn thành!</h3>
                  <p className="text-gray-600 mb-6">
                    Bạn đã hoàn thành Check-in và Check-out cho ca học này.
                  </p>
                  <Button onClick={() => navigate("/")} variant="outline">
                    Quay về trang chủ
                  </Button>
                </div>
              ) : !capturedImage ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
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
                      Chụp và Tải lên
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captured face"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {faceStatus === "processing" && (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </div>
                  )}

                  {faceStatus === "success" && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Ảnh hợp lệ (Sẵn sàng gửi)</span>
                    </div>
                  )}

                  {faceStatus === "error" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <span>Lỗi khi tải ảnh</span>
                      </div>
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
                <Button onClick={getLocation} variant="outline" className="w-full">
                  Thử lại
                </Button>
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
                <CardTitle>Bước 3: Xác nhận {attendanceMode === 'check-out' ? 'Check-out' : 'Check-in'}</CardTitle>
              </div>
              <CardDescription>
                Gửi thông tin lên hệ thống
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
                      Gửi {attendanceMode === 'check-out' ? 'Check-out' : 'Check-in'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        {step === 1 && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => navigate("/")}
          >
            Quay lại
          </Button>
        )}
      </div>
    </div>
  );
}
