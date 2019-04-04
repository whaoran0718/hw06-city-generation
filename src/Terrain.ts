import { vec2, vec3, vec4 } from "gl-matrix";
import Voronoi, { random1, smoothstep } from "./utils";
import Rasterizer from "./Rasterizer";

class Terrain {
    width: number;
    height: number;
    fbm: Array<number>;
    terrainMap: ImageData;
    rast: Rasterizer;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.terrainMap = new ImageData(width, height);
        this.fbm = new Array<number>(this.width * this.height).fill(0);
    }

    creatFBM(seed: number) {
        this.fbm.fill(0);
        let maxSize = Math.min(this.width, this.height) * 2;
        let coeff = 1;
        for (let k = 0; k < 4; k++) {
            coeff /= 2;
            let Vor = new Voronoi(this.width, this.height, maxSize * coeff, random1(seed + k));
            for (let j = 0; j < this.height; j++) {
                for (let i = 0; i < this.width; i++) {
                    let n = vec3.create();
                    let n2 = vec3.create();
                    Vor.voronoi(vec2.fromValues(i, j), n, n2);
                    this.fbm[j * this.width + i] += (n[2] > 1 ? 0 : 1 - n[2]) * coeff;
                }
            }
        }
    }

    createMap(seed: number, threshold: number) {
        let VorPixel = new Voronoi(this.width, this.height, 2, seed);
        let VorPopular = new Voronoi(this.width, this.height, this.width * 0.65, seed);
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {

                let nt = vec3.create();
                let nt2 = vec3.create();
                // VorPixel.voronoi(vec2.fromValues(i, j), nt, nt2);
                // let x = Math.min(this.width - 1, Math.max(0, Math.round(nt[0])));
                // let y = Math.min(this.height - 1, Math.max(0, Math.round(nt[1])));
                let x = i;
                let y = j;
                let ter = this.fbm[y * this.width + x] > threshold ? 1 : 0;
                let height = threshold < 1e-5 ? 1 : this.fbm[y * this.width + x] / threshold;

                let np = vec3.create();
                let np2 = vec3.create();
                let p = vec2.fromValues(i, j);
                VorPopular.voronoi(p, np, np2);
                let pop = smoothstep(0.3, 1.0, 1 - np[2]);
                let pop2 = smoothstep(0.3, 1.0, 1 - np2[2]);
                let factor = smoothstep(0, 1, Math.min(np[2], np2[2]) / (np[2] + np2[2]));
                pop = (pop * (1 - factor) + pop2 * factor) * 0.7 + this.fbm[j * this.width + i] * 0.3;

                let idx = 4 * (j * this.width + i);
                this.terrainMap.data[idx + 0] = ter * 255;
                this.terrainMap.data[idx + 1] = pop * 255;
                this.terrainMap.data[idx + 2] = 0;
                this.terrainMap.data[idx + 3] = height * 255;
            }
        }
        this.rast = new Rasterizer(this);
    }

    getColor(x: number, y: number, channel: number) {

        let w = this.width;
        let h = this.height;
        function index(i: number, j:number) {
            let x = Math.min(w - 1, Math.max(0, i));
            let y = Math.min(h - 1, Math.max(0, j));
            return 4 * (x + y * w) + channel;
        }
        
        let x1 = Math.ceil(x - 1);
        let x2 = Math.ceil(x);
        let y1 = Math.ceil(y - 1);
        let y2 = Math.ceil(y);
        let fx = x - x1;
        let fy = y - y1;
        let popX1Y1 = this.terrainMap.data[index(x1, y1)];
        let popX2Y1 = this.terrainMap.data[index(x2, y1)];
        let popX1Y2 = this.terrainMap.data[index(x1, y2)];
        let popX2Y2 = this.terrainMap.data[index(x2, y2)];
        
        return ((popX1Y1 * (1 - fx) + popX2Y1 * fx) * (1 - fy) + 
                (popX1Y2 * (1 - fx) + popX2Y2 * fx) * fy) / 255;
    }

    drawBlocks() {
        let numBlocks = this.rast.blocks.length;
        for (let i = 0; i < numBlocks; i++) {
            let block = this.rast.blocks[i];
            block.forEach(p => {
                this.terrainMap.data[4 * (p[0] + p[1] * this.width) + 2] = random1((i + 1) / numBlocks) * 255;
            });
        }
    }
}

export default Terrain;