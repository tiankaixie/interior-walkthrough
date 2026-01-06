/**
 * Input: model URL/path
 * Output: loaded model data, loading state
 * Pos: Hook for loading GLB/GLTF models using loaders.gl
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { useState, useEffect, useCallback } from 'react';
import { load, registerLoaders } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';
import { DracoLoader } from '@loaders.gl/draco';

// Register Draco loader for compressed meshes
registerLoaders([DracoLoader]);

export function useModelLoader() {
  const [modelUrl, setModelUrl] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const loadModel = useCallback(async (url) => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setProgress(0);
    setModelUrl(url);

    try {
      const fullUrl = url.startsWith('http') ? url : `${process.env.PUBLIC_URL}${url}`;

      const gltf = await load(fullUrl, GLTFLoader, {
        gltf: {
          loadBuffers: true,
          loadImages: true,
          decompressMeshes: true,
          postProcess: true,
        },
        draco: {
          decoderType: 'js',
        },
        onProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        }
      });

      setModelData({
        gltf,
        url: fullUrl,
        meshes: extractMeshes(gltf),
      });
      setProgress(100);
    } catch (err) {
      console.error('Error loading model:', err);
      setError(err.message || 'Failed to load model');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearModel = useCallback(() => {
    setModelData(null);
    setModelUrl(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    modelData,
    modelUrl,
    loading,
    error,
    progress,
    loadModel,
    clearModel,
  };
}

/**
 * Extract mesh data from GLTF for point cloud conversion
 * Handles multiple loaders.gl output formats
 */
function extractMeshes(gltf) {
  const meshes = [];

  if (!gltf) {
    return meshes;
  }

  // Try standard gltf.meshes format (with parsed attributes)
  if (gltf.meshes && Array.isArray(gltf.meshes) && gltf.meshes.length > 0) {
    gltf.meshes.forEach((mesh, meshIndex) => {
      mesh.primitives?.forEach((primitive, primIndex) => {
        const positions = primitive.attributes?.POSITION?.value;
        const normals = primitive.attributes?.NORMAL?.value;
        const colors = primitive.attributes?.COLOR_0?.value;
        const texcoords = primitive.attributes?.TEXCOORD_0?.value;

        if (positions) {
          meshes.push({
            id: `mesh-${meshIndex}-${primIndex}`,
            positions: positions,
            normals: normals || null,
            colors: colors || null,
            texcoords: texcoords || null,
            vertexCount: positions.length / 3,
          });
        }
      });
    });
  }

  // Try loaders.gl v3 format with accessors
  if (meshes.length === 0 && gltf.json?.meshes && gltf.buffers) {
    const jsonMeshes = gltf.json.meshes;
    const accessors = gltf.json.accessors || [];
    const bufferViews = gltf.json.bufferViews || [];

    jsonMeshes.forEach((mesh, meshIndex) => {
      mesh.primitives?.forEach((primitive, primIndex) => {
        const positionAccessorIndex = primitive.attributes?.POSITION;
        if (positionAccessorIndex !== undefined) {
          const accessor = accessors[positionAccessorIndex];
          if (accessor) {
            const bufferView = bufferViews[accessor.bufferView];
            const buffer = gltf.buffers[bufferView?.buffer || 0];

            if (buffer && bufferView) {
              const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
              const count = accessor.count;

              // Create Float32Array from buffer
              const positions = new Float32Array(
                buffer.arrayBuffer || buffer,
                byteOffset,
                count * 3
              );

              // Try to get normals
              let normals = null;
              const normalAccessorIndex = primitive.attributes?.NORMAL;
              if (normalAccessorIndex !== undefined) {
                const normalAccessor = accessors[normalAccessorIndex];
                if (normalAccessor) {
                  const normalBV = bufferViews[normalAccessor.bufferView];
                  const normalBuffer = gltf.buffers[normalBV?.buffer || 0];
                  if (normalBuffer && normalBV) {
                    const normalOffset = (normalBV.byteOffset || 0) + (normalAccessor.byteOffset || 0);
                    normals = new Float32Array(
                      normalBuffer.arrayBuffer || normalBuffer,
                      normalOffset,
                      normalAccessor.count * 3
                    );
                  }
                }
              }

              // Try to get colors
              let colors = null;
              const colorAccessorIndex = primitive.attributes?.COLOR_0;
              if (colorAccessorIndex !== undefined) {
                const colorAccessor = accessors[colorAccessorIndex];
                if (colorAccessor) {
                  const colorBV = bufferViews[colorAccessor.bufferView];
                  const colorBuffer = gltf.buffers[colorBV?.buffer || 0];
                  if (colorBuffer && colorBV) {
                    const colorOffset = (colorBV.byteOffset || 0) + (colorAccessor.byteOffset || 0);
                    const componentCount = colorAccessor.type === 'VEC4' ? 4 : 3;

                    // Handle different color component types
                    const bufferData = colorBuffer.arrayBuffer || colorBuffer;
                    if (colorAccessor.componentType === 5121) {
                      // UNSIGNED_BYTE - common for point cloud colors
                      colors = new Uint8Array(bufferData, colorOffset, colorAccessor.count * componentCount);
                    } else if (colorAccessor.componentType === 5126) {
                      // FLOAT
                      colors = new Float32Array(bufferData, colorOffset, colorAccessor.count * componentCount);
                    }
                  }
                }
              }

              meshes.push({
                id: `mesh-${meshIndex}-${primIndex}`,
                positions,
                normals,
                colors,
                texcoords: null,
                vertexCount: count,
              });
            }
          }
        }
      });
    });
  }

  return meshes;
}

/**
 * Hook to fetch available models from manifest
 */
export function useModelManifest() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/models/models-manifest.json`);
        if (!response.ok) {
          throw new Error('Failed to fetch model manifest');
        }
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        console.error('Error loading model manifest:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchManifest();
  }, []);

  return { models, loading, error };
}
