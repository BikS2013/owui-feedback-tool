# Reusable Components Documentation

This document describes all reusable components in the OWUI Feedback project, their purposes, use cases, parameters, and limitations.

## Component Overview

The OWUI Feedback project features a modular component architecture with three main categories:

### Generic Components
- **LogoHeader**: Two-line header with logo and configurable controls
- **NoLogoHeader**: Two-line header without logo, title on first line
- **List**: Flexible container with search and item rendering
- **ListItem**: Consistent styling for selectable list items

### Feature Components
- **ConversationList**: Main navigation using List, ListItem, and LogoHeader
- **ConversationDetail**: Full conversation display with export options
- **AnalyticsDashboard**: Metrics and charts visualization

### Utility Components
- **ResizablePanel**: Makes content horizontally resizable
- **ThemeToggle**: Light/dark theme switcher
- **CircularProgress**: Circular percentage indicator
- **FilterPanel**: Comprehensive filtering overlay
- **DataControls**: File upload and data management

## ResizablePanel

**Location**: `src/components/ResizablePanel/ResizablePanel.tsx`

### Purpose
A wrapper component that makes its children resizable by providing a draggable resize handle on the right edge.

### Use Cases
- Creating resizable sidebars or panels
- Allowing users to adjust layout proportions
- Wrapping navigation or detail panels that need flexible sizing

### Props
```typescript
interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;  // Default: 400
  minWidth?: number;      // Default: 300
  maxWidth?: number;      // Default: 600
  onResize?: (width: number) => void;
}
```

### Example Usage
```tsx
<ResizablePanel 
  defaultWidth={450} 
  minWidth={350} 
  maxWidth={700}
  onResize={(width) => console.log('New width:', width)}
>
  <ConversationList {...props} />
</ResizablePanel>
```

### Combination with Other Components
- Typically wraps ConversationList to make the sidebar resizable
- Can wrap any component that benefits from adjustable width
- Works well with responsive layouts

### Limitations
- Only supports horizontal resizing (width adjustment)
- Resize handle is always on the right edge
- Does not persist resize state between sessions (could be enhanced with localStorage)

---

## DataControls

**Location**: `src/components/DataControls/DataControls.tsx`

### Purpose
Provides data management controls for uploading JSON data files and clearing existing data.

### Use Cases
- Loading new feedback datasets
- Clearing current data
- Refreshing data from different sources

### Props
None - uses context directly

### Dependencies
- Requires `useFeedbackStore` context to be available
- Expects JSON files in specific format (Conversation[])

### Example Usage
```tsx
<DataControls />
```

### Integration Points
- Uses feedback store's `setConversations` method
- Validates JSON structure before loading
- Shows error alerts for invalid files

### Limitations
- Only accepts JSON files
- No visual feedback for upload progress
- No undo functionality for clear operation
- File size limitations depend on browser

---

## FilterPanel

**Location**: `src/components/FilterPanel/FilterPanel.tsx`

### Purpose
An overlay panel providing comprehensive filtering options for conversations and Q&A pairs.

### Use Cases
- Filtering conversations by date range
- Filtering by rating scores
- Selecting specific AI models
- Including/excluding unrated items
- Switching between conversation and Q&A level filtering

### Props
```typescript
interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onClose: () => void;
  availableModels: string[];
}
```

### Example Usage
```tsx
<FilterPanel
  filters={currentFilters}
  onFiltersChange={handleFilterUpdate}
  isOpen={isPanelOpen}
  onClose={() => setIsPanelOpen(false)}
  availableModels={['gpt-4', 'gpt-3.5-turbo', 'claude-2']}
/>
```

### Combination with Other Components
- Triggered by filter button in ConversationList
- Updates affect both ConversationList and AnalyticsDashboard
- Works with dataProcessor utility for actual filtering

### Limitations
- Date inputs may not work consistently across all browsers
- No preset date ranges (last week, last month, etc.)
- Model list must be provided externally
- No filter history or saved filter sets

---

## ThemeToggle

**Location**: `src/components/ThemeToggle/ThemeToggle.tsx`

### Purpose
A simple toggle button for switching between light and dark themes.

### Use Cases
- Providing theme switching in application header
- Improving accessibility for different lighting conditions
- User preference for visual comfort

### Props
None - uses theme context directly

### Dependencies
- Requires `useTheme` context to be available
- Uses localStorage for persistence

### Example Usage
```tsx
<ThemeToggle />
```

### Integration Points
- Reads/writes to localStorage key 'theme'
- Updates document root with 'dark' class
- Affects all CSS variables defined for theming

### Limitations
- Only supports light/dark themes (no custom themes)
- No transition animations between themes
- Icon-only interface (no text label option)

---

## ConversationList

**Location**: `src/components/ConversationList/ConversationList.tsx`

### Purpose
The main navigation component displaying all conversations with search, filtering, and selection capabilities. Now built on top of the generic List component for consistent behavior.

### Use Cases
- Primary navigation for browsing conversations
- Searching through conversation content
- Quick overview of conversation metadata
- Switching between detail and analytics views

### Props
```typescript
interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableModels: string[];
}
```

### Example Usage
```tsx
<ConversationList
  conversations={filteredConversations}
  selectedId={selectedConversationId}
  onSelect={handleConversationSelect}
  searchTerm={searchQuery}
  onSearchChange={setSearchQuery}
  filters={activeFilters}
  onFiltersChange={updateFilters}
  availableModels={uniqueModels}
/>
```

### Features
- Real-time search with debouncing
- Visual rating indicators with color coding
- Conversation metadata display
- View mode switching (details/analytics)
- Integration with FilterPanel and DataControls
- Uses List component for container behavior
- Uses ListItem component for consistent item styling

### Architecture
The component is now composed of:
1. **LogoHeader component**: Provides the two-line header with logo and controls
2. **List component**: Provides the container, scrolling, and search UI
3. **ListItem component**: Handles individual conversation item styling
4. **Render function**: Maps conversation data to ListItem components

### Integration Points
- Uses LogoHeader for the application header section
- Leverages List component's search functionality
- Delegates item rendering to ListItem component
- Maintains FilterPanel as a separate overlay
- Integrates DataControls and ThemeToggle within LogoHeader

### Limitations
- No virtualization for large lists (inherited from List component)
- Search is case-sensitive in some areas
- No grouping or sorting options
- Fixed layout structure

---

## ConversationDetail

**Location**: `src/components/ConversationDetail/ConversationDetail.tsx`

### Purpose
Displays the full conversation timeline with messages, ratings, and export options.

### Use Cases
- Viewing complete conversation history
- Examining individual Q&A ratings and feedback
- Exporting conversations in various formats
- Viewing raw JSON data

### Props
```typescript
interface ConversationDetailProps {
  conversation: Conversation | null;
  qaPairs: QAPair[];
}
```

### Example Usage
```tsx
<ConversationDetail
  conversation={selectedConversation}
  qaPairs={conversationQAPairs}
/>
```

### Features
- Markdown rendering for assistant responses
- Per-message and per-Q&A export options
- Raw JSON view toggle
- Visual rating indicators
- Feedback comment display

### Limitations
- No message editing capabilities
- Export formats limited to JSON and Markdown
- No pagination for very long conversations
- Markdown rendering may not support all features

---

## AnalyticsDashboard

**Location**: `src/components/AnalyticsDashboard/AnalyticsDashboard.tsx`

### Purpose
Provides analytical views of rating distributions and metrics across conversations.

### Use Cases
- Viewing overall feedback trends
- Comparing rated vs unrated content
- Analyzing rating distributions
- Identifying patterns in feedback data

### Props
```typescript
interface AnalyticsDashboardProps {
  conversations: Conversation[];
  qaPairs: QAPair[];
  selectedConversationId: string | null;
}
```

### Example Usage
```tsx
<AnalyticsDashboard
  conversations={allConversations}
  qaPairs={allQAPairs}
  selectedConversationId={selectedId}
/>
```

### Features
- Overall and per-conversation metrics
- Rating distribution bar charts
- Circular progress for completion rates
- Model-based filtering
- Export functionality for analytics data

### Limitations
- Limited chart types (only bar charts)
- No time-series analysis
- No custom metric definitions
- Basic statistical measures only

---

## CircularProgress

**Location**: `src/components/CircularProgress/CircularProgress.tsx`

### Purpose
A reusable circular progress indicator showing percentage completion with labeled segments.

### Use Cases
- Displaying completion rates
- Showing rated vs unrated proportions
- Visual KPI representation
- Dashboard metric displays

### Props
```typescript
interface CircularProgressProps {
  percentage: number;      // 0-100
  label: string;          // Center label
  ratedCount: number;
  unratedCount: number;
  size?: number;          // Default: 180
  strokeWidth?: number;   // Default: 12
}
```

### Example Usage
```tsx
<CircularProgress
  percentage={75}
  label="Completion"
  ratedCount={75}
  unratedCount={25}
  size={200}
  strokeWidth={15}
/>
```

### Combination with Other Components
- Used within AnalyticsDashboard for metrics display
- Can be integrated into any dashboard or reporting view
- Works well with theme system for consistent coloring

### Limitations
- Only shows two segments (rated/unrated)
- Fixed color scheme tied to CSS variables
- No animation on value changes
- Labels may overlap with very small percentages

---

## LogoHeader

**Location**: `src/components/LogoHeader/LogoHeader.tsx`

### Purpose
A flexible two-line header component with logo placement, configurable controls, and consistent styling. Provides a standardized layout for application headers with branding and navigation controls.

### Use Cases
- Application headers with logo and navigation
- Dashboard headers with controls and status information
- Section headers with branding and actions
- Any two-line header layout with left logo and right controls

### Props
```typescript
interface LogoHeaderProps {
  // Logo configuration
  logoSrc?: string;              // Logo image source
  logoAlt?: string;              // Logo alt text (default: 'Logo')
  logoHeight?: number;           // Logo height in pixels (default: 60)
  onLogoClick?: () => void;      // Optional logo click handler
  
  // Title configuration (appears below logo)
  title?: ReactNode;             // Title content (typically h1-h6)
  
  // Subtitle configuration (middle of second line)
  subtitle?: ReactNode;          // Subtitle content
  
  // Controls configuration
  topRightControls?: ReactNode;  // First line right-side controls
  bottomRightControls?: ReactNode; // Second line right-side controls
  
  // Style customization
  backgroundColor?: string;      // Header background (default: '#345085')
  className?: string;            // Additional CSS classes
  minHeight?: number;            // Minimum height in pixels (default: 105)
}
```

### Example Usage
```tsx
<LogoHeader
  logoSrc="/company-logo.svg"
  logoAlt="Company Name"
  logoHeight={50}
  onLogoClick={() => navigate('/')}
  title={<h2>Dashboard</h2>}
  subtitle={<span>5 active users, 12 sessions today</span>}
  topRightControls={
    <>
      <ViewToggle mode={viewMode} onChange={setViewMode} />
      <Button icon={<Settings />} onClick={openSettings} />
    </>
  }
  bottomRightControls={<ThemeToggle />}
  backgroundColor="#2a4080"
/>
```

### Features
- **Two-Line Layout**: Structured header with distinct top and bottom sections
- **Logo Positioning**: Absolute positioning for consistent logo placement
- **Flexible Controls**: Separate slots for top and bottom right controls
- **Button Styling**: Consistent hover states and group styling for controls
- **Responsive Design**: Adapts to smaller screens gracefully
- **Accessibility**: Keyboard navigation support for interactive logo
- **Theme Support**: Respects light/dark theme settings

### Styling Behaviors
- **Logo**: Positioned absolutely with optional click behavior and hover state
- **Controls**: Consistent button styling with hover effects
- **Button Groups**: Automatic grouping with rounded corners and backgrounds
- **Typography**: Standardized title and subtitle styling
- **Responsive**: Hides subtitle on very small screens

### Combination with Other Components
- Used by ConversationList for the main application header
- Can contain ThemeToggle, DataControls, or any control components
- Works well with view mode toggles and action buttons
- Integrates seamlessly with List component for complete layouts

### Limitations
- Fixed two-line structure (not suitable for single-line headers)
- Logo always positioned on the left
- No built-in navigation menu support
- Background color doesn't support gradients or patterns
- Title and subtitle positioning is fixed

---

## NoLogoHeader

**Location**: `src/components/NoLogoHeader/NoLogoHeader.tsx`

### Purpose
A two-line header component following the layout structure of LogoHeader but without logo support. Both title and subtitle are left-aligned, with controls remaining on the right side of each line.

### Use Cases
- Section headers without branding requirements
- Sub-page headers where logo is not needed
- Dashboard panels with title and controls
- Content sections with hierarchical headings

### Props
```typescript
interface NoLogoHeaderProps {
  // Title configuration (left side of first line)
  title?: ReactNode;             // Title content (typically h1-h6)
  
  // Subtitle configuration (left side of second line)
  subtitle?: ReactNode;          // Subtitle content
  
  // Controls configuration
  topRightControls?: ReactNode;  // First line right-side controls
  bottomRightControls?: ReactNode; // Second line right-side controls
  
  // Style customization
  backgroundColor?: string;      // Header background (default: '#345085')
  className?: string;            // Additional CSS classes
  minHeight?: number;            // Minimum height in pixels (default: 105)
  heightAdjustment?: number;     // Pixel adjustment for LogoHeader alignment (default: 0)
}
```

### Example Usage
```tsx
<NoLogoHeader
  title={<h3>Analytics Dashboard</h3>}
  subtitle={<span>Last updated: 5 minutes ago</span>}
  topRightControls={
    <>
      <DateRangePicker onChange={setDateRange} />
      <ExportButton onClick={handleExport} />
    </>
  }
  bottomRightControls={<RefreshButton onClick={refresh} />}
  backgroundColor="#2a4080"
/>

// Example with height adjustment to align with adjacent LogoHeader
<NoLogoHeader
  title={<h2>Section Title</h2>}
  subtitle={<span>Section details</span>}
  heightAdjustment={2}  // Add 2px to match LogoHeader height
/>
```

### Features
- **Two-Line Layout**: Similar structure to LogoHeader minus the logo
- **Left-Aligned Text**: Both title and subtitle are left-aligned
- **Flexible Controls**: Separate slots for top and bottom right controls
- **Button Styling**: Consistent hover states and group styling
- **Responsive Design**: Adapts to smaller screens gracefully
- **Theme Support**: Respects light/dark theme settings
- **Consistent Spacing**: Maintains same padding and heights as LogoHeader
- **Height Adjustment**: Optional parameter to fine-tune alignment with LogoHeader

### Styling Behaviors
- **Title**: Left-aligned on first line with standard typography
- **Subtitle**: Left-aligned on second line with ellipsis for overflow
- **Controls**: Same button styling and grouping as LogoHeader
- **Responsive**: Hides subtitle and reduces font sizes on small screens

### Layout Structure
```
┌─────────────────────────────────────────┐
│ Title                    [Controls]     │ ← First line
│ Subtitle                 [Controls]     │ ← Second line
└─────────────────────────────────────────┘
```

### Differences from LogoHeader
- No logo support or logo-related props
- Title on left of first line (LogoHeader: below logo on second line)
- Subtitle on left of second line (LogoHeader: centered on second line)
- Simpler DOM structure without absolute positioning
- Both text elements left-aligned for hierarchical clarity
- May need heightAdjustment prop to align with LogoHeader (typically +2px)

### Combination with Other Components
- Can be used interchangeably with LogoHeader based on needs
- Works with same control components (ThemeToggle, DataControls, etc.)
- Integrates seamlessly with List component for complete layouts
- Suitable for nested sections within LogoHeader layouts

### Limitations
- No logo support (use LogoHeader if logo is needed)
- Fixed two-line structure
- Title always on the left of first line
- Subtitle always on the left of second line
- Background color doesn't support gradients or patterns

---

## List

**Location**: `src/components/List/List.tsx`

### Purpose
A generic, reusable list container component that provides consistent scrolling, search functionality, and layout behavior while allowing flexible item rendering through render props.

### Use Cases
- Creating any scrollable list interface with consistent behavior
- Adding search functionality to lists
- Managing list layout, scrolling, and empty states
- Building file browsers, search results, user lists, or any data list

### Props
```typescript
interface ListProps<T> {
  items: T[];                                          // Array of items to display
  renderItem: (item: T, index: number) => ReactNode;   // Render function for each item
  keyExtractor: (item: T, index: number) => string;    // Function to extract unique key
  header?: ReactNode;                                  // Optional header content
  searchable?: boolean;                                // Enable search functionality
  searchValue?: string;                                // Controlled search input value
  onSearchChange?: (value: string) => void;            // Search change handler
  searchPlaceholder?: string;                          // Search input placeholder
  emptyState?: ReactNode;                              // Custom empty state content
  className?: string;                                  // Additional CSS classes
}
```

### Example Usage
```tsx
<List
  items={users}
  renderItem={(user) => (
    <UserCard 
      name={user.name} 
      email={user.email}
      avatar={user.avatar}
    />
  )}
  keyExtractor={(user) => user.id}
  header={<h2>Team Members</h2>}
  searchable={true}
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search team members..."
  emptyState={<EmptyTeamMessage />}
  className="team-list"
/>
```

### Features
- **Container Management**: Handles scrolling, overflow, and layout
- **Search Integration**: Optional search bar with consistent styling
- **Empty States**: Customizable empty state messages
- **Smooth Animations**: Staggered fade-in for list items
- **Custom Scrollbars**: Styled scrollbars matching the theme
- **Responsive Design**: Adapts to container width
- **Accessibility**: Supports high contrast and reduced motion preferences

### Styling Behaviors
- **Header**: Fixed header with customizable content
- **Search**: Integrated search bar below header (when enabled)
- **Scrolling**: Smooth scrolling with custom scrollbar styling
- **Item Animation**: Staggered fade-in animation for visual polish
- **Empty State**: Centered message when no items exist

### Combination with Other Components
- Works perfectly with ListItem for consistent item styling
- Can be wrapped in ResizablePanel for adjustable width
- Integrates with any item component through render props
- Used by ConversationList as the base container

### Limitations
- No built-in virtualization (performance may degrade with thousands of items)
- Search is controlled externally (no built-in filtering logic)
- Fixed layout structure (header → search → content)
- No infinite scroll support
- No built-in sorting capabilities

---

## ListItem

**Location**: `src/components/ListItem/ListItem.tsx`

### Purpose
A reusable list item component that encapsulates the look, feel, and behavior of items in lists, providing consistent styling, animations, and interaction patterns across the application.

### Use Cases
- Creating consistent list interfaces throughout the application
- Building selectable lists with hover and selection states
- Implementing accessible list navigation
- Separating list item presentation from data structure

### Props
```typescript
interface ListItemProps {
  id: string;                    // Unique identifier for the item
  selected?: boolean;            // Whether the item is currently selected
  onClick?: () => void;          // Click handler
  header?: ReactNode;            // Optional header content (flexible layout)
  children: ReactNode;           // Main content of the list item
  className?: string;            // Additional CSS classes for customization
}
```

### Example Usage
```tsx
<ListItem
  id={conversation.id}
  selected={selectedId === conversation.id}
  onClick={() => handleSelect(conversation.id)}
  header={
    <>
      <div className="item-title">{conversation.title}</div>
      <span className="item-date">{conversation.date}</span>
    </>
  }
>
  <div className="item-details">
    <p>{conversation.summary}</p>
    <div className="item-stats">
      <span>Messages: {conversation.messageCount}</span>
    </div>
  </div>
</ListItem>
```

### Features
- **Visual States**: Hover effects with translateY animation and shadow changes
- **Selection Indicator**: Left border accent bar when selected
- **Theme Support**: Automatically adapts to light/dark themes
- **Accessibility**: ARIA attributes, keyboard navigation support
- **Smooth Animations**: CSS transitions for all state changes
- **Flexible Layout**: Header and content slots for any data structure

### Styling Behaviors
- **Hover**: Lifts slightly (-2px), changes background and border color
- **Selected**: Adds left accent bar, stronger border, enhanced shadow
- **Focus**: Visible outline for keyboard navigation
- **Transitions**: 0.2s smooth transitions for all state changes

### Combination with Other Components
- Currently used by ConversationList for conversation items
- Can be used in any list-based interface (e.g., search results, file lists, user lists)
- Works seamlessly with ResizablePanel for flexible layouts
- Integrates with theme system for consistent appearance

### Limitations
- Fixed layout structure (header + content)
- No built-in virtualization for large lists
- Selection state must be managed by parent component
- No drag-and-drop support out of the box

---

## Global Architecture Considerations

### State Management
All components integrate with two main context providers:
1. **FeedbackStore**: Manages conversation data, filtering, and view modes
2. **ThemeStore**: Handles theme toggling and persistence

### Styling Approach
- Each component has its own CSS file
- Uses CSS variables for theming
- No CSS modules - plain CSS with component-specific class names
- Responsive design through CSS Grid and Flexbox

### Data Flow
1. Data loaded via DataControls
2. Processed through dataProcessor utility
3. Distributed via Context API
4. Components consume via hooks

### Component Hierarchy
The project now follows a clear component hierarchy:
1. **Generic Components**: List, ListItem, LogoHeader, NoLogoHeader - fully reusable across any context
2. **Feature Components**: ConversationList, ConversationDetail - domain-specific
3. **UI Components**: ThemeToggle, CircularProgress, ResizablePanel - utility components
4. **Control Components**: FilterPanel, DataControls - user interaction components

### Reusability Guidelines
- Components are designed to work together but can be used independently
- Generic components use flexible patterns:
  - List uses render props for item rendering
  - ListItem uses children and header slots
  - LogoHeader and NoLogoHeader use ReactNode props for all content areas
- Props interfaces are well-defined for easy integration
- Context dependencies should be wrapped in providers
- CSS files should be imported when using components
- Header components (LogoHeader/NoLogoHeader) can be used interchangeably

### Recent Architecture Improvements

The project has undergone significant refactoring to improve reusability:

1. **Extracted Generic Components**: 
   - ListItem was extracted from ConversationList for reusable item styling
   - List was extracted to provide consistent container behavior
   - LogoHeader was extracted for standardized two-line headers

2. **Component Composition**: 
   - ConversationList now composes LogoHeader + List + ListItem
   - Clear separation between container (List) and items (ListItem)
   - Flexible content areas using ReactNode props

3. **Consistent Patterns**:
   - Render props for flexible item rendering in List
   - Slot-based content in ListItem and LogoHeader
   - Theme-aware styling across all components

---

## ResizableModal

**Location**: `src/components/ResizableModal/ResizableModal.tsx`

### Purpose
A generic, reusable modal component that provides consistent modal behavior with resizable capabilities, theme support, and flexible content areas. Built to replace custom modal implementations with a standardized, accessible solution.

### Use Cases
- Settings dialogs with adjustable size
- Data upload interfaces that may need more space
- Form modals where content length varies
- Preview windows with resizable viewing areas
- Any modal dialog requiring consistent behavior and styling

### Props
```typescript
interface ResizableModalProps {
  isOpen: boolean;                // Controls modal visibility
  onClose: () => void;            // Callback when modal should close
  title: string;                  // Modal title text
  children: ReactNode;            // Modal body content
  className?: string;             // Additional CSS classes for customization
  defaultWidth?: number;          // Initial width in pixels (default: 600)
  defaultHeight?: number;         // Initial height in pixels (default: 500)
  minWidth?: number;              // Minimum width constraint (default: 400)
  minHeight?: number;             // Minimum height constraint (default: 400)
  storageKey?: string;            // LocalStorage key for persisting size
  showCloseButton?: boolean;      // Show/hide close button (default: true)
  closeOnEscape?: boolean;        // Close on ESC key (default: true)
  closeOnOverlayClick?: boolean;  // Close on overlay click (default: true)
  headerContent?: ReactNode;      // Additional header content (after title)
  footerContent?: ReactNode;      // Optional footer content
}
```

### Example Usage
```tsx
// Basic usage
<ResizableModal
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  title="Settings"
>
  <SettingsForm onSave={handleSave} />
</ResizableModal>

// Advanced usage with all features
<ResizableModal
  isOpen={isUploadOpen}
  onClose={handleClose}
  title="Upload Data"
  className="upload-modal"
  defaultWidth={700}
  defaultHeight={600}
  minWidth={500}
  minHeight={450}
  storageKey="uploadModalSize"
  showCloseButton={true}
  closeOnEscape={true}
  closeOnOverlayClick={false}
  headerContent={
    <div className="upload-status">
      3 files selected
    </div>
  }
  footerContent={
    <div className="modal-actions">
      <button onClick={handleCancel}>Cancel</button>
      <button onClick={handleUpload} className="primary">Upload</button>
    </div>
  }
>
  <FileUploadArea onFilesSelected={setFiles} />
</ResizableModal>
```

### Features
- **Resizable**: Drag handles on all edges and corners
- **Size Persistence**: Optional localStorage support for remembering size
- **Responsive**: Constrains to 90% of viewport, adapts to window resize
- **Accessible**: ESC key support, proper ARIA attributes, focus management
- **Theme Support**: Automatic light/dark theme adaptation
- **Smooth Animations**: Fade-in overlay and slide-in modal effects
- **Custom Scrollbar**: Styled scrollbar for body content
- **Flexible Layout**: Header, body, and optional footer sections
- **Portal Rendering**: Renders to document.body to avoid z-index issues

### Styling Behaviors
- **Overlay**: Semi-transparent backdrop with blur effect
- **Modal**: Rounded corners, shadow, theme-aware borders
- **Header**: Distinct background, title + optional content + close button
- **Body**: Scrollable content area with custom scrollbar
- **Footer**: Optional area for action buttons
- **Resize Handles**: Invisible by default, visible on hover
- **Animations**: Respects prefers-reduced-motion setting

### Integration with useResizable Hook
The component leverages the existing `useResizable` hook for resize functionality:
- Manages resize state and mouse interactions
- Persists size to localStorage (if storageKey provided)
- Ensures modal stays within viewport bounds
- Provides smooth resize experience

### Combination with Other Components
- Can contain any content components (forms, lists, analytics)
- Works with existing form components and controls
- Integrates with theme system automatically
- Can be triggered by buttons in LogoHeader or other components
- Suitable for replacing UploadModal, SettingsModal, etc.

### Accessibility Features
- Proper ARIA attributes for modal dialog
- ESC key support (configurable)
- Focus trap (when implemented)
- Semantic HTML structure
- High contrast mode support
- Reduced motion support

### Migration Guide
To replace existing modals with ResizableModal:
1. Import ResizableModal component
2. Replace modal structure with ResizableModal props
3. Move header content to `title` and `headerContent` props
4. Move footer buttons to `footerContent` prop
5. Keep modal-specific logic in the parent component
6. Use `storageKey` prop for size persistence if needed

### Limitations
- No built-in form validation
- Footer is optional (no default button layout)
- No built-in loading states
- Maximum size limited to 90% of viewport
- No fullscreen mode
- No multiple modal stacking support

### Enhancement Opportunities
1. Add prop validation with PropTypes or stricter TypeScript
2. Implement component composition patterns for complex UIs
3. Add accessibility features (ARIA labels, keyboard navigation)
4. Create a component library/storybook for documentation
5. Add unit tests for component behavior
6. Implement error boundaries for robustness
7. Add virtualization to List component for better performance with large datasets
8. Consider extracting more generic components from domain-specific ones
9. Add animation utilities for consistent transitions
10. Create a form component library for consistent input styling