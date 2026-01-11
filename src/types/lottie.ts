export interface LottieAnimation {
    v: string; // Version
    fr: number; // Frame Rate
    ip: number; // In Point
    op: number; // Out Point
    w: number; // Width
    h: number; // Height
    nm: string; // Name
    ddd: number; // 3D
    assets: Asset[];
    layers: Layer[];
}

export interface Asset {
    id: string;
    w?: number;
    h?: number;
    u?: string;
    p?: string;
    e?: number;
    layers?: Layer[];
}

export interface Layer {
    ddd?: number; // 3D Layer
    ind: number; // Index
    ty: number; // Type (4: Shape, 0: Precomp, 1: Solid, 2: Image, 3: Null, 5: Text)
    nm: string; // Name
    sr?: number;
    ks: Transform; // Transform
    ao?: number;
    ip: number; // In Point
    op: number; // Out Point
    st: number; // Start Time
    bm?: number;
    hasMask?: boolean;
    shapes?: ShapeElement[]; // For Shape Layers
    w?: number; // Width (Solids/Images)
    h?: number; // Height (Solids/Images)
    sc?: string; // Solid Color (hex)
    refId?: string; // Reference ID (for Assets)
    hd?: boolean; // Hidden

    // Text Properties (Custom for Editor, syncs to shapes)
    text?: string;
    font?: string;
    fontSize?: number;
}

export interface Transform {
    o: Value<number>; // Opacity
    r?: Value<number>; // Rotation
    p: Value<AnyVector> | PositionValue; // Position
    a: Value<AnyVector>; // Anchor Point
    s: Value<AnyVector>; // Scale
}

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type AnyVector = Vector2 | Vector3;

export interface Value<T> {
    a: 0 | 1; // 0: Static, 1: Animated
    k: T | Keyframe<T>[];
    ix?: number;
}

export interface PositionValue {
    a: 0 | 1;
    k: AnyVector | Keyframe<AnyVector>[];
    ix?: number;
    s?: boolean; // Separate dimensions?
    x?: Value<number>;
    y?: Value<number>;
}

export interface Keyframe<T> {
    t: number; // Time
    s: T; // Start Value
    e?: T; // End Value
    i?: BezierHandle; // In Tangent
    o?: BezierHandle; // Out Tangent
    h?: number;
}

export interface BezierHandle {
    x: number | number[];
    y: number | number[];
}

export interface ShapeElement {
    ty: string; // Type (gr: Group, sh: Path, rc: Rect, el: Ellipse, fl: Fill, st: Stroke, tr: Transform, sr: Star)
    nm?: string;
    matchName?: string;
    it?: ShapeElement[]; // For Groups

    // Specific properties based on type
    p?: Value<AnyVector>; // Position for Rect/Ellipse/Star
    s?: Value<AnyVector>; // Size for Rect/Ellipse
    r?: Value<number>; // Roundness for Rect or Rotation

    c?: Value<AnyVector>; // Color for Fill/Stroke
    o?: Value<number>; // Opacity for Fill/Stroke
    w?: Value<number>; // Width for Stroke
    a?: Value<AnyVector>; // Anchor Point for Transform

    // Path (sh)
    ks?: Value<ShapePath>;

    // Stroke (st)
    lc?: number; // Line Cap
    lj?: number; // Line Join
    ml?: number; // Miter Limit

    // Star/Polygon (sr)
    sy?: number; // Star Type (1: Star, 2: Polygon)
    pt?: Value<number>; // Points
    ir?: Value<number>; // Inner Radius
    is?: Value<number>; // Inner Roundness
    or?: Value<number>; // Outer Radius
    os?: Value<number>; // Outer Roundness
}

export interface ShapePath {
    i: [number, number][]; // In-tangents
    o: [number, number][]; // Out-tangents
    v: [number, number][]; // Vertices
    c: boolean; // Closed
}

// Helper to create defaults
export const createDefaultAnimation = (): LottieAnimation => ({
    v: "5.5.7",
    fr: 60,
    ip: 0,
    op: 300,
    w: 1920,
    h: 1080,
    nm: "New Animation",
    ddd: 0,
    assets: [],
    layers: []
});
