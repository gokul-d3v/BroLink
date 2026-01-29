import React, { useState } from "react";
import { type LinkMetadata, fetchLinkMetadata } from "../api/mockMetadata";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Link as LinkIcon, AlertCircle, ArrowUpRight, Search } from "lucide-react";

export const LinkPreview = () => {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && url) {
            setLoading(true);
            setError(null);
            setMetadata(null);
            try {
                const data = await fetchLinkMetadata(url);
                setMetadata(data);
            } catch (err) {
                setError("Failed to load preview");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F4F5] p-4 md:p-8 flex items-center justify-center font-sans tracking-tight">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                {/* Input Tile */}
                <div className="group relative flex flex-col justify-between h-[400px] w-full bg-white rounded-xl p-8 shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden">

                    {/* Decorative Background Blob */}
                    <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-purple-100 rounded-full blur-[80px] opacity-40 mix-blend-multiply group-hover:opacity-60 transition-opacity duration-700" />

                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                Link<br />Preview.
                            </h1>
                            <p className="text-lg text-gray-500 font-medium">
                                Visualize your links with style.
                            </p>
                        </div>

                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within/input:text-purple-600 transition-colors duration-300" />
                            </div>
                            <Input
                                placeholder="paste your link..."
                                className="h-16 pl-12 pr-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-lg shadow-sm focus-visible:ring-0 focus-visible:border-purple-500 focus-visible:bg-white transition-all duration-300 placeholder:text-gray-400"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center">
                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-200 text-gray-500 text-xs font-bold font-mono">
                                    ↵
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-wrap gap-2">
                            {['github', 'youtube', 'vercel'].map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => { setUrl(tag); }}
                                    className="px-4 py-2 rounded-full bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors cursor-pointer"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preview Tile Area */}
                <div className="h-[400px] w-full">
                    {loading ? (
                        <BentoSkeleton />
                    ) : error ? (
                        <div className="h-full w-full bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 border border-red-100 relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-50/30" />
                            <div className="h-16 w-16 bg-red-100 rounded-xl flex items-center justify-center relative z-10 text-red-500 mb-2">
                                <AlertCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 relative z-10">Oops!</h3>
                            <p className="text-gray-500 max-w-[200px] relative z-10">{error}</p>
                        </div>
                    ) : metadata ? (
                        <BentoCard data={metadata} />
                    ) : (
                        <div className="h-full w-full bg-gray-100/50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-4 group cursor-default hover:border-gray-300 hover:bg-gray-100 transition-all duration-300">
                            <Search className="h-12 w-12 opacity-20 group-hover:scale-110 transition-transform duration-300" />
                            <p className="font-medium opacity-40">Preview awaits...</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const BentoCard = ({ data }: { data: LinkMetadata }) => {
    return (
        <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full w-full group relative bg-white rounded-xl overflow-hidden shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1"
        >
            {/* Full background image for immersive feel on large cards, or split. 
                Bento style often allows image to take up significant space. 
             */}
            <div className="absolute inset-0 z-0">
                <img
                    src={data.image}
                    alt={data.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-500" />
            </div>

            <div className="absolute inset-0 z-10 p-8 flex flex-col justify-end text-white">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    {/* Favicon & Domain */}
                    <div className="flex items-center gap-3 mb-3 opacity-90">
                        <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center p-1 border border-white/10 shadow-inner">
                            <img src={data.favicon} alt="" className="h-4 w-4 rounded-sm" />
                        </div>
                        <span className="text-sm font-bold tracking-wide uppercase text-white/90 drop-shadow-sm">{data.domain}</span>
                    </div>

                    <h2 className="text-2xl font-bold leading-tight mb-2 text-white drop-shadow-md line-clamp-2">
                        {data.title}
                    </h2>

                    <p className="text-white/80 text-sm line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75 h-0 group-hover:h-auto overflow-hidden">
                        {data.description}
                    </p>
                </div>

                {/* External Link Icon */}
                <div className="absolute top-8 right-8 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90 transition-all duration-300">
                    <ArrowUpRight className="h-5 w-5" />
                </div>
            </div>
        </a>
    )
}

const BentoSkeleton = () => {
    return (
        <Card className="h-full w-full rounded-xl border-none bg-white shadow-sm overflow-hidden p-0 relative">
            <Skeleton className="h-full w-full absolute inset-0" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end space-y-4 z-10">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/30" />
                    <Skeleton className="h-4 w-24 bg-white/30" />
                </div>
                <Skeleton className="h-8 w-3/4 bg-white/30" />
                <Skeleton className="h-8 w-1/2 bg-white/30" />
            </div>
        </Card>
    )
}
