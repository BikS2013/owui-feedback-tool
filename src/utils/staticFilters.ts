import { Conversation, FilterOptions } from '../types/conversation';

export function applyStaticFilters(conversations: Conversation[], filters: FilterOptions): Conversation[] {
  let filtered = [...conversations];

  // Apply date range filter
  if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
    filtered = filtered.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      
      if (filters.dateRange!.start && convDate < filters.dateRange!.start) {
        return false;
      }
      
      if (filters.dateRange!.end) {
        // Add 1 day to end date to include the entire end day
        const endDate = new Date(filters.dateRange!.end);
        endDate.setDate(endDate.getDate() + 1);
        if (convDate >= endDate) {
          return false;
        }
      }
      
      return true;
    });
  }

  // Apply model filter
  if (filters.modelFilter && filters.modelFilter.length > 0) {
    filtered = filtered.filter(conv => {
      if (!conv.modelsUsed || conv.modelsUsed.length === 0) {
        return false;
      }
      
      // Check if any of the conversation's models match the filter
      return conv.modelsUsed.some(model => 
        filters.modelFilter!.includes(model)
      );
    });
  }

  // Apply rating filter
  if (filters.ratingFilter) {
    filtered = filtered.filter(conv => {
      // Handle unrated conversations
      if (conv.averageRating === null) {
        return filters.ratingFilter!.includeUnrated;
      }
      
      // Check if rating is within range
      return conv.averageRating >= filters.ratingFilter!.min && 
             conv.averageRating <= filters.ratingFilter!.max;
    });
  }

  return filtered;
}