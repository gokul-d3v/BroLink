import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BentoGrid } from "../components/BentoGrid";
import { ThemeToggle } from "../components/ThemeToggle";

export const Public = () => {
    // Display marketing admin's widgets on homepage
    const [isScrolled, setIsScrolled] = useState(false);
    const { username } = useParams<{ username: string }>();
    const targetUsername = username || "marketing";

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
                <img src="/logo.png" alt="Brototype" className="h-10 w-auto dark:invert" />
            </div>

            <div
                className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[200] flex items-center gap-3 transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
            >
                <a
                    href="https://www.brototype.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="cta-neumorph text-xs font-semibold px-4 py-2 rounded-full"
                >
                    Connect
                </a>
                <ThemeToggle />
            </div>

            <BentoGrid isEditable={false} publicUsername={targetUsername} />
        </div>
    );
};
