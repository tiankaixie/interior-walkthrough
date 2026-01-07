/**
 * Input: filename query parameter
 * Output: JSON with client upload token
 * Pos: Vercel serverless function to generate client upload token
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { handleUpload } from '@vercel/blob';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check if BLOB token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return res.status(500).json({ error: 'Server configuration error: Blob storage not configured' });
    }

    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file type
        const allowedExtensions = ['.glb', '.gltf', '.ply'];
        const ext = pathname.toLowerCase().match(/\.[^.]+$/)?.[0];

        if (!ext || !allowedExtensions.includes(ext)) {
          throw new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        }

        return {
          allowedContentTypes: [
            'model/gltf-binary',
            'model/gltf+json',
            'application/octet-stream',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Upload token error:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
