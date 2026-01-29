import { Link as LinkIcon, Mail } from "lucide-react";

interface ProfileWidgetProps {
    fullName?: string;
    username?: string;
    avatarUrl?: string; // Future use or if we add it to DB
}

export const ProfileWidget = ({ fullName, username, avatarUrl }: ProfileWidgetProps) => {
    // Get initials or first two chars of username
    const displayInitials = (fullName?.[0] || username?.[0] || "U").toUpperCase() + (fullName?.split(" ")[1]?.[0] || username?.[1] || "").toUpperCase();
    const displayName = fullName || username || "User";

    return (
        <div className="h-full w-full flex flex-col justify-center p-8 lg:p-10 space-y-6 lg:space-y-8 lg:fixed lg:w-[320px] lg:h-screen top-0 left-0 bg-[#fbfbfd] z-20">
            {/* Avatar */}
            <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-2 border-black/[0.08] shadow-md bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                        {displayInitials}
                    </div>
                )}
            </div>

            {/* Text Content */}
            <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#1d1d1f] leading-[1.05] break-words">
                    {displayName}
                </h1>
                <p className="text-lg text-[#6e6e73] font-normal">@{username}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button className="h-11 w-11 rounded-full bg-[#1d1d1f] hover:bg-[#2d2d2f] flex items-center justify-center text-white transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] shadow-sm">
                    <Mail className="h-5 w-5" />
                </button>
                <button
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="h-11 w-11 rounded-full bg-[#1d1d1f] hover:bg-[#2d2d2f] flex items-center justify-center text-white transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] shadow-sm"
                    title="Copy Link"
                >
                    <LinkIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile Divider */}
            <div className="lg:hidden w-full h-px bg-gray-200 mt-6" />
        </div>
    );
};
