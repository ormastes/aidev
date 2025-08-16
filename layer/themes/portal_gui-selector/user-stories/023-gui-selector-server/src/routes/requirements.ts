import { Router } from 'express';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';
import { optionalJWT } from '../middleware/jwt-auth';

export const requirementsRouter = Router();

interface Requirement {
  id: string;
  userId: string;
  selectionId: string;
  type: "functional" | 'design' | "technical" | 'other';
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage
const requirements = new Map<string, Requirement>();

// List requirements
requirementsRouter.get('/', optionalJWT, (req, res) => {
  const userId = req.user?.userId || req.session?.userId;
  const userRequirements = Array.from(requirements.values())
    .filter(r => userId ? r.userId === userId.toString() : true);
  res.json(userRequirements);
});

// Create requirement
requirementsRouter.post('/', optionalJWT, (req, res) => {
  try {
    const { selectionId, type, description, priority } = req.body;
    
    if (!selectionId || !type || !description) {
      return res.status(400).json({ error: 'Selection ID, type, and description required' });
    }

    const requirementId = `req-${Date.now()}`;
    const userId = req.user?.userId || req.session?.userId || "anonymous";
    const newRequirement: Requirement = {
      id: requirementId,
      userId: userId.toString(),
      selectionId,
      type,
      description,
      priority: priority || 'medium',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    requirements.set(requirementId, newRequirement);

    logger.info(`Requirement created: ${requirementId}`);
    res.status(201).json(newRequirement);
  } catch (error) {
    logger.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

// Export requirements
requirementsRouter.get('/export', optionalJWT, (req, res) => {
  try {
    const format = req.query.format || 'json';
    const userId = req.user?.userId || req.session?.userId;
    const userRequirements = Array.from(requirements.values())
      .filter(r => userId ? r.userId === userId.toString() : true);

    if (format === "markdown") {
      let markdown = '# GUI Requirements Export\n\n';
      markdown += `Generated on: ${new Date().toISOString()}\n\n`;
      
      const grouped = userRequirements.reduce((acc, req) => {
        if (!acc[req.type]) acc[req.type] = [];
        acc[req.type].push(req);
        return acc;
      }, {} as Record<string, Requirement[]>);

      for (const [type, reqs] of Object.entries(grouped)) {
        markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Requirements\n\n`;
        for (const req of reqs) {
          markdown += `### ${req.description}\n`;
          markdown += `- Priority: ${req.priority}\n`;
          markdown += `- Status: ${req.status}\n`;
          markdown += `- Created: ${req.createdAt.toISOString()}\n\n`;
        }
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="requirements.md"');
      res.send(markdown);
    } else {
      res.json({
        exportDate: new Date().toISOString(),
        requirements: userRequirements
      });
    }
  } catch (error) {
    logger.error('Error exporting requirements:', error);
    res.status(500).json({ error: 'Failed to export requirements' });
  }
});