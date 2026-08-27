import * as THREE from 'three';

/**
 * Small canvas-painted textures instead of flat colors — cheap (drawn once,
 * cached) but reads far less "flat" than a solid material color under real
 * lighting. No network fetch, so the game still loads instantly.
 */
function paint(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colorFn: () => string,
  dotSize: number
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colorFn();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, dotSize, dotSize);
  }
}

let grass: THREE.CanvasTexture | null = null;
export function getGrassTexture(repeat: number): THREE.CanvasTexture {
  if (!grass) {
    grass = paint(128, (ctx, size) => {
      ctx.fillStyle = '#5f9c4d';
      ctx.fillRect(0, 0, size, size);
      speckle(ctx, size, 700, () => `rgba(70,120,55,${0.25 + Math.random() * 0.35})`, 1.4);
      speckle(ctx, size, 400, () => `rgba(110,160,80,${0.2 + Math.random() * 0.3})`, 1.2);
    });
  }
  grass.repeat.set(repeat, repeat);
  return grass;
}

let asphalt: THREE.CanvasTexture | null = null;
export function getAsphaltTexture(): THREE.CanvasTexture {
  if (!asphalt) {
    asphalt = paint(64, (ctx, size) => {
      ctx.fillStyle = '#3a3a3d';
      ctx.fillRect(0, 0, size, size);
      speckle(ctx, size, 500, () => `rgba(${20 + Math.random() * 30},${20 + Math.random() * 30},${22 + Math.random() * 30},0.5)`, 1);
    });
  }
  return asphalt;
}

let floorTile: THREE.CanvasTexture | null = null;
export function getFloorTexture(repeat: number): THREE.CanvasTexture {
  if (!floorTile) {
    floorTile = paint(128, (ctx, size) => {
      ctx.fillStyle = '#d8cdb8';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(150,135,105,0.4)';
      ctx.lineWidth = 2;
      const tile = size / 4;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tile, 0);
        ctx.lineTo(i * tile, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * tile);
        ctx.lineTo(size, i * tile);
        ctx.stroke();
      }
      speckle(ctx, size, 200, () => `rgba(160,145,115,${0.1 + Math.random() * 0.15})`, 1);
    });
  }
  floorTile.repeat.set(repeat, repeat);
  return floorTile;
}
