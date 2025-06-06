# Issues - Pending Items

## Pending Items

### Download Functionality Not Working (Investigating)
**Issue**: Download buttons don't trigger any console output - click handlers not firing.
**Debug Steps Taken**:
1. Added console logging throughout the download flow
2. Added stopPropagation to prevent event bubbling
3. Fixed timestamp format (removed colons from filename)
4. Fixed date formatting for createdAt field
5. Added error handling with try/catch blocks
6. Removed React Portal implementation
7. Simplified click handlers
8. Added type="button" to all buttons
9. Added pointer-events: auto to CSS
10. Added direct inline onClick test

**Current Status**: 
- No console output when clicking buttons
- Click handlers appear not to be firing at all
- Need to verify if there's a CSS or DOM issue preventing clicks

## Completed Items

### Download Menu Z-Index Issue (Fixed: 2025-01-06)
**Issue**: Download dropdown menus were being hidden behind Q&A message cards.
**Solution**: 
- Used React Portals to render dropdown menus at the document body level
- Implemented dynamic positioning using getBoundingClientRect
- Increased z-index values for proper stacking context
- Changed from absolute to fixed positioning with calculated coordinates
- This ensures dropdown menus always appear above all other content

### Theme Toggle Overlap Issue (Fixed: 2025-01-06)
**Issue**: Download button was overlapping with the theme toggle button.
**Solution**:
- Added padding-right to conversation header to create space
- Increased theme toggle z-index to 2000
- Added responsive design for mobile screens