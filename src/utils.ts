import { vec2, vec3 } from "gl-matrix";

function random1(x: number){
    let d = Math.sin(x * 127.1) * 43758.5453;
    return d - Math.floor(d);
}

function random2(x: number, y: number) {
    let p = vec2.fromValues(x, y);
    let d1 = Math.sin(vec2.dot(p, vec2.fromValues(127.1, 311.7))) * 43758.5453;
    let d2 = Math.sin(vec2.dot(p, vec2.fromValues(269.5, 183.3))) * 43758.5453;
    return vec2.fromValues(d1 - Math.floor(d1), d2 - Math.floor(d2));
}

function random2to1(x: number, y: number) {
    let d = Math.sin(vec2.dot(vec2.fromValues(x, y), vec2.fromValues(127.1, 311.7))) * 43758.5453;
    return d - Math.floor(d);
}

function smoothstep(edge0: number, edge1: number, x: number) {
    let t = Math.min(1.0, Math.max(0.0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

function bias(b: number, t: number) {
    return Math.pow(t, Math.log(b) / Math.log(0.5));
}

function intersect(e0: vec2, e1: vec2, o0: vec2, o1: vec2, isect: vec2) {
    // convert to Ax + By = C form
    let A1 = e1[1] - e0[1];
    let B1 = e0[0] - e1[0];
    let C1 = A1 * e0[0] + B1 * e0[1];

    let A2 = o1[1] - o0[1];
    let B2 = o0[0] - o1[0];
    let C2 = A2 * o0[0] + B2 * o0[1];

    let det = A1 * B2 - A2 * B1;

    // parallel lines
    if (Math.abs(det) < 1e-5) {
        return false;
    } 
    else { 
        isect[0] = (B2 * C1 - B1 * C2) / det;
        isect[1] = (A1 * C2 - A2 * C1) / det;
        return true;
    }
}

class Voronoi {
    samples: Array<vec2>;
    width: number;
    height: number;
    column: number;
    row: number;
    size: number;
    seed: number;

    constructor(width: number, height: number, size: number, seed: number) {
        this.width = width;
        this.height = height;
        this.size = size;
        this.seed = seed; 

        this.row = Math.ceil(height / size) + 2;
        this.column = Math.ceil(width / size) + 2;
        this.samples = new Array<vec2>(this.column * this.row);
        for (let j = 0; j < this.row; j++) {
            for (let i = 0; i < this.column; i++) {
                this.samples[j * this.column + i] = random2(i + this.seed, j + this.seed);
            }
        }
    }

    voronoi(pos: vec2, out: vec3, out2: vec3) {
        let p = vec2.create();
        vec2.scale(p, pos, 1 / this.size);
        let n = vec2.create();
        vec2.floor(n, p);
        vec2.subtract(p, p, n);
    
        let md = this.size * this.size;
        let md2 = this.size * this.size;
        let mg = vec2.create();
        let mg2 = vec2.create();
        for (let j = -1; j <= 1; j++) {
            for (let i = -1; i <= 1; i++) {
                let idx = (j + n[1] + 1) * this.column + (i + n[0] + 1);
                let g = vec2.fromValues(i, j);
                vec2.add(g, g, this.samples[idx]);
                let d = vec2.distance(g, p);
    
                if (d < md) {
                    md2 = md;
                    md = d;
                    mg2 = mg;
                    mg = g;
                }
                else if (d < md2) {
                    md2 = d;
                    mg2 = g;
                }
            }
        }
        vec2.add(mg, mg, n);
        vec2.scale(mg, mg, this.size);
        vec2.add(mg2, mg2, n);
        vec2.scale(mg2, mg2, this.size);
        out.set([mg[0], mg[1], md]);
        out2.set([mg2[0], mg2[1], md2]);
    }
}

export { random1, random2, random2to1, smoothstep, intersect, bias };
export default Voronoi;