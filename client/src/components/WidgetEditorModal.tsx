import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import api from "../lib/api";
import { fetchLinkMetadata } from "../api/mockMetadata";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
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
}

export const WidgetEditorModal = ({ isOpen, onClose, onSave, initialData = {} }: WidgetEditorModalProps) => {
    // Local edit states
    const [editTitle, setEditTitle] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editThumbnail, setEditThumbnail] = useState("");
    const [editCtaText, setEditCtaText] = useState("");
    const [editImageFit, setEditImageFit] = useState<"cover" | "contain">("cover");
    const [urlError, setUrlError] = useState("");
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
    const [lastFetchedUrl, setLastFetchedUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop states
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
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
            setEditImageFit(initialData.imageFit || "cover");
            setUrlError("");
            setLastFetchedUrl("");
        }

        prevIsOpenRef.current = isOpen;
    }, [isOpen, initialData.customTitle, initialData.url, initialData.customImage, initialData.ctaText, initialData.imageFit]);

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

            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // Auto-fetch metadata effect
    useEffect(() => {
        const fetchMeta = async () => {
            if (!editUrl || editUrl === lastFetchedUrl || !/^https?:\/\//i.test(editUrl)) return;

            // Only auto-fetch if we don't have a custom image yet (or if we want to update it - user choice usually better if only empty)
            // But user asked: "if i dont add image ... generate image"
            if (editThumbnail) return;

            try {
                setIsFetchingMetadata(true);
                setLastFetchedUrl(editUrl); // Prevent refetching same URL loop

                const meta = await fetchLinkMetadata(editUrl);
                if (meta.image) {
                    setEditThumbnail(meta.image);
                }
                if (!editTitle && meta.title) {
                    setEditTitle(meta.title);
                }
            } catch (e) {
                console.error("Auto-fetch error", e);
            } finally {
                setIsFetchingMetadata(false);
            }
        };

        const timer = setTimeout(fetchMeta, 800); // 800ms debounce
        return () => clearTimeout(timer);
    }, [editUrl, editThumbnail, lastFetchedUrl, editTitle]);

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
            ctaText: editCtaText,
            imageFit: editImageFit
        });
        onClose();
    };



    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-20 pb-4 sm:p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/80"
                        />

                        {/* Modal Content */}
                        <motion.div
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-[800px] bg-[#F8F9FB] dark:bg-black overflow-hidden rounded-[20px] sm:rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 max-h-[85vh] sm:max-h-[90vh] flex flex-col"
                            initial={{
                                scale: 0.95,
                                opacity: 0
                            }}
                            animate={{
                                scale: 1,
                                opacity: 1
                            }}
                            exit={{
                                scale: 0.95,
                                opacity: 0
                            }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            {/* Header */}
                            <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-3 sm:pb-4 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 sticky top-0 z-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Add New Widget</h2>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Form Content */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto bg-[#F2F2F7] dark:bg-[#000000] flex-1">
                                {/* Top Row: Title/URL (2/3) + Thumbnail (1/3) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                    {/* Left Column: Title & URL */}
                                    <div className="md:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-[18px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                                        <div className="flex flex-col">
                                            <div className="relative group px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-white/10">
                                                <Label htmlFor="title" className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                                                    <Label htmlFor="url" className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                        Link URL <span className="text-red-500">*</span>
                                                    </Label>
                                                    {isFetchingMetadata && (
                                                        <div className="w-3 h-3 border-2 border-gray-200 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <LinkIcon className="h-4 w-4 text-black dark:text-white flex-shrink-0" />
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
                                    <div className="md:col-span-1 bg-white dark:bg-[#1C1C1E] rounded-[18px] p-4 sm:p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col h-full">
                                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                            Thumbnail
                                        </Label>

                                        <div className="flex-1 flex flex-col gap-3">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 min-h-[120px] rounded-xl overflow-hidden relative group cursor-pointer bg-gray-50 dark:bg-[#2C2C2E] transition-all hover:opacity-90 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10"
                                            >
                                                {editThumbnail ? (
                                                    <img src={editThumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#3A3A3C] shadow-sm flex items-center justify-center text-black dark:text-white">
                                                            <Upload className="h-5 w-5" />
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

                                {/* Bottom Row: Image Fit (1/3) + CTA (2/3) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="md:col-span-1 bg-white dark:bg-[#1C1C1E] rounded-[18px] p-4 sm:p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
                                            Image Fit
                                        </Label>
                                        {/* Apple-style Segmented Control */}
                                        <div className="bg-[#EEEEEF] dark:bg-[#2C2C2E] p-1 rounded-lg flex relative">
                                            <motion.div
                                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#636366] rounded-md shadow-sm z-0"
                                                initial={false}
                                                animate={{ x: editImageFit === "cover" ? 0 : "100%" }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditImageFit("cover")}
                                                className={cn(
                                                    "flex-1 py-1.5 text-[13px] font-medium relative z-10 transition-colors text-center rounded-md",
                                                    editImageFit === "cover" ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-300"
                                                )}
                                            >
                                                Fill
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditImageFit("contain")}
                                                className={cn(
                                                    "flex-1 py-1.5 text-[13px] font-medium relative z-10 transition-colors text-center rounded-md",
                                                    editImageFit === "contain" ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-300"
                                                )}
                                            >
                                                Fit
                                            </button>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-[18px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col justify-center overflow-hidden">
                                        <div className="px-4 sm:px-5 py-2">
                                            <Label htmlFor="cta" className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                            <div className="p-4 sm:p-5 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 z-10">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="text-[15px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-4 sm:px-6"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="px-5 py-2.5 rounded-full font-medium shadow-lg transition-all bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2"
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
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white dark:bg-gray-900">
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Crop Image</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">Adjust the crop area and zoom</DialogDescription>
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

                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-semibold">Cancel</Button>
                            <Button onClick={handleCropSave} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-black/10">Set Image</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
