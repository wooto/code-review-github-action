# Enhanced Code Review Comments Design

## Overview

This design document outlines the enhancement of the AI Code Review GitHub Action to add individual comments at each code review point, covering all severity levels (high, medium, low) with enhanced formatting.

## Problem Statement

Currently, the code review system only creates individual line comments for high-severity issues. The user requirement "코드 리뷰 하는 건 각각 코드 리뷰지점에 멘트를 달아야 해" (For code reviews, comments should be added at each code review point) indicates that comments should be added for all identified review points regardless of severity.

## Proposed Solution

### Architecture Overview

The solution extends the existing architecture to process all suggestions and create enhanced individual comments at each review point.

### Core Components

#### 1. Enhanced ReviewComment Interface

**File**: `src/github/GitHubClient.ts`

Extend the existing `ReviewComment` interface to include additional metadata:

```typescript
export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  severity?: 'high' | 'medium' | 'low';
  category?: string;
  suggestion?: string;
  codeExample?: string;
}
```

#### 2. Comment Formatter Service

**File**: `src/comment/CommentFormatter.ts` (new)

A new service to format individual line comments with enhanced structure:

```typescript
export class CommentFormatter {
  formatComment(suggestion: Suggestion): string;
  getSeverityIndicator(severity: string): string;
  getCategoryIcon(category: string): string;
  formatCodeExample(code: string): string;
}
```

**Enhanced Comment Template**:
```markdown
## 🔴 Security Issue

**Problem**: [Issue description]
**File**: `filename:line`
**Category**: Security
**Severity**: High

**Suggestion**: [Actionable suggestion]

**Example**:
```javascript
// Code example
```
```

#### 3. Enhanced Comment Creation Logic

**File**: `src/index.ts` (modify existing logic)

Replace the current high-severity filter (lines 294-306) with all-suggestions processing:

```typescript
// Instead of filtering only high-severity:
const highSeveritySuggestions = allSuggestions.filter(s => s.severity === 'high');

// Process all suggestions:
const commentableSuggestions = allSuggestions.filter(s =>
  s.file && s.line && s.message
);
```

### Implementation Plan

#### Phase 1: Interface Extensions
1. Extend `ReviewComment` interface in `GitHubClient.ts`
2. Create `CommentFormatter` class with template methods
3. Add severity and category handling

#### Phase 2: Logic Updates
1. Modify main suggestion processing loop in `index.ts`
2. Replace high-severity filter with all-suggestions processing
3. Integrate CommentFormatter into comment creation
4. Add comment validation and deduplication

#### Phase 3: Error Handling & Optimization
1. Add rate limiting protection
2. Implement comment deduplication logic
3. Add error recovery for failed comments
4. Add logging and monitoring

### Configuration Options

Add new GitHub Action inputs:

```yaml
- uses: your-username/code-review-action@latest
  with:
    # New configuration options
    comment-all-severities: 'true'        # boolean, default: true
    comment-format: 'enhanced'             # 'enhanced' | 'simple', default: 'enhanced'
    max-comments-per-file: '10'           # number, default: 10
    include-code-examples: 'true'         # boolean, default: true
```

### Data Flow

```
AI Provider Analysis → All Suggestions → Comment Formatter → Enhanced Comments → GitHub API
                                     ↓
                          Severity-specific formatting
                                     ↓
                          Category-aware templates
                                     ↓
                          Individual line comments
```

### Error Handling

1. **Rate Limiting**: Add delays between comment creation batches
2. **Deduplication**: Check for existing comments before creating new ones
3. **Validation**: Ensure required fields (file, line, message) are present
4. **Fallback**: Graceful degradation if enhanced formatting fails

### Testing Strategy

1. **Unit Tests**: Test CommentFormatter with different severity levels and categories
2. **Integration Tests**: Test full comment creation flow
3. **Mock Tests**: Test GitHub API interactions without actual API calls
4. **Edge Cases**: Test with empty suggestions, invalid data, API failures

### Backward Compatibility

- Existing functionality remains unchanged
- New configuration options have sensible defaults
- Current comment format remains supported
- No breaking changes to existing interfaces

## Success Criteria

1. ✅ Individual comments created for all severity levels
2. ✅ Enhanced formatting with severity indicators and categories
3. ✅ Configurable comment limits and formatting options
4. ✅ Backward compatibility maintained
5. ✅ Proper error handling and rate limiting
6. ✅ Comprehensive test coverage

## Future Considerations

1. **Comment Templates**: Allow custom comment templates via configuration
2. **Batch Optimization**: Consider batch API calls for large PRs
3. **Comment Threads**: Support for reply-based discussions
4. **Learning System**: Track developer responses to improve suggestions

## Timeline

- **Phase 1**: 1-2 days (Interface extensions)
- **Phase 2**: 2-3 days (Logic updates)
- **Phase 3**: 1-2 days (Error handling and testing)
- **Total**: 4-7 days

---

*Design approved: January 2, 2025*
*Status: Ready for implementation*