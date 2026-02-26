import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import {
    MousePointerClick, TrendingUp, Users, Globe, Smartphone,
    Monitor, Tablet, ExternalLink, BarChart2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WidgetStat { widget_id: string; url: string; custom_title: string; custom_image: string; total: number; unique: number; }
interface TimelinePoint { date: string; total: number; }
interface ReferrerStat { domain: string; count: number; }
interface DeviceStat { device_type: string; count: number; }
interface GeoStat { location: string; country_code: string; count: number; }
interface ClickLogItem { id: string; url: string; device_type: string; referrer_domain: string; country_code: string; location: string; clicked_at: string; count: number; }
interface LocationItem { country: string; regions: string[]; }

type Tab = "overview" | "timeline" | "devices" | "referrers" | "geo";

const DEVICE_COLORS: Record<string, string> = {
    desktop: "#ffffff", mobile: "#ec4899", tablet: "#06b6d4", bot: "#64748b",
};
const DEVICE_ICONS: Record<string, React.ReactNode> = {
    desktop: <Monitor className="h-4 w-4" />,
    mobile: <Smartphone className="h-4 w-4" />,
    tablet: <Tablet className="h-4 w-4" />,
    bot: <Globe className="h-4 w-4" />,
};

const getHostname = (rawUrl: string) => {
    try { return new URL(rawUrl).hostname.replace("www.", ""); } catch { return rawUrl; }
};
const flagEmoji = (code: string) => {
    if (!code || code.length !== 2) return "🌐";
    return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
};

// ─── Shared sub-components ────────────────────────────────────────────────────
const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-9 h-9 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading…</p>
    </div>
);
const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <MousePointerClick className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium text-sm max-w-xs">{label}</p>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const Dashboard = () => {
    const [tab, setTab] = useState<Tab>("overview");
    const [dateRange, setDateRange] = useState<{ mode: "today" | 7 | 30 | "custom", start: string | null, end: string | null }>({ mode: 7, start: null, end: null });
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

    const [geoView, setGeoView] = useState<"locations" | "clicks">("locations");
    const [clickLogs, setClickLogs] = useState<ClickLogItem[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const [locations, setLocations] = useState<LocationItem[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [selectedRegion, setSelectedRegion] = useState<string>("");

    // Keep isDark in sync with theme toggle
    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains("dark"))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const [widgets, setWidgets] = useState<WidgetStat[]>([]);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
    const [devices, setDevices] = useState<DeviceStat[]>([]);
    const [geo, setGeo] = useState<GeoStat[]>([]);
    const [loading, setLoading] = useState<Record<Tab, boolean>>({
        overview: true, timeline: true, devices: true, referrers: true, geo: true,
    });

    const getDates = useCallback(() => {
        if (dateRange.mode === "custom") return { start: dateRange.start, end: dateRange.end };
        const end = new Date();
        const start = new Date();
        if (dateRange.mode === "today") start.setHours(start.getHours() - 24);
        if (dateRange.mode === 7) start.setDate(start.getDate() - 7);
        if (dateRange.mode === 30) start.setDate(start.getDate() - 30);
        return { start: start.toISOString(), end: end.toISOString() };
    }, [dateRange]);

    const fetchAll = useCallback(async () => {
        setLoading(p => ({ ...p, overview: true, timeline: true, devices: true, referrers: true, geo: true }));
        const { start, end } = getDates();
        const params = new URLSearchParams();
        if (start) params.append("start", start);
        if (end) params.append("end", end);

        if (dateRange.mode === "today") params.append("mode", "hourly");
        else if (dateRange.mode === 7) params.append("days", "7");
        else if (dateRange.mode === 30) params.append("days", "30");

        if (selectedCountry) params.append("country", selectedCountry);
        if (selectedRegion) params.append("region", selectedRegion);

        const q = `?${params.toString()}`;

        const [w, tl, ref, dev, g] = await Promise.allSettled([
            api.get(`/analytics${q}`),
            api.get(`/analytics/timeline${q}`),
            api.get(`/analytics/referrers${q}`),
            api.get(`/analytics/devices${q}`),
            api.get(`/analytics/geo${q}`),
        ]);
        const set = <T,>(r: PromiseSettledResult<any>, setter: (v: T[]) => void) => {
            if (r.status === "fulfilled") setter(r.value.data || []);
        };
        set<WidgetStat>(w, setWidgets);
        set<TimelinePoint>(tl, setTimeline);
        set<ReferrerStat>(ref, setReferrers);
        set<DeviceStat>(dev, setDevices);
        set<GeoStat>(g, setGeo);
        setLoading(p => ({ ...p, overview: false, timeline: false, devices: false, referrers: false, geo: false }));
    }, [getDates, selectedCountry, selectedRegion, dateRange.mode]);

    const fetchClickLogs = useCallback(async () => {
        setLoadingLogs(true);
        const { start, end } = getDates();
        const params = new URLSearchParams();
        if (start) params.append("start", start);
        if (end) params.append("end", end);
        if (selectedCountry) params.append("country", selectedCountry);
        if (selectedRegion) params.append("region", selectedRegion);
        try {
            const res = await api.get(`/analytics/logs?${params.toString()}`);
            setClickLogs(res.data || []);
        } catch { }
        setLoadingLogs(false);
    }, [getDates, selectedCountry, selectedRegion]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        if (tab === "geo" && geoView === "clicks") {
            fetchClickLogs();
        }
    }, [tab, geoView, fetchClickLogs]);

    useEffect(() => {
        api.get("/analytics/locations").then(res => setLocations(res.data || []));
    }, []);

    // Reset region if country changes and region is no longer valid
    useEffect(() => {
        if (selectedCountry) {
            const loc = locations.find(l => l.country === selectedCountry);
            if (!loc || !loc.regions.includes(selectedRegion)) {
                setSelectedRegion("");
            }
        } else {
            setSelectedRegion("");
        }
    }, [selectedCountry, locations, selectedRegion]);

    const totalClicks = widgets.reduce((s, w) => s + w.total, 0);
    const uniqueClicks = widgets.reduce((s, w) => s + w.unique, 0);
    const maxTotal = Math.max(...widgets.map(w => w.total), 1);

    const TABS: { id: Tab; label: string }[] = [
        { id: "overview", label: "Overview" },
        { id: "timeline", label: "Timeline" },
        { id: "devices", label: "Devices" },
        { id: "referrers", label: "Referrers" },
        { id: "geo", label: "Geo" },
    ];

    return (
        <div className="min-h-screen pt-20 pb-16 px-3 sm:px-6 max-w-5xl mx-auto">

            {/* ── Header w/ Global Time Filter ── */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
                        <BarChart2 className="h-6 w-6" /> Analytics
                    </h2>
                    <p className="text-gray-400 mt-0.5 text-xs sm:text-sm">Real-time behavior across widgets.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Location Filters */}
                    {locations.length > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                            <select
                                value={selectedCountry}
                                onChange={e => setSelectedCountry(e.target.value)}
                                className="bg-gray-100 text-black/60 dark:bg-white/5 dark:text-white/60 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer border border-transparent dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                            >
                                <option value="" className="dark:bg-[#1c1b1e] dark:text-white">All Countries</option>
                                {locations.map(l => <option key={l.country} value={l.country} className="dark:bg-[#1c1b1e] dark:text-white">{l.country}</option>)}
                            </select>

                            {selectedCountry && (locations.find(l => l.country === selectedCountry)?.regions?.length || 0) > 0 && (
                                <select
                                    value={selectedRegion}
                                    onChange={e => setSelectedRegion(e.target.value)}
                                    className="bg-gray-100 text-black/60 dark:bg-white/5 dark:text-white/60 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer border border-transparent dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                                >
                                    <option value="" className="dark:bg-[#1c1b1e] dark:text-white">All Regions</option>
                                    {(locations.find(l => l.country === selectedCountry)?.regions || []).map(r => (
                                        <option key={r} value={r} className="dark:bg-[#1c1b1e] dark:text-white">{r}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Time Filters */}
                    {(["today", 7, 30, "custom"] as const).map(m => (
                        <button key={String(m)} onClick={() => setDateRange(p => ({ ...p, mode: m }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateRange.mode === m ? "bg-black text-white dark:bg-white/90 dark:text-black shadow-sm" : "bg-gray-100 text-black/60 hover:text-black dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white border border-transparent dark:border-white/5"}`}
                        >
                            {m === "today" ? "24h" : m === "custom" ? "Custom" : `${m}d`}
                        </button>
                    ))}
                    {dateRange.mode === "custom" && (
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg border border-transparent dark:border-white/10 ml-2">
                            <input type="date" value={dateRange.start ? dateRange.start.split('T')[0] : ''} onChange={e => setDateRange(p => ({ ...p, start: new Date(e.target.value).toISOString() }))} className="bg-transparent text-xs text-black dark:text-white outline-none unstyled-date cursor-pointer" />
                            <span className="text-black/30 dark:text-white/30 text-xs">to</span>
                            <input type="date" value={dateRange.end ? dateRange.end.split('T')[0] : ''} onChange={e => setDateRange(p => ({ ...p, end: new Date(e.target.value).toISOString() }))} className="bg-transparent text-xs text-black dark:text-white outline-none unstyled-date cursor-pointer" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {[
                    { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: <MousePointerClick className="h-4 w-4" /> },
                    { label: "Unique Visitors", value: uniqueClicks.toLocaleString(), icon: <Users className="h-4 w-4" /> },
                    { label: "Widgets", value: widgets.length, icon: <TrendingUp className="h-4 w-4" /> },
                    { label: "Countries", value: geo.length, icon: <Globe className="h-4 w-4" /> },
                ].map(card => (
                    <div key={card.label} className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 backdrop-blur-sm">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-black dark:bg-white/90 flex items-center justify-center text-white dark:text-black shrink-0 shadow-sm">
                            {card.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-black/50 dark:text-white/60 font-medium truncate">{card.label}</p>
                            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabs (horizontally scrollable on mobile) ── */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 sm:mb-6">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-xl w-max backdrop-blur-md">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${tab === t.id
                                ? "bg-black dark:bg-white/90 text-white dark:text-black shadow"
                                : "text-black/50 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* ══ OVERVIEW TAB ══ */}
            {tab === "overview" && (
                loading.overview ? <LoadingSpinner /> :
                    widgets.length === 0 ? <EmptyState label="No clicks yet — share your public profile link!" /> : (
                        <div className="space-y-2 sm:space-y-3">
                            {widgets.map((w, i) => {
                                const bar = Math.max(4, (w.total / maxTotal) * 100);
                                const domain = getHostname(w.url);
                                return (
                                    <div key={w.widget_id} className="group flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-black dark:hover:border-white/30 transition-all hover:shadow-md backdrop-blur-sm">
                                        <span className="hidden sm:block text-xs font-bold text-black/20 dark:text-white/20 w-5 text-center shrink-0">#{i + 1}</span>
                                        {/* Image */}
                                        <div className="h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                            {w.custom_image
                                                ? <img src={w.custom_image} alt={w.custom_title} className="h-full w-full object-cover" />
                                                : <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-lg">
                                                    {(w.custom_title || domain || "?").charAt(0).toUpperCase()}
                                                </div>
                                            }
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                                    {w.custom_title || domain}
                                                </p>
                                                <a href={w.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hidden sm:block opacity-0 group-hover:opacity-100 shrink-0">
                                                    <ExternalLink className="h-3.5 w-3.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" />
                                                </a>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-black/50 dark:text-white/50 truncate mb-1.5 sm:mb-2">{w.url}</p>
                                            <div className="h-1 sm:h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-black dark:bg-white/90 rounded-full transition-all duration-700" style={{ width: `${bar}%` }} />
                                            </div>
                                        </div>
                                        {/* Counts */}
                                        <div className="shrink-0 text-right space-y-0.5 sm:space-y-1">
                                            <div className="flex items-center gap-1 sm:gap-1.5 bg-black dark:bg-white/90 text-white dark:text-black px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm">
                                                <MousePointerClick className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                {w.total.toLocaleString()}
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-black/50 dark:text-white/60">{w.unique.toLocaleString()} unique</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
            )}

            {/* ══ TIMELINE TAB ══ */}
            {tab === "timeline" && (
                <div>
                    {loading.timeline ? <LoadingSpinner /> : timeline.length === 0
                        ? <EmptyState label="No timeline data yet for this range." />
                        : (
                            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={isDark ? "#fff" : "#000"} stopOpacity={isDark ? 0.3 : 0.2} />
                                                <stop offset="95%" stopColor={isDark ? "#fff" : "#000"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0"} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: isDark ? "rgba(255,255,255,0.5)" : "#666", fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val: string) => {
                                                if (dateRange.mode === "today" || val.includes(":00")) return val;
                                                const d = new Date(val + "T00:00:00");
                                                return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                                            }}
                                        />
                                        <YAxis tick={{ fill: isDark ? "rgba(255,255,255,0.5)" : "#666", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? "#2a2838" : "#fff", color: isDark ? "#fff" : "#000", borderRadius: "12px", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "12px" }}
                                            labelFormatter={(val) => {
                                                const v = String(val);
                                                if (dateRange.mode === "today" || v.includes(":00")) {
                                                    const parts = v.split(" ");
                                                    const hrStr = parts.length > 1 ? parts[1].split(":")[0] : v.split(":")[0];
                                                    const h = parseInt(hrStr) || 0;
                                                    const next = String((h + 1) % 24).padStart(2, "0");
                                                    return `${v} – ${next}:00`;
                                                }
                                                const d = new Date(v + "T00:00:00");
                                                return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
                                            }}
                                            formatter={(v: any) => [v, "Clicks"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke={isDark ? "#fff" : "#000"}
                                            strokeWidth={2}
                                            fill="url(#grad)"
                                            dot={{ r: 3, fill: isDark ? "#fff" : "#000" }}
                                            activeDot={{ r: 5, fill: isDark ? "#fff" : "#000" }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    }
                </div>
            )}

            {/* ══ DEVICES TAB ══ */}
            {tab === "devices" && (
                loading.devices ? <LoadingSpinner /> : devices.length === 0
                    ? <EmptyState label="No device data yet." />
                    : (
                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                            {/* Donut chart */}
                            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                                <h3 className="text-xs font-semibold text-black/40 dark:text-white/40 mb-3 uppercase tracking-widest">Breakdown</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie stroke="none" data={devices} dataKey="count" nameKey="device_type" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                                            {devices.map(d => (
                                                <Cell key={d.device_type} fill={DEVICE_COLORS[d.device_type] || "#999"} />
                                            ))}
                                        </Pie>
                                        <Legend formatter={v => <span style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.7)" : "#374151", textTransform: "capitalize" }}>{v}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* List */}
                            <div className="space-y-2 sm:space-y-3">
                                {devices.map(d => {
                                    const total = devices.reduce((s, x) => s + x.count, 0);
                                    const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
                                    return (
                                        <div key={d.device_type} className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl backdrop-blur-sm">
                                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: DEVICE_COLORS[d.device_type] || "#999", color: "#fff" }}>
                                                {DEVICE_ICONS[d.device_type] || <Globe className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs sm:text-sm font-semibold capitalize text-gray-900 dark:text-white">{d.device_type}</p>
                                                <div className="h-1 sm:h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mt-1">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DEVICE_COLORS[d.device_type] || "#999" }} />
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{d.count.toLocaleString()}</p>
                                                <p className="text-[10px] sm:text-xs text-black/50 dark:text-white/60">{pct}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
            )}

            {/* ══ REFERRERS TAB ══ */}
            {tab === "referrers" && (
                loading.referrers ? <LoadingSpinner /> : referrers.length === 0
                    ? <EmptyState label="No referrer data yet." />
                    : (
                        <div className="space-y-2 sm:space-y-3">
                            {referrers.map((ref, i) => {
                                const bar = Math.max(4, (ref.count / referrers[0].count) * 100);
                                return (
                                    <div key={ref.domain} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-black dark:hover:border-white/30 transition-all backdrop-blur-sm">
                                        <span className="hidden sm:block text-xs text-black/20 dark:text-white/20 font-bold w-5 text-center">#{i + 1}</span>
                                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-500 dark:text-white/60 font-bold text-sm">
                                            {ref.domain === "Direct" ? "↗" : ref.domain.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white mb-1 truncate">{ref.domain}</p>
                                            <div className="h-1 sm:h-1.5 bg-gray-100 dark:bg-white/10 rounded-full">
                                                <div className="h-full bg-black dark:bg-white/90 rounded-full transition-all" style={{ width: `${bar}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-1.5 bg-black dark:bg-white/90 text-white dark:text-black px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm shrink-0">
                                            <MousePointerClick className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                            {ref.count.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
            )}

            {/* ══ GEO TAB ══ */}
            {tab === "geo" && (
                <div>
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setGeoView("locations")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${geoView === "locations" ? "bg-black text-white dark:bg-white/90 dark:text-black" : "bg-gray-100 text-black/60 dark:bg-white/5 dark:text-white/60"}`}>
                            Top Locations
                        </button>
                        <button onClick={() => setGeoView("clicks")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${geoView === "clicks" ? "bg-black text-white dark:bg-white/90 dark:text-black" : "bg-gray-100 text-black/60 dark:bg-white/5 dark:text-white/60"}`}>
                            Activity Feed
                        </button>
                    </div>

                    {geoView === "locations" ? (
                        loading.geo ? <LoadingSpinner /> : geo.length === 0
                            ? <EmptyState label="No geo data yet." />
                            : (
                                <div className="space-y-2 sm:space-y-3">
                                    {geo.map((g, i) => {
                                        const bar = Math.max(4, (g.count / geo[0].count) * 100);
                                        return (
                                            <div key={g.location} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-black dark:hover:border-white/30 transition-all backdrop-blur-sm">
                                                <span className="hidden sm:block text-xs text-black/20 dark:text-white/20 font-bold w-5 text-center">#{i + 1}</span>
                                                <span className="text-xl sm:text-2xl shrink-0">{flagEmoji(g.country_code)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white mb-1 truncate">{g.location}</p>
                                                    <div className="h-1 sm:h-1.5 bg-gray-100 dark:bg-white/10 rounded-full">
                                                        <div className="h-full bg-black dark:bg-white/90 rounded-full transition-all" style={{ width: `${bar}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-1.5 bg-black dark:bg-white/90 text-white dark:text-black px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm shrink-0">
                                                    <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                    {g.count.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                    ) : (
                        loadingLogs ? <LoadingSpinner /> : clickLogs.length === 0
                            ? <EmptyState label="No click history found for this range." />
                            : (
                                <div className="space-y-2 sm:space-y-3">
                                    {clickLogs.map((log) => (
                                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl backdrop-blur-sm">
                                            <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl sm:text-2xl shrink-0 leading-none">{flagEmoji(log.country_code)}</span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">{log.location}</p>
                                                            {log.count > 1 && (
                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-black dark:bg-white/90 text-white dark:text-black whitespace-nowrap">x{log.count}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-black/50 dark:text-white/50">{new Date(log.clicked_at).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric', year: 'numeric',
                                                            hour: 'numeric', minute: '2-digit'
                                                        })}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-right">
                                                    <div className="hidden sm:block">
                                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{getHostname(log.url)}</p>
                                                        <p className="text-[10px] text-black/50 dark:text-white/50">Via {log.referrer_domain}</p>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-white/60">
                                                        {DEVICE_ICONS[log.device_type] || <Monitor className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sm:hidden border-t border-gray-100 dark:border-white/10 pt-2 mt-1 flex justify-between items-center">
                                                <p className="text-[10px] text-black/50 dark:text-white/50">via {log.referrer_domain}</p>
                                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{getHostname(log.url)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                    )}
                </div>
            )}
        </div>
    );
};
