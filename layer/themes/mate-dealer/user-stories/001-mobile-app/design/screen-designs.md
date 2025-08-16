# Mate Dealer Mobile App - Screen Designs

## ASCII Sketches

### 1. Login Screen

```
┌─────────────────────────────┐
│      MATE DEALER            │
│    ╱▔▔▔▔▔▔▔▔▔▔▔╲           │
│   │    ☕ LOGO   │          │
│    ╲____________╱           │
│                             │
│  ┌─────────────────────┐    │
│  │ Username/Email      │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Password            │    │
│  └─────────────────────┘    │
│                             │
│  □ Remember me              │
│                             │
│  ┌─────────────────────┐    │
│  │      LOGIN          │    │
│  └─────────────────────┘    │
│                             │
│  ─────── OR ────────        │
│                             │
│  [f] [G] [🍎] Social Login  │
│                             │
│  New? Create Account        │
│  Forgot Password?           │
└─────────────────────────────┘
```

### 2. Dashboard Screen

```
┌─────────────────────────────┐
│ ☰  Welcome, User!      🔔🛒 │
├─────────────────────────────┤
│  Featured Products          │
│ ┌──────┐ ┌──────┐ ┌──────┐│
│ │ IMG1 │ │ IMG2 │ │ IMG3 ││
│ │ $12  │ │ $18  │ │ $24  ││
│ └──────┘ └──────┘ └──────┘│
│ < Scroll horizontally >     │
├─────────────────────────────┤
│  Categories                 │
│ ┌─────────┐ ┌─────────┐    │
│ │Traditional│ │Pure Leaf│   │
│ └─────────┘ └─────────┘    │
│ ┌─────────┐ ┌─────────┐    │
│ │ Organic │ │  Blends │    │
│ └─────────┘ └─────────┘    │
├─────────────────────────────┤
│  Recent Orders              │
│ • Order #1234 - Delivered   │
│ • Order #1233 - In Transit  │
│                             │
│  View All Orders >          │
├─────────────────────────────┤
│ [🏠] [🔍] [🛒] [👤] [⚙️]    │
└─────────────────────────────┘
```

### 3. Profile Screen

```
┌─────────────────────────────┐
│ ←  Profile           Edit   │
├─────────────────────────────┤
│      ╱▔▔▔▔▔▔▔╲             │
│     │  👤     │             │
│      ╲________╱             │
│    John Doe                 │
│  john.doe@email.com         │
├─────────────────────────────┤
│  Account Information        │
│  ┌────────────────────┐     │
│  │ 📧 Email           │     │
│  │ 📱 +1 234 567 890  │     │
│  │ 📍 123 Main St     │     │
│  └────────────────────┘     │
├─────────────────────────────┤
│  Order Statistics           │
│  Total Orders: 42           │
│  Total Spent: $1,234        │
│  Member Since: Jan 2024     │
├─────────────────────────────┤
│  Quick Actions              │
│  [Order History]            │
│  [Saved Addresses]          │
│  [Payment Methods]          │
│  [Preferences]              │
│  [Help & Support]           │
│                             │
│  [🔴 Logout]                │
├─────────────────────────────┤
│ [🏠] [🔍] [🛒] [👤] [⚙️]    │
└─────────────────────────────┘
```

## 4 Design Variants

### Variant 1: Modern Minimalist

**Color Scheme**: White background, green accents (#4CAF50), dark gray text
**Typography**: Sans-serif, clean lines
**Features**:
- Floating action buttons
- Card-based layouts
- Subtle shadows
- Smooth animations
- Bottom navigation with icons only

### Variant 2: Professional Business

**Color Scheme**: Dark theme, gold accents (#FFD700), professional blue
**Typography**: Serif headers, sans-serif body
**Features**:
- Side drawer navigation
- Data tables for orders
- Charts for statistics
- Formal button styles
- Top navigation bar

### Variant 3: Creative Artisan

**Color Scheme**: Earth tones, brown (#8B4513), cream backgrounds
**Typography**: Hand-drawn style fonts
**Features**:
- Illustrated backgrounds
- Organic shapes
- Parallax scrolling
- Custom mate leaf animations
- Tab navigation with text

### Variant 4: Accessible High-Contrast

**Color Scheme**: High contrast black/white, blue links (#0066CC)
**Typography**: Large, clear fonts (min 16px)
**Features**:
- Extra large touch targets (48x48 min)
- Clear focus indicators
- Screen reader optimized
- Voice control support
- Simple grid layouts

## Navigation Structure

```
App
├── Auth Flow
│   ├── Login
│   ├── Register
│   └── Forgot Password
├── Main Flow
│   ├── Dashboard (Home)
│   ├── Catalog
│   │   ├── Categories
│   │   ├── Product List
│   │   └── Product Detail
│   ├── Cart
│   │   ├── Cart Items
│   │   └── Checkout
│   ├── Profile
│   │   ├── Account Info
│   │   ├── Orders
│   │   └── Settings
│   └── Settings
│       ├── Preferences
│       ├── Notifications
│       └── About
└── Modal Screens
    ├── Search
    ├── Filters
    └── Quick View
```

## Component Library

### Reusable Components
1. **MateButton**: Customizable button with loading states
2. **MateCard**: Product/content card component
3. **MateInput**: Form input with validation
4. **MateHeader**: Navigation header
5. **MateTabBar**: Bottom navigation
6. **MateLoader**: Loading spinner/skeleton
7. **MateModal**: Modal/popup component
8. **MateList**: Optimized list view
9. **MateImage**: Cached image component
10. **MateToast**: Notification toast

## Performance Considerations

### Screen Load Targets
- Login: < 1s
- Dashboard: < 2s (with images)
- Product List: < 1.5s
- Profile: < 1s
- Cart: < 1s

### Optimization Strategies
1. Lazy loading for images
2. Virtual scrolling for long lists
3. Offline caching for products
4. Preload critical screens
5. Code splitting by route
6. Optimistic UI updates
7. Background data sync
8. Image compression
9. Minified bundles
10. Progressive loading

## Accessibility Features

### Required Support
- VoiceOver (iOS)
- TalkBack (Android)
- Dynamic font sizing
- Color blind modes
- Keyboard navigation
- Focus management
- Alternative text
- ARIA labels
- Touch target sizing
- Gesture alternatives