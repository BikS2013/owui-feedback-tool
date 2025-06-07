# NBG Tech Hub Theming Guidelines

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Design](#component-design)
6. [Icons & Graphics](#icons--graphics)
7. [Interaction Patterns](#interaction-patterns)
8. [Responsive Design](#responsive-design)
9. [Implementation Guidelines](#implementation-guidelines)

---

## Design Philosophy

The NBG Tech Hub theming system is built on principles of:
- **Clarity**: Clear visual hierarchy through thoughtful color and spacing
- **Consistency**: Unified design language across all components
- **Accessibility**: High contrast ratios and clear interactive states
- **Sophistication**: Professional appearance with subtle gradients and shadows
- **Flexibility**: Dual theme support (light/dark) with seamless transitions

---

## Color System

### 1. Color Palette Structure

#### Dark Theme (Default)
```css
/* Background Colors */
--bg-primary: #1a2332;    /* Main background */
--bg-secondary: #222d42;  /* Elevated surfaces */
--bg-tertiary: #2a3752;   /* Hover states, subtle contrast */
--bg-card: #222d42;       /* Card backgrounds */

/* Text Colors */
--text-primary: #FFFFFF;   /* Main text */
--text-secondary: #B8C5D6; /* Secondary information */
--text-tertiary: #8B95A7;  /* Muted text, placeholders */

/* Accent Colors */
--accent-primary: #5B8BC9;   /* Primary brand color */
--accent-secondary: #FF8C5A; /* Secondary actions, alerts */
--accent-purple: #8B7BEE;    /* Special highlights */
--accent-blue: #6FA7E6;      /* Interactive elements */

/* Semantic Colors */
--accent-green: #52C77E;   /* Success, positive ratings */
--accent-yellow: #FFD666;  /* Warning, medium ratings */
--accent-red: #FF7B7B;     /* Error, negative ratings */

/* Utility Colors */
--border-color: rgba(91, 139, 201, 0.2);
--shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
```

#### Light Theme
```css
/* Background Colors */
--bg-primary: #F5F8FB;    /* Main background */
--bg-secondary: #FFFFFF;  /* Elevated surfaces */
--bg-tertiary: #E8EFF6;   /* Hover states */
--bg-card: #FFFFFF;       /* Card backgrounds */

/* Text Colors */
--text-primary: #1a2332;   /* Main text */
--text-secondary: #4A5568; /* Secondary information */
--text-tertiary: #718096;  /* Muted text */

/* Accent Colors */
--accent-primary: #345085;   /* Primary brand color */
--accent-secondary: #FF8C5A; /* Keep consistent */
--accent-blue: #5B8BC9;      /* Interactive elements */

/* Semantic Colors */
--accent-green: #52C77E;   /* Success */
--accent-yellow: #F59E0B;  /* Warning */
--accent-red: #EF4444;     /* Error */

/* Utility Colors */
--border-color: rgba(52, 80, 133, 0.15);
--shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
```

### 2. Special Colors

#### Brand Header Color
- **NBG Blue**: `#345085` - Used exclusively for primary headers and brand elements

#### Gradients
```css
/* Primary Background Gradient */
--gradient-primary: linear-gradient(135deg, [start-color] 0%, [end-color] 100%);

/* Card Gradient (subtle) */
--gradient-card: linear-gradient(135deg, [start-color] 0%, [end-color] 100%);

/* Text Gradient Effect */
.gradient-text {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 3. Color Usage Guidelines

- **Primary actions**: Use `--accent-primary`
- **Destructive actions**: Use `--accent-red`
- **Success states**: Use `--accent-green`
- **Hover states**: Lighten by 10% or use `--bg-tertiary`
- **Disabled states**: 50% opacity
- **Focus states**: Add 2px outline with `--accent-primary` at 50% opacity

---

## Typography

### 1. Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
             'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
             sans-serif;
```

### 2. Font Sizes
- **Extra Large**: 24px (Page titles - rarely used)
- **Large**: 18px (Section headers, h2)
- **Default**: 16px (Body text, standard UI)
- **Small**: 14px (Secondary information, labels)
- **Tiny**: 12px (Timestamps, metadata)
- **Micro**: 11px (Tags, badges)

### 3. Font Weights
- **Regular**: 400 (Body text)
- **Semibold**: 600 (Headers, emphasis)
- **Bold**: 700 (Strong emphasis - use sparingly)

### 4. Line Heights
- **Headers**: 1.2
- **Body text**: 1.5
- **Compact**: 1.3 (Cards, lists)

### 5. Monospace Font
```css
font-family: 'Monaco', 'Courier New', monospace;
```
Used for:
- Code snippets
- IDs and technical identifiers
- File names

---

## Spacing & Layout

### 1. Spacing Scale
```
4px   - xs  (Inline spacing)
8px   - sm  (Tight spacing)
12px  - md  (Element spacing)
16px  - lg  (Section spacing)
24px  - xl  (Component spacing)
32px  - 2xl (Major sections)
48px  - 3xl (Page sections)
```

### 2. Common Patterns

#### Headers
- Primary header: `padding: 20px 24px`
- Secondary header: `padding: 12px 24px`
- Standard header height: `min-height: 105px` (All main panel headers must use this)
- Header structure: Two-part design
  - Top row: Title and controls
  - Bottom row: Statistics/metadata
- Background: `#345085` (NBG brand blue)

#### Cards & Containers
- Standard card: `padding: 16px`
- Content areas: `padding: 24px`
- Card gap: `margin-bottom: 8px`

#### Buttons
- Icon buttons: `padding: 8px`
- Text buttons: `padding: 8px 16px`
- Large buttons: `padding: 12px 24px`

#### Lists
- List item: `padding: 16px`
- List gap: `gap: 8px`

### 3. Grid System
- Base unit: 8px
- Column gap: 16px or 24px
- Row gap: 16px or 24px

---

## Component Design

### 1. Border Radius Scale
```css
--radius-xs: 4px;   /* Buttons, tags, small elements */
--radius-sm: 6px;   /* Input fields */
--radius-md: 8px;   /* Cards, containers */
--radius-lg: 12px;  /* Modals, large panels */
--radius-xl: 16px;  /* Special elements */
--radius-full: 50%; /* Avatars, circular elements */
```

### 2. Elevation (Shadows)
```css
/* Level 1 - Subtle */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

/* Level 2 - Standard */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

/* Level 3 - Elevated */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);

/* Interactive Hover */
box-shadow: 0 4px 12px rgba(91, 139, 201, 0.3);

/* Glow Effect */
box-shadow: 0 0 20px rgba(91, 139, 201, 0.2),
            0 0 40px rgba(91, 139, 201, 0.1);
```

### 3. Borders
```css
/* Standard border */
border: 1px solid var(--border-color);

/* Emphasis border */
border: 2px solid var(--accent-primary);

/* Subtle border */
border: 1px solid rgba(0, 0, 0, 0.1);
```

### 4. Header Consistency Guidelines

All main panel headers (Conversations, Analytics Dashboard, Chat Details) must follow these specifications:

#### Header Alignment Strategy

The header alignment across panels presented unique challenges due to the NBG logo in the Conversations panel. Our approach ensures visual consistency while accommodating brand elements:

**Challenge:**
- The Conversations panel includes a 60px tall NBG logo positioned absolutely at `top: 3px`
- This creates a natural height requirement that other headers must match
- Simply matching padding and content height was insufficient due to the logo's visual impact

**Solution Strategy:**
1. **Empirical Height Determination**: Through iterative testing, we determined that 105px provides the optimal height that:
   - Fully accommodates the NBG logo with proper spacing
   - Creates visual balance across all headers
   - Maintains consistent proportions with the two-row content structure

2. **Standardization Approach**:
   - All headers use `min-height: 105px` rather than calculated heights
   - This ensures consistency even if content varies
   - Box-sizing is set to `border-box` for predictable height calculations

3. **Two-Row Structure**: All headers follow a consistent pattern:
   - **Top row**: Primary title and control buttons (min-height: 48px)
   - **Bottom row**: Statistics, metadata, or secondary information
   - This structure provides flexibility while maintaining visual consistency

4. **Visual Hierarchy**:
   - The NBG logo serves as the primary brand anchor in the Conversations panel
   - Other panels maintain the same height to create a unified header band
   - The blue background (#345085) creates a strong visual connection across panels

```css
.panel-header {
  background: #345085;              /* NBG brand blue */
  min-height: 105px;               /* Standard height across all panels */
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  box-sizing: border-box;          /* Ensure consistent box model */
}

.panel-header-top {
  padding: 12px 24px;
  min-height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header-bottom {
  padding: 5px 24px 12px 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}
```

**Implementation Notes:**
- The 105px height was determined through visual testing rather than pure calculation
- This height accounts for the logo, padding, line-heights, and visual weight
- Using min-height allows for content flexibility while maintaining consistency

#### Best Practices for Header Implementation

1. **Always use the standard height**: Even if a header seems to need less space, maintain the 105px minimum
2. **Consistent padding**: Use the defined padding values (12px 24px for top row, 5px 24px 12px 24px for bottom row)
3. **Flexible content**: Design header content to work within the standardized structure
4. **Brand elements**: Only the Conversations panel should display the NBG logo to avoid redundancy
5. **Testing**: Always verify header alignment visually across all panels when making changes

#### Future Considerations

- If the logo size changes, all header heights must be re-evaluated
- New panels should follow the same header structure and height
- Consider creating a shared header component to enforce consistency
- Document any deviations from the standard in this guide

### 5. Component States

#### Default State
- Background: `var(--bg-card)`
- Border: `1px solid var(--border-color)`
- Text: `var(--text-primary)`

#### Hover State
- Background: `var(--bg-tertiary)`
- Border: `1px solid var(--accent-primary)`
- Transform: `translateY(-2px)`
- Transition: `all 0.2s ease`

#### Active/Selected State
- Background: Theme-specific (see implementation)
- Border: `2px solid var(--accent-primary)`
- Left accent bar: 4px wide gradient

#### Disabled State
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects

### 5. Special Effects

#### Glass Morphism
```css
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
```

#### Circuit Pattern Overlay
```css
opacity: 0.03;
background-image: repeating-linear-gradient(...);
background-size: 50px 50px;
```

---

## Icons & Graphics

### 1. Icon Library
- **Primary**: Lucide React
- **Size scale**: 
  - Small: 14px
  - Default: 16px
  - Medium: 20px
  - Large: 24px

### 2. Icon Usage
- **Navigation**: Search, Filter, Menu
- **Actions**: Download, Upload, Delete, Edit
- **Status**: Check, X, AlertCircle, Info
- **User**: User, Bot, Users
- **Ratings**: ThumbsUp, ThumbsDown, Star
- **File types**: FileJson, FileText, Code
- **Theme**: Sun, Moon

### 3. Icon Colors
- Default: `currentColor` (inherits text color)
- Interactive: `var(--accent-primary)`
- Success: `var(--accent-green)`
- Warning: `var(--accent-yellow)`
- Error: `var(--accent-red)`

### 4. Logo Guidelines
- Maintain aspect ratio
- Position with absolute/relative as needed
- Allow for overflow effects when appropriate
- Standard height: 40-60px

---

## Interaction Patterns

### 1. Transitions
```css
/* Standard transition */
transition: all 0.2s ease;

/* Specific transitions */
transition: background-color 0.3s ease, 
            color 0.3s ease, 
            border-color 0.3s ease;
```

### 2. Hover Effects
- Elevation change: `transform: translateY(-2px)`
- Color brightening: 10% lighter
- Border emphasis: Change to accent color
- Shadow enhancement: Increase shadow opacity

### 3. Click Feedback
- Scale down: `transform: scale(0.98)`
- Instant color change
- Return to normal with transition

### 4. Focus States
```css
outline: 2px solid var(--accent-primary);
outline-offset: 2px;
box-shadow: 0 0 0 2px rgba(91, 139, 201, 0.2);
```

### 5. Loading States
- Skeleton screens with animated gradient
- Opacity: 0.6 with pulse animation
- Spinner: Use accent-primary color

---

## Responsive Design

### 1. Breakpoints
```css
--mobile: 480px;
--tablet: 768px;
--desktop: 1024px;
--wide: 1280px;
```

### 2. Mobile Adaptations
- Single column layouts
- Reduced padding: -25%
- Simplified navigation
- Touch-friendly targets: min 44px
- Hidden decorative elements

### 3. Tablet Adaptations
- Two-column layouts where appropriate
- Collapsible sidebars
- Adjusted font sizes: -10%

### 4. Responsive Components
- Panels: Fixed width on mobile, resizable on desktop
- Modals: Full screen on mobile, centered on desktop
- Tables: Horizontal scroll on mobile

---

## Implementation Guidelines

### 1. CSS Architecture
```css
/* Use CSS custom properties for all theme values */
.component {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

/* Never hardcode colors */
/* Bad: background: #222d42; */
/* Good: background: var(--bg-secondary); */
```

### 2. Theme Switching
```javascript
// Components should be theme-agnostic
// Use data-theme attribute on root
<div data-theme="dark">...</div>
<div data-theme="light">...</div>
```

### 3. Component Structure
```jsx
// Consistent component structure
<div className="component-container">
  <div className="component-header">
    {/* Header content */}
  </div>
  <div className="component-body">
    {/* Main content */}
  </div>
  <div className="component-footer">
    {/* Actions */}
  </div>
</div>
```

### 4. Accessibility
- Maintain WCAG AA contrast ratios
- Provide focus indicators
- Use semantic HTML
- Include ARIA labels
- Support keyboard navigation

### 5. Performance
- Use CSS transforms for animations
- Avoid expensive filters on large areas
- Lazy load heavy components
- Minimize repaints and reflows

### 6. File Organization
```
src/
├── styles/
│   ├── variables.css    # Theme variables
│   ├── globals.css      # Global styles
│   └── utilities.css    # Utility classes
├── components/
│   └── Component/
│       ├── Component.tsx
│       └── Component.css
```

### 7. Naming Conventions
- BEM-inspired: `.component__element--modifier`
- Utility classes: `.u-margin-top-lg`
- State classes: `.is-active`, `.is-loading`
- Theme classes: `.theme-dark`, `.theme-light`

---

## Quick Reference

### Must-Have Attributes
1. Every interactive element needs hover and focus states
2. All colors must use CSS variables
3. Transitions on all state changes
4. Consistent border-radius based on element size
5. Proper spacing using the 8px grid

### Common Patterns
```css
/* Card */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
  transition: all 0.2s ease;
}

/* Button */
.button {
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Input */
.input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--text-primary);
  transition: border-color 0.2s;
}
```

---

This theming guide should be treated as a living document and updated as the design system evolves. Consistency is key to creating a cohesive user experience across all applications in the NBG Tech Hub ecosystem.