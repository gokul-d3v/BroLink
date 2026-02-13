import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { BentoGrid } from "../components/BentoGrid";
import { ThemeToggle } from "../components/ThemeToggle";

export const Public = () => {
    const { username = "brototype" } = useParams();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Fade out when scrolled down (scroll position >= 50px)
            // Fade in when at top (scroll position < 50px)
            setIsScrolled(window.scrollY >= 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="relative">
            {/* Brototype Logo - fades out when scrolling down */}
            <div
                className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-[200] transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'
                    }`}
            >
                <h1 className="text-2xl font-bold tracking-tight">BROTOTYPE</h1>
            </div>

            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[200]">
                <ThemeToggle />
            </div>

            <BentoGrid isEditable={false} publicUsername={username} />
        </div>
    );
};
