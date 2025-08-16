# Feature: Multi-Theme GUI Screen Architecture

## Overview
Enhanced GUI Selector Server architecture where each GUI screen can support multiple themes, with a centralized template system and database-driven theme management.

## Core Requirements

### 1. Theme-Screen Relationship
- **One-to-Many**: Each GUI screen can have 1 or more themes
- **No Individual HTML Pages**: Sample GUI select pages don't have separate HTML files
- **Single Template System**: One theme template + one screen page template for all variations
- **Dynamic Rendering**: Themes applied dynamically to screen templates

### 2. Main Page Architecture
- **Theme Page Links**: Main page contains links to theme pages stored in database
- **Theme Entity Database**: Database stores theme metadata, configurations, and page associations
- **Navigation System**: Dynamic navigation based on available themes

### 3. Theme Page Structure
- **Screen Iteration**: Each theme page iterates through available screen pages
- **Template Application**: Single screen template receives theme parameters
- **Dynamic Content**: Screen content generated based on theme + screen combination

### 4. External Logging Integration
- **External Log Library**: Use existing external log lib for theme implementation logging
- **Theme Operations Logging**: Log theme selection, screen navigation, template rendering
- **Performance Monitoring**: Track theme loading times and user interactions

## Technical Architecture

### Database Schema
```sql
-- Theme Entity
CREATE TABLE themes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    styles JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Screen Entity  
CREATE TABLE screens (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_path VARCHAR(200),
    component_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Theme-Screen Association
CREATE TABLE theme_screens (
    theme_id VARCHAR(50) REFERENCES themes(id),
    screen_id VARCHAR(50) REFERENCES screens(id),
    render_config JSONB,
    sort_order INTEGER,
    PRIMARY KEY (theme_id, screen_id)
);
```

### Template System
```
layer/themes/<theme-name>/templates/
├── theme-template.html          # Single theme template
├── screen-page-template.html    # Single screen page template  
├── main-page.html              # Main navigation page
└── components/
    ├── theme-selector.html
    ├── screen-grid.html
    └── preview-panel.html
```

### API Endpoints
```
GET /api/themes                 # List all themes
GET /api/themes/{id}            # Get theme details
GET /api/themes/{id}/screens    # Get screens for theme
GET /api/screens               # List all screens
GET /api/screens/{id}          # Get screen details
POST /api/themes               # Create new theme
PUT /api/themes/{id}           # Update theme
DELETE /api/themes/{id}        # Delete theme
```

## Implementation Features

### 1. Dynamic Theme Application
- **Runtime Theme Switching**: Change themes without page reload
- **CSS Variable System**: Theme styles applied via CSS custom properties
- **Component Theming**: Individual components themed based on selected theme
- **Responsive Design**: Themes adapt to different screen sizes

### 2. Screen Template Engine
- **Template Interpolation**: Single screen template with variable substitution
- **Component Composition**: Screens built from reusable components
- **Data Binding**: Screen data bound to theme configurations
- **Event Handling**: Theme-aware event handling and interactions

### 3. Navigation System
- **Theme-Based Navigation**: Main page navigation generated from theme database
- **Breadcrumb System**: Navigate between themes and screens
- **Search and Filter**: Find themes and screens by category, features, etc.
- **Bookmarking**: Save and share specific theme-screen combinations

### 4. External Log Integration
- **Theme Selection Logging**: Log when users select themes
- **Screen Navigation Logging**: Track screen-to-screen navigation patterns
- **Performance Logging**: Monitor theme loading and rendering performance
- **Error Logging**: Capture theme application errors and fallbacks

## User Experience Flow

### Main Page Flow
1. **Landing**: User arrives at main page
2. **Theme Discovery**: Browse available themes from database
3. **Theme Selection**: Click theme link to enter theme experience
4. **Screen Navigation**: Browse screens within selected theme
5. **Preview**: Live preview of theme applied to each screen

### Theme Page Flow  
1. **Theme Context**: Page header shows current theme information
2. **Screen Grid**: Grid layout showing all screens for current theme
3. **Screen Preview**: Click screen to see full preview with theme applied
4. **Theme Switching**: Quick switch to other themes while maintaining screen context
5. **Customization**: Adjust theme parameters and see live updates

### Screen Page Flow
1. **Template Rendering**: Single screen template rendered with theme data
2. **Interactive Preview**: Fully interactive preview of themed screen
3. **Component Inspection**: Hover/click to inspect themed components
4. **Responsive Testing**: Toggle between device sizes to test responsiveness
5. **Export Options**: Generate code, save configurations, share links

## Logging Requirements

### Theme Operations
```javascript
// Theme selection logging
logger.info("Theme selected", { 
    themeId: "modern-01", 
    userId: "user123",
    screenCount: 5,
    loadTime: 250 
});

// Screen navigation logging  
logger.info("Screen navigation", {
    fromScreen: "dashboard",
    toScreen: "settings", 
    themeId: "modern-01",
    navigationTime: 50
});

// Theme rendering performance
logger.performance("Theme render", {
    themeId: "modern-01",
    screenId: "dashboard", 
    renderTime: 120,
    componentCount: 8
});
```

### Error Handling
```javascript
// Theme loading errors
logger.error("Theme load failed", {
    themeId: "broken-theme",
    error: "CSS parse error",
    fallbackTheme: "default"
});

// Template rendering errors
logger.error("Template render failed", {
    templatePath: "/templates/screen-page-template.html",
    themeId: "custom-01",
    error: "Variable substitution failed"
});
```

## Benefits

### 1. Scalability
- **Theme Multiplication**: Easy to add new themes without creating new pages
- **Screen Reusability**: Screens work with any theme automatically  
- **Maintenance Efficiency**: Single template maintains all theme-screen combinations

### 2. User Experience
- **Consistent Navigation**: Unified experience across all themes
- **Theme Comparison**: Easy to compare same screen across different themes
- **Performance**: Faster loading with template reuse and caching

### 3. Developer Experience  
- **Theme Development**: Focus on styling rather than page structure
- **Screen Development**: Build screens once, theme them many ways
- **Debugging**: Centralized logging and error handling

### 4. Content Management
- **Database-Driven**: Easy to manage themes and screens via admin interface
- **Version Control**: Track theme changes and rollback capabilities
- **A/B Testing**: Easy to test different theme variations

## IN PROGRESS Metrics

### Performance Metrics
- **Theme Load Time**: < 500ms for theme switching
- **Screen Render Time**: < 200ms for screen template rendering
- **Memory Usage**: < 50MB additional memory per theme loaded
- **Cache Hit Rate**: > 80% for template and theme asset caching

### User Experience Metrics
- **Theme Adoption**: Track which themes are most popular
- **Screen Engagement**: Measure time spent on each screen type
- **Navigation Patterns**: Understand user flow through themes and screens
- **Error Rates**: < 1% theme application failures

### Development Metrics
- **Theme Development Time**: Reduce new theme creation by 60%
- **Screen Development Time**: Reduce new screen creation by 40%  
- **Bug Resolution Time**: Centralized logging reduces debug time by 50%
- **Test Coverage**: Maintain > Improving test coverage with new architecture

## Implementation Priority

### Phase 1: Core Infrastructure
1. Database schema and migrations
2. Single template system implementation
3. Basic theme-screen association
4. External log integration setup

### Phase 2: Dynamic Rendering
1. Template engine with variable substitution
2. Theme application system (CSS variables)
3. Screen iteration and navigation
4. Performance optimization

### Phase 3: Enhanced Features
1. Advanced theme customization
2. Real-time preview updates
3. Search and filtering capabilities
4. Export and sharing features

### Phase 4: Analytics & Optimization
1. Comprehensive logging implementation
2. Performance monitoring dashboard
3. User behavior analytics
4. A/B testing framework