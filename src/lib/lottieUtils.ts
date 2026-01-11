import { type Vector3, type LottieAnimation } from '../types/lottie';
import * as fflate from 'fflate';

/**
 * Robustly retrieves the current value of a Lottie property at the given time.
 * Handles static values, animated keyframes, and ensures type-safe returns.
 */
export const getLottieVal = <T,>(prop: any, currentTime: number, defaultValue: any = 0): T => {
    if (!prop) return defaultValue as T;

    const extract = (val: any): any => {
        // Lottie sometimes wraps scalar values in a single-element array for animated properties
        if (prop.a === 1 && Array.isArray(val) && val.length === 1) return val[0];
        return val;
    };

    if (prop.a === 0) {
        const val = prop.k;
        // Basic NaN/null protection
        if (val === null || val === undefined) return defaultValue as T;
        return val as T;
    }

    const kfs = prop.k as any[];
    if (!kfs || kfs.length === 0) return extract(prop.k);

    // Boundary checks
    if (currentTime <= kfs[0].t) return extract(kfs[0].s);
    if (currentTime >= kfs[kfs.length - 1].t) return extract(kfs[kfs.length - 1].s);

    // Linear Interpolation
    for (let i = 0; i < kfs.length - 1; i++) {
        const cur = kfs[i];
        const next = kfs[i + 1];
        if (currentTime >= cur.t && currentTime < next.t) {
            const t = (currentTime - cur.t) / (next.t - cur.t);

            const s = Array.isArray(cur.s) ? cur.s : [cur.s];
            const e = Array.isArray(next.s) ? next.s : [next.s];

            // Safety: if dimensions don't match, return start value
            if (s.length !== e.length && e.length !== 0) return extract(cur.s);

            if (s.length > 1) {
                const result = s.map((v: number, idx: number) => {
                    const end = e[idx] ?? v;
                    const res = v + (end - v) * t;
                    return isNaN(res) ? v : res;
                });
                return result as any;
            } else {
                const res = s[0] + ((e[0] ?? s[0]) - s[0]) * t;
                return (isNaN(res) ? s[0] : res) as any;
            }
        }
    }

    return extract(kfs[0].s);
};

/**
 * Helper to ensure a value is a Vector3 [x, y, z]
 */
export const toVector3 = (val: any, defaultZ: number = 0): Vector3 => {
    if (Array.isArray(val)) {
        return [
            isNaN(val[0]) ? 0 : val[0],
            isNaN(val[1]) ? 0 : val[1],
            isNaN(val[2]) ? defaultZ : val[2]
        ];
    }
    const n = isNaN(val) ? 0 : val;
    return [n, n, defaultZ];
};

/**
 * Helper to ensure a value is a Vector2 [x, y]
 */
export const toVector2 = (val: any): [number, number] => {
    if (Array.isArray(val)) {
        return [
            isNaN(val[0]) ? 0 : val[0],
            isNaN(val[1]) ? 0 : val[1]
        ];
    }
    const n = isNaN(val) ? 0 : val;
    return [n, n];
};

/**
 * Loads a .lottie file (ZIP) and extracts the animation JSON.
 */
export const loadDotLottie = async (file: File): Promise<LottieAnimation> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            fflate.unzip(data, (err, unzipped) => {
                if (err) return reject(err);

                // Look for manifest.json
                const manifestEntry = Object.keys(unzipped).find(name => name.endsWith('manifest.json'));
                if (!manifestEntry) return reject(new Error('No manifest.json found in .lottie file'));

                const manifest = JSON.parse(fflate.strFromU8(unzipped[manifestEntry]));
                const animations = manifest.animations;
                if (!animations || animations.length === 0) return reject(new Error('No animations found in manifest'));

                // Get the first animation's data
                const animId = animations[0].id;
                const animEntry = Object.keys(unzipped).find(name => name.includes(animId) && name.endsWith('.json'));
                if (!animEntry) return reject(new Error(`Animation file for ${animId} not found`));

                const animationData = JSON.parse(fflate.strFromU8(unzipped[animEntry]));
                resolve(animationData);
            });
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Creates a .lottie file (ZIP blob) from animation JSON.
 */
export const saveDotLottie = async (animation: LottieAnimation): Promise<Blob> => {
    return new Promise((resolve) => {
        const animJson = JSON.stringify(animation);
        const manifest = {
            generator: "Lottie Editor",
            version: "1.0",
            animations: [
                {
                    id: "animation",
                    speed: 1,
                    loop: true
                }
            ]
        };

        const files = {
            "manifest.json": fflate.strToU8(JSON.stringify(manifest)),
            "animations/animation.json": fflate.strToU8(animJson)
        };

        fflate.zip(files, (err, data) => {
            if (err) throw err;
            resolve(new Blob([data], { type: 'application/zip' }));
        });
    });
};

/**
 * Records a canvas element to a video file.
 */
export const recordCanvasToVideo = async (
    canvas: HTMLCanvasElement,
    durationFrames: number,
    fps: number,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        // We'll use MediaStream for simplicity, though for high-quality MP4 
        // a tool like ffmpeg.wasm is usually better. 
        // This will often output .webm or .mp4 depending on browser support.
        const stream = canvas.captureStream(fps);
        const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';

        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 5000000 // 5Mbps
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            resolve(new Blob(chunks, { type: mimeType }));
        };

        recorder.onerror = reject;

        // Note: This assumes the calling code will handle the actual frame-by-frame 
        // progression of the animation to ensure everything is captured.
        // For now, we start/stop based on a timeout which is imprecise 
        // but works for a basic implementation.
        recorder.start();

        // This is a placeholder for real frame-by-frame capture logic
        const totalMs = (durationFrames / fps) * 1000;
        let start = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / totalMs, 1);
            if (onProgress) onProgress(progress);
            if (progress >= 1) {
                clearInterval(interval);
                recorder.stop();
            }
        }, 100);
    });
};
