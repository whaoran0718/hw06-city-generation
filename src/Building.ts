import FloorPolygon from "./geometry/FloorPolygon";
import { vec2, vec3, vec4 } from "gl-matrix";
import { random2to1, random2, random1, bias } from "./utils";
import Roadmap from "./Roads";
import Terrain from "./Terrain";
import Drawable from "./rendering/gl/Drawable";

class Building
{
    floors: Array<FloorPolygon>;
    position: vec2;
    height: number;

    constructor(position: vec2, height: number, 
                scale: number, boundbox: vec4, 
                population: number, id: number,
                style: number, seed: number) {
        this.floors = new Array<FloorPolygon>();
        this.position = vec2.fromValues(position[0], position[1]);
        this.height = height * scale;
        let layers = Math.floor(random2to1(position[0] + seed, position[1] + seed) * 5 * population + 1);
        let dH = height * scale / layers;
        let H = height * scale;
        let h = H;
        let noise = random2(position[0] + seed, position[0] + seed);
        let randRange = vec2.fromValues(scale / 1.5, scale / 1.5);
        for (let i = 0; i < layers; i++) {
            noise = random2(noise[0] + i, noise[1] + i);
            let offset = vec2.create();
            vec2.multiply(offset, noise, randRange);
            vec2.subtract(offset, offset, vec2.fromValues(randRange[0] / 2, randRange[1] / 2));
            let p = vec2.create();
            vec2.add(p, position, offset);
            let edgeCount = Math.max(4, Math.floor(random2to1(noise[0], noise[1]) * 4 * population + 3));
            let dh = i == layers - 1 ? h : h - (layers - i) * dH + dH * (random2to1(noise[0], noise[1]) * 0.3 + 0.7);
            let poly = new FloorPolygon(p, edgeCount, h, dh, scale, boundbox, seed);
            poly.id = id;
            poly.style = style;
            if (i > 0) {
                poly.combine(this.floors[i - 1]);
            }
            this.floors.push(poly);
            h -= dh;
        }
    }

    create() {
        this.floors.forEach(floor => {
            floor.create();
        });
    }

    destory() {
        this.floors.forEach(floor => {
            floor.destory();
        });
    }
}

class BuildingCollection
{
    buildings: Array<Building>;
    validGrid: Array<vec2>;
    gridSize: number = 5;
    terrain: Terrain;

    constructor(terrain: Terrain){
        this.buildings = new Array<Building>();
        this.validGrid = new Array<vec2>();
        this.terrain = terrain;
    }

    process(seed: number) {
        let maxHeight = 15;
        let minHeight = 0.3;
        let sd = random1(seed);
        this.init();
        let count = Math.min(2000, this.validGrid.length);
        let id = 0;
        for (let i = 0; i < count; i++) {
            sd = random1(sd);
            let idx = Math.floor(sd * this.validGrid.length);
            let pos = vec2.fromValues(this.validGrid[idx][0], this.validGrid[idx][1]);
            let population = this.terrain.getColor(pos[0], pos[1], 1);
            if (random2to1(pos[0] + sd, pos[1] + sd) > population + 0.4) {
                continue;
            }

            
            vec2.mul(pos, pos, vec2.fromValues(1 / this.terrain.width, 1 / this.terrain.height));
            vec2.subtract(pos, pos, vec2.fromValues(0.5, 0.5));
            let scale = this.gridSize / this.terrain.width / 2;
            let boundbox = vec4.fromValues(pos[0] + scale, pos[1] + scale, pos[0] - scale, pos[1] - scale);

            sd = random1(sd);
            let t = random2to1(pos[0] + sd, pos[1] + sd);
            t = bias(population / 1.5, sd) * (0.5 * population + 0.1) + population * 0.4;
            let height = (maxHeight - minHeight) * t + minHeight;

            sd = random1(sd);
            let style = bias(population / 1.2, sd) * (0.5 * population + 0.1) + population * 0.4;
            let building = new Building(pos, height, scale, boundbox, population, id, Math.floor(style * 3), sd);
            this.buildings.push(building);
            building.create();
            this.validGrid.splice(idx, 1);
            if (this.validGrid.length < 1) break;
            id++;
        }
    }

    init() {
        let column = Math.floor(this.terrain.width / this.gridSize);
        let row = Math.floor(this.terrain.height / this.gridSize);
        for (let i = 0; i < column; i++) {
            for (let j = 0; j < row; j++) {
                let valid = true;
                let col = random2to1(i, j) * 255;
                for (let x = 0; x < this.gridSize; x++) {
                    for (let y = 0; y < this.gridSize; y++) {
                        let idx = i * this.gridSize + x + (j * this.gridSize + y) * this.terrain.width;
                        valid = valid && this.terrain.rast.canvas[idx];
                        if (!valid) break;
                    }
                    if (!valid) break;
                }
                if (valid) this.validGrid.push(vec2.fromValues((i + 0.5) * this.gridSize, (j + 0.5) * this.gridSize));
            }
        }
    }

    mesh() {
        let meshes = Array<Drawable>();
        this.buildings.forEach(building => {
            building.floors.forEach(floor => {
                meshes.push(floor);
            });
        });
        return meshes;
    }
}

export default BuildingCollection;