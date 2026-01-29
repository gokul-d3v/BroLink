// ... imports
// ... imports
import { useState, useEffect, useCallback } from "react";
// Removed Cropper imports as they are now in WidgetEditorModal
// Removed api import (unused)
import { type LinkMetadata, fetchLinkMetadata } from "../api/mockMetadata";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Link as LinkIcon, AlertCircle, ArrowUpRight, Pencil, MoreHorizontal, Trash2, Github, Linkedin, Twitter, Youtube, Facebook, Instagram, Dribbble, Twitch } from "lucide-react";
import { Button } from "./ui/button";
// Removed Dialog imports
// Removed Label
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { cn } from "../lib/utils";
import { WidgetEditorModal } from "./WidgetEditorModal";

export interface WidgetData {
    id: string;
    size: "1x1" | "2x1" | "2x2" | "1x2";
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
    isEditable?: boolean;
}


const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('github')) return <Github className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) return <Twitter className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('linkedin')) return <Linkedin className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('youtube')) return <Youtube className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('facebook')) return <Facebook className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('instagram')) return <Instagram className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('dribbble')) return <Dribbble className="h-8 w-8 text-white" />;
    if (lowerUrl.includes('twitch')) return <Twitch className="h-8 w-8 text-white" />;
    return null;
};

export const LinkWidget = ({ data, onUpdate, onRemove, isEditable = false }: LinkWidgetProps) => {
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Local edit state for inline adding (first time URL input)
    const [editUrl, setEditUrl] = useState("");

    // Drag detection state
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

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

    const handleSaveEdit = (updates: Partial<WidgetData>) => {
        onUpdate(data.id, updates);
        if (updates.url && updates.url !== data.url) {
            setMetadata(null); // Trigger reload
        }
    };

    const resizeWidget = (newSize: "1x1" | "2x1" | "2x2" | "1x2") => {
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
    }[data.size];

    // If no URL is set, show Input State (Empty Widget)
    if (!data.url) {
        return (
            <div className={cn("bento-card group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50/50 transition-all duration-300", spanClass)}>
                <div className="w-full max-w-xs space-y-5 text-center">
                    <div className="mx-auto h-14 w-14 bg-white text-purple-600 rounded-xl flex items-center justify-center mb-1 shadow-sm ring-1 ring-black/5">
                        <LinkIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Add a Link</h3>
                        <p className="text-sm text-gray-500 font-medium">Paste a URL to create a card</p>
                    </div>
                    {isEditable && (
                        <>
                            <div className="relative">
                                <Input
                                    placeholder="brolink.me/inspirations"
                                    className="h-12 pl-11 bg-white border-gray-200 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all rounded-xl font-medium placeholder:text-gray-400"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && editUrl) {
                                            onUpdate(data.id, { url: editUrl });
                                        }
                                    }}
                                />
                                <LinkIcon className="absolute left-4 top-4 h-4 w-4 text-gray-500" />
                            </div>
                            <div className="flex justify-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setEditUrl('https://github.com/'); }} className="text-xs px-4 py-2 bg-white hover:bg-gray-50 hover:shadow-sm border border-gray-200 rounded-xl text-gray-600 font-semibold transition-all">Github</button>
                                <button onClick={(e) => { e.stopPropagation(); setEditUrl('https://youtube.com/'); }} className="text-xs px-4 py-2 bg-white hover:bg-gray-50 hover:shadow-sm border border-gray-200 rounded-xl text-gray-600 font-semibold transition-all">YouTube</button>
                            </div>
                            <div className="absolute top-4 right-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"
                                    onClick={() => onRemove(data.id, data.customImage)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
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
                        <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100" />
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
                                    (!((data.customImage || metadata?.image))) ? "items-center justify-center" : "justify-end items-start mb-2"
                                )}>
                                    {(!((data.customImage || metadata?.image))) ? (
                                        <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center shadow-lg ring-1 ring-black/5 group-hover:scale-110 transition-transform duration-300">
                                            {getSocialIcon(data.url) || (metadata?.favicon ? (
                                                <img src={metadata.favicon} alt="" className="h-8 w-8 object-contain drop-shadow-sm" />
                                            ) : (
                                                <LinkIcon className="h-6 w-6 text-black" />
                                            ))}
                                        </div>
                                    ) : (
                                        // Show title when there's an image
                                        <h3 className="font-bold leading-[1.05] text-white drop-shadow-lg text-2xl line-clamp-2 tracking-tight text-left">
                                            {data.customTitle || metadata?.title || ""}
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
                        className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-sm transition-colors ring-1 ring-white/10">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px] rounded-[24px] p-2 shadow-2xl border-gray-100 bg-white/95 backdrop-blur-lg">
                                {/* Size Options */}
                                <div className="px-3 py-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Widget Size</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => resizeWidget("1x1")} className={cn("aspect-square rounded-lg border-2 flex items-center justify-center transition-all", data.size === "1x1" ? "border-purple-600 bg-purple-50 text-purple-600" : "border-gray-100 hover:border-gray-200 text-gray-300")}>
                                            <div className="w-2.5 h-2.5 bg-current rounded-[1px]" />
                                        </button>
                                        <button onClick={() => resizeWidget("2x1")} className={cn("aspect-video rounded-lg border-2 flex items-center justify-center transition-all col-span-2", data.size === "2x1" ? "border-purple-600 bg-purple-50 text-purple-600" : "border-gray-100 hover:border-gray-200 text-gray-300")}>
                                            <div className="w-5 h-2.5 bg-current rounded-[1px]" />
                                        </button>
                                        <button onClick={() => resizeWidget("2x2")} className={cn("aspect-square rounded-lg border-2 flex items-center justify-center transition-all col-span-2 row-span-2", data.size === "2x2" ? "border-purple-600 bg-purple-50 text-purple-600" : "border-gray-100 hover:border-gray-200 text-gray-300")}>
                                            <div className="w-5 h-5 bg-current rounded-[1px]" />
                                        </button>
                                        <button onClick={() => resizeWidget("1x2")} className={cn("aspect-[1/2] rounded-lg border-2 flex items-center justify-center transition-all row-span-2", data.size === "1x2" ? "border-purple-600 bg-purple-50 text-purple-600" : "border-gray-100 hover:border-gray-200 text-gray-300")}>
                                            <div className="w-2.5 h-5 bg-current rounded-[1px]" />
                                        </button>
                                    </div>
                                </div>
                                <DropdownMenuSeparator className="bg-gray-100/50 my-1" />
                                <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 text-gray-600 font-medium transition-colors">
                                    <Pencil className="mr-2.5 h-4 w-4 text-gray-400" /> Edit Content
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRemove(data.id, data.customImage)} className="rounded-xl cursor-pointer py-2.5 px-3 text-red-500 focus:text-red-600 focus:bg-red-50 font-medium transition-colors">
                                    <Trash2 className="mr-2.5 h-4 w-4" /> Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                {/* External Link Indicator */}
                <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 text-white shadow-sm ring-1 ring-white/10">
                        <ArrowUpRight className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Reusable Widget Editor Modal */}
            <WidgetEditorModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={handleSaveEdit}
                initialData={data}
            />
        </>
    );
};
