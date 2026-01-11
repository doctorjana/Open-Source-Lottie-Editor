import opentype from 'opentype.js';
import { type ShapePath } from '../types/lottie';

export interface FontMetadata {
    family: string;
    variants: string[];
    subsets: string[];
    category: string;
}

export class FontManager {
    private static fonts: FontMetadata[] = [];
    private static cache: Record<string, opentype.Font> = {};

    static async getFonts(): Promise<FontMetadata[]> {
        if (this.fonts.length > 0) return this.fonts;

        try {
            const response = await fetch('https://fonts.google.com/metadata/fonts');
            const text = await response.text();
            // Remove the XSSI prefix if present
            const jsonText = text.startsWith(")]}'") ? text.substring(4) : text;
            const data = JSON.parse(jsonText);

            this.fonts = data.familyMetadataList.map((f: any) => ({
                family: f.family,
                variants: Object.keys(f.fonts),
                category: f.category,
                subsets: f.subsets
            }));
            return this.fonts;
        } catch (e) {
            console.error("Failed to fetch Google Fonts", e);
            // Fallback
            return [
                { family: 'Roboto', variants: ['regular', '700'], category: 'sans-serif', subsets: ['latin'] },
                { family: 'Open Sans', variants: ['regular', '700'], category: 'sans-serif', subsets: ['latin'] },
                { family: 'Lato', variants: ['regular', '700'], category: 'sans-serif', subsets: ['latin'] },
                { family: 'Montserrat', variants: ['regular', '700'], category: 'sans-serif', subsets: ['latin'] },
            ];
        }
    }

    static async loadFont(family: string, variant: string = 'regular'): Promise<opentype.Font> {
        const cacheKey = `${family}-${variant}`;
        if (this.cache[cacheKey]) return this.cache[cacheKey];

        // Format family for Google Fonts URL
        const urlFamily = family.replace(/ /g, '+');
        // We need a direct TTF/OTF link. Google Fonts API usually serves CSS.
        // A hacky way to get a direct link for opentype.js is to use a service like Font Source or similar,
        // but for a robust editor, we might need a more reliable way.
        // For now, let's try a standard construction or just use the Google API if we can find the URL.

        // Actually, many "text to shapes" implementations use a proxy or specific URL structure.
        // Let's try to find a direct .ttf URL. 
        // Example: https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf

        const url = `https://fonts.gstatic.com/s/${family.toLowerCase().replace(/ /g, '')}/v1/regular.ttf`;
        // WARNING: This URL structure might be too simplistic and fail for most fonts.
        // A better way is to parse the CSS from Google Fonts to get the src url.

        try {
            const cssUrl = `https://fonts.googleapis.com/css?family=${urlFamily}:${variant}`;
            const cssResponse = await fetch(cssUrl);
            const cssText = await cssResponse.text();
            const match = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+)\)/);

            if (!match) throw new Error("Could not find font URL in CSS");
            const fontUrl = match[1];

            const font = await opentype.load(fontUrl);
            this.cache[cacheKey] = font;
            return font;
        } catch (e) {
            console.error(`Failed to load font ${family}`, e);
            throw e;
        }
    }

    static textToShapes(text: string, font: opentype.Font, fontSize: number): ShapePath[] {
        const paths: ShapePath[] = [];
        const x = 0;
        const y = 0;
        const fontScale = 1 / font.unitsPerEm * fontSize;

        const glyphs = font.stringToGlyphs(text);
        let cursorX = x;

        glyphs.forEach(glyph => {
            const path = glyph.getPath(cursorX, y, fontSize);
            const segments: ShapePath = {
                v: [],
                i: [],
                o: [],
                c: true
            };

            path.commands.forEach(cmd => {
                if (cmd.type === 'M' || cmd.type === 'L') {
                    segments.v.push([cmd.x, cmd.y]);
                    segments.i.push([0, 0]);
                    segments.o.push([0, 0]);
                } else if (cmd.type === 'Q') {
                    // Quadratic to Cubic conversion for Lottie
                    // Cubic handle 1 = 1/3 start + 2/3 control
                    // Cubic handle 2 = 1/3 end + 2/3 control
                    const prev = segments.v[segments.v.length - 1];
                    const c1: [number, number] = [
                        prev[0] + 2 / 3 * (cmd.x1 - prev[0]),
                        prev[1] + 2 / 3 * (cmd.y1 - prev[1])
                    ];
                    const c2: [number, number] = [
                        cmd.x + 2 / 3 * (cmd.x1 - cmd.x),
                        cmd.y + 2 / 3 * (cmd.y1 - cmd.y)
                    ];

                    // Lottie segments store tangents relative to vertices
                    // Out-tangent of prev point
                    segments.o[segments.o.length - 1] = [c1[0] - prev[0], c1[1] - prev[1]];

                    // In-tangent of current point
                    segments.v.push([cmd.x, cmd.y]);
                    segments.i.push([c2[0] - cmd.x, c2[1] - cmd.y]);
                    segments.o.push([0, 0]);
                } else if (cmd.type === 'C') {
                    const prev = segments.v[segments.v.length - 1];
                    segments.o[segments.o.length - 1] = [cmd.x1 - prev[0], cmd.y1 - prev[1]];
                    segments.v.push([cmd.x, cmd.y]);
                    segments.i.push([cmd.x2 - cmd.x, cmd.y2 - cmd.y]);
                    segments.o.push([0, 0]);
                } else if (cmd.type === 'Z') {
                    segments.c = true;
                }
            });

            if (segments.v.length > 0) {
                paths.push(segments);
            }
            cursorX += (glyph.advanceWidth || 0) * fontScale;
        });

        return paths;
    }
}
