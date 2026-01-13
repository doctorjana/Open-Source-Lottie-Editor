import { type ShapePath, type Layer } from '../types/lottie';

export interface IconMetadata {
    name: string;
    version: number;
    unsupported_families: string[];
    categories: string[];
    tags: string[];
    sizes_px: number[];
}

export class IconManager {
    private static iconList: IconMetadata[] = [];
    private static baseUrl = 'https://fonts.google.com/metadata/icons';

    static async getIcons(): Promise<IconMetadata[]> {
        if (this.iconList.length > 0) return this.iconList;

        try {
            const response = await fetch(this.baseUrl);
            const text = await response.text();
            // Remove XSSI prefix
            const jsonText = text.startsWith(")]}'") ? text.substring(4) : text;
            const data = JSON.parse(jsonText);
            this.iconList = data.icons;
            return this.iconList;
        } catch (e) {
            console.error("Failed to fetch Material Icons", e);
            return [];
        }
    }

    static getIconSvgUrl(iconName: string, family: string = 'materialicons'): string {
        // Material Icons usually follow this pattern for SVGs in their repo/CDN
        return `https://fonts.gstatic.com/s/i/${family}/${iconName}/v1/24px.svg`;
    }

    /**
     * Parses a simple SVG path "d" attribute into Lottie ShapePaths.
     * Note: This is a simplified parser for Material Icons which mostly use M, L, C, Q, Z.
     */
    static parseSvgPath(d: string): ShapePath[] {
        const paths: ShapePath[] = [];
        let currentPath: ShapePath = { v: [], i: [], o: [], c: false };

        // Basic tokenizer: split by commands but keep them
        const tokens = d.match(/([MLCQZmlcqz])|(-?\d*\.?\d+)/g) || [];

        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];
            if (/[MLCQZmlcqz]/.test(token)) {
                const cmd = token;
                i++;

                if (cmd.toUpperCase() === 'M') {
                    if (currentPath.v.length > 0) paths.push(currentPath);
                    currentPath = { v: [], i: [], o: [], c: false };
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    currentPath.v.push([x, y]);
                    currentPath.i.push([0, 0]);
                    currentPath.o.push([0, 0]);
                } else if (cmd.toUpperCase() === 'L') {
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    currentPath.v.push([x, y]);
                    currentPath.i.push([0, 0]);
                    currentPath.o.push([0, 0]);
                } else if (cmd.toUpperCase() === 'C') {
                    const x1 = parseFloat(tokens[i++]);
                    const y1 = parseFloat(tokens[i++]);
                    const x2 = parseFloat(tokens[i++]);
                    const y2 = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);

                    const prevV = currentPath.v[currentPath.v.length - 1];
                    // Update out-tangent of previous vertex
                    currentPath.o[currentPath.o.length - 1] = [x1 - prevV[0], y1 - prevV[1]];

                    // Add new vertex with its in-tangent
                    currentPath.v.push([x, y]);
                    currentPath.i.push([x2 - x, y2 - y]);
                    currentPath.o.push([0, 0]);
                } else if (cmd.toUpperCase() === 'Q') {
                    const x1 = parseFloat(tokens[i++]);
                    const y1 = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);

                    const prevV = currentPath.v[currentPath.v.length - 1];
                    // Quadratic to Cubic conversion
                    const c1: [number, number] = [
                        prevV[0] + 2 / 3 * (x1 - prevV[0]),
                        prevV[1] + 2 / 3 * (y1 - prevV[1])
                    ];
                    const c2: [number, number] = [
                        x + 2 / 3 * (x1 - x),
                        y + 2 / 3 * (y1 - y)
                    ];

                    currentPath.o[currentPath.o.length - 1] = [c1[0] - prevV[0], c1[1] - prevV[1]];
                    currentPath.v.push([x, y]);
                    currentPath.i.push([c2[0] - x, c2[1] - y]);
                    currentPath.o.push([0, 0]);
                } else if (cmd.toUpperCase() === 'Z') {
                    currentPath.c = true;
                }
            } else {
                // If it's a number without a command, it's usually a continuation of the last command
                // For simplicity, we might assume 'L' or handle based on context, 
                // but many SVG paths are well-formed with commands.
                i++;
            }
        }

        if (currentPath.v.length > 0) paths.push(currentPath);
        return paths;
    }

    static async fetchIconSvgPath(iconName: string): Promise<string> {
        const url = this.getIconSvgUrl(iconName);
        try {
            const response = await fetch(url);
            const svgText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const pathElement = doc.querySelector('path');
            return pathElement?.getAttribute('d') || '';
        } catch (e) {
            console.error(`Failed to fetch SVG for ${iconName}`, e);
            return '';
        }
    }

    static applyPreset(layer: Layer, preset: 'draw-in' | 'scale-in' | 'fade-in'): void {
        const duration = 30; // 1 second at 30fps

        if (preset === 'draw-in') {
            // Add Trim Paths
            if (layer.shapes) {
                const trimPaths = {
                    ty: 'tm',
                    nm: 'Trim Paths',
                    s: { a: 0 as const, k: 0 },
                    e: {
                        a: 1 as const,
                        k: [
                            { t: 0, s: 0, e: 100, i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] } },
                            { t: duration, s: 100, e: 100, i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] } }
                        ]
                    },
                    o: { a: 0 as const, k: 0 },
                    m: 1
                };
                // Find first group or add to root shapes
                const group = layer.shapes.find((s: any) => s.ty === 'gr');
                if (group && group.it) {
                    group.it.push(trimPaths as any);
                } else {
                    layer.shapes.push(trimPaths as any);
                }
            }
        } else if (preset === 'scale-in') {
            layer.ks.s = {
                a: 1,
                k: [
                    { t: 0, s: [0, 0, 100], e: [100, 100, 100], i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] } },
                    { t: duration, s: [100, 100, 100] }
                ]
            } as any;
        } else if (preset === 'fade-in') {
            layer.ks.o = {
                a: 1,
                k: [
                    { t: 0, s: 0, e: 100, i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] } },
                    { t: duration, s: 100 }
                ]
            } as any;
        }
    }
}
