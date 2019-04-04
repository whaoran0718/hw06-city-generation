import { vec2, vec4, vec3 } from "gl-matrix";
import { random2, random1, intersect, random2to1 } from "./utils";
import Terrain from "./Terrain";
import Drawable from "./rendering/gl/Drawable";
import Square from "./geometry/Square";

class Turtle {
    pos: vec2;
    dir: vec2;

    constructor(pos: vec2, dir: vec2) {
        this.pos = vec2.fromValues(pos[0], pos[1]);
        this.dir = vec2.fromValues(dir[0], dir[1]);
    }

    move(len: number) {
        this.pos[0] += this.dir[0] * len;
        this.pos[1] += this.dir[1] * len;
    }

    rotate(angle: number) {
        let s = Math.sin(angle * Math.PI / 180);
        let c = Math.cos(angle * Math.PI / 180);
        let x = this.dir[0];
        let y = this.dir[1];
        this.dir[0] = x * c - y * s;
        this.dir[1] = x * s + y * c;
    }

}

class Highway {
    cross: Array<vec2>;
    roads: Array<vec4>;
    length: number;
    segment: number;
    rayAngle: number;
    rayCount: number;
    raySample: number;
    terrain: Terrain;
    stack: Array<Turtle>;
    tur: Turtle;
    stop: boolean;
    seed: number;

    constructor(len: number, angle: number, ter: Terrain) {
        this.segment = 5;
        this.length = len / this.segment;
        this.rayAngle = angle / this.segment;
        this.rayCount = 5;
        this.raySample = 5;
        this.terrain = ter;
        this.stop = false;
        this.seed = 0;
    }

    process(seed: number, maxIter: number) {
        this.seed = seed;
        this.stop = false;
        this.init();
        let i = 0;
        while(!this.stop && i < maxIter) {
            let stopExtend = false;
            for (let seg = 0; seg < this.segment; seg++) {
                if (!this.extend()) {
                    stopExtend = true;
                    break;
                }
            }
            if (this.terrain.getColor(this.tur.pos[0], this.tur.pos[1], 0) > 0.999) {
                if (!stopExtend) this.branch();
                this.pop();
            }
            else {
                if (stopExtend) this.pop();
            }
            i++;
        }
        return i;
    }

    init() {
        this.cross = new Array<vec2>();
        this.roads = new Array<vec4>();
        this.stack = new Array<Turtle>();
        let n = random2(this.seed, this.seed);
        let land = new Array<vec2>();
        for(let i = 0; i < this.terrain.width; i ++) {
            for(let j = 0; j < this.terrain.height; j++) {
                if (this.terrain.getColor(i, j, 0) > 0.999) {
                    land.push(vec2.fromValues(i, j));
                }
            }
        }
        this.tur = new Turtle(land[Math.floor(n[0] * land.length)], vec2.fromValues(1, 0));
        this.tur.rotate(n[1] * 360);
        this.push();
        this.tur.rotate(180);

    }

    pop() {
        if (this.stack.length > 0) {
            this.tur = this.stack.pop();
        }
        else {
            this.stop = true;
        }
    }

    push() {
        if (this.stop) { return; }
        let newtur = new Turtle(this.tur.pos, this.tur.dir);
        this.stack.unshift(newtur);
    }

    extend() {
        if (this.rayCount < 1) { return; }
        if (this.rayCount < 2) { this.tur.move(this.length); return; }

        let dAngle = this.rayAngle / this.rayCount;
        let dLen = this.length / this.raySample;
        let ms = 0;
        let ma = 0;
        for (let i = 0; i < this.rayCount; i++) {
            let a = -this.rayAngle / 2 + dAngle * (i + random1(this.tur.pos[0] * this.tur.pos[1] + this.seed));
            let s = 0;
            let l = 0;

            let tur = new Turtle(this.tur.pos, this.tur.dir);
            tur.rotate(a);
            for (let j = 0; j < this.raySample; j++) {
                tur.move(dLen);
                if (tur.pos[0] <= 0 || tur.pos[0] > this.terrain.width - 1 || 
                    tur.pos[1] <= 0 || tur.pos[1] > this.terrain.height - 1) {
                    break;
                }
                l += dLen;
                s += this.terrain.getColor(tur.pos[0], tur.pos[1], 1) / l;
            }

            if (s > ms) {
                ms = s;
                ma = a;
            }
        }

        let seg = vec4.create();
        seg.set([this.tur.pos[0], this.tur.pos[1]], 0);
        this.tur.rotate(ma);
        this.tur.move(this.length);
        seg.set([this.tur.pos[0], this.tur.pos[1]], 2);


        
        let hitbound = this.tur.pos[0] <= 0 || this.tur.pos[0] > this.terrain.width - 1 || 
                       this.tur.pos[1] <= 0 || this.tur.pos[1] > this.terrain.height - 1;

        let stopExtend = false;
        if (this.joint(seg) || this.intersect(seg) || hitbound) {
            stopExtend = true;
        }

        this.roads.push(seg);
        return !stopExtend;
    }
    
    branch() {
        this.push();
        let n = random2(this.tur.pos[0] + this.seed, this.tur.pos[1] + this.seed);
        if (n[0] < 0.5) {
            this.tur.rotate(90);
            this.push();
            this.tur.rotate(180);
            this.push();
        }
        else {
            n[1] < 0.5 ? this.tur.rotate(90) : this.tur.rotate(-90);
            this.push();
        }
        let c = vec2.fromValues(this.tur.pos[0], this.tur.pos[1]);
        this.cross.push(c);
    }

    intersect(seg: vec4) {
        let e0 = vec2.fromValues(seg[0], seg[1]);
        let e1 = vec2.fromValues(seg[2], seg[3]);
        let md = vec2.distance(e0, e1) * 1.5;
        let misect = vec2.create();
        let flag = false;
        for (let road of this.roads) {
            let isect = vec2.create();
            let o0 = vec2.fromValues(road[0], road[1]);
            let o1 = vec2.fromValues(road[2], road[3]);

            if (intersect(e0, e1, o0, o1, isect)) {
                let p0 = vec2.fromValues(isect[0] - o0[0], isect[1] - o0[1]);
                let p1 = vec2.fromValues(isect[0] - o1[0], isect[1] - o1[1]);
                let p2 = vec2.fromValues(e0[0] - e1[0], e0[1] - e1[1]);
                let p3 = vec2.fromValues(e0[0] - isect[0], e0[1] - isect[1]);

                if (vec2.dot(p0, p1) <= 0 && vec2.dot(p2, p3) >= 0 && !vec2.equals(isect, e0)) {
                    let d = vec2.distance(isect, e0);
                    if (d < md) {
                        flag = true;
                        md = d;
                        misect[0] = isect[0];
                        misect[1] = isect[1];
                    }
                }
            }
        }

        if (flag) {
            seg[2] = misect[0];
            seg[3] = misect[1];
            this.cross.push(misect);
        }
        return flag;
    }

    joint(seg: vec4) {
        let e0 = vec2.fromValues(seg[0], seg[1]);
        let e1 = vec2.fromValues(seg[2], seg[3]);
        let md = vec2.distance(e0, e1) * 0.5;
        let mc: vec2;
        let flag = false;
        for (let cross of this.cross) {
            let d = vec2.distance(cross, e1);
            if (d < md) {
                flag = true;
                md = d;
                mc = cross;
            }
        }

        if (flag) {
            seg[2] = mc[0];
            seg[3] = mc[1];
            this.intersect(seg);
        }
        return flag;
    }
}

class Street extends Highway {
    width: number;
    height: number;
    direction: vec2;
    highway: Highway;
    root: vec2;

    constructor(width: number, height: number, direction: vec2, root: vec2, highway: Highway) {
        super(0, 0, highway.terrain);
        this.width = width;
        this.height = height;
        this.direction = vec2.fromValues(direction[0], direction[1]);
        this.highway = highway;
        this.root = vec2.fromValues(root[0], root[1]);
    }

    process(seed: number, maxIter: number) {
        this.seed = seed;
        this.stop = false;
        this.init();
        let i = 0;
        while(!this.stop && i < maxIter) {
            if (this.extend()) this.branch();
            this.pop();
            i++;
        }
        return i;
    }

    init() {
        this.cross = this.highway.cross;
        this.roads = new Array<vec4>();
        this.stack = new Array<Turtle>();
        let x = this.root[0];
        let y = this.root[1];
        this.tur = new Turtle(vec2.fromValues(x, y), this.direction);
        this.push();
        this.tur.rotate(180);
    }

    extend() {
        let seg = vec4.create();
        seg.set([this.tur.pos[0], this.tur.pos[1]], 0);
        this.tur.move(Math.abs(vec2.dot(this.tur.dir, this.direction)) < 0.5 ? this.height : this.width);
        seg.set([this.tur.pos[0], this.tur.pos[1]], 2);
        
        if (this.terrain.getColor(this.tur.pos[0], this.tur.pos[1], 0) < 0.999) {
            return false;
        }
        
        let hitbound = this.tur.pos[0] <= 0 || this.tur.pos[0] > this.terrain.width - 1 || 
                       this.tur.pos[1] <= 0 || this.tur.pos[1] > this.terrain.height - 1;

        let stopExtend = false;
        if (this.joint(seg) || this.intersect(seg) || hitbound) {
            stopExtend = true;
        }

        this.roads.push(seg);
        return !stopExtend;
    }
    
    branch() {
        this.push();
        let n = random2(this.tur.pos[0] + this.seed, this.tur.pos[1] + this.seed);
        if (n[0] < 0.8) {
            this.tur.rotate(90);
            this.push();
            this.tur.rotate(180);
            this.push();
        }
        else {
            n[1] < 0.5 ? this.tur.rotate(90) : this.tur.rotate(-90);
            this.push();
        }
        let c = vec2.fromValues(this.tur.pos[0], this.tur.pos[1]);
        this.cross.push(c);
    }

    intersect(seg: vec4) {
        let e0 = vec2.fromValues(seg[0], seg[1]);
        let e1 = vec2.fromValues(seg[2], seg[3]);
        let md = vec2.distance(e0, e1) * 1.5;
        let misect = vec2.create();
        let flag = false;
        for (let i = 0; i < this.highway.roads.length + this.roads.length; i++) {
            let road = i < this.highway.roads.length ? this.highway.roads[i] : this.roads[i - this.highway.roads.length];
            let isect = vec2.create();
            let o0 = vec2.fromValues(road[0], road[1]);
            let o1 = vec2.fromValues(road[2], road[3]);

            if (intersect(e0, e1, o0, o1, isect)) {
                let p0 = vec2.fromValues(isect[0] - o0[0], isect[1] - o0[1]);
                let p1 = vec2.fromValues(isect[0] - o1[0], isect[1] - o1[1]);
                let p2 = vec2.fromValues(e0[0] - e1[0], e0[1] - e1[1]);
                let p3 = vec2.fromValues(e0[0] - isect[0], e0[1] - isect[1]);

                if (vec2.dot(p0, p1) <= 0 && vec2.dot(p2, p3) >= 0 && !vec2.equals(isect, e0)) {
                    let d = vec2.distance(isect, e0);
                    if (d < md) {
                        flag = true;
                        md = d;
                        misect[0] = isect[0];
                        misect[1] = isect[1];
                    }
                }
            }
        }

        if (flag) {
            seg[2] = misect[0];
            seg[3] = misect[1];
            this.cross.push(misect);
        }
        return flag;
    }

    joint(seg: vec4) {
        let e0 = vec2.fromValues(seg[0], seg[1]);
        let e1 = vec2.fromValues(seg[2], seg[3]);
        let md = vec2.distance(e0, e1) * 0.8 * 
                 (this.width > this.height ? this.height / this.width : this.width / this.height);
        let mc: vec2;
        let flag = false;
        for (let cross of this.cross) {
            let d = vec2.distance(cross, e1);
            if (d < md) {
                flag = true;
                md = d;
                mc = cross;
            }
        }

        if (flag) {
            seg[2] = mc[0];
            seg[3] = mc[1];
            this.intersect(seg);
        }
        return flag;
    }
}

class Roadmap {
    highway: Highway;
    streets: Array<Street>;
    blankDistinct: Array<vec2>;
    terrain: Terrain;
    blockWidth: number;
    blockHeight: number;
    sampleCount: number;
    seed: number;

    constructor(highwayLen: number, highwayAngle: number,
                blockWidth: number, blockHeight: number,
                ter: Terrain)
    {
        this.highway = new Highway(highwayLen, highwayAngle, ter);
        this.streets = new Array<Street>();
        this.terrain = ter;
        this.blockWidth = blockWidth;
        this.blockHeight = blockHeight;
        this.sampleCount = 8;
    }

    process(seed: number, iteration: number) {
        this.seed = seed;
        this.highway.process(seed, iteration);
        this.terrain.rast.process(this.highway.roads, 0.008 * this.terrain.width);
        this.terrain.rast.partition();
        this.terrain.drawBlocks();
        this.terrain.rast.blocks.forEach(block => {
            let oripix = block[0];
            let rand = random2to1(oripix[0], oripix[1]);
            for (let i = 0; i < block.length; i++) {
                let idx = Math.floor(random1(rand) * block.length);
                if (this.generateStreet(block[idx])) break;
            }
        });
        this.streets.forEach(street => {
            this.terrain.rast.process(street.roads, 0.0025 * this.terrain.width);
        });
    }

    generateStreet(root: vec2) {
        let dir = vec2.create();
        let dist = vec4.create();
        this.sampleDirection(root, dir, dist);
        let str = new Street(this.blockWidth, this.blockHeight, dir, root, this.highway);
        let step = str.process(random1(root[0] + root[1] * this.terrain.width + this.seed), 1000);

        if (str.roads.length > 0) {
            this.streets.push(str);
            return true;
        }
        return false;
    }

    sampleDirection(pos: vec2, dir: vec2, dist: vec4) {
        let dAngle = 180.0 / this.sampleCount;
        let maxDir = vec2.create();
        let md = vec2.create();
        for (let i = 0; i < this.sampleCount; i++) {
            let a = dAngle * (i + random1(pos[0] * pos[1] + this.seed));
            let x = Math.cos(a * Math.PI / 180);
            let y = Math.sin(a * Math.PI / 180);
            let d0 = this.intersect(pos, vec2.fromValues(x, y));
            let d1 = this.intersect(pos, vec2.fromValues(-x, -y));
            if (d0 + d1 > md[0] + md[1]) {
                md[0] = d0;
                md[1] = d1;
                maxDir[0] = x;
                maxDir[1] = y;
            }
        }

        dir[0] = maxDir[0];
        dir[1] = maxDir[1];
        dist[0] = md[0];
        dist[1] = -md[1];
        dist[2] = this.intersect(pos, vec2.fromValues(-maxDir[1], maxDir[0]))
        dist[3] = -this.intersect(pos, vec2.fromValues(maxDir[1], -maxDir[0]));
    }

    intersect(pos: vec2, dir: vec2) {
        let e0 = vec2.fromValues(pos[0], pos[1]);
        let e1 = vec2.fromValues(pos[0] + dir[0], pos[1] + dir[1]);

        let md = this.terrain.width * this.terrain.height;
        let flag = false;
        for (let road of this.highway.roads) {
            let isect = vec2.create();
            let o0 = vec2.fromValues(road[0], road[1]);
            let o1 = vec2.fromValues(road[2], road[3]);

            if (intersect(e0, e1, o0, o1, isect)) {
                let p0 = vec2.fromValues(isect[0] - o0[0], isect[1] - o0[1]);
                let p1 = vec2.fromValues(isect[0] - o1[0], isect[1] - o1[1]);
                let p2 = vec2.fromValues(e0[0] - e1[0], e0[1] - e1[1]);
                let p3 = vec2.fromValues(e0[0] - isect[0], e0[1] - isect[1]);

                if (vec2.dot(p0, p1) <= 0 && vec2.dot(p2, p3) >= 0) {
                    let d = vec2.distance(isect, e0);
                    if (d < md) {
                        flag = true;
                        md = d;
                    }
                }
            }
        }

        let p = vec2.fromValues(pos[0], pos[1]);
        let toSea = 0;
        while (p[0] >= 0 && p[0] < this.terrain.width &&
               p[1] >= 0 && p[1] < this.terrain.height)
        {
            if (this.terrain.getColor(p[0], p[1], 0) < 0.999) {
                if (flag) { return toSea < md ? toSea : md; }
                else { return toSea; }
            }

            toSea++;
            p[0] = pos[0] + toSea * dir[0];
            p[1] = pos[1] + toSea * dir[1];
        }
        
        return flag ? md : toSea;
    }

    instance(highwayMesh: Square, streetMesh: Square) {
        highwayMesh.create();
        let offsetsArray = [];
        let colorsArray = [];
        for (let segment of this.highway.roads) {
            offsetsArray.push(segment[0] / this.terrain.width - 0.5);
            offsetsArray.push(segment[1] / this.terrain.height - 0.5);
            offsetsArray.push(segment[2] / this.terrain.width - 0.5);
            offsetsArray.push(segment[3] / this.terrain.height - 0.5);

            colorsArray.push(0);
            colorsArray.push(0);
            colorsArray.push(0);
            colorsArray.push(1);
        }
        let offsets: Float32Array = new Float32Array(offsetsArray);
        let colors: Float32Array = new Float32Array(colorsArray);
        highwayMesh.setInstanceVBOs(offsets, colors);
        highwayMesh.setNumInstances(this.highway.roads.length);

        streetMesh.create();
        let strOffsetsArray = [];
        let strColorsArray = [];
        for (let street of this.streets) {
            for (let segment of street.roads) {
                strOffsetsArray.push(segment[0] / this.terrain.width - 0.5);
                strOffsetsArray.push(segment[1] / this.terrain.height - 0.5);
                strOffsetsArray.push(segment[2] / this.terrain.width - 0.5);
                strOffsetsArray.push(segment[3] / this.terrain.height - 0.5);

                strColorsArray.push(0);
                strColorsArray.push(0);
                strColorsArray.push(0);
                strColorsArray.push(0);
            }
        }
        let strOffsets = new Float32Array(strOffsetsArray);
        let strColors = new Float32Array(strColorsArray);
        streetMesh.setInstanceVBOs(strOffsets, strColors);
        streetMesh.setNumInstances(strColorsArray.length / 4);
    }
}

export default Roadmap;
export { Highway, Street };