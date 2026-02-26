import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { BentoGrid } from "../components/BentoGrid";
import { ThemeToggle } from "../components/ThemeToggle";
import { LogOut, Eye, Loader2, BarChart2 } from "lucide-react";
import api from "../lib/api";
import { Dashboard } from "./Dashboard";

export const Admin = () => {
    const navigate = useNavigate();
    const { username: routeUsername } = useParams<{ username: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsAuthenticated(false);
                navigate("/admin-login");
                setIsLoading(false);
                return;
            }

            try {
                const response = await api.get('/auth/me');
                const user = response.data;
                setIsAuthenticated(true);

                setUsername(user.username);
                if (routeUsername && routeUsername !== user.username) {
                    navigate(`/admin/${user.username}`, { replace: true });
                }

            } catch (error) {
                setIsAuthenticated(false);
                localStorage.removeItem('token');
                navigate("/admin-login");
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    // Scroll effect for logo fade
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY >= 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('token');
        navigate("/");
    };

    const handleViewPublic = () => {
        const target = routeUsername || username || "";
        window.open(`/${target}`, "_blank");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-6 w-6 text-gray-900" />
            </div>
        );
    }

    if (!isAuthenticated) return null; // Will redirect


    // Regular User Dashboard
    if (!isAuthenticated) return null;


    // Regular User Dashboard
    return (
        <div className="relative">
            {/* Admin Floating Controls */}
            <div
                className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-[200] transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'
                    }`}
            >
                <img src="/logo.png" alt="Brototype" className="h-7 sm:h-10 w-auto dark:invert" />
            </div>

            <div className="fixed top-3 right-3 sm:top-6 sm:right-6 z-[200] flex gap-1.5 sm:gap-2">
                <ThemeToggle />
                <button
                    onClick={() => setShowDashboard(prev => !prev)}
                    className={`btn-neumorph-icon h-8 w-8 sm:h-10 sm:w-10 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center ${showDashboard ? "bg-black text-white" : ""
                        }`}
                    title="Analytics Dashboard"
                >
                    <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                    onClick={handleViewPublic}
                    disabled={!username}
                    className="btn-neumorph-icon h-8 w-8 sm:h-10 sm:w-10 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Public Page"
                >
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                    onClick={handleLogout}
                    className="btn-neumorph-icon h-8 w-8 sm:h-10 sm:w-10 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center"
                    title="Logout"
                >
                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
            </div>

            {showDashboard ? <Dashboard /> : <BentoGrid isEditable={true} />}
        </div>
    );
};
