import { format } from 'date-fns';
import { Conversation, QAPair } from '../types/conversation';
import { downloadAsJSON, downloadAsMarkdown } from './downloadUtils';

interface RatingDistribution {
  rating: number;
  count: number;
  conversationIds: string[];
}

interface AnalyticsMetrics {
  ratingDistribution: RatingDistribution[];
  ratedCount: number;
  unratedCount: number;
  overallAverage: number | null;
  totalCount: number;
}

interface AnalyticsExportData {
  exportMetadata: {
    timestamp: string;
    modelFilter: string | null;
    searchFilter: string | null;
    totalConversations: number;
    totalQAPairs: number;
  };
  conversationMetrics: AnalyticsMetrics;
  qaMetrics: AnalyticsMetrics;
  detailedBreakdown: {
    conversationsByRating: { [key: number]: Array<{ id: string; title: string; averageRating: number }> };
    qaPairsByRating: { [key: number]: Array<{ conversationId: string; qaId: string; rating: number }> };
  };
}

export function prepareAnalyticsExportData(
  conversations: Conversation[],
  qaPairs: QAPair[],
  conversationMetrics: AnalyticsMetrics,
  qaMetrics: AnalyticsMetrics,
  selectedModel: string | null,
  searchQuery: string | null
): AnalyticsExportData {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

  // Build detailed breakdown for conversations
  const conversationsByRating: { [key: number]: Array<{ id: string; title: string; averageRating: number }> } = {};
  for (let i = 1; i <= 10; i++) {
    conversationsByRating[i] = [];
  }

  conversations.forEach(conv => {
    if (conv.averageRating !== null) {
      const roundedRating = Math.round(conv.averageRating);
      if (roundedRating >= 1 && roundedRating <= 10) {
        conversationsByRating[roundedRating].push({
          id: conv.id,
          title: conv.title,
          averageRating: conv.averageRating
        });
      }
    }
  });

  // Build detailed breakdown for Q&A pairs
  const qaPairsByRating: { [key: number]: Array<{ conversationId: string; qaId: string; rating: number }> } = {};
  for (let i = 1; i <= 10; i++) {
    qaPairsByRating[i] = [];
  }

  qaPairs.forEach(qa => {
    if (qa.rating !== null && qa.rating >= 1 && qa.rating <= 10) {
      qaPairsByRating[qa.rating].push({
        conversationId: qa.conversationId,
        qaId: qa.answer.id,
        rating: qa.rating
      });
    }
  });

  return {
    exportMetadata: {
      timestamp,
      modelFilter: selectedModel,
      searchFilter: searchQuery,
      totalConversations: conversations.length,
      totalQAPairs: qaPairs.length
    },
    conversationMetrics,
    qaMetrics,
    detailedBreakdown: {
      conversationsByRating,
      qaPairsByRating
    }
  };
}

export function exportAnalyticsAsJSON(data: AnalyticsExportData, selectedModel: string | null) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const modelSuffix = selectedModel ? `-${selectedModel.replace(/[^a-zA-Z0-9]/g, '_')}` : '-all-models';
  const filename = `analytics-export${modelSuffix}_${timestamp}.json`;
  
  downloadAsJSON(data, filename);
}

export function exportAnalyticsAsMarkdown(data: AnalyticsExportData, selectedModel: string | null) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const modelSuffix = selectedModel ? `-${selectedModel.replace(/[^a-zA-Z0-9]/g, '_')}` : '-all-models';
  const filename = `analytics-export${modelSuffix}_${timestamp}.md`;
  
  const markdown = generateAnalyticsMarkdown(data);
  downloadAsMarkdown(markdown, filename);
}

function generateAnalyticsMarkdown(data: AnalyticsExportData): string {
  const { exportMetadata, conversationMetrics, qaMetrics, detailedBreakdown } = data;
  
  let markdown = `# Analytics Export Report

## Export Metadata
- **Timestamp:** ${exportMetadata.timestamp}
- **Model Filter:** ${exportMetadata.modelFilter || 'All Models'}
- **Search Filter:** ${exportMetadata.searchFilter || 'None'}
- **Total Conversations:** ${exportMetadata.totalConversations}
- **Total Q&A Pairs:** ${exportMetadata.totalQAPairs}

---

## Conversation Metrics

### Overview
- **Rated Conversations:** ${conversationMetrics.ratedCount} (${((conversationMetrics.ratedCount / conversationMetrics.totalCount) * 100).toFixed(1)}%)
- **Unrated Conversations:** ${conversationMetrics.unratedCount} (${((conversationMetrics.unratedCount / conversationMetrics.totalCount) * 100).toFixed(1)}%)
- **Overall Average Rating:** ${conversationMetrics.overallAverage?.toFixed(2) || 'N/A'}/10

### Rating Distribution

| Rating | Count | Percentage |
|--------|-------|------------|
${conversationMetrics.ratingDistribution.map(item => 
  `| ${item.rating} | ${item.count} | ${((item.count / conversationMetrics.totalCount) * 100).toFixed(1)}% |`
).join('\n')}

---

## Q&A Metrics

### Overview
- **Rated Q&A Pairs:** ${qaMetrics.ratedCount} (${((qaMetrics.ratedCount / qaMetrics.totalCount) * 100).toFixed(1)}%)
- **Unrated Q&A Pairs:** ${qaMetrics.unratedCount} (${((qaMetrics.unratedCount / qaMetrics.totalCount) * 100).toFixed(1)}%)
- **Overall Average Rating:** ${qaMetrics.overallAverage?.toFixed(2) || 'N/A'}/10

### Rating Distribution

| Rating | Count | Percentage |
|--------|-------|------------|
${qaMetrics.ratingDistribution.map(item => 
  `| ${item.rating} | ${item.count} | ${((item.count / qaMetrics.totalCount) * 100).toFixed(1)}% |`
).join('\n')}

---

## Detailed Breakdown

### Conversations by Rating
`;

  // Add conversations by rating
  for (let rating = 10; rating >= 1; rating--) {
    const conversations = detailedBreakdown.conversationsByRating[rating];
    if (conversations.length > 0) {
      markdown += `\n#### Rating ${rating} (${conversations.length} conversations)\n`;
      conversations.forEach((conv, index) => {
        if (index < 10) { // Show first 10
          markdown += `- ${conv.title} (ID: ${conv.id}, Avg: ${conv.averageRating.toFixed(2)})\n`;
        }
      });
      if (conversations.length > 10) {
        markdown += `- ... and ${conversations.length - 10} more\n`;
      }
    }
  }

  markdown += `\n### Q&A Pairs by Rating\n`;

  // Add Q&A pairs by rating
  for (let rating = 10; rating >= 1; rating--) {
    const qaPairs = detailedBreakdown.qaPairsByRating[rating];
    if (qaPairs.length > 0) {
      markdown += `\n#### Rating ${rating} (${qaPairs.length} Q&As)\n`;
      qaPairs.forEach((qa, index) => {
        if (index < 10) { // Show first 10
          markdown += `- Conversation ${qa.conversationId}, Q&A ${qa.qaId}\n`;
        }
      });
      if (qaPairs.length > 10) {
        markdown += `- ... and ${qaPairs.length - 10} more\n`;
      }
    }
  }

  return markdown;
}