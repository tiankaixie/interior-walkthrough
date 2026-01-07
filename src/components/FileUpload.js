/**
 * Input: onUploadComplete callback
 * Output: File upload UI component
 * Pos: Component for uploading GLB/GLTF/PLY files
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import './FileUpload.css';

export function FileUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ['.glb', '.gltf', '.ply'];

  const handleFileSelect = async (file) => {
    if (!file) return;

    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Use Vercel Blob client upload - supports large files (up to 500MB)
      const blob = await upload(`models/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-url',
        onUploadProgress: (progressEvent) => {
          setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        },
      });

      // Extract file info from blob response
      const fileInfo = {
        id: file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-'),
        name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        path: blob.url,
        type: ext.slice(1),
        description: `Uploaded ${new Date().toISOString()}`,
        size: file.size,
      };

      if (onUploadComplete) {
        onUploadComplete(fileInfo);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        ) : (
          <>
            <div className="upload-icon">+</div>
            <div className="upload-text">
              Drop file here or click to upload
            </div>
            <div className="upload-hint">
              Supports: GLB, GLTF, PLY
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}
    </div>
  );
}
