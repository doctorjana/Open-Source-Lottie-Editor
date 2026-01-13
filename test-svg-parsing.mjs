// Test script to verify SVG path parsing and compare with original coordinates

/**
 * Parses an SVG path "d" attribute into Lottie ShapePaths.
 * (Copied from lottieUtils.ts for testing)
 */
const parseSvgPathD = (d) => {
    const paths = [];
    let currentPath = { v: [], i: [], o: [], c: false };

    const tokens = d.match(/([MLHVCSQTAZmlhvcsqtaz])|(-?\d*\.?\d+(?:e[+-]?\d+)?)/gi) || [];

    let i = 0;
    let lastX = 0, lastY = 0;
    let lastCmd = '';
    let lastCx = 0, lastCy = 0;

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
            } else if (cmd === 'Z') {
                currentPath.c = true;
            }
        } else {
            i++;
        }
    }

    if (currentPath.v.length > 0) paths.push(currentPath);
    return paths;
};

// Test cases
console.log("=== SVG Path Parsing Test ===\n");

// Test 1: Simple triangle (from our test SVG)
const trianglePath = "M50,10 L80,50 L20,50 Z";
console.log("Test 1: Triangle path");
console.log("SVG path:", trianglePath);
console.log("Expected vertices: (50,10), (80,50), (20,50)");
const triangleResult = parseSvgPathD(trianglePath);
console.log("Lottie result:");
console.log("  Vertices (v):", JSON.stringify(triangleResult[0].v));
console.log("  In-tangents (i):", JSON.stringify(triangleResult[0].i));
console.log("  Out-tangents (o):", JSON.stringify(triangleResult[0].o));
console.log("  Closed (c):", triangleResult[0].c);
console.log("");

// Test 2: Simple square using L commands
const squarePath = "M0,0 L100,0 L100,100 L0,100 Z";
console.log("Test 2: Square path");
console.log("SVG path:", squarePath);
console.log("Expected vertices: (0,0), (100,0), (100,100), (0,100)");
const squareResult = parseSvgPathD(squarePath);
console.log("Lottie result:");
console.log("  Vertices (v):", JSON.stringify(squareResult[0].v));
console.log("");

// Test 3: Relative coordinates
const relativePath = "M10,10 l20,0 l0,20 l-20,0 z";
console.log("Test 3: Relative square path");
console.log("SVG path:", relativePath);
console.log("Expected vertices: (10,10), (30,10), (30,30), (10,30)");
const relativeResult = parseSvgPathD(relativePath);
console.log("Lottie result:");
console.log("  Vertices (v):", JSON.stringify(relativeResult[0].v));
console.log("");

// Test 4: Bezier curve
const bezierPath = "M0,0 C25,0 75,100 100,100";
console.log("Test 4: Cubic Bezier curve");
console.log("SVG path:", bezierPath);
console.log("Expected:");
console.log("  Start: (0,0) with out-tangent to control point 1 (25,0)");
console.log("  End: (100,100) with in-tangent from control point 2 (75,100)");
const bezierResult = parseSvgPathD(bezierPath);
console.log("Lottie result:");
console.log("  Vertices (v):", JSON.stringify(bezierResult[0].v));
console.log("  In-tangents (i):", JSON.stringify(bezierResult[0].i));
console.log("  Out-tangents (o):", JSON.stringify(bezierResult[0].o));
console.log("");

// Explain the difference
console.log("=== Key Difference: SVG vs Lottie Bezier Representation ===");
console.log("");
console.log("SVG uses ABSOLUTE control points:");
console.log("  C x1,y1 x2,y2 x,y");
console.log("  - (x1,y1): first control point (absolute position)");
console.log("  - (x2,y2): second control point (absolute position)");
console.log("  - (x,y): end point (absolute position)");
console.log("");
console.log("Lottie uses RELATIVE offsets from vertices:");
console.log("  - v: vertex positions (same as SVG endpoints)");
console.log("  - o: out-tangent OFFSET from previous vertex to control point 1");
console.log("  - i: in-tangent OFFSET from current vertex to control point 2");
console.log("");
console.log("For the bezier above:");
console.log("  SVG: Start=(0,0), CP1=(25,0), CP2=(75,100), End=(100,100)");
console.log("  Lottie:");
console.log("    v[0]=(0,0), o[0]=(25-0, 0-0)=(25,0) <-- offset from v[0] to CP1");
console.log("    v[1]=(100,100), i[1]=(75-100, 100-100)=(-25,0) <-- offset from v[1] to CP2");
