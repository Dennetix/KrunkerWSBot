export const setImmediateInterval = (callback: (...args: any[]) => void, ms: number, ...args: any[]): NodeJS.Timeout => {
    setImmediate(callback, ...args);
    return setInterval(callback, ms, ...args);
};

export const when = (predicate: () => boolean, callback: () => void, ms: number = 100): void => {
    const interval = setImmediateInterval(() => {
        if (predicate()) {
            clearInterval(interval);
            callback();
        }
    }, ms);
};
