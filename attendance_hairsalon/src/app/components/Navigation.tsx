import { Link, useLocation } from "react-router-dom";
import { Home, Camera, ClipboardList, User, LogOut, CheckCheck, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationProps {
  onLogout: () => void;
}

export default function Navigation({ onLogout }: NavigationProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Trang chủ" },
    { path: "/classes", icon: GraduationCap, label: "Lớp học" },
    { path: "/check-in", icon: Camera, label: "Điểm danh" },
    { path: "/history", icon: ClipboardList, label: "Lịch sử" },
    { path: "/profile", icon: User, label: "Hồ sơ" },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1 w-full"></div>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl">
                <CheckCheck className="w-6 h-6" />
                <span>Attendance System</span>
              </div>
              <div className="flex space-x-2">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant="ghost"
                      className={`gap-2 rounded-full transition-all duration-200 ${isActive(item.path)
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onLogout}
              className="gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive(item.path)
                ? "text-indigo-600"
                : "text-gray-400 hover:text-gray-600"
                }`}
            >
              <item.icon className={`w-6 h-6 ${isActive(item.path) ? "fill-current opacity-20" : ""}`} />
              <div className={`w-6 h-6 absolute ${isActive(item.path) ? "block" : "hidden"}`}>
                <item.icon className="w-6 h-6" />
              </div>

              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
