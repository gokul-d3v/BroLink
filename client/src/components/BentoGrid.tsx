import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { LinkWidget, type WidgetData } from "./LinkWidget";
import api from "../lib/api";

import { WidgetEditorModal } from "./WidgetEditorModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
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

import { generateId } from "../lib/utils";

const ResponsiveGridLayout = withWidth(Responsive);

// Helper to find the first available 1x1 spot
const findNextAvailablePosition = (layout: any[], cols: number = 4): { x: number, y: number } => {
    if (!layout || layout.length === 0) return { x: 0, y: 0 };

    // Create a set of occupied cells
    const occupied = new Set<string>();
    layout.forEach(item => {
        for (let x = item.x; x < item.x + item.w; x++) {
            for (let y = item.y; y < item.y + item.h; y++) {
                occupied.add(`${x},${y}`);
            }
        }
    });

    let y = 0;
    while (true) {
        for (let x = 0; x < cols; x++) {
            if (!occupied.has(`${x},${y}`)) {
                return { x, y };
            }
        }
        y++;
    }
};

const reflowLayout = (layout: any[], cols: number): any[] => {
    if (!layout || layout.length === 0) return [];

    const sorted = [...layout].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const occupied = new Set<string>();

    const isFree = (x: number, y: number, w: number, h: number) => {
        for (let ix = x; ix < x + w; ix++) {
            for (let iy = y; iy < y + h; iy++) {
                if (occupied.has(`${ix},${iy}`)) return false;
            }
        }
        return true;
    };

    const occupy = (x: number, y: number, w: number, h: number) => {
        for (let ix = x; ix < x + w; ix++) {
            for (let iy = y; iy < y + h; iy++) {
                occupied.add(`${ix},${iy}`);
            }
        }
    };

    const result: any[] = [];
    for (const item of sorted) {
        const w = Math.min(item.w ?? 1, cols);
        const h = item.h ?? 1;
        let x = 0;
        let y = 0;

        while (true) {
            if (x + w > cols) {
                x = 0;
                y++;
                continue;
            }
            if (isFree(x, y, w, h)) {
                const placed = { ...item, x, y, w, h };
                result.push(placed);
                occupy(x, y, w, h);
                break;
            }
            x++;
        }
    }

    return result;
};

// Pre-generates all breakpoint layouts from an lg layout sorted by (y, x).
// This prevents ReactGridLayout from auto-generating them in wrong order on mobile.
const buildResponsiveLayouts = (lgLayout: any[]): any => {
    // Sort lg layout by reading order: top-to-bottom, left-to-right
    const sorted = [...lgLayout].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

    return {
        lg: sorted,                          // 4 cols
        md: reflowLayout(sorted, 2),         // 2 cols
        sm: reflowLayout(sorted, 2),         // 2 cols
        xs: reflowLayout(sorted, 1),         // 1 col
        xxs: reflowLayout(sorted, 1),        // 1 col
    };
};

interface BentoGridProps {
    isEditable: boolean;
    publicUsername?: string;
}

export const BentoGrid = ({ isEditable, publicUsername }: BentoGridProps) => {
    const [widgets, setWidgets] = useState<WidgetData[]>([]);
    const [widgetToDelete, setWidgetToDelete] = useState<{ id: string, imageUrl?: string } | null>(null);
    const [layouts, setLayouts] = useState<any>({ lg: [] });
    const [isLoading, setIsLoading] = useState(true);

    const isRemoteUpdate = useRef(false);

    const gridBreakpoints = useMemo(() => ({
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 0,
    }), []);

    const gridCols = useMemo(() => ({
        lg: 4,
        md: 2,
        sm: 2,
        xs: 1,
        xxs: 1,
    }), []);

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

                    // Build all breakpoint layouts from the lg layout so mobile order always
                    // matches the desktop (y, x) reading order.
                    if (parsedLayouts && parsedLayouts.lg) {
                        setLayouts(buildResponsiveLayouts(parsedLayouts.lg));
                    } else {
                        setLayouts(parsedLayouts || {});
                    }
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
    const addWidgetButtonRef = useRef<HTMLButtonElement>(null);

    // State for Edit Widget Modal
    const [activeWidget, setActiveWidget] = useState<{ data: WidgetData, buttonRef: { current: HTMLElement | null } } | null>(null);

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

        // Explicitly add to all breakpoint layouts so mobile order always matches desktop.
        setLayouts((prev: any) => {
            const currentLg = prev.lg || [];
            const { x, y } = findNextAvailablePosition(currentLg, 4);
            const newItem = { i: id, x, y, w: 1, h: 1, minW: 1, minH: 1 };
            const newLg = [...currentLg, newItem];
            return buildResponsiveLayouts(newLg);
        });

        setIsAddModalOpen(false);
    };

    const addWidget = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const removeWidget = useCallback((id: string, imageUrl?: string) => {
        setWidgetToDelete({ id, imageUrl });
    }, []);

    const confirmDeleteWidget = useCallback(async () => {
        if (!widgetToDelete) return;

        const { id, imageUrl } = widgetToDelete;

        if (imageUrl) {
            try {
                await api.post('/upload/delete', { url: imageUrl });
            } catch (error) {
                console.error("Failed to delete image from Cloudinary:", error);
            }
        }
        setWidgets(prev => prev.filter(w => w.id !== id));

        // Also remove from layouts to trigger recompaction
        setLayouts((prev: any) => {
            const newLayouts: any = { ...prev };
            Object.keys(newLayouts).forEach(breakpoint => {
                if (newLayouts[breakpoint]) {
                    const filtered = newLayouts[breakpoint].filter((item: any) => item.i !== id);
                    const cols = gridCols[breakpoint as keyof typeof gridCols] ?? 4;
                    newLayouts[breakpoint] = reflowLayout(filtered, cols);
                }
            });
            return newLayouts;
        });

        setWidgetToDelete(null);
        toast.success("Widget deleted");
    }, [gridCols, widgetToDelete]);

    const updateWidget = useCallback((id: string, updates: Partial<WidgetData>) => {
        setWidgets((prev: WidgetData[]) => prev.map((w: WidgetData) =>
            w.id === id ? { ...w, ...updates } : w
        ));

        // Sync layout if size changes
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
                            if (updates.size === "3x1") { w = 3; h = 1; }
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

    const handleEditWidget = useCallback((data: WidgetData, buttonRef: { current: HTMLElement | null }) => {
        setActiveWidget({ data, buttonRef });
    }, []);

    const handleSaveEdit = (updates: Partial<WidgetData>) => {
        if (activeWidget) {
            updateWidget(activeWidget.data.id, updates);

            // If size changed, we update the layout for that item
            if (updates.size) {
                setLayouts((prev: any) => {
                    const newLayouts: any = { ...prev };

                    Object.keys(newLayouts).forEach(key => {
                        if (!newLayouts[key]) return;

                        newLayouts[key] = newLayouts[key].map((l: any) => {
                            if (l.i === activeWidget.data.id) {
                                let w = 1; let h = 1;
                                if (updates.size === "2x1") { w = 2; h = 1; }
                                if (updates.size === "1x2") { w = 1; h = 2; }
                                if (updates.size === "2x2") { w = 2; h = 2; }
                                if (updates.size === "3x1") { w = 3; h = 1; }
                                if (updates.size === "1x1") { w = 1; h = 1; }
                                return { ...l, w, h };
                            }
                            return l;
                        });
                    });

                    return newLayouts;
                });
            }

            setActiveWidget(null);
        }
    };




    // Helper to compare layouts
    const areLayoutsEqual = (layout1: any, layout2: any) => {
        if (!layout1 || !layout2) return false;
        if (Object.keys(layout1).length !== Object.keys(layout2).length) return false;

        for (const key of Object.keys(layout1)) {
            const l1 = layout1[key];
            const l2 = layout2[key];

            if (!l1 || !l2) return false;
            if (l1.length !== l2.length) return false;

            // Sort by id to ensure order doesn't matter
            const sortedL1 = [...l1].sort((a: any, b: any) => a.i.localeCompare(b.i));
            const sortedL2 = [...l2].sort((a: any, b: any) => a.i.localeCompare(b.i));

            for (let i = 0; i < sortedL1.length; i++) {
                const item1 = sortedL1[i];
                const item2 = sortedL2[i];

                if (
                    item1.i !== item2.i ||
                    item1.x !== item2.x ||
                    item1.y !== item2.y ||
                    item1.w !== item2.w ||
                    item1.h !== item2.h
                ) {
                    return false;
                }
            }
        }
        return true;
    };

    // Use a ref to track the previous layout to avoid infinite loops
    const layoutsRef = useRef<any>(layouts);

    // Update ref when layouts change
    useEffect(() => {
        layoutsRef.current = layouts;
    }, [layouts]);

    // Handle layout changes
    const handleLayoutChange = useCallback((_currentLayout: any, allLayouts: any) => {
        // Prevent infinite loops by checking if the layout actually changed
        if (!areLayoutsEqual(layoutsRef.current, allLayouts)) {
            setLayouts(allLayouts);
        }
    }, []); // Empty dependency array - uses ref instead

    // Update 'static' property using useMemo instead of useEffect to avoid render loops
    const derivedLayouts = useMemo(() => {
        const newLayouts = { ...layouts };
        Object.keys(newLayouts).forEach(key => {
            if (newLayouts[key]) {
                // Sort by (y, x) so 1-column mobile collapse always preserves left-to-right row order
                const sorted = [...newLayouts[key]].sort((a: any, b: any) =>
                    a.y !== b.y ? a.y - b.y : a.x - b.x
                );
                newLayouts[key] = sorted.map((item: any) => ({
                    ...item,
                    static: !isEditable
                }));
            }
        });
        return newLayouts;
    }, [layouts, isEditable]);

    // Skeleton Loading



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
                    {/* Empty State */}
                    {widgets.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-transparent dark:border-white/10 backdrop-blur-sm">
                                <span className="text-4xl">📦</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                                {isEditable ? "No widgets yet" : "Nothing to see here"}
                            </h2>
                            <p className="text-gray-500 dark:text-white/60 text-lg max-w-md mb-8">
                                {isEditable
                                    ? "Start building your BROTOTYPE grid by adding your first widget."
                                    : "This page doesn't have any widgets yet."}
                            </p>
                            {isEditable && (
                                <button
                                    onClick={addWidget}
                                    className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-3"
                                >
                                    <svg className="icon-neumorph" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add Your First Widget
                                </button>
                            )}
                        </div>
                    )}

                    {/* Grid Layout */}
                    {widgets.length > 0 && (
                        <ResponsiveGridLayout
                            className="layout"
                            layouts={derivedLayouts}
                            onLayoutChange={handleLayoutChange}
                            breakpoints={gridBreakpoints}
                            cols={gridCols}
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
                                            onEdit={handleEditWidget}
                                            isEditable={isEditable}
                                            ownerUsername={publicUsername || currentUserUsername || undefined}
                                        />
                                    </div>
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                    )}
                </div>
            </div>
            {/* Floating Add Button */}
            {isEditable && !isAddModalOpen && !activeWidget && (
                <motion.button
                    ref={addWidgetButtonRef}
                    onClick={addWidget}
                    className="btn-neumorph-icon fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] h-14 w-14 sm:h-16 sm:w-16 hover:scale-110 active:scale-95 duration-200 flex items-center justify-center"
                    title="Add New Widget"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                    <svg className="icon-neumorph" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </motion.button>
            )}


            {/* Add Widget Modal */}
            <WidgetEditorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleCreateWidget}
                buttonRef={addWidgetButtonRef}
                title="Add New Widget"
            />

            {/* Edit Widget Modal (Shared) */}
            {activeWidget && (
                <WidgetEditorModal
                    isOpen={!!activeWidget}
                    onClose={() => setActiveWidget(null)}
                    onSave={handleSaveEdit}
                    initialData={activeWidget.data}
                    buttonRef={activeWidget.buttonRef as any}
                    title="Edit Widget"
                />
            )}

            {/* Delete Confirmation Modal */}
            <Dialog open={!!widgetToDelete} onOpenChange={(open: boolean) => !open && setWidgetToDelete(null)}>
                <DialogContent className="sm:max-w-[400px] p-6 rounded-3xl border border-transparent dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#1c1b1e]/95 backdrop-blur-xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold tracking-tight text-center text-gray-900 dark:text-white">Delete Widget?</DialogTitle>
                        <DialogDescription className="text-center text-gray-500 dark:text-white/60 mt-2">
                            This action cannot be undone. This will permanently delete the widget from your grid.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-3 justify-center sm:justify-center w-full">
                        <button
                            onClick={() => setWidgetToDelete(null)}
                            className="flex-1 inline-flex items-center justify-center rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none disabled:opacity-50 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white h-11 px-4 shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteWidget}
                            className="flex-1 inline-flex items-center justify-center rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none disabled:opacity-50 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 h-11 px-4"
                        >
                            Delete
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
