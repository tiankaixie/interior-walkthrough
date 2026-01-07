/**
 * Input: models list, onSelect callback, onUploadComplete callback
 * Output: Dropdown UI for model selection with upload support
 * Pos: Model selection component displayed at startup
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';

export function ModelSelector({ models, loading, error, onSelect, selectedModel, onUploadComplete }) {
  const [isOpen, setIsOpen] = useState(!selectedModel);

  const handleSelect = (model) => {
    onSelect(model);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal">
          <h2>Loading Models...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal error">
          <h2>Error Loading Models</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Helper to get icon for model type
  const getModelIcon = (model) => {
    if (model.type === 'ply') return '☁️';
    if (model.type === 'glb') return '📦';
    return '🏛️';
  };

  // Only show overlay if no model selected
  if (!selectedModel && isOpen) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal">
          <h2>Select a Model</h2>
          <p className="subtitle">Choose a 3D model or upload your own</p>

          {/* File Upload */}
          <FileUpload onUploadComplete={onUploadComplete} />

          <div className="divider">
            <span>or select existing</span>
          </div>

          <div className="model-list">
            {models.map((model) => (
              <button
                key={model.id}
                className="model-item"
                onClick={() => handleSelect(model)}
              >
                <div className="model-icon">
                  {getModelIcon(model)}
                </div>
                <div className="model-info">
                  <span className="model-name">{model.name}</span>
                  <span className="model-type">
                    {model.type.toUpperCase()}
                    {model.source === 'uploaded' && ' · Uploaded'}
                  </span>
                  {model.description && (
                    <span className="model-description">{model.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {models.length === 0 && (
            <p className="no-models">No models available. Upload a file to get started.</p>
          )}
        </div>
      </div>
    );
  }

  // Compact dropdown when model is selected
  return (
    <div className="model-selector-compact">
      <button
        className="model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="current-model">{selectedModel?.name || 'Select Model'}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="model-dropdown">
          {models.map((model) => (
            <button
              key={model.id}
              className={`dropdown-item ${selectedModel?.id === model.id ? 'active' : ''}`}
              onClick={() => handleSelect(model)}
            >
              <span className="model-icon-small">
                {getModelIcon(model)}
              </span>
              <span>{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
