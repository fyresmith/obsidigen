// Static file routes (favicon, etc)

import { Hono } from 'hono';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type Variables = {
  vaultPath: string;
};

export const staticRoutes = new Hono<{ Variables: Variables }>();

// Favicon route - checks for various favicon formats in vault root
staticRoutes.get('/favicon.ico', async (c) => {
  const vaultPath = c.get('vaultPath');
  
  // Check for various favicon formats
  const possibleFavicons = [
    'favicon.ico',
    'favicon.png',
    'favicon.svg',
    'favicon.jpg',
    'favicon.jpeg',
    'favicon.gif',
  ];
  
  for (const filename of possibleFavicons) {
    const filepath = join(vaultPath, filename);
    if (existsSync(filepath)) {
      try {
        const file = readFileSync(filepath);
        
        // Set appropriate content type
        let contentType = 'image/x-icon';
        if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.svg')) contentType = 'image/svg+xml';
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';
        
        c.header('Content-Type', contentType);
        c.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        return c.body(file);
      } catch (error) {
        console.error(`Error serving favicon ${filename}:`, error);
      }
    }
  }
  
  // No favicon found, return 404
  return c.notFound();
});

