import express from 'express';
import { z } from 'zod';
import { SkillStorage } from '../services/skillStorage';
import type { 
  SkillConfig,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillValidationResult
} from '../types/skills';

const router: express.Router = express.Router();

// Initialize skill storage
const skillStorage = new SkillStorage();
skillStorage.initialize().catch(console.error);

// Validation schemas
const CreateSkillSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-_]+$/, 'Name must contain only lowercase letters, numbers, hyphens, and underscores'),
  description: z.string().min(1).max(1024),
  scope: z.enum(['user', 'project']),
  projectId: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  content: z.string().min(1),
  additionalFiles: z.array(z.object({
    name: z.string().min(1),
    path: z.string().min(1),
    type: z.enum(['markdown', 'text', 'script', 'template', 'other']),
    content: z.string()
  })).optional()
});

const UpdateSkillSchema = CreateSkillSchema.partial().omit({ scope: true });

// Get all skills
router.get('/', (req, res) => {
  try {
    const { scope, includeDisabled } = req.query;
    
    let skillsPromise;
    if (scope === 'user') {
      skillsPromise = skillStorage.getUserSkills(includeDisabled === 'true');
    } else if (scope === 'project') {
      skillsPromise = skillStorage.getProjectSkills(includeDisabled === 'true');
    } else {
      skillsPromise = skillStorage.getAllSkills(includeDisabled === 'true');
    }
    
    skillsPromise.then(skills => {
      res.json({ skills });
    }).catch(error => {
      console.error('Failed to get skills:', error);
      res.status(500).json({ error: 'Failed to retrieve skills' });
    });
  } catch (error) {
    console.error('Failed to get skills:', error);
    res.status(500).json({ error: 'Failed to retrieve skills' });
  }
});

// Get specific skill
router.get('/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { scope } = req.query;
    
    const skill = await skillStorage.getSkill(
      skillId, 
      scope as 'user' | 'project' | undefined
    );
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ skill });
  } catch (error) {
    console.error('Failed to get skill:', error);
    res.status(500).json({ error: 'Failed to retrieve skill' });
  }
});

// Create new skill
router.post('/', async (req, res) => {
  try {
    const validation = CreateSkillSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid skill data', 
        details: validation.error.errors 
      });
    }

    const skillData = validation.data;
    
    // Validate skill manifest content
    const manifestValidation = await skillStorage.validateSkillManifest(skillData.content);
    if (!manifestValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid skill manifest', 
        details: manifestValidation.errors 
      });
    }

    const result = await skillStorage.createSkill(skillData);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Failed to create skill', 
        details: result.errors 
      });
    }

    // Get the created skill
    const createdSkill = await skillStorage.getSkill(result.skillId, skillData.scope);
    
    res.status(201).json({ 
      skill: createdSkill, 
      message: 'Skill created successfully' 
    });
  } catch (error) {
    console.error('Failed to create skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

// Update skill
router.put('/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const validation = UpdateSkillSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid skill data', 
        details: validation.error.errors 
      });
    }

    // Check if skill exists
    const existingSkill = await skillStorage.getSkill(skillId);
    if (!existingSkill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Validate skill manifest content if provided
    if ('content' in validation.data && validation.data.content) {
      const manifestValidation = await skillStorage.validateSkillManifest(validation.data.content);
      if (!manifestValidation.valid) {
        return res.status(400).json({ 
          error: 'Invalid skill manifest', 
          details: manifestValidation.errors 
        });
      }
    }

    const result = await skillStorage.updateSkill(skillId, existingSkill.scope, validation.data);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Failed to update skill', 
        details: result.errors 
      });
    }

    // Get the updated skill - preserve the original scope
    const updatedSkill = await skillStorage.getSkill(skillId, existingSkill.scope);
    
    res.json({ 
      skill: updatedSkill, 
      message: 'Skill updated successfully',
      updatedFiles: result.updatedFiles
    });
  } catch (error) {
    console.error('Failed to update skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

// Delete skill
router.delete('/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { scope } = req.query;
    
    const deleted = await skillStorage.deleteSkill(
      skillId, 
      scope as 'user' | 'project' | undefined
    );
    
    if (!deleted) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// Get skill directory info
router.get('/:skillId/directory', async (req, res) => {
  try {
    const { skillId } = req.params;
    
    const directoryInfo = await skillStorage.getSkillDirectoryInfo(skillId);
    
    if (!directoryInfo) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ directoryInfo });
  } catch (error) {
    console.error('Failed to get skill directory info:', error);
    res.status(500).json({ error: 'Failed to retrieve skill directory info' });
  }
});

// Validate skill manifest
router.post('/validate', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ 
        error: 'Content is required and must be a string' 
      });
    }

    const result = await skillStorage.validateSkillManifest(content);
    
    res.json({ 
      valid: result.valid,
      errors: result.errors
    });
  } catch (error) {
    console.error('Failed to validate skill manifest:', error);
    res.status(500).json({ error: 'Failed to validate skill manifest' });
  }
});

// Get skill file content
router.get('/:skillId/files/*', async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const filePath = (req.params as any)[0] || ''; // Get the wildcard part
    
    const skill = await skillStorage.getSkill(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const baseDir = skill.scope === 'user' 
      ? (skillStorage as any).userSkillsDir 
      : (skillStorage as any).projectSkillsDir;
    const fullPath = require('path').join(baseDir, skillId, filePath);
    
    // Security check: ensure the file is within the skill directory
    if (!fullPath.startsWith(require('path').join(baseDir, skillId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fs = require('fs/promises');
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      res.json({ content });
    } catch (fileError) {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Failed to get skill file:', error);
    res.status(500).json({ error: 'Failed to retrieve skill file' });
  }
});

// Update skill file content
router.put('/:skillId/files/*', async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const filePath = (req.params as any)[0] || ''; // Get the wildcard part
    const { content } = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const skill = await skillStorage.getSkill(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const baseDir = skill.scope === 'user' 
      ? (skillStorage as any).userSkillsDir 
      : (skillStorage as any).projectSkillsDir;
    const fullPath = require('path').join(baseDir, skillId, filePath);
    
    // Security check: ensure the file is within the skill directory
    if (!fullPath.startsWith(require('path').join(baseDir, skillId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fs = require('fs/promises');
    const path = require('path');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file content
    await fs.writeFile(fullPath, content, 'utf8');
    
    res.json({ message: 'File updated successfully' });
  } catch (error) {
    console.error('Failed to update skill file:', error);
    res.status(500).json({ error: 'Failed to update skill file' });
  }
});

export default router;