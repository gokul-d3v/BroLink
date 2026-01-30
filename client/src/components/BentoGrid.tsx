import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";

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

        // Explicitly add to layout to prevent alignment issues
        setLayouts((prev: any) => {
            const currentLayout = prev.lg || [];

            // Smart Placement: Find first available spot
            const { x, y } = findNextAvailablePosition(currentLayout, 4);

            const newItem = {
                i: id,
                x,
                y,
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
                    newLayouts[breakpoint] = newLayouts[breakpoint].filter((item: any) => item.i !== id);
                }
            });
            return newLayouts;
        });

        setWidgetToDelete(null);
    }, [widgetToDelete]);

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

    const autoArrangeWidgets = useCallback(() => {
        setLayouts((prev: any) => {
            const newLayouts: any = { ...prev };

            // Auto-arrange for each breakpoint
            Object.keys(newLayouts).forEach(breakpoint => {
                if (!newLayouts[breakpoint]) return;

                const cols = breakpoint === 'lg' || breakpoint === 'md' ? 4 : breakpoint === 'sm' || breakpoint === 'xs' ? 2 : 1;
                let currentX = 0;
                let currentY = 0;

                // Sort by original position (y, then x) to maintain relative order
                const sortedItems = [...newLayouts[breakpoint]].sort((a: any, b: any) => {
                    if (a.y !== b.y) return a.y - b.y;
                    return a.x - b.x;
                });

                newLayouts[breakpoint] = sortedItems.map((item: any) => {
                    const width = item.w;

                    // If widget doesn't fit in current row, move to next row
                    if (currentX + width > cols) {
                        currentX = 0;
                        currentY++;
                    }

                    const newItem = {
                        ...item,
                        x: currentX,
                        y: currentY
                    };

                    currentX += width;

                    // Move to next row if we've filled this one
                    if (currentX >= cols) {
                        currentX = 0;
                        currentY++;
                    }

                    return newItem;
                });
            });

            return newLayouts;
        });
    }, []);

    // Auto-arrange widgets whenever the widget list changes
    useEffect(() => {
        if (widgets.length > 0 && !isLoading) {
            // Small delay to ensure layout state is ready
            const timer = setTimeout(() => {
                autoArrangeWidgets();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [widgets.length, autoArrangeWidgets, isLoading]);


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
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                                <span className="text-4xl">📦</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
                                {isEditable ? "No widgets yet" : "Nothing to see here"}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mb-8">
                                {isEditable
                                    ? "Start building your Brototype grid by adding your first widget."
                                    : "This page doesn't have any widgets yet."}
                            </p>
                            {isEditable && (
                                <button
                                    onClick={addWidget}
                                    className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-3"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 4, md: 4, sm: 2, xs: 2, xxs: 1 }}
                            rowHeight={280}
                            isDraggable={isEditable}
                            isResizable={false}
                            compactType="horizontal"
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
                                        />
                                    </div>
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                    )}
                </div>
            </div>
            {/* Floating Add Button */}
            {isEditable && !isAddModalOpen && (
                <motion.button
                    ref={addWidgetButtonRef}
                    onClick={addWidget}
                    className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] h-14 w-14 sm:h-16 sm:w-16 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-110 active:scale-95 transition-all duration-200"
                    title="Add New Widget"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            <Dialog open={!!widgetToDelete} onOpenChange={(open) => !open && setWidgetToDelete(null)}>
                <DialogContent className="sm:max-w-[400px] p-6 rounded-3xl border-none shadow-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold tracking-tight text-center">Delete Widget?</DialogTitle>
                        <DialogDescription className="text-center text-gray-500 dark:text-gray-400 mt-2">
                            This action cannot be undone. This will permanently delete the widget from your grid.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-3 justify-center sm:justify-center w-full">
                        <button
                            onClick={() => setWidgetToDelete(null)}
                            className="flex-1 inline-flex items-center justify-center rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none disabled:opacity-50 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 h-11 px-4 shadow-sm"
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
