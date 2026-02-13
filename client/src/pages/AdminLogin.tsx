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

export const AdminLogin = () => {
    const [email, setEmail] = useState("");
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
                // Using OpenWeatherMap API (free tier)
                const API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // Public demo key for testing
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
        // Refresh weather every 10 minutes
        const interval = setInterval(fetchWeather, 600000);
        return () => clearInterval(interval);
    }, []);

    // Initial check
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await api.get('/auth/me');
                    navigate("/admin");
                } catch (e) {
                    localStorage.removeItem('token');
                }
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogin = async () => {
        if (!email || !password) return toast.error("Please fill in all fields");

        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            toast.success("Welcome back!");
            navigate("/admin");
        } catch (error: any) {
            console.error("Login Error:", error);
            const msg = error.response?.data?.message || "Invalid credentials";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const cardStyle = "bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden cursor-move";

    const renderDashboardWidgets = () => [
        // WEATHER WIDGET
        <div key="weather" className={`${cardStyle} p-6 flex items-center justify-between h-full`}>
            <div>
                <h2 className="text-5xl font-medium text-white tracking-tight">{weather.temp}°</h2>
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 mt-2 uppercase">Kochi, Kerala</p>
            </div>
            <div className="flex flex-col items-center">
                <Sun className="h-10 w-10 text-yellow-400 fill-yellow-400 mb-2" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{weather.condition}</span>
            </div>
        </div>,

        // CALENDAR WIDGET
        <div key="calendar" className={`${cardStyle} p-6 flex flex-col justify-center items-center h-full`}>
            <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' })}
            </p>
            <p className="text-6xl font-light text-white tracking-tight">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </p>
        </div>,

        // CLOCK WIDGET
        <div key="clock" className={`${cardStyle} p-4 flex flex-col justify-center items-center h-full overflow-hidden`}>
            <AnalogClock />
        </div>,

        // SYSTEM WIDGET
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
            {/* LEFT PANEL: Draggable Dashboard Widgets */}
            <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-center items-center p-12 overflow-hidden">
                {/* Dot Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

                {/* Draggable Widgets Container */}
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

            {/* RIGHT PANEL: Login Form */}
            <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 lg:p-24 relative">
                <div className="w-full max-w-[400px]">
                    <div className="mb-12">
                        <h1 className="text-4xl font-bold text-zinc-950 mb-2 tracking-tight">Sign In</h1>
                        <p className="text-zinc-500 text-sm">Welcome back to your workspace</p>
                    </div>

                    <div className="space-y-8">
                        {/* Email Input */}
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

                        {/* Password Input */}
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
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <button className="text-[10px] font-bold tracking-widest text-blue-600 uppercase hover:text-blue-700 mt-2">
                                Reset
                            </button>
                        </div>

                        {/* Sign In Button */}
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full h-14 bg-zinc-950 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center mt-4"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                        </button>

                        {/* Social/Divider */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-100"></span>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="bg-white px-4 text-zinc-300">Connect With</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="h-12 border border-zinc-100 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors group">
                                <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            </button>
                            <button className="h-12 border border-zinc-100 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors group">
                                <svg className="h-5 w-5 text-zinc-950 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
