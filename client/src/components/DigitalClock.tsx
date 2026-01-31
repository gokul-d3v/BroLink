import { useState, useEffect } from "react";

export const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Get time in Asia/Kolkata timezone
    const hours = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    }).split(':')[0];

    const minutes = time.toLocaleTimeString('en-US', {
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    }).split(':')[1];

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-[28px] shadow-lg flex items-center justify-center p-4">
            {/* Minute Markers around border */}
            {[...Array(60)].map((_, i) => (
                <div
                    key={i}
                    className={`absolute ${i % 5 === 0 ? 'w-[2px] h-3 bg-zinc-500' : 'w-[1.5px] h-2.5 bg-zinc-400'
                        }`}
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(${i * 6}deg) translateY(-${i % 5 === 0 ? '45%' : '46%'
                            })`,
                        transformOrigin: 'center'
                    }}
                />
            ))}

            {/* Digital Time Display */}
            <div className="flex items-center justify-center" style={{ lineHeight: '0.85' }}>
                <span className="text-[2.5rem] sm:text-[3rem] font-black text-zinc-950 tracking-tighter tabular-nums">
                    {hours}
                </span>
                <span className="text-[2.5rem] sm:text-[3rem] font-black text-zinc-950 tracking-tighter">
                    :
                </span>
                <span className="text-[2.5rem] sm:text-[3rem] font-black text-zinc-950 tracking-tighter tabular-nums">
                    {minutes}
                </span>
            </div>
        </div>
    );
};
