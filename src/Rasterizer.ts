import Terrain from "./Terrain";
import { vec2, vec4 } from "gl-matrix";

class Rasterizer {
    canvas: Array<boolean>;
    blocks: Array<Array<vec2>>;
    width: number;
    height: number;

    constructor(ter: Terrain){
        this.width = ter.width;
        this.height = ter.height;
        this.canvas = new Array<boolean>(this.width * this.height);
        for (let i = 0; i < this.canvas.length; i++) {
            this.canvas[i] = ter.terrainMap.data[4 * i] / 255 > 0.999;
        }
        this.blocks = new Array<Array<vec2>>();
    }

    process(segs: Array<vec4>, thickness: number) {
        segs.forEach(seg => {
            let p1 = vec2.create();
            let p2 = vec2.create();
            let p3 = vec2.create();
            let p4 = vec2.create();
            this.quadrangulate(seg, thickness, p1, p2, p3, p4);
            this.removeInvalidPixel(p1, p2, p3, thickness);
            this.removeInvalidPixel(p3, p4, p1, thickness);
        });
    }

    removeInvalidPixel(p1: vec2, p2: vec2, p3: vec2, thickness: number) {
        let boundY = vec2.create();
        this.getBoundY(p1, p2, p3, boundY);
        for (let y = boundY[0]; y <= boundY[1]; y++) {
            let boundX = vec2.create();
            this.rasterizeTriangle(p1, p2, p3, y, boundX);
            boundX[0] = Math.max(0, boundX[0]);
            boundX[1] = Math.min(this.width, boundX[1]);
            for (let x = boundX[0]; x < boundX[1]; x++) {
                this.canvas[x + y * this.width] = false;
            }
        }
    }

    getBoundY(p1: vec2, p2: vec2, p3: vec2, out: vec2) {
        out[0] = Math.max(0, Math.floor(Math.min(p1[1], Math.min(p2[1], p3[1]))));
        out[1] = Math.min(this.height - 1, Math.floor(Math.max(p1[1], Math.max(p2[1], p3[1]))));
    }

    rasterizeTriangle(p1: vec2, p2: vec2, p3: vec2, y: number, out: vec2) {
        let edge1 = [p1, p2];
        let edge2 = [p2, p3];
        let edge3 = [p3, p1];

        function isInBoundY(endpoint1: vec2, endpoint2: vec2, y: number) {
            return y >= Math.min(endpoint1[1], endpoint2[1]) &&
                   y <= Math.max(endpoint1[1], endpoint2[1]);
        }

        function intersect(endpoint1: vec2, endpoint2: vec2, y: number) {
            return (y - endpoint1[1]) * (endpoint2[0] - endpoint1[0]) / (endpoint2[1] - endpoint1[1]) + endpoint1[0];
        }

        function getIntersects(edge1: Array<vec2>, edge2: Array<vec2>, y: number, out: vec2) {
            if (isInBoundY(edge1[0], edge1[1], y) && isInBoundY(edge2[0], edge2[1], y)) {
                let isect1 = intersect(edge1[0], edge1[1], y);
                let isect2 = intersect(edge2[0], edge2[1], y);
                out[0] = Math.floor(Math.min(isect1, isect2));
                out[1] = Math.ceil(Math.max(isect1, isect2));
                return true;
            }
            return false;
        }
        
        return getIntersects(edge1, edge2, y, out) ||
               getIntersects(edge2, edge3, y, out) ||
               getIntersects(edge3, edge1, y, out);
    }

    quadrangulate(seg: vec4, thickness: number, out1: vec2, out2: vec2, out3: vec2, out4: vec2) {
        let p1 = vec2.fromValues(seg[0], seg[1]);
        let p2 = vec2.fromValues(seg[2], seg[3]);
        let Vec = vec2.create();
        vec2.subtract(Vec, p2, p1);
        let perpVec = vec2.fromValues(-Vec[1], Vec[0]);
        vec2.normalize(perpVec, perpVec);
        vec2.scale(perpVec, perpVec, thickness * 0.5);
        
        vec2.add(out1, p1, perpVec);
        vec2.subtract(out2, p1, perpVec);
        vec2.subtract(out3, p2, perpVec);
        vec2.add(out4, p2, perpVec);
    }

    partition() {
        this.blocks = new Array<Array<vec2>>();
        let canvas = new Array<boolean>(this.canvas.length);
        for (let i = 0; i < this.canvas.length; i++) canvas[i] = this.canvas[i];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let block = new Array<vec2>();
                if (this.extractBlock(vec2.fromValues(i, j), block, canvas)) {
                    if (block.length > 4) this.blocks.push(block);
                }
            }
        }
    }

    extractBlock(origin: vec2, block: Array<vec2>, canvas: Array<boolean>) {
        if (canvas[origin[0] + origin[1] * this.width]) {
            canvas[origin[0] + origin[1] * this.width] = false;
            block.push(vec2.fromValues(origin[0], origin[1]));
            let border = new Array<vec2>();
            border.push(vec2.fromValues(origin[0], origin[1]));
            while(border.length > 0) {
                let p = border.pop();
                if (p[0] + 1 < this.width && canvas[p[0] + 1 + p[1] * this.width]) {
                    canvas[p[0] + 1 + p[1] * this.width] = false;
                    border.unshift(vec2.fromValues(p[0] + 1, p[1]));
                    block.push(vec2.fromValues(p[0] + 1, p[1]));
                }
                if (p[1] - 1 >= 0 && canvas[p[0] + (p[1] - 1) * this.width]) {
                    canvas[p[0] + (p[1] - 1) * this.width] = false;
                    border.unshift(vec2.fromValues(p[0], p[1] - 1));
                    block.push(vec2.fromValues(p[0], p[1] - 1));
                }
                if (p[0] - 1 >= 0 && canvas[p[0] - 1 + p[1] * this.width]) {
                    canvas[p[0] - 1 + p[1] * this.width] = false;
                    border.unshift(vec2.fromValues(p[0] - 1, p[1]));
                    block.push(vec2.fromValues(p[0] - 1, p[1]));
                }
                if (p[1] + 1 < this.height && canvas[p[0] + (p[1] + 1) * this.width]) {
                    canvas[p[0] + (p[1] + 1) * this.width] = false;
                    border.unshift(vec2.fromValues(p[0], p[1] + 1));
                    block.push(vec2.fromValues(p[0], p[1] + 1));
                }
            }
            return true;
        }
        return false;
    }

}

export default Rasterizer;