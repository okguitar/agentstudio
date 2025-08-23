import express from 'express';
import fs from 'fs-extra';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Get slides directory path
const getSlidesDir = () => {
  return join(__dirname, '../../..', process.env.SLIDES_DIR || 'slides');
};

// Get slides configuration
const getSlidesConfigPath = () => {
  return join(__dirname, '../../..', 'slides.js');
};

// Helper function to parse slides configuration
const parseSlidesConfig = async (configPath: string): Promise<{ slides: string[], title: string }> => {
  const configContent = await fs.readFile(configPath, 'utf-8');
  
  // Try to extract slides array and title from either new format or old format
  let slidesMatch = configContent.match(/presentationConfig\s*=\s*\{[\s\S]*?slides:\s*\[([\s\S]*?)\]/);
  let titleMatch = configContent.match(/title:\s*["']([^"']+)["']/);
  
  if (!slidesMatch) {
    // Fallback to old format
    slidesMatch = configContent.match(/slides:\s*\[([\s\S]*?)\]/);
  }
  
  if (!slidesMatch) {
    throw new Error('Invalid slides configuration format');
  }

  // Extract slide paths
  const slidesArrayContent = slidesMatch[1];
  const slideMatches = slidesArrayContent.match(/"([^"]+)"/g);
  const slides = slideMatches ? slideMatches.map(match => match.replace(/"/g, '')) : [];
  
  // Extract title, fallback to default
  const title = titleMatch ? titleMatch[1] : 'Presentation';
  
  return { slides, title };
};

// Validation schemas
const SlideContentSchema = z.object({
  content: z.string(),
  slideIndex: z.number().optional()
});

// GET /api/slides - Get all slides configuration
router.get('/', async (req, res) => {
  try {
    const configPath = getSlidesConfigPath();
    
    if (!existsSync(configPath)) {
      return res.status(404).json({ error: 'Slides configuration not found' });
    }

    const { slides, title } = await parseSlidesConfig(configPath);

    // Get metadata for each slide
    const slidesDir = getSlidesDir();
    const slidesWithMetadata = await Promise.all(
      slides.map(async (slidePath, index) => {
        const fullPath = join(slidesDir, slidePath.replace('slides/', ''));
        const exists = existsSync(fullPath);
        
        let title = slidePath.split('/').pop()?.replace('.html', '') || `Slide ${index + 1}`;
        
        // Try to extract title from HTML if file exists
        if (exists) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const titleMatch = content.match(/<title>(.*?)<\/title>/i) || 
                              content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (titleMatch) {
              title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
            }
          } catch (error) {
            console.warn(`Could not read slide content for ${slidePath}:`, error);
          }
        }

        return {
          path: slidePath,
          title,
          exists,
          index
        };
      })
    );

    res.json({
      slides: slidesWithMetadata,
      total: slides.length,
      title: title
    });
  } catch (error) {
    console.error('Error reading slides configuration:', error);
    res.status(500).json({ error: 'Failed to read slides configuration' });
  }
});

// GET /api/slides/:index - Get specific slide content
router.get('/:index', async (req, res) => {
  try {
    const slideIndex = parseInt(req.params.index);
    if (isNaN(slideIndex)) {
      return res.status(400).json({ error: 'Invalid slide index' });
    }

    const configPath = getSlidesConfigPath();
    const { slides } = await parseSlidesConfig(configPath);

    if (slideIndex >= slides.length) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    const slidePath = slides[slideIndex];
    const fullPath = join(getSlidesDir(), slidePath.replace('slides/', ''));

    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'Slide file not found' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({
      content,
      path: slidePath,
      index: slideIndex
    });
  } catch (error) {
    console.error('Error reading slide:', error);
    res.status(500).json({ error: 'Failed to read slide' });
  }
});

// PUT /api/slides/:index - Update specific slide content
router.put('/:index', async (req, res) => {
  try {
    const slideIndex = parseInt(req.params.index);
    if (isNaN(slideIndex)) {
      return res.status(400).json({ error: 'Invalid slide index' });
    }

    const validation = SlideContentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validation.error });
    }

    const { content } = validation.data;

    // Get current slides configuration
    const configPath = getSlidesConfigPath();
    const { slides } = await parseSlidesConfig(configPath);

    if (slideIndex >= slides.length) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    const slidePath = slides[slideIndex];
    const fullPath = join(getSlidesDir(), slidePath.replace('slides/', ''));

    // Write the updated content
    await fs.writeFile(fullPath, content, 'utf-8');

    res.json({
      success: true,
      message: 'Slide updated successfully',
      path: slidePath,
      index: slideIndex
    });
  } catch (error) {
    console.error('Error updating slide:', error);
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

export default router;