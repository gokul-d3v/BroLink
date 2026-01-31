import { useState, useEffect } from "react";

export const AnalogClock = () => {
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
        <div className="relative w-full h-full bg-zinc-950 rounded-[28px] shadow-lg flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-full max-h-full aspect-square">
                {/* Outer Circle Border */}
                <div className="absolute inset-0 border-[3px] border-zinc-700 rounded-full"></div>

                {/* Hour Markers - Segmented style */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-[4px] h-[12%] bg-zinc-600 rounded-sm"
                        style={{
                            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-42%)`,
                            transformOrigin: 'center'
                        }}
                    />
                ))}

                {/* Hour Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[6px] h-[25%] bg-white rounded-full origin-bottom transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
                    }}
                />

                {/* Minute Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[5px] h-[38%] bg-white rounded-full origin-bottom transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
                    }}
                />

                {/* Second Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-[2px] h-[42%] bg-red-500 origin-bottom transition-transform duration-100 ease-linear"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
                    }}
                />

                {/* Center Dot */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-10 border-2 border-red-500"></div>
            </div>
        </div>
    );
};
