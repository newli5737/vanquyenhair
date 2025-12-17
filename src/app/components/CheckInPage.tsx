import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import Navigation from "./Navigation";
import { toast } from "sonner";
import { Camera, MapPin, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function CheckInPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [faceStatus, setFaceStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
    } catch (error) {
      // Mock camera if real camera access fails
      toast.info("Đang sử dụng camera mô phỏng");
      setFaceStatus("idle");
    }
  };

  const capturePhoto = () => {
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
        }
        
        // Simulate face recognition
        processFaceRecognition();
      }
    } else {
      // Mock capture
      setCapturedImage("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFuaCBjaOG7pXAgd2ViY2FtPC90ZXh0Pjwvc3ZnPg==");
      processFaceRecognition();
    }
  };

  const processFaceRecognition = () => {
    setFaceStatus("processing");
    
    // Simulate face recognition process
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        setFaceStatus("success");
        toast.success("Nhận diện khuôn mặt thành công!");
        setTimeout(() => setStep(2), 1000);
      } else {
        setFaceStatus("error");
        toast.error("Không nhận diện được khuôn mặt, vui lòng thử lại");
      }
    }, 2000);
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
          
          // Simulate location validation
          setTimeout(() => {
            const isValidLocation = Math.random() > 0.3; // 70% success rate
            if (isValidLocation) {
              setGpsStatus("success");
              toast.success("Vị trí hợp lệ!");
              setTimeout(() => setStep(3), 1000);
            } else {
              setGpsStatus("error");
              toast.error("Bạn đang ở ngoài khu vực cho phép");
            }
          }, 1500);
        },
        (error) => {
          // Mock location if geolocation fails
          const mockLoc = {
            lat: 21.0285,
            lng: 105.8542,
            accuracy: 20,
          };
          setLocation(mockLoc);
          toast.info("Đang sử dụng vị trí mô phỏng");
          
          setTimeout(() => {
            setGpsStatus("success");
            toast.success("Vị trí hợp lệ!");
            setTimeout(() => setStep(3), 1000);
          }, 1500);
        }
      );
    } else {
      // Mock location
      const mockLoc = {
        lat: 21.0285,
        lng: 105.8542,
        accuracy: 20,
      };
      setLocation(mockLoc);
      
      setTimeout(() => {
        setGpsStatus("success");
        toast.success("Vị trí hợp lệ!");
        setTimeout(() => setStep(3), 1000);
      }, 1500);
    }
  };

  const submitCheckIn = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Đang xử lý điểm danh...",
        success: () => {
          const now = new Date();
          const timeString = now.toLocaleTimeString("vi-VN", { 
            hour: "2-digit", 
            minute: "2-digit" 
          });
          const dateString = now.toLocaleDateString("vi-VN");
          
          setTimeout(() => {
            navigate("/");
          }, 2000);
          
          return `Điểm danh thành công lúc ${timeString} ${dateString}`;
        },
        error: "Điểm danh thất bại, vui lòng thử lại",
      }
    );
  };

  const progressValue = (step / 3) * 100;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navigation onLogout={() => navigate("/login")} />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Điểm danh</h2>
            <span className="text-sm text-gray-600">Bước {step}/3</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step 1: Face Recognition */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <CardTitle>Bước 1: Nhận diện khuôn mặt</CardTitle>
              </div>
              <CardDescription>
                Vui lòng chụp ảnh khuôn mặt của bạn để xác thực
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!capturedImage ? (
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
                      Chụp khuôn mặt
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
                      <span>Đang nhận diện khuôn mặt...</span>
                    </div>
                  )}
                  
                  {faceStatus === "success" && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Nhận diện thành công</span>
                    </div>
                  )}
                  
                  {faceStatus === "error" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <span>Không nhận diện được khuôn mặt</span>
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
                Vui lòng cho phép truy cập vị trí để xác thực
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
                  <span>Đang xác định vị trí...</span>
                </div>
              )}
              
              {gpsStatus === "success" && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Vị trí hợp lệ</span>
                </div>
              )}
              
              {gpsStatus === "error" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span>Bạn đang ở ngoài khu vực cho phép</span>
                  </div>
                  <Button onClick={getLocation} variant="outline" className="w-full">
                    Thử lại
                  </Button>
                </div>
              )}
              
              {gpsStatus === "idle" && (
                <Button onClick={getLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Xác định vị trí
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
                Kiểm tra thông tin và xác nhận điểm danh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Khuôn mặt đã xác thực</p>
                    <p className="text-sm text-green-700">Nhận diện thành công</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Vị trí đã xác thực</p>
                    <p className="text-sm text-green-700">Bạn đang ở trong khu vực cho phép</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-4">
                  Thời gian: {new Date().toLocaleString("vi-VN")}
                </p>
                
                <Button onClick={submitCheckIn} className="w-full" size="lg">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Xác nhận điểm danh
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Dữ liệu khuôn mặt và vị trí chỉ được sử dụng cho mục đích điểm danh
              </p>
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
