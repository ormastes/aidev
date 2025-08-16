import { Router, Request, Response } from 'express';
import { StoryService } from '../services/story-service';
import { StoryReportGenerator } from '../external/story-report-generator';
import { 
  StoryStatus,
  Requirement,
  UserStory,
  TestCase,
  RoleComment,
  CoverageReport,
  FraudCheckResult
} from '../domain/story';

export function createStoryAPI(storyService: StoryService): Router {
  const router = Router();
  const reportGenerator = new StoryReportGenerator();

  // Get all stories
  router.get('/stories', async (req: Request, res: Response) => {
    try {
      const { status, project, tags, text, failed } = req.query;
      
      if (failed === 'true') {
        const failing = await storyService.getFailingStories();
        return res.json(failing);
      }
      
      const criteria: any = {};
      if (status) criteria.status = status as StoryStatus;
      if (project) criteria.project = project as string;
      if (tags) criteria.tags = (tags as string).split(',');
      if (text) criteria.text = text as string;
      
      const stories = Object.keys(criteria).length > 0
        ? await storyService.searchStories(criteria)
        : await storyService.getAllStories();
        
      res.json(stories);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch stories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get single story
  router.get('/stories/:id', async (req: Request, res: Response) => {
    try {
      const story = await storyService.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(story);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create story
  router.post('/stories', async (req: Request, res: Response) => {
    try {
      const { title, description, project, tags } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      const story = await storyService.createStory(title, description || '');
      
      // Update metadata if provided
      if (project || tags) {
        const updates: any = {};
        if (project) updates.metadata = { ...story.metadata, project };
        if (tags) updates.metadata = { ...story.metadata, tags };
        await storyService.updateStory(story.id, updates);
      }
      
      res.status(201).json(story);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to create story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update story
  router.put('/stories/:id', async (req: Request, res: Response) => {
    try {
      const updated = await storyService.updateStory(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete story
  router.delete('/stories/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storyService.deleteStory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to delete story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update story status
  router.patch('/stories/:id/status', async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status || !Object.values(StoryStatus).includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          validStatuses: Object.values(StoryStatus)
        });
      }
      
      const updated = await storyService.updateStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add requirement
  router.post('/stories/:id/requirements', async (req: Request, res: Response) => {
    try {
      const requirement: Requirement = {
        id: `req_${Date.now()}`,
        ...req.body
      };
      
      const updated = await storyService.addRequirement(req.params.id, requirement);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to add requirement',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add user story
  router.post('/stories/:id/user-stories', async (req: Request, res: Response) => {
    try {
      const userStory: UserStory = {
        id: `us_${Date.now()}`,
        ...req.body
      };
      
      const updated = await storyService.addUserStory(req.params.id, userStory);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to add user story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add test case
  router.post('/stories/:id/tests', async (req: Request, res: Response) => {
    try {
      const testCase: TestCase = {
        id: `test_${Date.now()}`,
        ...req.body
      };
      
      const updated = await storyService.addTestCase(req.params.id, testCase);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to add test case',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add comment
  router.post('/stories/:id/comments', async (req: Request, res: Response) => {
    try {
      const comment: RoleComment = {
        id: `comment_${Date.now()}`,
        timestamp: new Date(),
        ...req.body
      };
      
      const updated = await storyService.addComment(req.params.id, comment);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to add comment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update coverage
  router.put('/stories/:id/coverage', async (req: Request, res: Response) => {
    try {
      const coverage: CoverageReport = req.body;
      
      const updated = await storyService.updateCoverage(req.params.id, coverage);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update coverage',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update fraud check
  router.put('/stories/:id/fraud-check', async (req: Request, res: Response) => {
    try {
      const fraudCheck: FraudCheckResult = req.body;
      
      const updated = await storyService.updateFraudCheck(req.params.id, fraudCheck);
      if (!updated) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update fraud check',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verify story
  router.get('/stories/:id/verify', async (req: Request, res: Response) => {
    try {
      const result = await storyService.verifyStory(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(result.verification);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to verify story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate report
  router.post('/stories/:id/report', async (req: Request, res: Response) => {
    try {
      const story = await storyService.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      
      const reportPath = await reportGenerator.generateStoryReport(story);
      res.json({ 
        "success": true,
        reportPath,
        message: 'Report generated In Progress'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Export story data
  router.get('/stories/:id/export', async (req: Request, res: Response) => {
    try {
      const data = await storyService.exportStoryData(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Story not found' });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to export story data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import story
  router.post('/stories/import', async (req: Request, res: Response) => {
    try {
      const story = await storyService.importStory(req.body);
      res.status(201).json(story);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to import story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get statistics
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const stories = await storyService.getAllStories();
      const failing = await storyService.getFailingStories();
      
      const stats = {
        total: stories.length,
        byStatus: Object.values(StoryStatus).reduce((acc, status) => {
          acc[status] = stories.filter(s => s.status === status).length;
          return acc;
        }, {} as Record<string, number>),
        failing: failing.length,
        passed: stories.filter(s => s.status === StoryStatus.success).length,
        averageCoverage: stories.length > 0
          ? stories.reduce((sum, s) => sum + s.coverage.overall, 0) / stories.length
          : 0
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}