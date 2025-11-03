export interface Suggestion {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  suggestion: string;
  codeExample?: string;
  file: string;
  line: number;
}

export class CommentFormatter {
  formatComment(suggestion: Suggestion): string {
    const severityEmoji = this.getSeverityIndicator(suggestion.severity);
    const categoryIcon = this.getCategoryIcon(suggestion.category);

    let comment = `## ${severityEmoji} ${categoryIcon} ${this.capitalizeFirst(suggestion.category)} Issue\n\n`;
    comment += `**Problem**: ${suggestion.message}\n`;
    comment += `**File**: \`${suggestion.file}:${suggestion.line}\`\n`;
    comment += `**Category**: ${this.capitalizeFirst(suggestion.category)}\n`;
    comment += `**Severity**: ${this.capitalizeFirst(suggestion.severity)}\n\n`;
    comment += `**Suggestion**: ${suggestion.suggestion}\n`;

    if (suggestion.codeExample) {
      comment += `\n**Example**:\n\`\`\`javascript\n${suggestion.codeExample}\n\`\`\`\n`;
    }

    return comment;
  }

  private getSeverityIndicator(severity: string): string {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private getCategoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'security': return '🔒';
      case 'performance': return '⚡';
      case 'style': return '🎨';
      case 'bug': return '🐛';
      default: return '📝';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}