import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BentoGrid } from "../components/BentoGrid";
import { ThemeToggle } from "../components/ThemeToggle";
import { LogOut, Eye, Loader2 } from "lucide-react";
import api from "../lib/api";

export const Admin = () => {
    const navigate = useNavigate();
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
        window.open("/", "_blank");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-gray-900" />
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
                <h1 className="text-2xl font-bold tracking-tight">BroLink</h1>
            </div>

            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[200] flex gap-2 sm:gap-3">
                <ThemeToggle />
                <button
                    onClick={handleViewPublic}
                    disabled={!username}
                    className="rounded-full w-10 h-10 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Public Page"
                >
                    <Eye className="h-[1.2rem] w-[1.2rem]" />
                </button>
                <button
                    onClick={handleLogout}
                    className="rounded-full w-10 h-10 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center"
                    title="Logout"
                >
                    <LogOut className="h-[1.2rem] w-[1.2rem]" />
                </button>
            </div>

            <BentoGrid isEditable={true} />
        </div>
    );
};
