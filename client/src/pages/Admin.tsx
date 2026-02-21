import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { BentoGrid } from "../components/BentoGrid";
import { ThemeToggle } from "../components/ThemeToggle";
import { LogOut, Eye, Loader2 } from "lucide-react";
import api from "../lib/api";

export const Admin = () => {
    const navigate = useNavigate();
    const { username: routeUsername } = useParams<{ username: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);

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
                <h1 className="text-2xl font-bold tracking-tight">BROTOTYPE</h1>
            </div>

            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[200] flex gap-2 sm:gap-3">
                <ThemeToggle />
                <button
                    onClick={handleViewPublic}
                    disabled={!username}
                    className="btn-neumorph-icon w-10 h-10 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Public Page"
                >
                    <Eye className="h-4 w-4" />
                </button>
                <button
                    onClick={handleLogout}
                    className="btn-neumorph-icon w-10 h-10 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center"
                    title="Logout"
                >
                    <LogOut className="h-4 w-4" />
                </button>
            </div>

            <BentoGrid isEditable={true} />
        </div>
    );
};
