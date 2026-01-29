import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

export const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Verify token validity by calling /me
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return toast.error("Please fill in all fields");

        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });

            // Optional: Check if admin
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

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#fbfbfd]">
            <div className="w-full max-w-md p-6 sm:p-8">
                <div className="bg-white rounded-[32px] shadow-2xl shadow-black/5 p-8 sm:p-10 text-center border border-white/20 ring-1 ring-black/5">

                    {/* Header */}
                    <div className="mb-10 space-y-3">
                        <div className="mx-auto h-12 w-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-xl shadow-black/20">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">
                            Admin Portal
                        </h1>
                        <p className="text-[#86868b] font-medium text-lg">
                            Sign in to manage the platform
                        </p>
                    </div>

                    {/* LOGIN FORM */}
                    <form onSubmit={handleLogin} className="space-y-5 text-left">
                        <div className="space-y-1.5 relative">
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Admin Email"
                                className="h-14 rounded-2xl bg-[#f5f5f7] border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 px-5 pl-12 font-medium text-lg transition-all placeholder:text-[#86868b]"
                                required
                                autoFocus
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] h-5 w-5" />
                        </div>

                        <div className="space-y-1.5 relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="h-14 rounded-2xl bg-[#f5f5f7] border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 px-5 pl-12 font-medium text-lg transition-all placeholder:text-[#86868b] pr-12"
                                required
                                autoComplete="current-password"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] h-5 w-5" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] transition-colors p-1"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 rounded-2xl bg-[#1d1d1f] text-white hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all font-bold text-lg shadow-lg shadow-black/10 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Signing In...
                                </span>
                            ) : "Sign In via Dashboard"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
