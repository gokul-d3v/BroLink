// ... imports
// ... imports
import { useState, useEffect, useCallback, useRef } from "react";
// Removed Cropper imports as they are now in WidgetEditorModal
// Removed api import (unused)
import { type LinkMetadata, fetchLinkMetadata } from "../api/mockMetadata";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Link as LinkIcon, AlertCircle, ArrowUpRight, Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
// Removed Dialog imports
// Removed Label
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { cn } from "../lib/utils";

export interface WidgetData {
    id: string;
    size: "1x1" | "2x1" | "2x2" | "1x2" | "3x1";
    url: string;
    customTitle?: string;
    customImage?: string;
    ctaText?: string;
    imageFit?: "cover" | "contain";
    isWide?: boolean;
}

interface LinkWidgetProps {
    data: WidgetData;
    onUpdate: (id: string, updates: Partial<WidgetData>) => void;
    onRemove: (id: string, imageUrl?: string) => void;
    onEdit: (data: WidgetData, buttonRef: { current: HTMLElement | null }) => void;
    isEditable?: boolean;
}




export const LinkWidget = ({ data, onUpdate, onRemove, onEdit, isEditable = false }: LinkWidgetProps) => {
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);



    // Drag detection state
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const editButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (data.url && !metadata && !loading && !error) {
            loadMetadata(data.url);
        }
    }, [data.url, metadata, loading, error]);

    const loadMetadata = useCallback(async (urlToFetch: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchLinkMetadata(urlToFetch);
            setMetadata(result);
        } catch (err) {
            setError("Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);



    const resizeWidget = (newSize: "1x1" | "2x1" | "2x2" | "1x2" | "3x1") => {
        onUpdate(data.id, { size: newSize });
    }

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditable) return; // Disable drag start if not editable
        setStartPos({ x: e.clientX, y: e.clientY });
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isEditable) return;
        const moveX = Math.abs(e.clientX - startPos.x);
        const moveY = Math.abs(e.clientY - startPos.y);
        if (moveX > 5 || moveY > 5) {
            setIsDragging(true);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging && data.url) {
            window.open(data.url, "_blank", "noopener,noreferrer");
        }
    };

    // Determine span classes
    const spanClass = {
        "1x1": "col-span-1 row-span-1",
        "2x1": "col-span-1 md:col-span-2 row-span-1",
        "2x2": "col-span-1 md:col-span-2 row-span-2",
        "1x2": "col-span-1 row-span-2",
        "3x1": "col-span-1 md:col-span-3 row-span-1",
    }[data.size];


    // Dynamic title size based on widget size
    const titleSizeClass = data.size === "1x1" ? "text-lg" : "text-xl md:text-2xl";
    // If no URL is set, show Input State (Empty Widget)
    if (!data.url) {
        return (
            <div
                className={cn(
                    "bento-card group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50/50 transition-all duration-300",
                    spanClass,
                    isEditable && "cursor-pointer hover:bg-gray-100/50"
                )}
                onClick={(e) => {
                    if (isEditable) {
                        onEdit(data, { current: e.currentTarget });
                    }
                }}
            >
                <div className="w-full max-w-xs space-y-5 text-center">
                    <div className="mx-auto h-14 w-14 bg-white text-purple-600 rounded-xl flex items-center justify-center mb-1 shadow-sm ring-1 ring-black/5">
                        <LinkIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Add a Link</h3>
                        <p className="text-sm text-gray-500 font-medium">Click to create a card</p>
                    </div>
                </div>

                {isEditable && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(data.id, data.customImage);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Loading State
    if (loading) {
        return (
            <Card className={cn("bento-card border-none bg-white p-0 shadow-sm overflow-hidden relative h-full w-full", spanClass)}>
                <Skeleton className="h-full w-full bg-gray-100 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shim" />
            </Card>
        );
    }

    // Error State
    if (error) {
        return (
            <div className={cn("bg-red-50/30 backdrop-blur-md rounded-xl p-6 flex flex-col items-center justify-center text-center relative group", spanClass)}>
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-red-600 font-medium">Broken Link</p>
                <p className="text-xs text-red-400/80 mb-4">{error}</p>
                {isEditable && (
                    <Button variant="outline" size="sm" onClick={() => onUpdate(data.id, { url: "" })} className="bg-white/50 hover:bg-red-50 border-red-200 text-red-600">
                        Edit Link
                    </Button>
                )}
                {isEditable && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/40 hover:bg-white/80 shadow-sm backdrop-blur-sm" onClick={() => onRemove(data.id, data.customImage)}>
                            <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <div
                role="button"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => { }}
                onClick={handleClick}
                className={cn(
                    "bento-card group block cursor-pointer h-full w-full",
                    // Lift effect handled by bento-card:hover
                    // "hover:scale-[1.01] active:scale-[0.99]", // Handled by CSS
                )}
            >
                {/* Background Image / Color */}
                <div className="absolute inset-0 z-0">
                    {(data.customImage || metadata?.image) ? (
                        <>
                            <img
                                src={data.customImage || metadata?.image}
                                alt={data.customTitle || metadata?.title}
                                draggable={false}
                                className={cn(
                                    "h-full w-full",
                                    data.imageFit === "contain" ? "object-contain bg-black/5" : "object-cover"
                                )}
                            />
                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60 opacity-80" />
                        </>
                    ) : (
                        // Fallback generic gradient if no image
                        <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900" />
                    )}
                </div>

                {/* Content Overlay */}
                <div className={cn(
                    "absolute inset-0 z-10 p-6 flex flex-col pointer-events-none select-none justify-end"
                )}>
                    <div className="transform transition-transform duration-300 w-full translate-y-2 group-hover:translate-y-0">
                        {/* 1x1 Layout: Icon/Title at top, button at absolute bottom */}
                        {data.size === "1x1" ? (
                            <div className="flex flex-col h-full">
                                {/* Content area - takes available space */}
                                <div className={cn(
                                    "flex-1 flex flex-col",
                                    "justify-end items-start mb-2"
                                )}>
                                    {/* Show title when available */}
                                    {(data.customTitle || metadata?.title) && (
                                        <h3 className="font-bold leading-[1.05] text-white drop-shadow-lg text-2xl line-clamp-2 tracking-tight text-left">
                                            {data.customTitle || metadata?.title}
                                        </h3>
                                    )}
                                </div>
                                {/* Button - always at bottom */}
                                <div className="flex">
                                    <button className="relative bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.4)] hover:bg-white/20 hover:scale-105 active:scale-95 transition-all overflow-hidden group/btn border border-white/20">
                                        <span className="relative z-10 flex items-center justify-center gap-1 drop-shadow-md">
                                            {data.ctaText || "Visit"}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </span>
                                        {/* Inner light glow */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-60" />
                                        {/* Shimmer */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Standard Layout (Wide/Large/Tall)
                            <div className="flex flex-col gap-4 h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 opacity-90">
                                        <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 overflow-hidden shadow-sm ring-1 ring-white/10">
                                            {metadata?.favicon ? (
                                                <img src={metadata.favicon} alt="" className="h-5 w-5 object-contain" />
                                            ) : (
                                                <LinkIcon className="h-4 w-4 text-white" />
                                            )}
                                        </div>
                                        <span className="text-xs font-bold tracking-wide text-white/95 drop-shadow-md uppercase">
                                            {metadata?.domain || "LINK"}
                                        </span>
                                    </div>
                                    <h3 className="font-bold leading-[1.05] text-white drop-shadow-lg text-3xl line-clamp-2 tracking-tight text-left">
                                        {data.customTitle || metadata?.title || "Untitled Link"}
                                    </h3>
                                </div>

                                {/* Liquid Glass CTA Button - Bottom Aligned */}
                                <div className="mt-auto pb-0">
                                    <button className="relative bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.4)] hover:bg-white/20 hover:scale-105 active:scale-95 transition-all overflow-hidden group/btn border border-white/20">
                                        <span className="relative z-10 flex items-center justify-center gap-1 drop-shadow-md">
                                            {data.ctaText || "Visit Page"}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </span>
                                        {/* Inner light glow */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-60" />
                                        {/* Shimmer */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit/Controls Overlay - Only in Edit Mode */}
                {/* FIXED: Visibility for Mobile - opacity-100 by default, sm:opacity-0 */}
                {isEditable && (
                    <div
                        className="absolute top-4 right-4 z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/40 hover:bg-white/80 backdrop-blur-sm shadow-sm transition-all focus:ring-0">
                                    <MoreHorizontal className="h-4 w-4 text-gray-700" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl">
                                <div className="grid grid-cols-3 gap-2 mb-2 p-1">
                                    <button onClick={() => resizeWidget("1x1")} className={cn("aspect-square rounded-md flex items-center justify-center transition-all duration-200 col-span-1", data.size === "1x1" ? "bg-black text-white shadow-md scale-100" : "bg-gray-100/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105")}>
                                        <div className="w-3 h-3 bg-current rounded-[1px] opacity-90" />
                                    </button>
                                    <button onClick={() => resizeWidget("2x1")} className={cn("aspect-[2/1] rounded-md flex items-center justify-center transition-all duration-200 col-span-2", data.size === "2x1" ? "bg-black text-white shadow-md scale-100" : "bg-gray-100/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105")}>
                                        <div className="w-6 h-3 bg-current rounded-[1px] opacity-90" />
                                    </button>
                                    <button onClick={() => resizeWidget("1x2")} className={cn("aspect-[1/2] rounded-md flex items-center justify-center transition-all duration-200 col-span-1", data.size === "1x2" ? "bg-black text-white shadow-md scale-100" : "bg-gray-100/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105")}>
                                        <div className="w-3 h-6 bg-current rounded-[1px] opacity-90" />
                                    </button>

                                    <button onClick={() => resizeWidget("2x2")} className={cn("aspect-square rounded-md flex items-center justify-center transition-all duration-200 col-span-2", data.size === "2x2" ? "bg-black text-white shadow-md scale-100" : "bg-gray-100/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105")}>
                                        <div className="w-5 h-5 bg-current rounded-[1px] opacity-90" />
                                    </button>

                                    <button onClick={() => resizeWidget("3x1")} className={cn("aspect-[3/1] rounded-md flex items-center justify-center transition-all duration-200 col-span-3", data.size === "3x1" ? "bg-black text-white shadow-md scale-100" : "bg-gray-100/50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105")}>
                                        <div className="w-9 h-3 bg-current rounded-[1px] opacity-90" />
                                    </button>
                                </div>
                                <DropdownMenuSeparator className="bg-gray-200/50 my-2" />
                                <DropdownMenuItem onClick={() => onEdit(data, editButtonRef)} className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-100/80 focus:text-gray-900 text-gray-600 font-medium transition-colors">
                                    <Pencil className="mr-2.5 h-4 w-4 text-gray-400" /> Edit Content
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRemove(data.id, data.customImage)} className="rounded-xl cursor-pointer py-2.5 px-3 text-red-500 focus:text-red-600 focus:bg-red-50 font-medium transition-colors">
                                    <Trash2 className="mr-2.5 h-4 w-4 opacity-80" /> Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent >
                        </DropdownMenu >
                    </div >
                )}

                {/* External Link Indicator */}
                <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 text-white shadow-sm ring-1 ring-white/10">
                        <ArrowUpRight className="h-4 w-4" />
                    </div>
                </div>
            </div >
        </>
    );
};
