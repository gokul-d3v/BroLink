import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import api from "../lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Link as LinkIcon, Upload, X } from "lucide-react";
import { cn } from "../lib/utils";
import type { WidgetData } from "./LinkWidget";

interface WidgetEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<WidgetData>) => void;
    initialData?: Partial<WidgetData>;
    title?: string; // "Edit Widget" or "Add Widget"
    buttonRef?: React.RefObject<HTMLButtonElement | null>; // Reference to the Add Widget button for genie effect
}

export const WidgetEditorModal = ({ isOpen, onClose, onSave, initialData = {}, buttonRef, title }: WidgetEditorModalProps) => {
    // Local edit states
    const [editTitle, setEditTitle] = useState(initialData.customTitle || "");
    const [editUrl, setEditUrl] = useState(initialData.url || "");
    const [editThumbnail, setEditThumbnail] = useState(initialData.customImage || "");
    const [editCtaText, setEditCtaText] = useState(initialData.ctaText || "");
    const [urlError, setUrlError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop states
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const rawFileRef = useRef<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Track previous isOpen state to detect modal opening
    const prevIsOpenRef = useRef(isOpen);

    // Reset state ONLY when modal transitions from closed to open
    useEffect(() => {
        const justOpened = isOpen && !prevIsOpenRef.current;

        if (justOpened) {
            setEditTitle(initialData.customTitle || "");
            setEditUrl(initialData.url || "");
            setEditThumbnail(initialData.customImage || "");
            setEditCtaText(initialData.ctaText || "");
            setUrlError("");
        }

        prevIsOpenRef.current = isOpen;
    }, [isOpen, initialData.customTitle, initialData.url, initialData.customImage, initialData.ctaText]);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
            image.src = url;
        });

    const formatBytes = (bytes: number) => {
        if (!bytes) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, index);
        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
    };

    const extensionForMime = (mime: string) => {
        switch (mime) {
            case "image/png":
                return "png";
            case "image/webp":
                return "webp";
            case "image/jpeg":
            case "image/jpg":
                return "jpg";
            default:
                return "jpg";
        }
    };

    const buildUploadName = (original: File | null, blob: Blob, fallbackBase: string) => {
        if (blob instanceof File && blob.name) {
            return blob.name;
        }
        const base = original?.name ? original.name.replace(/\.[^/.]+$/, "") : fallbackBase;
        const ext = extensionForMime(blob.type);
        return `${base}.${ext}`;
    };

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
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert("Please upload a valid image file (JPEG, PNG, WEBP, etc.)");
                return;
            }

            rawFileRef.current = file;
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // Lightweight client-side compression (keeps quality, caps longest edge)
    const compressImage = async (file: Blob, maxSize = 1400, quality = 0.82): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const originalSize = file.size || 0;
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                let { width, height } = img;
                const shouldResize = width > maxSize || height > maxSize;
                if (!shouldResize) {
                    URL.revokeObjectURL(url);
                    return resolve(file);
                }
                const scale = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    return reject(new Error('No canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob) {
                        return reject(new Error('Compression failed'));
                    }

                    const finalize = (finalBlob: Blob, note?: string) => {
                        if (originalSize > 0) {
                            const ratio = finalBlob.size / originalSize;
                            console.info(
                                `[image] compressed ${formatBytes(originalSize)} -> ${formatBytes(finalBlob.size)} (${Math.round(ratio * 100)}%)${note ? ` ${note}` : ""}`
                            );
                        }
                        resolve(finalBlob);
                    };

                    if (originalSize > 0) {
                        const ratio = blob.size / originalSize;
                        if (ratio >= 0.95) {
                            const fallbackQuality = Math.max(quality - 0.15, 0.6);
                            if (fallbackQuality < quality) {
                                canvas.toBlob((second) => {
                                    if (second) {
                                        return finalize(second, "(re-encoded)");
                                    }
                                    finalize(blob);
                                }, 'image/jpeg', fallbackQuality);
                                return;
                            }
                        }
                    }

                    finalize(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(error);
            };
            img.src = url;
        });
    };

    const handleCropSave = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        try {
            setIsUploading(true);
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const compressed = await compressImage(croppedBlob);
            const formData = new FormData();
            formData.append('file', compressed, buildUploadName(null, compressed, "cropped-image"));

            const response = await api.post('/upload', formData);
            setEditThumbnail(response.data.url);
            setIsCropModalOpen(false);
            setImageToCrop(null);
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUseOriginal = async () => {
        if (!rawFileRef.current) return;
        try {
            setIsUploading(true);
            const compressed = await compressImage(rawFileRef.current);
            const formData = new FormData();
            formData.append('file', compressed, buildUploadName(rawFileRef.current, compressed, "upload"));

            const response = await api.post('/upload', formData);
            setEditThumbnail(response.data.url);
            setIsCropModalOpen(false);
            setImageToCrop(null);
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = () => {
        // Validation
        if (!editUrl || editUrl.trim() === "") {
            setUrlError("URL is required");
            return;
        }

        if (!/^https?:\/\//i.test(editUrl)) {
            setUrlError("URL must start with http:// or https://");
            return;
        }
        setUrlError("");

        onSave({
            customTitle: editTitle,
            url: editUrl,
            customImage: editThumbnail,
            ctaText: editCtaText
        });
        onClose();
    };



    // Calculate initial position offset from button to modal center
    const getInitialOffset = () => {
        if (!buttonRef?.current) return { x: 0, y: 0 };

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Button center position
        const buttonCenterX = buttonRect.left + buttonRect.width / 2;
        const buttonCenterY = buttonRect.top + buttonRect.height / 2;

        // Modal center position (centered in viewport)
        const modalCenterX = windowWidth / 2;
        const modalCenterY = windowHeight / 2;

        // Calculate offset
        return {
            x: buttonCenterX - modalCenterX,
            y: buttonCenterY - modalCenterY
        };
    };

    return (
        <>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 pt-20 sm:p-4" style={{ perspective: "2000px" }}>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/80"
                        />

                        {/* Modal Content with Optimized Genie Effect */}
                        <motion.div
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-[800px] bg-[#F8F9FB] dark:bg-black overflow-hidden rounded-[20px] sm:rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 max-h-[80dvh] sm:max-h-[90vh] flex flex-col"
                            style={{
                                transformStyle: "preserve-3d",
                                willChange: "transform, opacity"
                            }}
                            initial={{
                                scale: 0.08,
                                scaleY: 0.03,
                                opacity: 0,
                                rotateX: 75,
                                x: getInitialOffset().x,
                                y: getInitialOffset().y
                            }}
                            animate={{
                                scale: 1,
                                scaleY: 1,
                                opacity: 1,
                                rotateX: 0,
                                x: 0,
                                y: 0
                            }}
                            exit={{
                                scale: 0.08,
                                scaleY: 0.03,
                                opacity: 0,
                                rotateX: 75,
                                x: getInitialOffset().x,
                                y: getInitialOffset().y,
                                transition: {
                                    duration: 0.35,
                                    ease: [0.32, 0, 0.67, 0]
                                }
                            }}
                            transition={{
                                type: "spring",
                                damping: 22,
                                stiffness: 220,
                                mass: 0.75,
                                restDelta: 0.001,
                                restSpeed: 0.001
                            }}
                        >
                            {/* Header */}
                            <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-3 sm:pb-4 bg-white/80 dark:bg-black backdrop-blur-md border-b border-gray-100 dark:border-white/10 sticky top-0 z-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title || "Add New Widget"}</h2>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-gray-400 hover:bg-gray-100 dark:hover:bg-black/80 transition-colors">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                            {/* Form Content */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto bg-[#F2F2F7] dark:bg-black flex-1">
                                {/* Top Row: Title/URL (2/3) + Thumbnail (1/3) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                    {/* Left Column: Title & URL */}
                                    <div className="md:col-span-2 bg-white dark:bg-black rounded-[18px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                                        <div className="flex flex-col">
                                            <div className="relative group px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-white/10">
                                                <Label htmlFor="title" className="text-[11px] font-medium text-gray-500 dark:text-white uppercase tracking-wide">
                                                    Title
                                                </Label>
                                                <Input
                                                    id="title"
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    placeholder="Display title"
                                                    className="h-8 -ml-3 w-[calc(100%+1.5rem)] border-none shadow-none focus-visible:ring-0 bg-transparent text-[15px] font-normal text-gray-900 dark:text-white placeholder:text-gray-400 px-3"
                                                />
                                            </div>

                                            <div className="relative group px-4 sm:px-5 py-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <Label htmlFor="url" className="text-[11px] font-medium text-gray-500 dark:text-white uppercase tracking-wide">
                                                        Link URL <span className="text-red-500">*</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <LinkIcon className="h-3.5 w-3.5 text-black dark:text-white flex-shrink-0" />
                                                    <Input
                                                        id="url"
                                                        type="url"
                                                        required
                                                        value={editUrl}
                                                        onChange={(e) => {
                                                            setEditUrl(e.target.value);
                                                            if (urlError) setUrlError("");
                                                        }}
                                                        placeholder="https://..."
                                                        className={cn(
                                                            "h-8 -ml-3 w-full border-none shadow-none focus-visible:ring-0 bg-transparent text-[15px] font-normal text-gray-900 dark:text-white placeholder:text-gray-400 px-3",
                                                            urlError && "text-red-500"
                                                        )}
                                                    />
                                                </div>
                                                {urlError && (
                                                    <p className="text-xs text-red-500 mt-1 ml-6">{urlError}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Thumbnail */}
                                    <div className="md:col-span-1 bg-white dark:bg-black rounded-[18px] p-4 sm:p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col h-full">
                                        <Label className="text-[11px] font-medium text-gray-500 dark:text-white uppercase tracking-wide mb-3">
                                            Thumbnail
                                        </Label>

                                        <div className="flex-1 flex flex-col gap-3">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 min-h-[120px] rounded-xl overflow-hidden relative group cursor-pointer bg-gray-50 dark:bg-black transition-all hover:opacity-90 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10"
                                            >
                                                {editThumbnail ? (
                                                    <img src={editThumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-black shadow-sm flex items-center justify-center text-black dark:text-white">
                                                            <Upload className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-xs text-gray-400">Add Image</p>
                                                    </div>
                                                )}

                                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-black/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full">Edit</div>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-black rounded-[18px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden">
                                    <div className="px-4 sm:px-5 py-2">
                                        <Label htmlFor="cta" className="text-[11px] font-medium text-gray-500 dark:text-white uppercase tracking-wide">
                                            Button Label
                                        </Label>
                                        <Input
                                            id="cta"
                                            type="text"
                                            value={editCtaText}
                                            onChange={(e) => setEditCtaText(e.target.value)}
                                            placeholder="e.g. Visit Website"
                                            className="h-10 -ml-3 w-[calc(100%+1.5rem)] border-none shadow-none focus-visible:ring-0 bg-transparent text-[15px] font-normal text-gray-900 dark:text-white placeholder:text-gray-400 px-3"
                                        />
                                    </div>
                                </div>
                            </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 sm:p-5 bg-white/80 dark:bg-black backdrop-blur-md border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 z-10">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="text-[15px] font-medium text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-black/80 rounded-full px-4 sm:px-6"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="px-5 py-2.5 rounded-full font-medium shadow-lg transition-all bg-black dark:bg-black text-white dark:text-white hover:bg-gray-800 dark:hover:bg-black/80 flex items-center gap-2"
                                >
                                    Save
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Crop Modal */}
            <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white dark:bg-black">
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Crop Image</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 dark:text-white mt-1">Adjust the crop area and zoom</DialogDescription>
                    </div>

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

                        <div className="flex gap-3 flex-col sm:flex-row">
                            <div className="flex flex-1 gap-2">
                                <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-semibold" disabled={isUploading}>Cancel</Button>
                                <Button
                                    variant="outline"
                                    onClick={handleUseOriginal}
                                    className="flex-1 h-12 rounded-xl font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-sm dark:border-white/15 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                                    disabled={isUploading}
                                >
                                    Use without crop
                                </Button>
                            </div>
                            <Button onClick={handleCropSave} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-black/10" disabled={isUploading}>
                                {isUploading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Uploading...</span>
                                    </div>
                                ) : (
                                    "Set Image"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
