/**
 * Input: modelData, pointCloudData, viewState, controls
 * Output: deck.gl canvas with WebGL rendering
 * Pos: Main 3D viewer component using deck.gl with OrbitView
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { OrbitView } from '@deck.gl/core';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { PointCloudLayer } from '@deck.gl/layers';
import { registerLoaders } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';

// Register loaders
registerLoaders([GLTFLoader]);

// View modes
export const VIEW_MODES = {
  MESH: 'mesh',
  POINTCLOUD: 'pointcloud',
};

// Initial view state for OrbitView
const INITIAL_VIEW_STATE = {
  target: [2.5, 0, 2],  // Look at center of point cloud
  rotationX: 30,        // Pitch
  rotationOrbit: -45,   // Yaw
  zoom: 2,              // Zoom level
  minZoom: -2,
  maxZoom: 10,
};

export function DeckGLViewer({
  modelData,
  pointCloudData,
  viewMode = VIEW_MODES.MESH,
  controls = {},
  viewState: externalViewState,
  onCanvasReady,
  onDeviceInfo,
}) {
  const deckRef = useRef(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Handle deck.gl load - get device info and canvas
  useEffect(() => {
    if (deckRef.current?.deck) {
      const deck = deckRef.current.deck;

      // Get canvas for pointer lock
      if (onCanvasReady && deck.canvas) {
        onCanvasReady(deck.canvas);
      }

      // Report WebGL info
      if (onDeviceInfo) {
        onDeviceInfo({
          type: 'webgl2',
          vendor: 'WebGL',
          renderer: 'WebGL2',
        });
      }
    }
  }, [onCanvasReady, onDeviceInfo]);

  // Handle view state changes
  const onViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
  }, []);

  // Create layers based on view mode
  const layers = useMemo(() => {
    const result = [];

    if (viewMode === VIEW_MODES.MESH && modelData?.url) {
      result.push(
        new ScenegraphLayer({
          id: 'scenegraph-layer',
          data: [{ position: [0, 0, 0] }],
          scenegraph: modelData.url,
          getPosition: d => d.position,
          getOrientation: d => [0, 0, 0],
          sizeScale: controls.modelScale || 1,
          _lighting: 'pbr',
        })
      );
    }

    if (viewMode === VIEW_MODES.POINTCLOUD && pointCloudData && pointCloudData.length > 0) {
      result.push(
        new PointCloudLayer({
          id: 'pointcloud-layer',
          data: pointCloudData,
          getPosition: d => d.position,
          getColor: d => d.color,
          getNormal: d => d.normal,
          pointSize: controls.pointSize || 4,
          sizeUnits: 'pixels',
        })
      );
    }

    return result;
  }, [viewMode, modelData, pointCloudData, controls.modelScale, controls.pointSize]);

  // OrbitView for 3D point cloud navigation
  const views = useMemo(() => {
    return new OrbitView({
      id: 'orbit',
      orbitAxis: 'Y',
      fovy: controls.fov || 50,
      near: 0.1,
      far: 1000,
    });
  }, [controls.fov]);

  return (
    <DeckGL
      ref={deckRef}
      views={views}
      viewState={viewState}
      onViewStateChange={onViewStateChange}
      layers={layers}
      useDevicePixels={true}
      controller={true}
      parameters={{
        clearColor: [0.1, 0.1, 0.1, 1],
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}

export default DeckGLViewer;
