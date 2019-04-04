import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import { random2to1, random1, intersect } from '../utils';

class FloorPolygon extends Drawable {
    indices: Uint32Array;
    positions: Float32Array;
    normal: Float32Array;
    uv: Float32Array;

    vectices: Array<Array<vec2>>;
    edgeCount: Array<number>;
    height: number;
    thickness: number;
    style: number;
    id: number;
  
    constructor(baseCenter: vec2, edgeCount: number, 
                height: number, thickness: number, 
                scale: number, boundbox: vec4, seed: number) {
        super();
        this.vectices = new Array<Array<vec2>>();
        this.edgeCount = new Array<number>();
        this.edgeCount.push(Math.max(3, Math.ceil(edgeCount)));
        this.height = height;
        this.thickness = thickness;
        let noise = random2to1(baseCenter[0] + seed, baseCenter[1] + seed);
        let dA = edgeCount == 4 ? (noise * 40 + 50) / 180 * Math.PI : Math.PI * 2 / this.edgeCount[0];
        let A = noise * Math.PI;
        let vectices = new Array<vec2>();
        let l = scale;
        for (let i = 0; i <= edgeCount; i++) {
            let v= vec2.fromValues(Math.cos(A) * scale + baseCenter[0],
                                   Math.sin(A) * scale + baseCenter[1]);
            let isect = vec2.create();
            if (v[0] > boundbox[0] && 
                intersect(baseCenter, v, 
                          vec2.fromValues(boundbox[0], boundbox[1]), 
                          vec2.fromValues(boundbox[0], boundbox[3]),
                          isect))
            {
                l = Math.min(l, vec2.distance(isect, baseCenter));
            }
            if (v[0] < boundbox[2] && 
                intersect(baseCenter, v, 
                          vec2.fromValues(boundbox[2], boundbox[1]), 
                          vec2.fromValues(boundbox[2], boundbox[3]),
                          isect))
            {
                l = Math.min(l, vec2.distance(isect, baseCenter));
            }
            if (v[1] > boundbox[1] && 
                intersect(baseCenter, v, 
                          vec2.fromValues(boundbox[0], boundbox[1]), 
                          vec2.fromValues(boundbox[2], boundbox[1]),
                          isect))
            {
                l = Math.min(l, vec2.distance(isect, baseCenter));
            }
            if (v[1] < boundbox[3] && 
                intersect(baseCenter, v, 
                          vec2.fromValues(boundbox[0], boundbox[3]), 
                          vec2.fromValues(boundbox[2], boundbox[3]),
                          isect))
            {
                l = Math.min(l, vec2.distance(isect, baseCenter));
            }
            vectices.push(v);
            A += edgeCount == 4 ? (i == 1 || i == 3 ? Math.PI - dA : dA) : dA;
        }
        if (l < scale) {
            vectices.forEach(vecter => {
                let disp = vec2.create();
                vec2.subtract(disp, vecter, baseCenter);
                vec2.scale(disp, disp, l / vec2.length(disp));
                vec2.add(vecter, baseCenter, disp);
            });
        }
        this.vectices.push(vectices);
    }

    combine(polygon: FloorPolygon) {
        this.edgeCount = polygon.edgeCount.concat(this.edgeCount);
        this.vectices = polygon.vectices.concat(this.vectices);
    }
  
    create() {
        let indices = Array<number>();
        let position = Array<number>();
        let normal = Array<number>();
        let uv = Array<number>();

        let idx = 0;
        let len = 0;
        for (let g = 0; g < this.vectices.length; g++) {
            let vectices = this.vectices[g];
            for (let i = 0; i < this.edgeCount[g]; i++) {
                indices.push(idx, idx + 1, idx + 2,
                             idx, idx + 2, idx + 3);
                let V0 = vectices[i];
                let V1 = vectices[i + 1];
                position.push(V0[0], V0[1], this.height - this.thickness, this.style);
                position.push(V1[0], V1[1], this.height - this.thickness, this.style);
                position.push(V1[0], V1[1], this.height, this.style);
                position.push(V0[0], V0[1], this.height, this.style);

                let nor = vec2.fromValues(V1[1] - V0[1], -V1[0] + V0[0]);
                let l = vec2.length(nor);
                vec2.scale(nor, nor, 1 / l);
                normal.push(nor[0], nor[1], 0, this.id);
                normal.push(nor[0], nor[1], 0, this.id);
                normal.push(nor[0], nor[1], 0, this.id);
                normal.push(nor[0], nor[1], 0, this.id);

                uv.push(len, this.height - this.thickness);
                uv.push(len + l, this.height - this.thickness);
                uv.push(len + l, this.height);
                uv.push(len, this.height);

                len += l;
                idx += 4;
            }

            for (let i = 0; i < this.edgeCount[g]; i++) {
                if (i > 0 && i < this.edgeCount[g] - 1) {
                    indices.push(idx, idx + i, idx + i + 1);
                }
                position.push(vectices[i][0], vectices[i][1], this.height, this.style);
                normal.push(0, 0, 1, this.id);
                uv.push(vectices[i][0], vectices[i][1]);
            }

            idx += this.edgeCount[g];
        }

        this.indices = new Uint32Array(indices);
        this.positions = new Float32Array(position);
        this.normal = new Float32Array(normal);
        this.uv = new Float32Array(uv);

        this.generateIdx();
        this.generatePos();
        this.generateNor();
        this.generateUV();
  
        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normal, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
        gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
    }
  };
  
  export default FloorPolygon;