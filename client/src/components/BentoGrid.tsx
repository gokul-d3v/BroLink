import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { LinkWidget, type WidgetData } from "./LinkWidget";
import api from "../lib/api";
import { Skeleton } from "./ui/skeleton";
import { WidgetEditorModal } from "./WidgetEditorModal";
// @ts-ignore
import * as ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const RGL = ReactGridLayout as any;
const Responsive = RGL.Responsive || RGL.ResponsiveGridLayout;

// Custom WidthProvider to handle the missing export
const withWidth = (WrappedComponent: any) => {
    return (props: any) => {
        const outerRef = useRef<HTMLDivElement>(null);
        const [width, setWidth] = useState(1200);

        useEffect(() => {
            if (!outerRef.current) return;

            let animationFrameId: number;

            const resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (entry && entry.contentRect.width > 0) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = requestAnimationFrame(() => {
                        setWidth((prev) => {
                            if (Math.abs(prev - entry.contentRect.width) > 1) {
                                return entry.contentRect.width;
                            }
                            return prev;
                        });
                    });
                }
            });

            resizeObserver.observe(outerRef.current);

            // Initial read
            if (outerRef.current.offsetWidth > 0) {
                setWidth(outerRef.current.offsetWidth);
            }

            return () => {
                resizeObserver.disconnect();
                cancelAnimationFrame(animationFrameId);
            };
        }, []);

        return (
            <div ref={outerRef} style={{ width: '100%' }}>
                <WrappedComponent {...props} width={width} />
            </div>
        );
    };
};

const ResponsiveGridLayout = withWidth(Responsive);

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_WIDGETS: WidgetData[] = [
    // Large Feature Widget (2x2)
    { id: '1', size: "2x2", url: "https://unsplash.com/photos/berlin-architecture", customTitle: "Berlin Architecture" },
    // Wide Horizontal Widget (2x1)
    { id: '2', size: "2x1", url: "https://buymeacoffee.com", customTitle: "Support my Work 💐" },
    // Square Small Widgets (1x1)
    { id: '3', size: "1x1", url: "https://instagram.com", customTitle: "Instagram" },
    { id: '4', size: "1x1", url: "https://linkedin.com", customTitle: "LinkedIn" },
    // Tall Vertical Widget (1x2)
    { id: '5', size: "1x2", url: "https://medium.com/@studio-ghibli/how-to-paint-like-hayao-miyazaki", customTitle: "How to Paint Like Hayao Miyazaki" },
    // More Squares
    { id: '6', size: "1x1", url: "https://twitter.com", customTitle: "My Tweeeets" },
    { id: '7', size: "1x1", url: "https://youtube.com", customTitle: "Hot takes" },
    { id: '8', size: "1x1", url: "https://dribbble.com", customTitle: "iOS UI Kit" },
];

interface BentoGridProps {
    isEditable: boolean;
    publicUsername?: string;
}

export const BentoGrid = ({ isEditable, publicUsername }: BentoGridProps) => {
    // Generate Layout helper
    const generateLayout = useCallback((currentWidgets: WidgetData[]) => {
        return currentWidgets.map((widget, i) => {
            let w = 1;
            let h = 1;
            if (widget.size === "2x1") { w = 2; h = 1; }
            if (widget.size === "1x2") { w = 1; h = 2; }
            if (widget.size === "2x2") { w = 2; h = 2; }
            // Basic layout packing logic
            return {
                i: widget.id,
                x: i % 4,
                y: Math.floor(i / 4) * 2,
                w: w,
                h: h,
                minW: 1,
                minH: 1
            };
        });
    }, []);

    const [widgets, setWidgets] = useState<WidgetData[]>(INITIAL_WIDGETS);
    const [layouts, setLayouts] = useState<any>({ lg: generateLayout(INITIAL_WIDGETS) });
    const [isLoading, setIsLoading] = useState(true);

    const isRemoteUpdate = useRef(false);

    // RE-INSERTING MISSING STATE
    const [userNotFound, setUserNotFound] = useState(false);
    // Profile data not used in grid view anymore
    const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(null);
    const [configDocId, setConfigDocId] = useState<string | null>(null); // Kept for compat if needed, but not strictly used in new API

    // Get Auth User
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) return setCurrentUserUsername(null);

            try {
                const response = await api.get('/auth/me');
                setCurrentUserUsername(response.data.username);
            } catch (e) {
                setCurrentUserUsername(null);
            }
        };
        fetchUser();
    }, []);


    // Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            let targetUsername = publicUsername;

            // If editable and no publicUsername, assume it's the logged in user
            if (isEditable && !publicUsername) {
                if (!currentUserUsername) {
                    setIsLoading(false);
                    return;
                }
                targetUsername = currentUserUsername;
            }

            if (!targetUsername) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch Config + Profile info implicitly via backend or separate route
                // Our backend /bento/:username returns the config object

                const response = await api.get(`/bento/${targetUsername}`);
                const config = response.data;

                // If backend returns 404 or 403, axios throws

                // Only Update if we got data
                if (config) {
                    // Backend User model has full_name, we might need to populate it in bento route or fetch separate. 
                    // For now, let's assume config has username. 

                    setConfigDocId(config._id);
                    isRemoteUpdate.current = true;

                    // Parse if stored as string (mixed type in mongoose might be obj or string depending on save)
                    // Our backend saves as Mixed, so it should be object. But legacy string data might exist?
                    // Let's parse just in case if string.
                    const parsedWidgets = typeof config.widgets === 'string' ? JSON.parse(config.widgets) : config.widgets;
                    const parsedLayouts = typeof config.layouts === 'string' ? JSON.parse(config.layouts) : config.layouts;

                    setWidgets(parsedWidgets || []);
                    setLayouts(parsedLayouts || {});
                }

            } catch (error: any) {
                console.error("Failed to load data:", error);
                if (error.response?.status === 404) {
                    setUserNotFound(true);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isEditable, publicUsername, currentUserUsername]);

    // Persistence Effect
    useEffect(() => {
        if (isRemoteUpdate.current || isLoading || !isEditable || !currentUserUsername) {
            isRemoteUpdate.current = false;
            return;
        }

        const syncData = async () => {
            // Allow syncing empty state (e.g. if user deleted all widgets)
            // But still respect isLoading to avoid overwriting with initial state before load
            if (isLoading) return;

            try {
                const payload = {
                    widgets: widgets, // Send as object, backend handles it
                    layouts: layouts
                };

                const response = await api.post('/bento/sync', payload);
                if (response.data._id) {
                    setConfigDocId(response.data._id);
                }
            } catch (error) {
                console.error("Failed to sync data:", error);
            }
        };

        const timer = setTimeout(syncData, 1000);
        return () => clearTimeout(timer);
    }, [widgets, layouts, isLoading, isEditable, currentUserUsername, configDocId]);


    // State for Add Widget Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleCreateWidget = (data: Partial<WidgetData>) => {
        const id = generateId();
        const newWidget: WidgetData = {
            id,
            size: "1x1",
            url: data.url || "",
            customTitle: data.customTitle,
            customImage: data.customImage,
            ctaText: data.ctaText,
            imageFit: data.imageFit
        };

        setWidgets(prev => [...prev, newWidget]);

        // Explicitly add to layout to prevent alignment issues
        setLayouts((prev: any) => {
            const currentLayout = prev.lg || [];
            // Find a spot: simple approach is to put it at the bottom
            const y = Math.max(...currentLayout.map((l: any) => l.y + l.h), 0);

            const newItem = {
                i: id,
                x: 0, // Start at left
                y: y, // Start at bottom
                w: 1,
                h: 1,
                minW: 1,
                minH: 1
            };

            return {
                ...prev,
                lg: [...currentLayout, newItem]
            };
        });

        setIsAddModalOpen(false);
    };

    const addWidget = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const removeWidget = useCallback(async (id: string, imageUrl?: string) => {
        if (imageUrl) {
            try {
                await api.post('/upload/delete', { url: imageUrl });
            } catch (error) {
                console.error("Failed to delete image from Cloudinary:", error);
                // We typically proceed with removing the widget even if image delete fails
            }
        }
        setWidgets(prev => prev.filter(w => w.id !== id));
    }, []);

    const updateWidget = useCallback((id: string, updates: Partial<WidgetData>) => {
        setWidgets(prevWidgets => {
            return prevWidgets.map(w => w.id === id ? { ...w, ...updates } : w);
        });

        // If size changed, we update the layout for that item
        if (updates.size) {
            setLayouts((prev: any) => {
                const newLayouts: any = { ...prev };

                Object.keys(newLayouts).forEach(key => {
                    if (!newLayouts[key]) return;

                    newLayouts[key] = newLayouts[key].map((l: any) => {
                        if (l.i === id) {
                            let w = 1; let h = 1;
                            if (updates.size === "2x1") { w = 2; h = 1; }
                            if (updates.size === "1x2") { w = 1; h = 2; }
                            if (updates.size === "2x2") { w = 2; h = 2; }
                            if (updates.size === "1x1") { w = 1; h = 1; }
                            return { ...l, w, h };
                        }
                        return l;
                    });
                });

                return newLayouts;
            });
        }
    }, []);


    // Handle layout changes
    const handleLayoutChange = useCallback((_currentLayout: any, allLayouts: any) => {
        // Prevent infinite loops by checking if the layout actually changed
        if (JSON.stringify(allLayouts) !== JSON.stringify(layouts)) {
            setLayouts(allLayouts);
        }
    }, [layouts]);

    // Update 'static' property using useMemo instead of useEffect to avoid render loops
    const derivedLayouts = useMemo(() => {
        const newLayouts = { ...layouts };
        Object.keys(newLayouts).forEach(key => {
            if (newLayouts[key]) {
                newLayouts[key] = newLayouts[key].map((item: any) => ({
                    ...item,
                    static: !isEditable
                }));
            }
        });
        return newLayouts;
    }, [layouts, isEditable]);

    // Skeleton Loading

    if (isLoading && !widgets.length) {
        return (
            <div className="max-w-7xl mx-auto px-6 pt-24 pb-10 md:py-24 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 auto-rows-[280px]">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className={`h-[280px] rounded-3xl ${i === 0 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`} />
                    ))}
                </div>
            </div>
        );
    }

    // Only show "User not found" if we are NOT in editable mode.
    // If we are editable (Admin), we should show the empty grid so the user can add widgets.
    if (userNotFound && !isEditable) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fbfbfd] p-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                    <span className="text-3xl">🤔</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1d1d1f] mb-3">User not found</h1>
                <p className="text-[#86868b] text-lg max-w-md">
                    The page <span className="font-semibold text-black">@{publicUsername}</span> does not exist.
                </p>
                <a href="/" className="mt-8 px-6 py-3 bg-black text-white rounded-xl font-medium hover:scale-[1.02] transition-transform">
                    Create your own page
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative">
            <div className="max-w-7xl mx-auto px-6 pt-24 pb-10 md:py-24 relative z-10">


                {/* Profile Widget (Sidebar on LG, Top on Mobile) */}


                {/* Link Widgets Grid - Full Width with Left Padding for Sidebar */}
                <div className="w-full pt-4 lg:pt-12">
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={derivedLayouts}
                        onLayoutChange={handleLayoutChange}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 4, md: 4, sm: 2, xs: 2, xxs: 1 }}
                        rowHeight={280}
                        isDraggable={isEditable}
                        isResizable={false}
                        compactType="vertical"
                        preventCollision={false}
                        margin={[24, 24]}
                        containerPadding={[0, 0]}
                    >
                        {widgets.map((widget) => (
                            <div key={widget.id} className="h-full w-full">
                                <div className="h-full">
                                    <LinkWidget
                                        data={widget}
                                        onUpdate={updateWidget}
                                        onRemove={removeWidget}
                                        isEditable={isEditable}
                                    />
                                </div>
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                </div>
            </div>
            {/* Floating Add Button */}
            <AnimatePresence>
                {isEditable && !isAddModalOpen && (
                    <motion.button
                        key="add-widget-button"
                        layoutId="add-widget-modal"
                        onClick={addWidget}
                        className="fixed bottom-8 right-8 z-[100] h-16 w-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-white/20 hover:border-white/40"
                        title="Add New Card"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Add Widget Modal */}
            <WidgetEditorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleCreateWidget}
                title="Add New Widget"
            />
        </div>
    );
};
