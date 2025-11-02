# GitHub Action CI Testing Design

## Overview

이 문서는 GitHub Action Code Review를 위한 CI 테스트 전략을 설명합니다. In-Memory Mocking 방식을 사용하여 실제 AI API 호출 없이 일관된 테스트 결과를 보장합니다.

## Problem Statement

현재 CI는 unit tests와 build verification만 수행합니다. GitHub Action으로서의 실제 실행 환경을 테스트하지 않아 다음 문제들이 있습니다:
- Action의 전체 실행 흐름 검증 부재
- AI Provider별 동작 검증 부족
- 실제 PR 환경에서의 동작 불확실성

## Solution Architecture

### 1. Mock Layer Structure

```
src/
├── __tests__/
│   ├── mocks/
│   │   ├── mockResponses.ts      # AI 응답 데이터
│   │   ├── mockProviders.ts      # Provider Mock 구현
│   │   └── mockGitHub.ts         # GitHub API Mock
│   ├── integration/
│   │   └── action.test.ts        # Action 통합 테스트
│   └── scenarios/
│       └── review-scenarios.ts   # 다양한 리뷰 시나리오
```

### 2. Mock Data Design

#### Mock Response Structure
```typescript
interface MockReviewResponse {
  provider: 'openai' | 'claude' | 'gemini';
  summary: string;
  issues: Array<{
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  suggestions: string[];
}
```

#### Predefined Scenarios
- **Basic Review**: 일반적인 코드 리뷰 시나리오
- **Security Issues**: 보안 문제 발견 시나리오
- **Performance Issues**: 성능 문제 발견 시나리오
- **No Issues**: 리뷰할 내용 없는 시나리오
- **Error Handling**: API 실패 시나리오

### 3. CI Workflow Enhancement

#### Enhanced test.yml
```yaml
jobs:
  # 기존 test job 유지

  action-integration-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Setup test environment
      - name: Run action with mocked responses
      - name: Verify action outputs
      - name: Test error scenarios
```

#### New action-test.yml
```yaml
name: Action Integration Test

on:
  push:
    paths: ['.github/workflows/action-test.yml']
  pull_request:
    paths: ['.github/workflows/action-test.yml']

jobs:
  test-action:
    runs-on: ubuntu-latest
    steps:
      - name: Create test PR
      - name: Execute code review action
      - name: Verify review comments
      - name: Test multiple providers
```

## Implementation Plan

### Phase 1: Mock Infrastructure (1-2일)
1. Mock response 데이터 생성
2. Provider mock 구현
3. GitHub API mock 설정

### Phase 2: Integration Tests (2-3일)
1. Action 전체 실행 테스트
2. 시나리오별 테스트 구현
3. 에러 핸들링 테스트

### Phase 3: CI Enhancement (1-2일)
1. 기존 test.yml에 integration test 추가
2. 별도 action-test.yml 생성
3. 테스트 결과 보고서 개선

## Testing Strategy

### Unit Tests (기존)
- Provider별 로직 테스트
- 유틸리티 함수 테스트
- ✅ 이미 구현됨

### Integration Tests (신규)
- Action 전체 실행 흐름
- Mock 데이터를 통한 AI 응답 처리
- GitHub API와의 상호작용

### Scenario Tests (신규)
- 다양한 코드 변경 시나리오
- 여러 Provider 동시 사용
- 에러 상황 및 복구 시나리오

## Success Criteria

1. **Coverage**: 90% 이상의 테스트 커버리지 유지
2. **Reliability**: 100% 재현 가능한 테스트 결과
3. **Performance**: CI 실행 시간 10분 이내
4. **Maintainability**: 새로운 시나리오 추가 용이

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Mock 데이터 부정확성 | 실제 API 응답 기반으로 주기적 업데이트 |
| CI 실행 시간 증가 | 병렬 실행 및 캐싱 전략 도입 |
| 테스트 복잡성 증가 | 명확한 테스트 계층 구조 유지 |

## Future Considerations

1. **E2E Testing**: 실제 API를 사용하는 주간/월간 테스트
2. **Performance Testing**: 대규모 PR 처리 능력 테스트
3. **Security Testing**: 악의적인 입력에 대한 보안 테스트

---

*Created: 2025-01-02*
*Author: Code Review Team*
