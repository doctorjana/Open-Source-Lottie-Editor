import { create } from 'zustand';
import { type LottieAnimation, type Layer, createDefaultAnimation } from '../types/lottie';
import { FontManager } from '../lib/FontManager';
import { toVector3, toVector2 } from '../lib/lottieUtils';

interface EditorState {
    animation: LottieAnimation;
    selectedLayerId: number | null; // using 'ind' as ID usually
    currentTime: number;
    isPlaying: boolean;
    zoom: number;
    expandedIds: Record<string, boolean>;
    lockedIds: Record<number, boolean>;
    activeTool: 'select' | 'rectangle' | 'circle' | 'star' | 'polygon' | 'pen' | 'text';

    // Actions
    setAnimation: (animation: LottieAnimation) => void;
    updateLayer: (index: number, layer: Partial<Layer>) => void;
    addLayer: (layer: Layer) => void;
    addTextLayer: (text: string) => void;
    deleteLayer: (index: number) => void;
    selectLayer: (index: number | null) => void;
    toggleExpansion: (id: string) => void;
    toggleLock: (id: number) => void;
    setTime: (time: number) => void;
    togglePlayback: () => void;
    setTool: (tool: 'select' | 'rectangle' | 'circle' | 'star' | 'polygon' | 'pen' | 'text') => void;
    addKeyframe: (layerInd: number, propertyPath: string, time: number, value: any) => void;
    toggleAnimation: (layerInd: number, propertyPath: string) => void;
    syncTextToShapes: (layerInd: number) => Promise<void>;
}

export const useStore = create<EditorState>((set) => ({
    animation: createDefaultAnimation(),
    selectedLayerId: null,
    expandedIds: {},
    lockedIds: {},
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    activeTool: 'select',

    setAnimation: (animation) => {
        console.log(`[setAnimation] Total Layers: ${animation.layers.length}, Assets: ${animation.assets?.length || 0}`);
        set({ animation, selectedLayerId: null, currentTime: 0, isPlaying: false });
    },

    updateLayer: (ind, layerUpdate) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind === ind) {
                return { ...layer, ...layerUpdate };
            }
            return layer;
        });
        return { animation: { ...state.animation, layers: newLayers } };
    }),

    addLayer: (layer) => set((state) => ({
        animation: {
            ...state.animation,
            layers: [layer, ...state.animation.layers]
        },
        selectedLayerId: layer.ind,
        activeTool: 'select'
    })),

    addTextLayer: (text) => set((state) => {
        const ind = Date.now();
        const newLayer: Layer = {
            ind,
            ty: 4, // We keep it as a shape layer internally for Lottie compatibility
            nm: `Text: ${text.substring(0, 10)}`,
            text: text,
            font: 'Roboto',
            fontSize: 48,
            ks: {
                o: { a: 0, k: 100 },
                p: { a: 0, k: [960, 540, 0] },
                s: { a: 0, k: [100, 100, 100] },
                r: { a: 0, k: 0 },
                a: { a: 0, k: [0, 0, 0] },
            },
            ip: 0,
            op: state.animation.op,
            st: 0,
            shapes: [] // Will be filled by syncTextToShapes
        };
        return {
            animation: {
                ...state.animation,
                layers: [newLayer, ...state.animation.layers]
            },
            selectedLayerId: ind,
            activeTool: 'select'
        };
    }),

    deleteLayer: (ind) => set((state) => ({
        animation: {
            ...state.animation,
            layers: state.animation.layers.filter(l => l.ind !== ind)
        },
        selectedLayerId: state.selectedLayerId === ind ? null : state.selectedLayerId
    })),

    selectLayer: (id) => set({ selectedLayerId: id, activeTool: 'select' }),

    toggleExpansion: (id) => set((state) => ({
        expandedIds: {
            ...state.expandedIds,
            [id]: !state.expandedIds[id]
        }
    })),

    toggleLock: (id) => set((state) => ({
        lockedIds: {
            ...state.lockedIds,
            [id]: !state.lockedIds[id]
        }
    })),

    setTime: (time) => set({ currentTime: time }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setTool: (tool) => set({ activeTool: tool }),

    addKeyframe: (layerInd, propertyPath, time, value) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const path = propertyPath.split('.');
            let current = newLayer;

            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }

            const prop = current[path[path.length - 1]];
            if (!prop) return layer;

            // Ensure it's animated
            if (prop.a === 0) {
                const staticVal = prop.k;
                let valForKfs = Array.isArray(staticVal) ? staticVal : [staticVal];

                // Hard enforce dimensions for transform properties
                if (propertyPath.endsWith('.p') || propertyPath.endsWith('.a') || propertyPath.endsWith('.s')) {
                    if (propertyPath.includes('.it.') || propertyPath.includes('.shapes.')) {
                        valForKfs = toVector2(staticVal);
                    } else {
                        valForKfs = toVector3(staticVal, propertyPath.endsWith('.s') ? 100 : 0);
                    }
                }

                const dims = valForKfs.length;
                const i_o = {
                    x: Array(dims).fill(0.833),
                    y: Array(dims).fill(0.833)
                };

                prop.a = 1;
                prop.k = [{
                    t: 0,
                    s: JSON.parse(JSON.stringify(valForKfs)),
                    i: JSON.parse(JSON.stringify(i_o)),
                    o: JSON.parse(JSON.stringify({ x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }))
                }];
            }

            const keyframes = prop.k as any[];
            const valArray = Array.isArray(value) ? value : [value];
            const dims = keyframes[0]?.s?.length || valArray.length;

            // Ensure valArray matches dims if it's a scalar being added to a vector
            let finalValArray = valArray;
            if (valArray.length === 1 && dims > 1) {
                finalValArray = Array(dims).fill(valArray[0]);
            }

            const existingKeyframe = keyframes.find(k => Math.abs(k.t - time) < 0.1);

            if (existingKeyframe) {
                existingKeyframe.s = JSON.parse(JSON.stringify(finalValArray));
            } else {
                keyframes.push({
                    t: time,
                    s: JSON.parse(JSON.stringify(finalValArray)),
                    i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                    o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                });
                keyframes.sort((a, b) => a.t - b.t);
            }

            // Sync 'e' (end values) and ensure every kf has i/o
            for (let i = 0; i < keyframes.length; i++) {
                const cur = keyframes[i];
                const next = keyframes[i + 1];
                const curDims = cur.s.length;

                if (next) {
                    cur.e = JSON.parse(JSON.stringify(next.s));
                } else {
                    // Lottie-web needs 'e' to match 's' for the last keyframe in many renderers
                    cur.e = JSON.parse(JSON.stringify(cur.s));
                }

                if (!cur.i) cur.i = { x: Array(curDims).fill(0.833), y: Array(curDims).fill(0.833) };
                if (!cur.o) cur.o = { x: Array(curDims).fill(0.167), y: Array(curDims).fill(0.167) };
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    toggleAnimation: (layerInd, propertyPath) => set((state) => {
        const newLayers = state.animation.layers.map((layer) => {
            if (layer.ind !== layerInd) return layer;

            const newLayer = JSON.parse(JSON.stringify(layer));
            const path = propertyPath.split('.');
            let current = newLayer;

            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }

            const prop = current[path[path.length - 1]];
            if (!prop) return layer;

            if (prop.a === 1) {
                // Switching to static: take value from first keyframe
                let value = Array.isArray(prop.k) ? prop.k[0].s : prop.k;

                // For scalars in ks, Lottie often prefers raw numbers when a=0
                if (Array.isArray(value) && value.length === 1 && (propertyPath.endsWith('.o') || propertyPath.endsWith('.r'))) {
                    value = value[0];
                }

                prop.a = 0;
                prop.k = value;
            } else {
                // Switching to animated
                const staticVal = prop.k;
                let valArray = Array.isArray(staticVal) ? staticVal : [staticVal];

                // Hard enforce dimensions for transform properties
                if (propertyPath.endsWith('.p') || propertyPath.endsWith('.a') || propertyPath.endsWith('.s')) {
                    // Shape group transforms (tr) often prefer Vector2 [x, y]
                    if (propertyPath.includes('.it.') || propertyPath.includes('.shapes.')) {
                        valArray = toVector2(staticVal);
                    } else {
                        valArray = toVector3(staticVal, propertyPath.endsWith('.s') ? 100 : 0);
                    }
                }

                const dims = valArray.length;
                const endTime = state.animation.op - 1;
                prop.a = 1;
                prop.k = [
                    {
                        t: 0,
                        s: JSON.parse(JSON.stringify(valArray)),
                        e: JSON.parse(JSON.stringify(valArray)),
                        i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                        o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                    },
                    {
                        t: endTime,
                        s: JSON.parse(JSON.stringify(valArray)),
                        e: JSON.parse(JSON.stringify(valArray)),
                        i: { x: Array(dims).fill(0.833), y: Array(dims).fill(0.833) },
                        o: { x: Array(dims).fill(0.167), y: Array(dims).fill(0.167) }
                    }
                ];
            }

            return newLayer;
        });

        return { animation: { ...state.animation, layers: newLayers } };
    }),

    syncTextToShapes: async (layerInd) => {
        const state = useStore.getState();
        const layer = state.animation.layers.find(l => l.ind === layerInd);
        if (!layer || !layer.text || !layer.font) return;

        try {
            const font = await FontManager.loadFont(layer.font);
            const shapePaths = FontManager.textToShapes(layer.text, font, layer.fontSize || 48);

            const shapes: any[] = [{
                ty: 'gr',
                nm: 'Text Group',
                it: [
                    ...shapePaths.map((p, i) => ({
                        ty: 'sh',
                        nm: `Glyph ${i}`,
                        ks: { a: 0 as const, k: p }
                    })),
                    {
                        ty: 'fl',
                        nm: 'Fill',
                        c: { a: 0 as const, k: [0.2, 0.2, 0.2] },
                        o: { a: 0 as const, k: 100 }
                    },
                    {
                        ty: 'tr',
                        nm: 'Transform',
                        p: { a: 0 as const, k: [0, 0] },
                        a: { a: 0 as const, k: [0, 0] },
                        s: { a: 0 as const, k: [100, 100] },
                        r: { a: 0 as const, k: 0 },
                        o: { a: 0 as const, k: 100 }
                    }
                ]
            }];

            state.updateLayer(layerInd, { shapes });
        } catch (e) {
            console.error("Sync text failure", e);
        }
    }
}));
