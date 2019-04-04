import {vec3, vec2} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader, loadText} from './rendering/gl/ShaderProgram';
import Terrain from './Terrain';
import Roadmap, { Highway, Street } from './Roads';
import BuildingCollection from './Building';
import Plane from './geometry/Plane';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  seed: 52,
  seaLevel: 0.5,
  highwayLength: 100,
  highwayAngle: 90,
  displayMode: 0,
  loadScene: function() {
    if (highwayLength != controls.highwayLength
      || highwayAngle != controls.highwayAngle
      || seed != controls.seed
      || seaLevel != controls.seaLevel)
    {
      seed = controls.seed;
      seaLevel = controls.seaLevel;
      highwayLength = controls.highwayLength;
      highwayAngle = controls.highwayAngle;

      ter = new Terrain(resolution, resolution);
      ter.creatFBM(seed);
      ter.createMap(seed, seaLevel);

      highwayMesh = new Square();
      streetMesh = new Square();
      road = new Roadmap(highwayLength, highwayAngle, blockWidth, blockHeight, ter);
      road.process(seed, iteration);
      road.instance(highwayMesh, streetMesh);

      buildings = new BuildingCollection(ter);
      buildings.process(seed);

      tex = loadText(ter.terrainMap);
    }
  }
};

let screen: ScreenQuad;
let highwayMesh: Square;
let streetMesh: Square;
let time: number = 0.0;
let ter: Terrain;
let iteration: number = 1000;
let highwayLength: number;
let highwayAngle: number;
let seaLevel: number;
let seed: number;
let blockWidth: number = 16;
let blockHeight: number = 12;
let road: Roadmap;
let resolution: number = 512;
let buildings: BuildingCollection;
let plane: Plane;
let lightDir: vec3;
let tex: WebGLTexture;

function loadScene() {
  lightDir = vec3.fromValues(1.0, 1.0, 1.0);
  vec3.normalize(lightDir, lightDir);

  highwayLength = controls.highwayLength;
  highwayAngle = controls.highwayAngle;
  seaLevel = controls.seaLevel;
  seed = controls.seed;

  screen = new ScreenQuad();
  screen.create();
  plane = new Plane(vec3.fromValues(0, 0, 0), vec2.fromValues(1, 1), 20);
  plane.create();
  ter = new Terrain(resolution, resolution);
  ter.creatFBM(seed);
  ter.createMap(seed, seaLevel);

  highwayMesh = new Square();
  streetMesh = new Square();
  road = new Roadmap(highwayLength, highwayAngle, blockWidth, blockHeight, ter);
  road.process(seed, iteration);
  road.instance(highwayMesh, streetMesh);

  buildings = new BuildingCollection(ter);
  buildings.process(seed);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, "seed", 0, 100);
  gui.add(controls, "highwayLength", 0, 200);
  gui.add(controls, "highwayAngle", 0, 180);
  gui.add(controls, "seaLevel", 0, 1).step(0.01);
  gui.add(controls, "displayMode", {Terrain: 0, Population: 1, Overlay: 2, Blocks: 3});
  gui.add(controls, "loadScene");

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0,5, 6), vec3.fromValues(0, 0, 2));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);

  // From https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
  let shaderMap = gl.createTexture();
  function initShadowMap(map: WebGLTexture, width: number, height: number) {
    gl.bindTexture(gl.TEXTURE_2D, map);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  }
  initShadowMap(shaderMap, window.innerWidth, window.innerHeight);
  
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shaderMap, 0);


  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/building-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/building-frag.glsl')),
  ]);
  const sky = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/sky-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/sky-frag.glsl')),
  ]);
  const shadow = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/shadow-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/shadow-frag.glsl')),
  ]);
  tex = loadText(ter.terrainMap);
  flat.setMode(controls.displayMode);
  flat.setLightDir(lightDir);
  sky.setLightDir(lightDir);
  lambert.setLightDir(lightDir);
  shadow.setLightDir(lightDir);
  instancedShader.setLightDir(lightDir);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    shadow.setTexture();
    renderer.render(camera, shadow, [plane]);
    renderer.render(camera, shadow, buildings.mesh());

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    flat.setMode(controls.displayMode);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shaderMap);
    flat.setTexture();
    flat.setShadow();
    lambert.setShadow();
    instancedShader.setShadow();

    sky.setTime(time++);
    renderer.render(camera, sky, [screen]);
    renderer.render(camera, flat, [plane]);
    gl.disable(gl.DEPTH_TEST);
    renderer.render(camera, instancedShader, [streetMesh]);
    renderer.render(camera, instancedShader, [highwayMesh]);
    gl.enable(gl.DEPTH_TEST);
    renderer.render(camera, lambert, buildings.mesh());
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    sky.setDimensions(window.innerWidth, window.innerHeight);
    initShadowMap(shaderMap, window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  sky.setDimensions(window.innerWidth, window.innerHeight);
  gl.bindTexture(gl.TEXTURE_2D, shaderMap);
  initShadowMap(shaderMap, window.innerWidth, window.innerHeight);

  // Start the render loop
  tick();
}

main();
