/**
 * Input: modelData from useModelLoader
 * Output: point cloud data array for PointCloudLayer
 * Pos: Extracts vertices from GLB meshes and converts to point cloud format
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { useState, useEffect, useCallback } from 'react';

// Color modes for point cloud visualization
export const COLOR_MODES = {
  ORIGINAL: 'original',
  HEIGHT: 'height',
  NORMAL: 'normal',
  SOLID: 'solid',
};

export function usePointCloudExtractor(modelData, options = {}) {
  const {
    colorMode = COLOR_MODES.ORIGINAL,
    solidColor = [255, 255, 255],
    sampleRate = 1.0,
    lodLevel = 1.0,
  } = options;

  const [pointCloudData, setPointCloudData] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [stats, setStats] = useState({ totalPoints: 0, sampledPoints: 0 });

  // Extract point cloud from model data
  const extractPointCloud = useCallback(() => {
    if (!modelData) {
      setPointCloudData(null);
      return;
    }

    // Try to get meshes from different sources
    let meshes = modelData.meshes;

    // If meshes is empty, try to extract from gltf directly
    if (!meshes || meshes.length === 0) {
      meshes = extractMeshesFromGLTF(modelData.gltf);
    }

    if (!meshes || meshes.length === 0) {
      setPointCloudData(null);
      return;
    }

    setExtracting(true);

    setTimeout(() => {
      const points = [];
      let totalPoints = 0;
      let minY = Infinity, maxY = -Infinity;

      // First pass: find height range
      meshes.forEach(mesh => {
        const positions = mesh.positions;
        if (!positions) return;

        totalPoints += mesh.vertexCount || (positions.length / 3);

        for (let i = 1; i < positions.length; i += 3) {
          const y = positions[i];
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      });

      const heightRange = maxY - minY || 1;
      const effectiveSampleRate = sampleRate * lodLevel;

      // Second pass: extract points
      meshes.forEach(mesh => {
        const { positions, normals, colors } = mesh;
        if (!positions) return;

        const vertexCount = mesh.vertexCount || (positions.length / 3);

        for (let i = 0; i < positions.length; i += 3) {
          // Apply sampling
          if (Math.random() > effectiveSampleRate) continue;

          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];

          const nx = normals ? normals[i] : 0;
          const ny = normals ? normals[i + 1] : 1;
          const nz = normals ? normals[i + 2] : 0;

          let color;
          switch (colorMode) {
            case COLOR_MODES.HEIGHT:
              color = heightToColor(y, minY, heightRange);
              break;
            case COLOR_MODES.NORMAL:
              color = normalToColor(nx, ny, nz);
              break;
            case COLOR_MODES.SOLID:
              color = [...solidColor];
              break;
            case COLOR_MODES.ORIGINAL:
            default:
              if (colors && colors.length > 0) {
                const vertexIndex = i / 3;
                // Check if colors are Uint8 (0-255) or Float (0-1)
                const isUint8 = colors instanceof Uint8Array || colors[0] > 1.0;
                // Determine color stride (RGB=3 or RGBA=4)
                const colorComponents = colors.length / vertexCount;
                const colorStride = Math.round(colorComponents);
                const colorOffset = Math.floor(vertexIndex * colorStride);

                if (isUint8) {
                  // Colors are already 0-255
                  color = [
                    colors[colorOffset] || 180,
                    colors[colorOffset + 1] || 180,
                    colors[colorOffset + 2] || 180,
                  ];
                } else {
                  // Colors are 0-1, convert to 0-255
                  color = [
                    Math.round((colors[colorOffset] || 0.7) * 255),
                    Math.round((colors[colorOffset + 1] || 0.7) * 255),
                    Math.round((colors[colorOffset + 2] || 0.7) * 255),
                  ];
                }
              } else {
                // Default gray if no vertex colors
                color = [180, 180, 180];
              }
              break;
          }

          points.push({
            position: [x, y, z],
            normal: [nx, ny, nz],
            color,
          });
        }
      });

      setPointCloudData(points);
      setStats({
        totalPoints,
        sampledPoints: points.length,
      });
      setExtracting(false);
    }, 0);
  }, [modelData, colorMode, solidColor, sampleRate, lodLevel]);

  useEffect(() => {
    extractPointCloud();
  }, [extractPointCloud]);

  return {
    pointCloudData,
    extracting,
    stats,
    reextract: extractPointCloud,
  };
}

/**
 * Extract meshes from GLTF object - handles different GLTF structures
 * This is a fallback for when modelData.meshes is empty
 */
function extractMeshesFromGLTF(gltf) {
  const meshes = [];

  if (!gltf) {
    return meshes;
  }

  // Structure 1: gltf.meshes (standard post-processed format)
  if (gltf.meshes && Array.isArray(gltf.meshes)) {
    gltf.meshes.forEach((mesh, meshIndex) => {
      if (mesh.primitives) {
        mesh.primitives.forEach((primitive, primIndex) => {
          const positions = primitive.attributes?.POSITION?.value;
          if (positions) {
            meshes.push({
              id: `mesh-${meshIndex}-${primIndex}`,
              positions: positions,
              normals: primitive.attributes?.NORMAL?.value || null,
              colors: primitive.attributes?.COLOR_0?.value || null,
              vertexCount: positions.length / 3,
            });
          }
        });
      }
    });
  }

  // Structure 2: Try to access via scenes -> nodes if meshes is empty
  if (meshes.length === 0 && gltf.scenes) {
    const visitedNodes = new Set();

    const traverseNode = (node) => {
      if (!node || visitedNodes.has(node)) return;
      visitedNodes.add(node);

      if (node.mesh) {
        const mesh = node.mesh;
        if (mesh.primitives) {
          mesh.primitives.forEach((primitive) => {
            const positions = primitive.attributes?.POSITION?.value;
            if (positions) {
              meshes.push({
                id: `node-mesh-${meshes.length}`,
                positions: positions,
                normals: primitive.attributes?.NORMAL?.value || null,
                colors: primitive.attributes?.COLOR_0?.value || null,
                vertexCount: positions.length / 3,
              });
            }
          });
        }
      }

      if (node.children) {
        node.children.forEach(traverseNode);
      }
    };

    gltf.scenes.forEach(scene => {
      if (scene.nodes) {
        scene.nodes.forEach(traverseNode);
      }
    });
  }

  return meshes;
}

function heightToColor(y, minY, range) {
  const t = (y - minY) / range;

  if (t < 0.25) {
    const s = t / 0.25;
    return [0, Math.round(s * 255), 255];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 255, Math.round((1 - s) * 255)];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(s * 255), 255, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [255, Math.round((1 - s) * 255), 0];
  }
}

function normalToColor(nx, ny, nz) {
  return [
    Math.round((nx * 0.5 + 0.5) * 255),
    Math.round((ny * 0.5 + 0.5) * 255),
    Math.round((nz * 0.5 + 0.5) * 255),
  ];
}

export function calculateBounds(pointCloudData) {
  if (!pointCloudData || pointCloudData.length === 0) {
    return null;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  pointCloudData.forEach(point => {
    const [x, y, z] = point.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}
