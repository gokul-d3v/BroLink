import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Loader2, ArrowRight, Move, Globe, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
// @ts-ignore
import * as ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
// import { cn } from "../lib/utils"; // Unused import

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

// 3 Column Layout
const DEFAULT_LAYOUT = [
    { i: "welcome", x: 0, y: 0, w: 2, h: 2 },
    { i: "email", x: 2, y: 0, w: 1, h: 1 },
    { i: "password", x: 2, y: 1, w: 1, h: 1 },
    { i: "enter", x: 0, y: 2, w: 2, h: 1 },
    { i: "quick", x: 2, y: 2, w: 1, h: 1 },
];

export const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [layouts, setLayouts] = useState<any>(() => {
        const saved = localStorage.getItem("neo-bento-layout");
        return saved ? JSON.parse(saved) : { lg: DEFAULT_LAYOUT };
    });

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

    // Migration: Fix layout if using old version (Email h=2)
    useEffect(() => {
        const currentLg = layouts.lg || [];
        const emailWidget = currentLg.find((w: any) => w.i === 'email');
        if (emailWidget && emailWidget.h === 2) {
            setLayouts({ lg: DEFAULT_LAYOUT });
            localStorage.setItem("neo-bento-layout", JSON.stringify({ lg: DEFAULT_LAYOUT }));
        }
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

    const onLayoutChange = (_: any, allLayouts: any) => {
        setLayouts(allLayouts);
        localStorage.setItem("neo-bento-layout", JSON.stringify(allLayouts));
    };

    const renderWidgets = (isMobile: boolean) => [
        /* Welcome Widget */
        <div key="welcome" className={`${isMobile ? 'w-full mb-4' : 'relative group overflow-hidden'}`}>
            <div className={`h-full w-full bg-[#EBF58A] rounded-[32px] p-8 sm:p-10 flex flex-col justify-between text-zinc-900 ${isMobile ? 'min-h-[200px]' : ''}`}>
                <div className="drag-handle absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-400 hidden md:block">
                    <div className="grid grid-cols-2 gap-1">
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                    </div>
                </div>
                <div className="max-w-md">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95] mb-6">
                        Welcome Back to the Workspace.
                    </h1>
                    <p className="text-zinc-700 font-medium text-lg leading-relaxed max-w-sm">
                        Drag and drop your way into your creative environment. Your blocks are right where you left them.
                    </p>
                </div>
            </div>
        </div>,

        /* Email Widget */
        <div key="email" className={`${isMobile ? 'w-full mb-4' : 'relative group'}`}>
            <div className={`h-full w-full bg-[#9ACBE8] rounded-[32px] p-8 flex flex-col text-zinc-900 ${isMobile ? 'min-h-[160px]' : ''}`}>
                <div className="drag-handle absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-600 hidden md:block">
                    <div className="grid grid-cols-2 gap-1">
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                    </div>
                </div>
                <label className="text-xs font-bold tracking-widest uppercase mb-4 opacity-70">
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full h-14 bg-white/50 backdrop-blur-sm rounded-xl px-4 font-medium text-lg placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all mb-auto relative z-20"
                />
            </div>
        </div>,

        /* Password Widget */
        <div key="password" className={`${isMobile ? 'w-full mb-4' : 'relative group'}`}>
            <div className={`h-full w-full bg-[#A0E8AF] rounded-[32px] p-8 flex flex-col text-zinc-900 ${isMobile ? 'min-h-[160px]' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold tracking-widest uppercase opacity-70">
                        Password
                    </label>
                </div>
                <div className="relative mb-auto">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder=""
                        className="w-full h-14 bg-white/50 backdrop-blur-sm rounded-xl px-4 font-medium text-lg placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all pr-10 relative z-20"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors p-1 z-30"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </div>,

        /* Enter Widget */
        <div key="enter" className={`${isMobile ? 'w-full mb-4' : 'relative group'}`}>
            <button
                onClick={handleLogin}
                disabled={isLoading}
                className={`h-full w-full bg-[#6200EE] rounded-[32px] flex items-center justify-center relative hover:scale-[1.02] active:scale-[0.98] transition-all group-hover:shadow-[0_0_40px_-10px_rgba(98,0,238,0.5)] ${isMobile ? 'min-h-[160px]' : ''}`}
            >
                <div className="drag-handle absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white/50 z-20 hidden md:block">
                    <Move className="h-5 w-5" />
                </div>

                {isLoading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                    <div className="flex items-center gap-3 text-white">
                        <span className="font-bold tracking-widest text-lg">ENTER</span>
                        <ArrowRight className="h-6 w-6" strokeWidth={3} />
                    </div>
                )}
            </button>
        </div>,

        /* Quick Connect Widget */
        <div key="quick" className={`${isMobile ? 'w-full mb-4' : 'relative group'}`}>
            <div className={`h-full w-full bg-[#FFBCB7] rounded-[32px] p-6 sm:p-8 flex flex-col justify-center text-zinc-900 ${isMobile ? 'min-h-[160px]' : ''}`}>
                <div className="drag-handle absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-600 hidden md:block">
                    <div className="grid grid-cols-2 gap-1">
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                    </div>
                </div>
                <label className="text-xs font-bold tracking-widest uppercase mb-3 opacity-70">
                    Quick Connect
                </label>
                <div className="flex gap-3">
                    <button className="h-12 flex-1 bg-white hover:bg-white/90 transition-colors rounded-xl flex items-center justify-center group/btn shadow-sm">
                        <Globe className="h-6 w-6 text-blue-500 group-hover/btn:scale-110 transition-transform" />
                    </button>
                    <button className="h-12 w-16 bg-[#25D366] hover:bg-[#20bd5a] transition-colors rounded-xl flex items-center justify-center text-white group/btn shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white group-hover/btn:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    ];

    return (
        <div className="min-h-screen w-full bg-[#fbfbfd] text-gray-900 flex flex-col selection:bg-purple-500/30">
            {/* Header */}
            <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Brototype</h1>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl">
                    {!isDraggable ? (
                        <div className="flex flex-col gap-4 max-w-[500px] mx-auto pb-10">
                            {renderWidgets(true)}
                        </div>
                    ) : (
                        <ResponsiveGridLayout
                            className="layout"
                            layouts={layouts}
                            onLayoutChange={onLayoutChange}
                            breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
                            cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
                            rowHeight={160}
                            margin={[20, 20]}
                            isResizable={false}
                            isDraggable={isDraggable}
                            draggableHandle=".drag-handle"
                            draggableCancel=".no-drag"
                        >
                            {renderWidgets(false)}
                        </ResponsiveGridLayout>
                    )}
                </div>
            </main>
        </div>
    );
};
