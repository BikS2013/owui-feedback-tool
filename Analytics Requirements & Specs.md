# Analytics Requirements & Specifications

## Overview
This document outlines the requirements and specifications for adding an analytics dashboard to the OWUI Feedback application. The dashboard will provide insights into conversation ratings and quality metrics, with the ability to switch between conversation details and analytics views.

## Core Requirements

### 1. View Toggle Switch
- **Location**: Conversations panel header (left panel)
- **Function**: Toggle between:
  - Conversation Details view (existing)
  - Analytics Dashboard view (new)
- **Design**: Toggle switch or segmented control for clear view indication
- **State**: Persist user's view preference in local storage

### 2. Analytics Dashboard Metrics

#### 2.1 Conversation-Based Metrics
- **Rating Distribution Chart**
  - Display number of conversations per rating level (1-10)
  - Based on average ratings per conversation
  - Visual: Bar chart or histogram
  
- **Rated vs Unrated Comparison**
  - Show percentage and count of rated vs unrated conversations
  - Visual: Pie chart or donut chart
  
- **Overall Average Rating**
  - Display average rating across all filtered conversations
  - Include confidence indicator based on sample size

#### 2.2 Q&A-Based Metrics
- **Q&A Rating Distribution**
  - Number of individual Q&A pairs per rating level
  - More granular view than conversation-level
  
- **Q&A Rated vs Unrated**
  - Percentage of Q&A pairs with ratings
  
- **Q&A Average Rating**
  - Overall average across all Q&A pairs

### 3. Model Filtering
- **Model Selection Dropdown**
  - Options: Individual models + "All Models" option
  - Default: "All Models"
  - Updates all metrics based on selection
  
- **Model Comparison Mode** (Enhancement)
  - Side-by-side model performance comparison
  - Highlight performance differences

### 4. Conversation Highlighting
- **When**: User selects a conversation in the list
- **Condition**: Selected conversation's model matches analytics filter
- **Highlights**:
  - Mark conversation's rating position in distribution chart
  - Show conversation's contribution to averages
  - Visual indicator in relevant metric sections

## Enhanced Features & Best Practices

### 5. Additional Metrics (Recommended)

#### 5.1 Trend Analysis
- **Rating Trends Over Time**
  - Line chart showing rating evolution
  - Configurable time periods (day, week, month)
  
#### 5.2 Quality Indicators
- **Response Time Metrics**
  - Average time between Q&A pairs
  - Correlation with ratings
  
- **Conversation Length Analysis**
  - Average number of turns per rating level
  - Identify optimal conversation lengths

#### 5.3 Sentiment Analysis
- **User Satisfaction Indicators**
  - Positive/negative sentiment distribution
  - Correlation with numerical ratings

### 6. Data Export & Reporting
- **Export Analytics Data**
  - CSV/JSON export of current view
  - Include applied filters in export
  
- **Shareable Reports**
  - Generate PDF summaries
  - Snapshot URLs for specific views

### 7. Interactive Features
- **Drill-Down Capability**
  - Click on chart segments to filter conversations
  - Breadcrumb navigation for filter context
  
- **Tooltips & Details**
  - Hover for detailed breakdowns
  - Click for expanded views

### 8. Performance Considerations
- **Data Aggregation**
  - Pre-calculate common metrics
  - Lazy load detailed analytics
  
- **Caching Strategy**
  - Cache calculated metrics
  - Invalidate on filter changes

## Technical Implementation Guidelines

### Component Architecture
```
AnalyticsDashboard/
├── AnalyticsDashboard.tsx      # Main container
├── AnalyticsDashboard.css      # Styles
├── components/
│   ├── RatingDistribution.tsx   # Rating chart component
│   ├── RatedVsUnrated.tsx      # Comparison chart
│   ├── ModelSelector.tsx        # Model dropdown
│   └── MetricCard.tsx          # Reusable metric display
└── hooks/
    └── useAnalytics.ts         # Analytics calculations
```

### State Management
- Extend `feedbackStore` with analytics state
- Add computed properties for metrics
- Memoize expensive calculations

### Data Processing
- Enhance `dataProcessor.ts` with analytics functions
- Add metric calculation utilities
- Support real-time metric updates

## User Experience Guidelines

### Visual Design
- Consistent with existing theme system
- Support dark/light modes
- Responsive layout for various screen sizes
- Accessible color schemes for charts

### Interaction Patterns
- Smooth transitions between views
- Loading states for calculations
- Error handling for edge cases
- Helpful empty states

### Information Hierarchy
- Most important metrics prominent
- Progressive disclosure for details
- Clear labeling and units
- Contextual help/tooltips

## Implementation Phases

### Phase 1: Core Functionality ✅ COMPLETED
1. View toggle switch ✅
2. Basic rating distribution ✅
3. Rated vs unrated comparison ✅
4. Model filtering ✅

### Phase 2: Enhanced Metrics (Partially Complete)
1. Q&A-based analytics ✅
2. Conversation highlighting ✅
3. Trend analysis ⏳
4. Export functionality ⏳

### Phase 3: Advanced Features (Pending)
1. Sentiment analysis ⏳
2. Interactive drill-downs ⏳
3. Comparative analysis ⏳
4. Custom date ranges ⏳

## Implementation Status
**Phase 1 Completed**: All core functionality has been implemented as of January 6, 2025.
- Analytics dashboard component created
- View toggle switch added to Conversations header
- All basic metrics implemented (rating distribution, rated vs unrated, overall average)
- Model selection dropdown functional
- Conversation highlighting when model matches selection
- Both conversation-based and Q&A-based metrics implemented

## Success Metrics
- Dashboard load time < 500ms
- Metric calculation time < 100ms
- User engagement with analytics > 60%
- Positive user feedback on insights value

## Open Questions
1. Should analytics persist filter selections separately from conversation list?
2. What time periods are most relevant for trend analysis?
3. Are there specific KPIs the team wants to track?
4. Should we support custom metric definitions?
5. What level of data granularity is needed for exports?

---

**Next Steps**: Review this document and provide feedback on priorities, additional requirements, or modifications before proceeding with implementation.