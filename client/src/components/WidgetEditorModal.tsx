import { useState, useRef, useCallback, useEffect } from "react";
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import api from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Link as LinkIcon, Upload, ArrowUpRight } from "lucide-react";
import { cn } from "../lib/utils";
import type { WidgetData } from "./LinkWidget";

interface WidgetEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<WidgetData>) => void;
    initialData?: Partial<WidgetData>;
    title?: string; // "Edit Widget" or "Add Widget"
}

export const WidgetEditorModal = ({ isOpen, onClose, onSave, initialData = {}, title = "Edit Widget" }: WidgetEditorModalProps) => {
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

    // Reset state when modal opens with new data
    useEffect(() => {
        if (isOpen) {
            setEditTitle(initialData.customTitle || "");
            setEditUrl(initialData.url || "");
            setEditThumbnail(initialData.customImage || "");
            setEditCtaText(initialData.ctaText || "");
            setEditImageFit(initialData.imageFit || "cover");
        }
    }, [isOpen, initialData]);

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

    const handleSave = () => {
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
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[420px] p-0 gap-0 rounded-xl overflow-hidden border-none shadow-2xl bg-[#fafafa]">
                    <DialogHeader className="p-6 pb-2 bg-white">
                        <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">{title}</DialogTitle>
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
                        <Button variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm font-semibold">Cancel</Button>
                        <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg shadow-black/10">Save Changes</Button>
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
                            <Button onClick={handleCropSave} className="flex-1 h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-black/10">Set Image</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
