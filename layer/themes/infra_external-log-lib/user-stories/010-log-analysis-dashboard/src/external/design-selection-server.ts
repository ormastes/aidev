/**
 * Design Selection Server
 * Web interface for presenting and selecting dashboard design candidates
 */

import * as express from 'express';
import * as path from 'path';
import { promises as fs } from 'fs';

const app = express();
const PORT = 3457; // Standard port for GUI selection

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../docs/designs')));

// Design candidates data
const designCandidates = [
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean, modern interface with focus on data visualization and minimal UI chrome',
    features: [
      'Flat design with subtle shadows',
      'Large, clear typography',
      'Prominent data visualizations',
      'Minimal sidebar navigation',
      'Card-based layout'
    ],
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b'
    },
    preview: '/previews/modern-minimalist.html'
  },
  {
    id: 'professional-corporate',
    name: 'Professional Corporate',
    description: 'Enterprise-grade interface with traditional layouts and comprehensive navigation',
    features: [
      'Traditional sidebar with detailed navigation',
      'Tabbed interface for different views',
      'Dense information layout',
      'Consistent with enterprise tools',
      'Strong visual hierarchy'
    ],
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827'
    },
    preview: '/previews/professional-corporate.html'
  },
  {
    id: 'creative-playful',
    name: 'Creative Playful',
    description: 'Vibrant, engaging interface with dynamic layouts and interactive elements',
    features: [
      'Vibrant color scheme',
      'Animated transitions',
      'Interactive dashboard widgets',
      'Flexible grid layout',
      'Engaging micro-interactions'
    ],
    colors: {
      primary: '#7c3aed',
      secondary: '#ec4899',
      background: '#fefcfd',
      surface: '#faf8ff',
      text: '#5b21b6'
    },
    preview: '/previews/creative-playful.html'
  },
  {
    id: 'accessible-high-contrast',
    name: 'Accessible High-Contrast',
    description: 'Maximum accessibility with high contrast, large text, and clear visual separation',
    features: [
      'WCAG AAA compliance',
      'High contrast color scheme',
      'Large, readable typography',
      'Clear focus indicators',
      'Screen reader optimized'
    ],
    colors: {
      primary: '#000000',
      secondary: '#4a4a4a',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      accent: '#0066cc'
    },
    preview: '/previews/accessible-high-contrast.html'
  }
];

// Routes
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analysis Dashboard - Design Selection</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #64748b;
        }
        
        .designs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .design-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        
        .design-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        }
        
        .design-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .design-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-left: 0.5rem;
        }
        
        .design-description {
            color: #64748b;
            margin-bottom: 1.5rem;
        }
        
        .features {
            margin-bottom: 2rem;
        }
        
        .features h4 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1e293b;
        }
        
        .features ul {
            list-style: none;
        }
        
        .features li {
            padding: 0.25rem 0;
            color: #475569;
        }
        
        .features li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 0.5rem;
        }
        
        .color-palette {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
        
        .color-swatch {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 2px solid #e2e8f0;
        }
        
        .actions {
            display: flex;
            gap: 1rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            transition: all 0.2s ease;
            cursor: pointer;
            border: none;
        }
        
        .btn-primary {
            background: #2563eb;
            color: white;
        }
        
        .btn-primary:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        .selection-form {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1e293b;
        }
        
        select, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 1rem;
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .submit-btn {
            background: #059669;
            color: white;
            padding: 1rem 2rem;
            font-size: 1.1rem;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .submit-btn:hover {
            background: #047857;
        }
        
        #selected-design {
            display: none;
        }
        
        .selected {
            border: 3px solid #059669;
            background: #f0fdf4;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🖥️ Log Analysis Dashboard</h1>
            <p class="subtitle">Choose your preferred design from these 4 carefully crafted options</p>
        </header>
        
        <div class="designs-grid">
            ${designCandidates.map(design => `
                <div class="design-card" data-design-id="${design.id}">
                    <div class="design-header">
                        <h3 class="design-title">${design.name}</h3>
                    </div>
                    <p class="design-description">${design.description}</p>
                    
                    <div class="features">
                        <h4>Key Features</h4>
                        <ul>
                            ${design.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="color-palette">
                        ${Object.values(design.colors).map(color => 
                            `<div class="color-swatch" style="background-color: ${color};" title="${color}"></div>`
                        ).join('')}
                    </div>
                    
                    <div class="actions">
                        <a href="${design.preview}" target="_blank" class="btn btn-secondary">Preview</a>
                        <button class="btn btn-primary select-design" data-design-id="${design.id}">Select This Design</button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div id="selected-design">
            <div class="selection-form">
                <h2>Design Selected! 🎉</h2>
                <p>Great choice! You've selected the <strong id="selected-name"></strong> design.</p>
                
                <form id="selection-form">
                    <div class="form-group">
                        <label for="design-id">Selected Design</label>
                        <select id="design-id" name="designId" required>
                            ${designCandidates.map(design => 
                                `<option value="${design.id}">${design.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="customizations">Customizations or Notes (optional)</label>
                        <textarea id="customizations" name="customizations" placeholder="Any specific customizations you'd like for this design..."></textarea>
                    </div>
                    
                    <button type="submit" class="submit-btn">Confirm Selection & Start Implementation</button>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const selectButtons = document.querySelectorAll('.select-design');
            const designCards = document.querySelectorAll('.design-card');
            const selectedDesignDiv = document.getElementById('selected-design');
            const selectedNameSpan = document.getElementById('selected-name');
            const designSelect = document.getElementById('design-id');
            
            selectButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const designId = this.dataset.designId;
                    const design = ${JSON.stringify(designCandidates)}.find(d => d.id === designId);
                    
                    // Remove previous selections
                    designCards.forEach(card => card.classList.remove('selected'));
                    
                    // Mark selected card
                    this.closest('.design-card').classList.add('selected');
                    
                    // Update selection form
                    selectedNameSpan.textContent = design.name;
                    designSelect.value = designId;
                    selectedDesignDiv.style.display = 'block';
                    selectedDesignDiv.scrollIntoView({ behavior: 'smooth' });
                });
            });
            
            document.getElementById('selection-form').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const data = {
                    designId: formData.get('designId'),
                    customizations: formData.get('customizations'),
                    timestamp: new Date().toISOString()
                };
                
                fetch('/api/select-design', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert('Design selection saved! Implementation will now begin with your chosen design.');
                        console.log('Design selection result:', result);
                    } else {
                        alert('Error saving selection: ' + result.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error saving selection. Check console for details.');
                });
            });
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

// API endpoint to save design selection
app.post('/api/select-design', async (req, res) => {
  try {
    const { designId, customizations, timestamp } = req.body;
    
    const selection = {
      designId,
      customizations,
      timestamp,
      selectedDesign: designCandidates.find(d => d.id === designId)
    };
    
    // Save selection to file
    const selectionPath = path.join(__dirname, '../../docs/design-selection.json');
    await fs.writeFile(selectionPath, JSON.stringify(selection, null, 2));
    
    console.log(`✅ Design selection saved: ${designId}`);
    console.log(`📝 Customizations: ${customizations || 'None'}`);
    
    res.json({
      success: true,
      message: 'Design selection saved successfully',
      selection
    });
  } catch (error) {
    console.error('Error saving design selection:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get design candidates
app.get('/api/designs', (req, res) => {
  res.json(designCandidates);
});

// Get current selection
app.get('/api/current-selection', async (req, res) => {
  try {
    const selectionPath = path.join(__dirname, '../../docs/design-selection.json');
    const selection = JSON.parse(await fs.readFile(selectionPath, 'utf-8'));
    res.json(selection);
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'No design selection found'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Design Selection Server running at http://localhost:${PORT}`);
  console.log(`📋 Open this URL to view and select dashboard designs`);
  console.log(`🚀 After selection, the chosen design will be implemented`);
});

export { app, designCandidates };