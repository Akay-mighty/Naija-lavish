// Convert FBX to GLB using three.js FBXLoader + GLTFExporter
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { dirname } from "path";

// FBXLoader needs fflate for decompression (auto-imported from package)
import * as fflate from "fflate";
globalThis.fflate = fflate;

// Polyfill FileReader for Node.js (GLTFExporter uses it for binary export)
globalThis.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  readAsArrayBuffer(blob) {
    // Handle Blob (from toBlob callback) by reading it as ArrayBuffer
    if (blob.arrayBuffer) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    } else {
      // Fallback: treat as buffer directly
      this.result = blob;
      if (this.onloadend) this.onloadend();
    }
  }
};

// Polyfill Blob.arrayBuffer for Node.js
if (!globalThis.Blob.prototype.arrayBuffer) {
  globalThis.Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const chunks = [];
      // Node 18+ has Blob.bytes()
      if (this.bytes) {
        resolve(this.bytes().buffer);
      } else {
        resolve(new ArrayBuffer(0));
      }
    });
  };
}

function convertFbxToGlb(inputPath, outputPath) {
  console.log(`Converting: ${inputPath} → ${outputPath}`);
  const loader = new FBXLoader();
  
  // Read as buffer then convert to ArrayBuffer (FBXLoader needs pure ArrayBuffer)
  const nodeBuffer = readFileSync(inputPath);
  const arrayBuffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
  
  let object;
  try {
    object = loader.parse(arrayBuffer, dirname(inputPath) + "/");
  } catch (e) {
    console.error(`  Parse failed: ${e.message}`);
    return false;
  }

  // Center + scale
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim; // normalize to ~2 units tall
  object.scale.setScalar(scale);
  object.position.x = -center.x * scale;
  object.position.y = -box.min.y * scale;
  object.position.z = -center.z * scale;

  // Export to GLB
  const exporter = new GLTFExporter();
  return new Promise((resolve) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          mkdirSync(dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, Buffer.from(result));
          const stats = statSync(outputPath);
          console.log(`✅ Saved GLB: ${(stats.size / 1024).toFixed(0)} KB`);
          resolve(true);
        } else {
          console.error("Export returned JSON, not binary");
          resolve(false);
        }
      },
      (error) => {
        console.error("Export error:", error);
        resolve(false);
      },
      { binary: true, onlyVisible: true }
    );
  });
}

async function main() {
  const conversions = [
    ["/tmp/models/low-poly-male/source/low poly male.fbx", "public/models/male.glb"],
    ["/tmp/models/low-poly-female/source/low poly female.fbx", "public/models/female.glb"],
    ["/tmp/models/low-poly-truck-car-drifter/source/Jeep_done.fbx", "public/models/truck.glb"],
    ["/tmp/models/low-poly-modular-roads/extracted/roads.fbx", "public/models/roads.glb"],
  ];
  
  for (const [input, output] of conversions) {
    try {
      await convertFbxToGlb(input, output);
    } catch (e) {
      console.error(`Failed: ${input}:`, e.message);
    }
  }
  console.log("Done!");
}

main();
