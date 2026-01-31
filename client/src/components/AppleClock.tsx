import { useState, useEffect } from "react";

export const AppleClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Get time in Asia/Kolkata timezone
    const kolkataTime = new Date(time.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    // Calculate angles for clock hands
    const seconds = kolkataTime.getSeconds();
    const minutes = kolkataTime.getMinutes();
    const hours = kolkataTime.getHours() % 12;

    const secondAngle = (seconds * 6); // 360/60
    const minuteAngle = (minutes * 6) + (seconds * 0.1); // smooth minute hand
    const hourAngle = (hours * 30) + (minutes * 0.5); // smooth hour hand

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-[28px] shadow-lg flex items-center justify-center p-4">
            <div className="relative w-full h-full max-w-full max-h-full aspect-square">{/* Hour Numbers */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl font-bold text-zinc-900">12</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-900">3</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-2xl font-bold text-zinc-900">6</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-900">9</div>

                {/* Minute Markers */}
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute top-1/2 left-1/2 origin-bottom ${i % 5 === 0 ? 'w-[2px] h-2 bg-zinc-800' : 'w-[1px] h-1.5 bg-zinc-400'
                            }`}
                        style={{
                            transform: `translate(-50%, -50%) rotate(${i * 6}deg) translateY(-${i % 5 === 0 ? '50px' : '52px'})`,
                        }}
                    />
                ))}

                {/* Hour Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[4px] h-9 bg-zinc-900 rounded-full origin-bottom transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                    }}
                />

                {/* Minute Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[3px] h-12 bg-zinc-900 rounded-full origin-bottom transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                    }}
                />

                {/* Second Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[2px] h-14 origin-bottom transition-transform duration-100 ease-linear"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
                    }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-orange-500 rounded-full"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-11 bg-orange-500"></div>
                </div>

                {/* Center Dot */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-zinc-900 rounded-full -translate-x-1/2 -translate-y-1/2 z-10 border-2 border-orange-500"></div>
            </div>
        </div>
    );
};
