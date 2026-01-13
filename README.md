Once the contents of this folder change, update this document.

# deck.gl 3D Model Viewer

A 3D model viewer built with deck.gl and React. Supports GLB/GLTF meshes and PLY point clouds with first-person navigation controls.

## Quick Start

### Option 1: View Only (No Upload)

```bash
yarn install && yarn start
```

Opens http://localhost:3000 automatically.

### Option 2: Full Features (With File Upload)

```bash
# macOS/Linux - one command
yarn install && cd server && npm install && cd .. && \
npm start --prefix server & REACT_APP_API_URL=http://localhost:3001 yarn start
```

Windows PowerShell:
```powershell
yarn install; cd server; npm install; cd ..; Start-Process npm -ArgumentList "start","--prefix","server"; $env:REACT_APP_API_URL="http://localhost:3001"; yarn start
```

Frontend: http://localhost:3000 | Backend: http://localhost:3001

**Upload Password**: `admin123` (change via `ADMIN_PASSWORD` env variable)

## Architecture

React + deck.gl v8 + Express backend. Frontend renders 3D models, backend handles file uploads.

## File Structure

| Name | Purpose |
|------|---------|
| src/App.js | Main application component |
| src/components/ | UI components (DeckGLViewer, ModelSelector, ControlPanel, FileUpload, LoginModal) |
| src/hooks/ | Custom hooks (useFirstPersonControls, useModelLoader, usePointCloudExtractor) |
| server/index.js | Express upload server |
| public/models/ | Static model files |
| public/models/uploads/ | User uploaded models |

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move forward/left/backward/right |
| Space | Ascend (free flight) / Jump (physics mode) |
| Shift | Descend (free flight) |
| Mouse | Look around (click to lock cursor) |
| ESC | Unlock cursor |

## Features

- GLB/GLTF mesh models and PLY point clouds
- First-person WASD + mouse controls
- Drag-and-drop file upload (requires login)
- Control panel for point size, color mode, etc.

## Adding Models

### Upload (Recommended)
1. Click login in top-right, enter password `admin123`
2. Drag file to upload area or click to select

### Static Files
1. Place file in `public/models/`
2. Edit `public/models/models-manifest.json`:

```json
{
  "models": [
    {
      "id": "model-id",
      "name": "Display Name",
      "path": "/models/your-model.glb",
      "type": "glb"
    }
  ]
}
```

## Supported Formats

- **GLB/GLTF**: 3D mesh models (with Draco compression support)
- **PLY**: Point cloud files (ASCII or binary, with colors/normals)

## Deployment

### Local Production

```bash
yarn build
cd server && ADMIN_PASSWORD=your_password npm start
# Configure nginx to proxy /api/* to localhost:3001, serve static files from build/
```

### GitHub Pages (Static Only)

```bash
npm run deploy
```

## Tech Stack

- React 19
- deck.gl v8 / luma.gl v8
- loaders.gl (GLB/GLTF/PLY loading)
- Express + Multer (file upload)
- cannon-es (optional physics)

## Browser Support

Chrome, Edge, Firefox, Safari (WebGL2)
