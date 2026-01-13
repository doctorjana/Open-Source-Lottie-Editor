import { type Vector3, type LottieAnimation, type Layer, type ShapePath } from '../types/lottie';
import * as fflate from 'fflate';

/**
 * Parses an SVG path "d" attribute into Lottie ShapePaths.
 * Supports M, L, H, V, C, S, Q, T, A, Z commands (both absolute and relative).
 */
export const parseSvgPathD = (d: string): ShapePath[] => {
    const paths: ShapePath[] = [];
    let currentPath: ShapePath = { v: [], i: [], o: [], c: false };

    const tokens = d.match(/([MLHVCSQTAZmlhvcsqtaz])|(-?\d*\.?\d+(?:e[+-]?\d+)?)/gi) || [];

    let i = 0;
    let lastX = 0, lastY = 0;
    let lastCmd = '';
    let lastCx = 0, lastCy = 0; // For S and T commands

    const parseNum = () => parseFloat(tokens[i++]) || 0;

    while (i < tokens.length) {
        const token = tokens[i];
        if (/[MLHVCSQTAZmlhvcsqtaz]/.test(token)) {
            lastCmd = token;
            i++;

            const isRelative = token === token.toLowerCase();
            const cmd = token.toUpperCase();

            if (cmd === 'M') {
                if (currentPath.v.length > 0) paths.push(currentPath);
                currentPath = { v: [], i: [], o: [], c: false };
                let x = parseNum();
                let y = parseNum();
                if (isRelative) { x += lastX; y += lastY; }
                lastX = x; lastY = y;
                currentPath.v.push([x, y]);
                currentPath.i.push([0, 0]);
                currentPath.o.push([0, 0]);
            } else if (cmd === 'L') {
                let x = parseNum();
                let y = parseNum();
                if (isRelative) { x += lastX; y += lastY; }
                lastX = x; lastY = y;
                currentPath.v.push([x, y]);
                currentPath.i.push([0, 0]);
                currentPath.o.push([0, 0]);
            } else if (cmd === 'H') {
                let x = parseNum();
                if (isRelative) x += lastX;
                lastX = x;
                currentPath.v.push([x, lastY]);
                currentPath.i.push([0, 0]);
                currentPath.o.push([0, 0]);
            } else if (cmd === 'V') {
                let y = parseNum();
                if (isRelative) y += lastY;
                lastY = y;
                currentPath.v.push([lastX, y]);
                currentPath.i.push([0, 0]);
                currentPath.o.push([0, 0]);
            } else if (cmd === 'C') {
                const x1 = parseNum() + (isRelative ? lastX : 0);
                const y1 = parseNum() + (isRelative ? lastY : 0);
                const x2 = parseNum() + (isRelative ? lastX : 0);
                const y2 = parseNum() + (isRelative ? lastY : 0);
                const x = parseNum() + (isRelative ? lastX : 0);
                const y = parseNum() + (isRelative ? lastY : 0);

                const prevV = currentPath.v[currentPath.v.length - 1];
                currentPath.o[currentPath.o.length - 1] = [x1 - prevV[0], y1 - prevV[1]];
                currentPath.v.push([x, y]);
                currentPath.i.push([x2 - x, y2 - y]);
                currentPath.o.push([0, 0]);
                lastCx = x2; lastCy = y2;
                lastX = x; lastY = y;
            } else if (cmd === 'S') {
                // Smooth cubic - reflect last control point
                let cx1 = lastX, cy1 = lastY;
                if (['C', 'S', 'c', 's'].includes(lastCmd)) {
                    cx1 = 2 * lastX - lastCx;
                    cy1 = 2 * lastY - lastCy;
                }
                const x2 = parseNum() + (isRelative ? lastX : 0);
                const y2 = parseNum() + (isRelative ? lastY : 0);
                const x = parseNum() + (isRelative ? lastX : 0);
                const y = parseNum() + (isRelative ? lastY : 0);

                const prevV = currentPath.v[currentPath.v.length - 1];
                currentPath.o[currentPath.o.length - 1] = [cx1 - prevV[0], cy1 - prevV[1]];
                currentPath.v.push([x, y]);
                currentPath.i.push([x2 - x, y2 - y]);
                currentPath.o.push([0, 0]);
                lastCx = x2; lastCy = y2;
                lastX = x; lastY = y;
            } else if (cmd === 'Q') {
                const x1 = parseNum() + (isRelative ? lastX : 0);
                const y1 = parseNum() + (isRelative ? lastY : 0);
                const x = parseNum() + (isRelative ? lastX : 0);
                const y = parseNum() + (isRelative ? lastY : 0);

                const prevV = currentPath.v[currentPath.v.length - 1];
                // Quadratic to Cubic conversion
                const c1x = prevV[0] + 2 / 3 * (x1 - prevV[0]);
                const c1y = prevV[1] + 2 / 3 * (y1 - prevV[1]);
                const c2x = x + 2 / 3 * (x1 - x);
                const c2y = y + 2 / 3 * (y1 - y);

                currentPath.o[currentPath.o.length - 1] = [c1x - prevV[0], c1y - prevV[1]];
                currentPath.v.push([x, y]);
                currentPath.i.push([c2x - x, c2y - y]);
                currentPath.o.push([0, 0]);
                lastCx = x1; lastCy = y1;
                lastX = x; lastY = y;
            } else if (cmd === 'T') {
                // Smooth quadratic - reflect last control point
                let qx = lastX, qy = lastY;
                if (['Q', 'T', 'q', 't'].includes(lastCmd)) {
                    qx = 2 * lastX - lastCx;
                    qy = 2 * lastY - lastCy;
                }
                const x = parseNum() + (isRelative ? lastX : 0);
                const y = parseNum() + (isRelative ? lastY : 0);

                const prevV = currentPath.v[currentPath.v.length - 1];
                const c1x = prevV[0] + 2 / 3 * (qx - prevV[0]);
                const c1y = prevV[1] + 2 / 3 * (qy - prevV[1]);
                const c2x = x + 2 / 3 * (qx - x);
                const c2y = y + 2 / 3 * (qy - y);

                currentPath.o[currentPath.o.length - 1] = [c1x - prevV[0], c1y - prevV[1]];
                currentPath.v.push([x, y]);
                currentPath.i.push([c2x - x, c2y - y]);
                currentPath.o.push([0, 0]);
                lastCx = qx; lastCy = qy;
                lastX = x; lastY = y;
            } else if (cmd === 'A') {
                // Arc command - we need to consume all parameters to advance the token index
                // Full arc-to-bezier conversion is complex, so we simplify to a line
                parseNum(); // rx
                parseNum(); // ry
                parseNum(); // x-axis-rotation
                parseNum(); // large-arc-flag
                parseNum(); // sweep-flag
                const x = parseNum() + (isRelative ? lastX : 0);
                const y = parseNum() + (isRelative ? lastY : 0);
                // Simplified: just draw a line (proper arc conversion would need bezier approximation)
                currentPath.v.push([x, y]);
                currentPath.i.push([0, 0]);
                currentPath.o.push([0, 0]);
                lastX = x; lastY = y;
            } else if (cmd === 'Z') {
                currentPath.c = true;
            }
        } else {
            // Implicit command continuation
            i++;
        }
    }

    if (currentPath.v.length > 0) paths.push(currentPath);
    return paths;
};

/**
 * Parses a color string (hex, rgb, named) to Lottie [r, g, b] format (0-1 range).
 */
const parseColor = (color: string | null): [number, number, number] | null => {
    if (!color || color === 'none') return null;

    // Hex color
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16) / 255;
            const g = parseInt(hex[1] + hex[1], 16) / 255;
            const b = parseInt(hex[2] + hex[2], 16) / 255;
            return [r, g, b];
        } else if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            return [r, g, b];
        }
    }

    // RGB/RGBA
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        return [
            parseInt(rgbMatch[1]) / 255,
            parseInt(rgbMatch[2]) / 255,
            parseInt(rgbMatch[3]) / 255
        ];
    }

    // Named colors (basic set)
    const namedColors: Record<string, [number, number, number]> = {
        black: [0, 0, 0], white: [1, 1, 1], red: [1, 0, 0],
        green: [0, 0.5, 0], blue: [0, 0, 1], yellow: [1, 1, 0],
        cyan: [0, 1, 1], magenta: [1, 0, 1], gray: [0.5, 0.5, 0.5],
        grey: [0.5, 0.5, 0.5], orange: [1, 0.65, 0], purple: [0.5, 0, 0.5],
        pink: [1, 0.75, 0.8], lime: [0, 1, 0], navy: [0, 0, 0.5]
    };

    return namedColors[color.toLowerCase()] || [0, 0, 0];
};

/**
 * Converts an SVG string to a Lottie Layer.
 */
export const svgToLottieLayer = (svgContent: string, canvasW: number, canvasH: number): Layer | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) return null;

    // Get SVG dimensions
    const viewBox = svg.getAttribute('viewBox');
    let svgW = parseFloat(svg.getAttribute('width') || '100');
    let svgH = parseFloat(svg.getAttribute('height') || '100');

    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(parseFloat);
        if (parts.length === 4) {
            svgW = parts[2];
            svgH = parts[3];
        }
    }

    // Calculate scale to fit canvas
    const scale = Math.min(canvasW / svgW, canvasH / svgH) * 0.8;

    const shapeItems: any[] = [];

    // Process all shape elements
    const processElement = (el: Element, inherited: { fill?: string; stroke?: string; strokeWidth?: number } = {}) => {
        const fill = el.getAttribute('fill') || inherited.fill || 'black';
        const stroke = el.getAttribute('stroke') || inherited.stroke;
        const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '') || inherited.strokeWidth || 1;

        const tagName = el.tagName.toLowerCase();

        if (tagName === 'path') {
            const d = el.getAttribute('d');
            if (d) {
                const shapePaths = parseSvgPathD(d);
                shapePaths.forEach((shapePath, idx) => {
                    const groupItems: any[] = [
                        {
                            ty: 'sh',
                            nm: `Path ${idx + 1}`,
                            ks: { a: 0, k: shapePath }
                        }
                    ];

                    const fillColor = parseColor(fill);
                    if (fillColor) {
                        groupItems.push({
                            ty: 'fl',
                            nm: 'Fill',
                            c: { a: 0, k: fillColor },
                            o: { a: 0, k: 100 }
                        });
                    }

                    const strokeColor = parseColor(stroke || null);
                    if (strokeColor) {
                        groupItems.push({
                            ty: 'st',
                            nm: 'Stroke',
                            c: { a: 0, k: strokeColor },
                            o: { a: 0, k: 100 },
                            w: { a: 0, k: strokeWidth }
                        });
                    }

                    groupItems.push({
                        ty: 'tr',
                        nm: 'Transform',
                        p: { a: 0, k: [0, 0] },
                        a: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [100, 100] },
                        r: { a: 0, k: 0 },
                        o: { a: 0, k: 100 }
                    });

                    shapeItems.push({
                        ty: 'gr',
                        nm: `Path Group ${idx + 1}`,
                        it: groupItems
                    });
                });
            }
        } else if (tagName === 'rect') {
            const x = parseFloat(el.getAttribute('x') || '0');
            const y = parseFloat(el.getAttribute('y') || '0');
            const w = parseFloat(el.getAttribute('width') || '0');
            const h = parseFloat(el.getAttribute('height') || '0');
            const rx = parseFloat(el.getAttribute('rx') || '0');

            const groupItems: any[] = [
                {
                    ty: 'rc',
                    nm: 'Rectangle',
                    p: { a: 0, k: [x + w / 2, y + h / 2] },
                    s: { a: 0, k: [w, h] },
                    r: { a: 0, k: rx }
                }
            ];

            const fillColor = parseColor(fill);
            if (fillColor) {
                groupItems.push({
                    ty: 'fl',
                    nm: 'Fill',
                    c: { a: 0, k: fillColor },
                    o: { a: 0, k: 100 }
                });
            }

            groupItems.push({
                ty: 'tr',
                nm: 'Transform',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
            });

            shapeItems.push({
                ty: 'gr',
                nm: 'Rectangle Group',
                it: groupItems
            });
        } else if (tagName === 'circle') {
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const r = parseFloat(el.getAttribute('r') || '0');

            const groupItems: any[] = [
                {
                    ty: 'el',
                    nm: 'Ellipse',
                    p: { a: 0, k: [cx, cy] },
                    s: { a: 0, k: [r * 2, r * 2] }
                }
            ];

            const fillColor = parseColor(fill);
            if (fillColor) {
                groupItems.push({
                    ty: 'fl',
                    nm: 'Fill',
                    c: { a: 0, k: fillColor },
                    o: { a: 0, k: 100 }
                });
            }

            groupItems.push({
                ty: 'tr',
                nm: 'Transform',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
            });

            shapeItems.push({
                ty: 'gr',
                nm: 'Circle Group',
                it: groupItems
            });
        } else if (tagName === 'ellipse') {
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const rx = parseFloat(el.getAttribute('rx') || '0');
            const ry = parseFloat(el.getAttribute('ry') || '0');

            const groupItems: any[] = [
                {
                    ty: 'el',
                    nm: 'Ellipse',
                    p: { a: 0, k: [cx, cy] },
                    s: { a: 0, k: [rx * 2, ry * 2] }
                }
            ];

            const fillColor = parseColor(fill);
            if (fillColor) {
                groupItems.push({
                    ty: 'fl',
                    nm: 'Fill',
                    c: { a: 0, k: fillColor },
                    o: { a: 0, k: 100 }
                });
            }

            groupItems.push({
                ty: 'tr',
                nm: 'Transform',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
            });

            shapeItems.push({
                ty: 'gr',
                nm: 'Ellipse Group',
                it: groupItems
            });
        } else if (tagName === 'polygon' || tagName === 'polyline') {
            const points = el.getAttribute('points');
            if (points) {
                const coords = points.trim().split(/[\s,]+/).map(parseFloat);
                const vertices: [number, number][] = [];
                for (let j = 0; j < coords.length; j += 2) {
                    vertices.push([coords[j], coords[j + 1]]);
                }

                const shapePath: ShapePath = {
                    v: vertices,
                    i: vertices.map(() => [0, 0] as [number, number]),
                    o: vertices.map(() => [0, 0] as [number, number]),
                    c: tagName === 'polygon'
                };

                const groupItems: any[] = [
                    {
                        ty: 'sh',
                        nm: tagName === 'polygon' ? 'Polygon' : 'Polyline',
                        ks: { a: 0, k: shapePath }
                    }
                ];

                const fillColor = parseColor(fill);
                if (fillColor && tagName === 'polygon') {
                    groupItems.push({
                        ty: 'fl',
                        nm: 'Fill',
                        c: { a: 0, k: fillColor },
                        o: { a: 0, k: 100 }
                    });
                }

                const strokeColor = parseColor(stroke || null);
                if (strokeColor) {
                    groupItems.push({
                        ty: 'st',
                        nm: 'Stroke',
                        c: { a: 0, k: strokeColor },
                        o: { a: 0, k: 100 },
                        w: { a: 0, k: strokeWidth }
                    });
                }

                groupItems.push({
                    ty: 'tr',
                    nm: 'Transform',
                    p: { a: 0, k: [0, 0] },
                    a: { a: 0, k: [0, 0] },
                    s: { a: 0, k: [100, 100] },
                    r: { a: 0, k: 0 },
                    o: { a: 0, k: 100 }
                });

                shapeItems.push({
                    ty: 'gr',
                    nm: `${tagName === 'polygon' ? 'Polygon' : 'Polyline'} Group`,
                    it: groupItems
                });
            }
        } else if (tagName === 'line') {
            const x1 = parseFloat(el.getAttribute('x1') || '0');
            const y1 = parseFloat(el.getAttribute('y1') || '0');
            const x2 = parseFloat(el.getAttribute('x2') || '0');
            const y2 = parseFloat(el.getAttribute('y2') || '0');

            const shapePath: ShapePath = {
                v: [[x1, y1], [x2, y2]],
                i: [[0, 0], [0, 0]],
                o: [[0, 0], [0, 0]],
                c: false
            };

            const groupItems: any[] = [
                {
                    ty: 'sh',
                    nm: 'Line',
                    ks: { a: 0, k: shapePath }
                }
            ];

            const strokeColor = parseColor(stroke || 'black');
            if (strokeColor) {
                groupItems.push({
                    ty: 'st',
                    nm: 'Stroke',
                    c: { a: 0, k: strokeColor },
                    o: { a: 0, k: 100 },
                    w: { a: 0, k: strokeWidth }
                });
            }

            groupItems.push({
                ty: 'tr',
                nm: 'Transform',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
            });

            shapeItems.push({
                ty: 'gr',
                nm: 'Line Group',
                it: groupItems
            });
        } else if (tagName === 'g') {
            // Process group children with inherited styles
            el.childNodes.forEach(child => {
                if (child instanceof Element) {
                    processElement(child, { fill, stroke: stroke || undefined, strokeWidth });
                }
            });
        }
    };

    // Process all direct children of SVG
    svg.childNodes.forEach(child => {
        if (child instanceof Element) {
            processElement(child);
        }
    });

    if (shapeItems.length === 0) return null;

    const layer: Layer = {
        ind: Date.now(),
        ty: 4,
        nm: 'SVG Import',
        ks: {
            o: { a: 0, k: 100 },
            p: { a: 0, k: [canvasW / 2, canvasH / 2, 0] },
            s: { a: 0, k: [scale * 100, scale * 100, 100] },
            r: { a: 0, k: 0 },
            a: { a: 0, k: [svgW / 2, svgH / 2, 0] }
        },
        ip: 0,
        op: 300,
        st: 0,
        shapes: shapeItems
    };

    return layer;
};

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

    // Check if this is a ShapePath keyframe (s is an array containing an object with v, i, o)
    const isShapePathKeyframe = kfs[0]?.s &&
        Array.isArray(kfs[0].s) &&
        kfs[0].s[0] &&
        Array.isArray(kfs[0].s[0].v);

    // Linear Interpolation
    for (let i = 0; i < kfs.length - 1; i++) {
        const cur = kfs[i];
        const next = kfs[i + 1];
        if (currentTime >= cur.t && currentTime < next.t) {
            const t = (currentTime - cur.t) / (next.t - cur.t);

            // Handle ShapePath interpolation
            if (isShapePathKeyframe) {
                const startPath = cur.s[0];
                const endPath = next.s[0];

                // Both paths must have same number of vertices for morphing
                if (startPath.v.length !== endPath.v.length) {
                    return extract(cur.s);
                }

                // Interpolate each vertex and control point
                const interpolatedPath = {
                    v: startPath.v.map((v: [number, number], idx: number) => [
                        v[0] + (endPath.v[idx][0] - v[0]) * t,
                        v[1] + (endPath.v[idx][1] - v[1]) * t
                    ]),
                    i: startPath.i.map((pt: [number, number], idx: number) => [
                        pt[0] + (endPath.i[idx][0] - pt[0]) * t,
                        pt[1] + (endPath.i[idx][1] - pt[1]) * t
                    ]),
                    o: startPath.o.map((pt: [number, number], idx: number) => [
                        pt[0] + (endPath.o[idx][0] - pt[0]) * t,
                        pt[1] + (endPath.o[idx][1] - pt[1]) * t
                    ]),
                    c: startPath.c
                };

                return interpolatedPath as any;
            }

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
            resolve(new Blob([data as any], { type: 'application/zip' }));
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
