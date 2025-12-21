class NYTriangulation {
    
    /**
     * Triangulates a set of points forming a polygon using Bowyer-Watson algorithm
     * and filters triangles that are outside the polygon boundary.
     * @param {Array} points - Array of objects with x and y properties
     * @returns {Array} Array of triangles, where each triangle is [p1, p2, p3]
     */
    static triangulate(points) {
        if (points.length < 3) return [];

        // 1. Setup Supertriangle
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }

        let dx = maxX - minX;
        let dy = maxY - minY;
        let deltaMax = Math.max(dx, dy);
        let midX = (minX + maxX) / 2;
        let midY = (minY + maxY) / 2;

        // Create supertriangle vertices (large enough to encompass all points)
        let stP1 = { x: midX - 20 * deltaMax, y: midY - deltaMax };
        let stP2 = { x: midX, y: midY + 20 * deltaMax };
        let stP3 = { x: midX + 20 * deltaMax, y: midY - deltaMax };

        // Triangle list
        let triangulation = [{ p1: stP1, p2: stP2, p3: stP3 }];

        // 2. Add each point
        for (let p of points) {
            let badTriangles = [];

            // Find triangles whose circumcircle contains the point
            for (let t of triangulation) {
                if (NYTriangulation.isPointInCircumcircle(p, t)) {
                    badTriangles.push(t);
                }
            }

            let polygon = [];
            
            // Find boundary of the polygonal hole
            for (let t of badTriangles) {
                NYTriangulation.addEdgeToPolygon(polygon, t.p1, t.p2);
                NYTriangulation.addEdgeToPolygon(polygon, t.p2, t.p3);
                NYTriangulation.addEdgeToPolygon(polygon, t.p3, t.p1);
            }

            // Remove bad triangles
            triangulation = triangulation.filter(t => !badTriangles.includes(t));

            // Re-triangulate the polygonal hole
            for (let edge of polygon) {
                triangulation.push({ p1: edge.p1, p2: edge.p2, p3: p });
            }
        }

        // 3. Remove triangles connected to supertriangle
        triangulation = triangulation.filter(t => 
            t.p1 !== stP1 && t.p1 !== stP2 && t.p1 !== stP3 &&
            t.p2 !== stP1 && t.p2 !== stP2 && t.p2 !== stP3 &&
            t.p3 !== stP1 && t.p3 !== stP2 && t.p3 !== stP3
        );

        // 4. Filter triangles that are outside the original polygon
        // This is necessary because Delaunay triangulates the convex hull
        let finalTriangles = [];
        for(let t of triangulation) {
            let cx = (t.p1.x + t.p2.x + t.p3.x) / 3;
            let cy = (t.p1.y + t.p2.y + t.p3.y) / 3;
            
            if(NYTriangulation.isPointInPolygon(cx, cy, points)) {
                finalTriangles.push([t.p1, t.p2, t.p3]);
            }
        }

        return finalTriangles;
    }

    static isPointInCircumcircle(p, t) {
        let ax = t.p1.x, ay = t.p1.y;
        let bx = t.p2.x, by = t.p2.y;
        let cx = t.p3.x, cy = t.p3.y;

        let d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        let ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        let uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
        
        let rSq = (ux - ax) * (ux - ax) + (uy - ay) * (uy - ay);
        let distSq = (p.x - ux) * (p.x - ux) + (p.y - uy) * (p.y - uy);

        // Use a small epsilon for float comparison if needed, but strict < is usually fine
        return distSq < rSq;
    }

    static addEdgeToPolygon(polygon, p1, p2) {
        // Check if edge (p1, p2) or (p2, p1) already exists
        // If it does, it's a shared edge -> remove it
        // If not, add it
        
        for (let i = 0; i < polygon.length; i++) {
            let edge = polygon[i];
            if ((edge.p1 === p1 && edge.p2 === p2) || (edge.p1 === p2 && edge.p2 === p1)) {
                polygon.splice(i, 1);
                return;
            }
        }
        polygon.push({ p1: p1, p2: p2 });
    }

    static isPointInPolygon(x, y, polygon) {
        // Ray-casting algorithm
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            let xi = polygon[i].x, yi = polygon[i].y;
            let xj = polygon[j].x, yj = polygon[j].y;

            let intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
