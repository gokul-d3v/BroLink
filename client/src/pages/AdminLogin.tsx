import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Loader2, Command, Sun, Plus } from "lucide-react";
import { toast } from "sonner";
// @ts-ignore
import * as ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const RGL = ReactGridLayout as any;
const Responsive = RGL.Responsive || RGL.ResponsiveGridLayout;

// Custom WidthProvider
const withWidth = (WrappedComponent: any) => {
    return (props: any) => {
        const [width, setWidth] = useState(1200);
        const ref = useCallback((node: HTMLDivElement) => {
            if (node !== null) {
                const resizeObserver = new ResizeObserver((entries) => {
                    setWidth(entries[0].contentRect.width);
                });
                resizeObserver.observe(node);
            }
        }, []);

        return (
            <div ref={ref} style={{ width: '100%' }}>
                <WrappedComponent {...props} width={width} />
            </div>
        );
    };
};

const ResponsiveGridLayout = withWidth(Responsive);

// WIREFRAME LAYOUT (Balanced 2x4 Left, 2x4 Right)
// Left area: Time (2x1), Quick (2x1), Socials (2x2) -> Total Height 4
// Right area: Login (2x4) -> Total Height 4
const LG_LAYOUT = [
    { i: "time", x: 0, y: 0, w: 2, h: 1 },
    { i: "quick", x: 0, y: 1, w: 2, h: 1 },
    { i: "socials", x: 0, y: 2, w: 2, h: 2 },
    { i: "login", x: 2, y: 0, w: 2, h: 4 },
];

// Fallback for Tablet (Stacked)
const MD_LAYOUT = [
    { i: "time", x: 0, y: 0, w: 1, h: 1 },
    { i: "quick", x: 1, y: 0, w: 1, h: 1 },
    { i: "socials", x: 0, y: 1, w: 2, h: 1 },
    { i: "login", x: 2, y: 0, w: 1, h: 4 },
];

export const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Realtime Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Kept state in case we want to add live data back elsewhere, but removed from display for now
    const [events, setEvents] = useState<any[]>([]);

    const [layouts, setLayouts] = useState<any>({ lg: LG_LAYOUT, md: MD_LAYOUT });
    const navigate = useNavigate();
    const [isDraggable, setIsDraggable] = useState(() => window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsDraggable(window.innerWidth >= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check if user is already logged in
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

    // Data Fetching (Kept minimal in background for now)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const eventsRes = await fetch('https://api.github.com/events?per_page=30');
                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json();
                    const pushEvents = eventsData
                        .filter((e: any) => e.type === 'PushEvent' && e.payload.commits && e.payload.commits.length > 0)
                        .slice(0, 1);
                    if (pushEvents.length > 0) setEvents(pushEvents);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

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

    // Shared border style
    const cardStyle = "bg-white border-2 border-zinc-950 rounded-[32px] overflow-hidden relative group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300";

    const renderWidgets = () => [
        /* Time Widget */
        <div key="time" className={`${cardStyle} flex flex-col justify-center px-10 py-8`}>
            <div className="flex justify-between items-center h-full">
                <div className="flex flex-col justify-center">
                    <h2 className="text-5xl font-bold text-zinc-950 tracking-tight tabular-nums flex items-end">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })}
                        <span className="text-3xl font-bold text-zinc-300 mb-1 ml-1">:</span>
                        <span className="text-3xl font-bold text-zinc-400 mb-1">
                            {currentTime.toLocaleTimeString([], { second: '2-digit', timeZone: 'Asia/Kolkata' }).slice(0, 2)}
                        </span>
                        <span className="text-lg font-medium text-zinc-400 mb-2.5 ml-2">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).split(' ')[1]}
                        </span>
                    </h2>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div>
                        <p className="text-zinc-950 font-bold text-lg">Kochi, Kerala</p>
                        <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase">IST • GMT+5:30</p>
                    </div>
                    <Sun className="h-10 w-10 text-zinc-950 fill-zinc-950" />
                </div>
            </div>
        </div>,

        /* Quick Action Widget */
        <div key="quick" className={`${cardStyle} flex flex-col justify-center px-10 py-8`}>
            <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950">
                        <Command className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-zinc-950 font-bold text-xl">Quick Actions</p>
                        <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 mt-1">Ready to deploy</p>
                    </div>
                </div>
                <p className="font-bold text-zinc-950 text-base flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-lg border border-zinc-200">
                    <Command className="h-4 w-4" /> + K
                </p>
            </div>
        </div>,

        /* Socials Container (Grid of 4 large rectangular cards) */
        <div key="socials" className="grid grid-cols-2 gap-6 h-full">
            {/* Google */}
            <div className="bg-white border-2 border-zinc-950 rounded-[32px] flex items-center justify-between px-8 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
                <div className="flex items-center gap-4">
                    <svg className="h-8 w-8" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#000" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#000" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#000" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#000" /></svg>
                    <span className="font-bold text-zinc-950 text-lg">Google</span>
                </div>
            </div>
            {/* Github */}
            <div className="bg-white border-2 border-zinc-950 rounded-[32px] flex items-center justify-between px-8 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
                <div className="flex items-center gap-4">
                    <svg className="h-8 w-8 text-zinc-950" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                    <span className="font-bold text-zinc-950 text-lg">Github</span>
                </div>
            </div>
            {/* Twitter/X */}
            <div className="bg-white border-2 border-zinc-950 rounded-[32px] flex items-center justify-between px-8 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
                <div className="flex items-center gap-4">
                    <svg className="h-7 w-7 text-zinc-950" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    <span className="font-bold text-zinc-950 text-lg">Twitter</span>
                </div>
            </div>
            {/* Add */}
            <div className="bg-white border-2 border-dashed border-zinc-300 rounded-[32px] flex items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-300">
                <Plus className="h-10 w-10 text-zinc-300" />
            </div>
        </div>,

        /* Login Widget (Right Side - Tall) */
        <div key="login" className={`${cardStyle} p-12 sm:p-20 flex flex-col justify-center`}>
            <div className="mb-12">
                <h1 className="text-5xl font-bold tracking-tight text-zinc-950 mb-4">Welcome back</h1>
                <p className="text-zinc-500 font-medium text-xl leading-relaxed max-w-lg">
                    Sign in to your dashboard to continue building your next big thing.
                </p>
            </div>

            <div className="space-y-10 max-w-md">
                <div className="space-y-3">
                    <label className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 block mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        placeholder="name@company.com"
                        className="no-drag w-full py-3 bg-transparent border-b-2 border-zinc-100 font-medium text-xl text-zinc-950 placeholder:text-zinc-200 focus:outline-none focus:border-zinc-950 transition-all rounded-none"
                    />
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline mb-1">
                        <label className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 block">
                            Password
                        </label>
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-zinc-950 transition-colors"
                        >
                            Forgot?
                        </button>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        placeholder="••••••••"
                        className="no-drag w-full py-3 bg-transparent border-b-2 border-zinc-100 font-medium text-xl text-zinc-950 placeholder:text-zinc-200 focus:outline-none focus:border-zinc-950 transition-all rounded-none tracking-widest"
                    />
                </div>

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="no-drag w-full h-20 bg-black text-white rounded-2xl flex items-center justify-center font-bold tracking-wider hover:bg-zinc-800 active:scale-[0.98] transition-all mt-6 text-base shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]"
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        "SIGN IN"
                    )}
                </button>
            </div>

            <div className="mt-16">
                <p className="text-base font-medium text-zinc-400">
                    New here? <button className="font-bold text-zinc-950 hover:underline">Create an account</button>
                </p>
            </div>

            <div className="mt-auto pt-16 flex gap-8 text-[11px] font-bold tracking-widest uppercase text-zinc-300">
                <a href="#" className="hover:text-zinc-950 transition-colors">Security</a>
                <a href="#" className="hover:text-zinc-950 transition-colors">Privacy</a>
                <a href="#" className="hover:text-zinc-950 transition-colors">Terms</a>
            </div>
        </div>
    ];

    return (
        <div className="min-h-screen w-full bg-white text-zinc-950 flex flex-col relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none"></div>

            {/* Main Content Centered */}
            <main className="flex-1 flex items-center justify-center p-6 z-10">
                <div className="w-full max-w-[1400px]">
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={layouts}
                        breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
                        cols={{ lg: 4, md: 3, sm: 1, xs: 1, xxs: 1 }}
                        rowHeight={160}
                        margin={[24, 24]}
                        isResizable={false}
                        isDraggable={isDraggable}
                        draggableHandle=".group"
                        draggableCancel=".no-drag"
                    >
                        {renderWidgets()}
                    </ResponsiveGridLayout>
                </div>
            </main>
        </div>
    );
};
