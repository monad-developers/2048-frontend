import { useEffect, useRef } from "react";

export function useAsyncInterval(asyncCallback: () => Promise<void>, delay: number | null) {
    const savedCallback = useRef(asyncCallback);

    useEffect(() => {
        savedCallback.current = asyncCallback;
    }, [asyncCallback]);

    useEffect(() => {
        if (delay === null) return;
        let isActive = true; // To prevent execution after unmount

        const tick = async () => {
            await savedCallback.current();
            if (isActive) {
                setTimeout(tick, delay);
            }
        };

        const timeoutId = setTimeout(tick, delay);

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [delay]);
}