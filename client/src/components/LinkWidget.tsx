import { useState, useEffect, useRef, useCallback } from "react";
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import api from "../lib/api";
import { type LinkMetadata, fetchLinkMetadata } from "../api/mockMetadata";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Link as LinkIcon, AlertCircle, ArrowUpRight, Pencil, MoreHorizontal, Trash2, Github, Linkedin, Twitter, Youtube, Facebook, Instagram, Dribbble, Twitch, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { cn } from "../lib/utils";

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
    onRemove: (id: string) => void;
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

    // Local edit states
    const [editTitle, setEditTitle] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editThumbnail, setEditThumbnail] = useState("");
    const [editCtaText, setEditCtaText] = useState("");
    const [editImageFit, setEditImageFit] = useState<"cover" | "contain">("cover");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop states
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropSave = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const formData = new FormData();
            formData.append('file', croppedBlob, 'cropped-image.jpg');

            const response = await api.post('/upload', formData);
            setEditThumbnail(response.data.url);
            setIsCropModalOpen(false);
            setImageToCrop(null);
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

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

    const openEdit = () => {
        setEditTitle(data.customTitle || metadata?.title || "");
        setEditUrl(data.url);
        setEditThumbnail(data.customImage || "");
        setEditCtaText(data.ctaText || "");
        setEditImageFit(data.imageFit || "cover");
        setIsEditOpen(true);
    };

    const saveEdit = () => {
        onUpdate(data.id, {
            customTitle: editTitle,
            url: editUrl !== data.url ? editUrl : data.url,
            customImage: editThumbnail,
            ctaText: editCtaText,
            imageFit: editImageFit
        });
        setIsEditOpen(false);
        if (editUrl !== data.url) {
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
                                    onClick={() => onRemove(data.id)}
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
                {/* Controls Overlay */}
                {isEditable && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/40 hover:bg-white/80 shadow-sm backdrop-blur-sm" onClick={() => onRemove(data.id)}>
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
                {isEditable && (
                    <div
                        className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-auto"
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
                                <DropdownMenuItem onClick={openEdit} className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 text-gray-600 font-medium transition-colors">
                                    <Pencil className="mr-2.5 h-4 w-4 text-gray-400" /> Edit Content
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRemove(data.id)} className="rounded-xl cursor-pointer py-2.5 px-3 text-red-500 focus:text-red-600 focus:bg-red-50 font-medium transition-colors">
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

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[420px] p-0 gap-0 rounded-xl overflow-hidden border-none shadow-2xl bg-[#fafafa]">
                    <DialogHeader className="p-6 pb-2 bg-white">
                        <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Edit Widget</DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-5 bg-white max-h-[70vh] overflow-y-auto">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Title</Label>
                            <Input
                                id="title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Display title"
                                className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-purple-500/20 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium text-lg px-4"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="url" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Link URL</Label>
                            <div className="relative">
                                <LinkIcon className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                                <Input
                                    id="url"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="h-12 pl-10 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-purple-500/20 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Thumbnail Input */}
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Thumbnail Image</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="thumbnail"
                                    value={editThumbnail}
                                    onChange={(e) => setEditThumbnail(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-purple-500/20 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium text-gray-600 px-4"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 shrink-0 rounded-xl border-gray-200 bg-gray-50 hover:bg-white transition-all shadow-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload Image"
                                >
                                    <Upload className="h-5 w-5 text-gray-500" />
                                </Button>
                            </div>
                        </div>

                        {/* Image Fit Toggle */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Image Fit</Label>
                            <div className="flex gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditImageFit("cover")}
                                    className={cn("flex-1 rounded-xl font-semibold transition-all", editImageFit === "cover" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-gray-600")}
                                >
                                    Fill (Cover)
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditImageFit("contain")}
                                    className={cn("flex-1 rounded-xl font-semibold transition-all", editImageFit === "contain" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-gray-600")}
                                >
                                    Fit (Contain)
                                </Button>
                            </div>
                        </div>

                        {/* CTA Input */}
                        <div className="space-y-2">
                            <Label htmlFor="cta" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Button Label (CTA)</Label>
                            <Input
                                id="cta"
                                value={editCtaText}
                                onChange={(e) => setEditCtaText(e.target.value)}
                                placeholder="e.g. Read More, Buy Now"
                                className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-purple-500/20 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium text-gray-600 px-4"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm font-semibold">Cancel</Button>
                        <Button onClick={saveEdit} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg shadow-black/10">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Crop Modal */}
            <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-xl overflow-hidden border-none shadow-2xl bg-[#fafafa]">
                    <DialogHeader className="p-6 pb-2 bg-white flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Crop Image</DialogTitle>
                    </DialogHeader>

                    <div className="relative h-[400px] w-full bg-black/5">
                        {imageToCrop && (
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>

                    <div className="p-6 bg-white space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Zoom</Label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-semibold">Cancel</Button>
                            <Button onClick={handleCropSave} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-black/10">Sets Image</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
