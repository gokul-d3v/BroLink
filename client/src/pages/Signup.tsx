import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Loader2, Sun, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AnalogClock } from "../components/AnalogClock";
// @ts-ignore
import * as ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const RGL = ReactGridLayout as any;
const Responsive = RGL.Responsive || RGL.ResponsiveGridLayout;

// Custom WidthProvider for left panel
const withWidth = (WrappedComponent: any) => {
    return (props: any) => {
        const [width, setWidth] = useState(600);
        const ref = useCallback((node: HTMLDivElement) => {
            if (node !== null) {
                const resizeObserver = new ResizeObserver((entries) => {
                    setWidth(entries[0].contentRect.width);
                });
                resizeObserver.observe(node);
            }
        }, []);

        return (
            <div ref={ref} style={{ width: '100%', height: '100%' }}>
                <WrappedComponent {...props} width={width} />
            </div>
        );
    };
};

const ResponsiveGridLayout = withWidth(Responsive);

// Layout configuration for dashboard widgets
const DASHBOARD_LAYOUT = [
    { i: "weather", x: 0, y: 0, w: 2, h: 1.2 },
    { i: "calendar", x: 0, y: 1.2, w: 1, h: 1.5 },
    { i: "clock", x: 1, y: 1.2, w: 1, h: 1.5 },
    { i: "system", x: 0, y: 2.7, w: 2, h: 0.8 },
];

export const Signup = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [layouts, setLayouts] = useState<any>({ lg: DASHBOARD_LAYOUT });
    const [weather, setWeather] = useState<{ temp: number; condition: string; icon: string }>({
        temp: 28,
        condition: "Mostly Sunny",
        icon: "clear"
    });
    const navigate = useNavigate();

    // Fetch real weather data for Kochi, Kerala
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // Demo key
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?q=Kochi,IN&units=metric&appid=${API_KEY}`
                );
                const data = await response.json();

                if (response.ok) {
                    setWeather({
                        temp: Math.round(data.main.temp),
                        condition: data.weather[0].main,
                        icon: data.weather[0].icon
                    });
                }
            } catch (error) {
                console.error("Failed to fetch weather:", error);
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 600000);
        return () => clearInterval(interval);
    }, []);

    // If already logged in, send to their admin page
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const me = await api.get('/auth/me');
                    navigate(`/admin/${me.data.username}`);
                } catch (e) {
                    localStorage.removeItem('token');
                }
            }
        };
        checkAuth();
    }, [navigate]);

    const handleSignup = async () => {
        if (!email || !password || !username) return toast.error("Please fill in all fields");

        setIsLoading(true);
        try {
            const response = await api.post('/auth/signup', { email, password, username });
            localStorage.setItem('token', response.data.token);
            toast.success("Account created!");
            const targetUsername = response.data.user?.username || username;
            navigate(`/admin/${targetUsername}`);
        } catch (error: any) {
            console.error("Signup Error:", error);
            const msg = error.response?.data?.message || "Signup failed";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const cardStyle = "bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden cursor-move";

    const renderDashboardWidgets = () => [
        <div key="weather" className={`${cardStyle} p-6 flex items-center justify-between h-full`}>
            <div>
                <h2 className="text-5xl font-medium text-white tracking-tight">{weather.temp}°</h2>
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 mt-2 uppercase">Kochi, Kerala</p>
            </div>
            <div className="flex flex-col items-center">
                <Sun className="h-8 w-8 text-yellow-400 fill-yellow-400 mb-2" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{weather.condition}</span>
            </div>
        </div>,
        <div key="calendar" className={`${cardStyle} p-6 flex flex-col justify-center items-center h-full`}>
            <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' })}
            </p>
            <p className="text-6xl font-light text-white tracking-tight">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </p>
        </div>,
        <div key="clock" className={`${cardStyle} p-4 flex flex-col justify-center items-center h-full overflow-hidden`}>
            <AnalogClock />
        </div>,
        <div key="system" className={`${cardStyle} p-6 flex items-center gap-6 h-full`}>
            <div className="flex -space-x-2">
                <div className="h-10 w-10 rounded-full bg-red-500 border-4 border-zinc-900 z-30 animate-pulse"></div>
                <div className="h-10 w-10 rounded-full bg-blue-500 border-4 border-zinc-900 z-20 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-10 w-10 rounded-full bg-green-500 border-4 border-zinc-900 z-10 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
            </div>
        </div>
    ];

    return (
        <div className="flex min-h-screen w-full overflow-hidden">
            <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-center items-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>
                <div className="relative z-10 w-full max-w-md h-full flex items-center">
                    <ResponsiveGridLayout
                        className="layout w-full"
                        layouts={layouts}
                        onLayoutChange={(_layout: any, layouts: any) => setLayouts(layouts)}
                        breakpoints={{ lg: 600 }}
                        cols={{ lg: 2 }}
                        rowHeight={120}
                        margin={[24, 24]}
                        isDraggable={true}
                        isResizable={false}
                        draggableHandle=".cursor-move"
                    >
                        {renderDashboardWidgets()}
                    </ResponsiveGridLayout>
                </div>
            </div>

            <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 lg:p-24 relative">
                <div className="w-full max-w-[400px]">
                    <div className="mb-12">
                        <h1 className="text-4xl font-bold text-zinc-950 mb-2 tracking-tight">Create Account</h1>
                        <p className="text-zinc-500 text-sm">Build your public board in seconds</p>
                    </div>

                    <div className="space-y-8">
                        <div className="group">
                            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-2 block group-focus-within:text-zinc-900 transition-colors">
                                Username
                            </label>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="yourname"
                                className="w-full pb-3 border-b border-zinc-200 bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="group">
                            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-2 block group-focus-within:text-zinc-900 transition-colors">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full pb-3 border-b border-zinc-200 bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="group">
                            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase group-focus-within:text-zinc-900 transition-colors mb-2 block">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pb-3 border-b border-zinc-200 bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors tracking-widest pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 bottom-3 text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSignup}
                            disabled={isLoading}
                            className="w-full h-14 bg-zinc-950 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center mt-4"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                        </button>

                        <p className="text-sm text-zinc-500">
                            Already have an account?{" "}
                            <button className="text-blue-600 font-semibold" onClick={() => navigate("/admin-login")}>
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
