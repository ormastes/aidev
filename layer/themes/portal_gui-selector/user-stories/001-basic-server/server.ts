import express, { Request, Response } from 'express';
import { path } from '../../../infra_external-log-lib/src';
import { 
  setupWebSecurity,
  AuthService,
  SessionManager,
  SecurityConstants,
  User,
  NavigationHelper
} from '../../../web-security/pipe';

// Extend Request with user
interface AuthRequest extends Request {
  user?: User;
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3456;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Setup web security with shared session
const { authService, sessionManager, appRegistry } = setupWebSecurity(app, {
  requireAuth: false, // GUI selector might have public pages
  enableRateLimit: true,
  authMiddlewareConfig: {
    loginPath: '/login',
    publicPaths: ['/', '/login', '/api/auth/*', '/health', '/designs/*']
  },
  sessionConfig: {
    cookieDomain: "localhost", // Share cookies across ports
    cookieName: SecurityConstants.SESSION.COOKIE_NAME
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'GUI Selector',
    port: PORT
  });
});

// Check authentication status (shared with aidev-portal)
app.get('/api/auth/check', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (user) {
    res.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.roles[0]
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Redirect to main portal for login
app.get('/api/auth/login-redirect', (req: Request, res: Response) => {
  const returnUrl = encodeURIComponent(`http://localhost:${PORT}${req.query.return || '/'}`);
  res.json({
    loginUrl: `http://localhost:3400/login?returnUrl=${returnUrl}`
  });
});

// GUI Selection API (public)
app.get('/api/designs', (req: Request, res: Response) => {
  // Return available design templates
  res.json({
    designs: [
      {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, minimalist design with Material UI components',
        preview: '/designs/modern/preview.png'
      },
      {
        id: "professional",
        name: "Professional",
        description: 'Corporate-friendly design with traditional layouts',
        preview: '/designs/professional/preview.png'
      },
      {
        id: "creative",
        name: "Creative",
        description: 'Bold, artistic design with unique animations',
        preview: '/designs/creative/preview.png'
      },
      {
        id: "accessible",
        name: "Accessible",
        description: 'High-contrast, screen-reader friendly design',
        preview: '/designs/accessible/preview.png'
      }
    ]
  });
});

// Save user's design selection (requires auth)
app.post('/api/designs/select', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: `/api/auth/login-redirect?return=${req.path}`
    });
  }
  
  const { designId, projectId } = req.body;
  
  if (!designId) {
    return res.status(400).json({ error: 'Design ID is required' });
  }
  
  // Here you would save the selection to database
  // For now, just return success
  res.json({
    success: true,
    message: 'Design selected successfully',
    selection: {
      userId: user.id,
      designId,
      projectId,
      timestamp: new Date()
    }
  });
});

// Get user's saved selections (requires auth)
app.get('/api/designs/my-selections', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: `/api/auth/login-redirect?return=${req.path}`
    });
  }
  
  // Here you would fetch from database
  // For now, return mock data
  res.json({
    selections: [
      {
        id: '1',
        designId: 'modern',
        projectId: 'project-123',
        projectName: 'My Web App',
        selectedAt: new Date('2024-01-15')
      }
    ]
  });
});

// Serve the GUI selector app
app.get('/', async (req: Request, res: Response) => {
  const navigation = await NavigationHelper.generateNavigationHTML('gui-selector', authService, req);
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>GUI Selector - AI Dev Platform</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .auth-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .designs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .design-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .design-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .login-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${navigation}
  <div class="container">
    <div class="header">
      <h1>GUI Design Selector</h1>
      <div class="auth-status" id="authStatus">
        <span>Checking authentication...</span>
      </div>
    </div>
    
    <div class="designs" id="designs">
      <div class="design-card" data-id="modern">
        <h3>Modern</h3>
        <p>Clean, minimalist design</p>
      </div>
      <div class="design-card" data-id="professional">
        <h3>Professional</h3>
        <p>Corporate-friendly design</p>
      </div>
      <div class="design-card" data-id="creative">
        <h3>Creative</h3>
        <p>Bold, artistic design</p>
      </div>
      <div class="design-card" data-id="accessible">
        <h3>Accessible</h3>
        <p>High-contrast, accessible design</p>
      </div>
    </div>
  </div>
  
  <script>
    // Check authentication status
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        const authStatus = document.getElementById("authStatus");
        if (data.authenticated) {
          authStatus.innerHTML = \`
            <span>Welcome, \${data.user.username}!</span>
            <button onclick="location.href='http://localhost:3400/dashboard'">Dashboard</button>
          \`;
        } else {
          authStatus.innerHTML = \`
            <span>Not logged in</span>
            <button class="login-btn" onclick="login()">Login</button>
          \`;
        }
      });
    
    // Handle design selection
    document.querySelectorAll('.design-card').forEach(card => {
      card.addEventListener('click', async () => {
        const designId = card.dataset.id;
        
        const response = await fetch('/api/designs/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designId })
        });
        
        const result = await response.json();
        
        if (response.status === 401) {
          // Redirect to login
          login();
        } else if (result.success) {
          alert('Design selected successfully!');
        }
      });
    });
    
    function login() {
      fetch('/api/auth/login-redirect')
        .then(res => res.json())
        .then(data => {
          window.location.href = data.loginUrl;
        });
    }
  </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`GUI Selector is running on http://localhost:${PORT}`);
  console.log('Sharing authentication with AI Dev Portal via web-security theme');
});