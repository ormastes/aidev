# AI Dev Portal - Style Guide & Design System

## 🎨 Design Philosophy

Our design system emphasizes modern, clean aesthetics with a focus on usability and visual hierarchy. We use glassmorphism, gradients, and smooth animations to create an engaging yet professional interface.

## 🎯 Core Principles

1. **Clarity First** - Information should be immediately understandable
2. **Consistent Experience** - Similar elements behave similarly everywhere
3. **Delightful Interactions** - Smooth animations and micro-interactions
4. **Accessible Design** - WCAG AA compliant with clear focus states
5. **Performance Minded** - Beautiful but fast

## 🎨 Color System

### Primary Palette
```css
--primary: #6366f1;        /* Indigo - Main brand color */
--primary-dark: #4f46e5;   /* Darker shade for hover states */
--primary-light: #818cf8;  /* Lighter shade for backgrounds */
```

### Secondary Colors
```css
--secondary: #8b5cf6;  /* Purple - Complementary actions */
--accent: #ec4899;     /* Pink - Highlights and CTAs */
```

### Semantic Colors
```css
--success: #10b981;    /* Green - Success states */
--warning: #f59e0b;    /* Amber - Warning messages */
--error: #ef4444;      /* Red - Error states */
--info: #3b82f6;       /* Blue - Information */
```

### Neutral Tones
```css
/* Dark Theme (Default) */
--bg-primary: #0f172a;     /* Main background */
--bg-secondary: #1e293b;   /* Card backgrounds */
--bg-tertiary: #334155;    /* Hover states */
--text-primary: #f1f5f9;   /* Main text */
--text-secondary: #cbd5e1; /* Secondary text */
--text-muted: #94a3b8;     /* Muted text */
```

## 📐 Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
Using a 1.25 modular scale for harmonious sizing:

```css
--font-xs: 0.75rem;    /* 12px - Captions */
--font-sm: 0.875rem;   /* 14px - Small text */
--font-base: 1rem;     /* 16px - Body text */
--font-lg: 1.125rem;   /* 18px - Large body */
--font-xl: 1.25rem;    /* 20px - H5 */
--font-2xl: 1.5rem;    /* 24px - H4 */
--font-3xl: 1.875rem;  /* 30px - H3 */
--font-4xl: 2.25rem;   /* 36px - H2 */
--font-5xl: 3rem;      /* 48px - H1 */
```

### Line Heights
- Headlines: 1.2
- Body text: 1.6
- UI elements: 1.4

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## 📏 Spacing System

Based on 8px grid for consistency:

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

## 🎭 Visual Effects

### Glassmorphism
```css
.glass {
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(148, 163, 184, 0.1);
}
```

### Gradients
```css
/* Primary gradient */
background: linear-gradient(135deg, #6366f1, #8b5cf6);

/* Animated gradient border */
background: linear-gradient(45deg, #6366f1, #8b5cf6, #ec4899);
```

### Shadows
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.16);
--shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.19);
--shadow-xl: 0 14px 28px rgba(0, 0, 0, 0.25);
--shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);
```

## 🎬 Animations

### Timing Functions
```css
--transition-fast: 150ms ease;
--transition-base: 250ms ease;
--transition-slow: 350ms ease;
```

### Common Animations
```css
/* Fade In */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Shimmer (for loading states) */
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* Shake (for errors) */
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
}
```

## 🧩 Component Patterns

### Buttons
```css
.btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-md);
    font-weight: 600;
    transition: all var(--transition-base);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}
```

### Cards
```css
.card {
    background: rgba(30, 41, 59, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
}
```

### Forms
```css
.input {
    background: rgba(15, 23, 42, 0.5);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    padding: var(--space-md) var(--space-lg);
    transition: all var(--transition-base);
}

.input:focus {
    border-color: var(--primary);
    background: rgba(15, 23, 42, 0.8);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### Navigation
```css
.nav-link {
    position: relative;
    transition: all var(--transition-base);
}

.nav-link::before {
    content: '';
    position: absolute;
    left: 0;
    width: 3px;
    height: 100%;
    background: var(--primary);
    transform: scaleY(0);
    transition: transform var(--transition-base);
}

.nav-link.active::before {
    transform: scaleY(1);
}
```

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
/* Small devices (phones) */
@media (min-width: 576px) { }

/* Medium devices (tablets) */
@media (min-width: 768px) { }

/* Large devices (desktops) */
@media (min-width: 992px) { }

/* Extra large devices */
@media (min-width: 1200px) { }
```

## ♿ Accessibility Guidelines

### Focus States
All interactive elements must have visible focus indicators:
```css
:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
```

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Touch Targets
- Minimum size: 44x44px on mobile
- Adequate spacing between targets

### ARIA Labels
- Use semantic HTML first
- Add ARIA labels for icon-only buttons
- Provide screen reader context

## 🎯 Implementation Checklist

### When Creating New Components:
- [ ] Use CSS variables for all colors
- [ ] Apply consistent spacing from the scale
- [ ] Include hover and focus states
- [ ] Add smooth transitions
- [ ] Test on multiple screen sizes
- [ ] Verify color contrast
- [ ] Add loading states where needed
- [ ] Include error states
- [ ] Document component usage

### Before Release:
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness check
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit (axe DevTools)
- [ ] Dark/light theme compatibility
- [ ] Animation performance check
- [ ] Loading state coverage
- [ ] Error state handling

## 📚 Usage Examples

### Creating a New Card Component
```html
<div class="card fade-in">
    <h3 class="gradient-text">Feature Title</h3>
    <p class="text-secondary">Description text here</p>
    <div class="progress-bar">
        <div class="progress-fill" style="width: 75%"></div>
    </div>
</div>
```

### Building a Form
```html
<form class="glass-form">
    <input type="text" class="input" placeholder="Enter text">
    <button class="btn-primary">
        Submit
        <span class="shimmer"></span>
    </button>
</form>
```

### Status Indicators
```html
<span class="status-badge status-active">Active</span>
<span class="status-badge status-pending">Pending</span>
<span class="status-badge status-completed">Completed</span>
```

## 🔗 Resources

- [Inter Font](https://fonts.google.com/specimen/Inter)
- [CSS Variables Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Glassmorphism Generator](https://glassmorphism.com/)
- [Gradient Generator](https://cssgradient.io/)

## 📝 Version History

- **v1.0.0** - Initial style guide
- **v1.1.0** - Added glassmorphism and gradient effects
- **v1.2.0** - Enhanced animations and micro-interactions
- **Current** - Complete design system with accessibility focus

---

*This style guide is a living document and will evolve with the project's needs.*