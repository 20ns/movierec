# Component Organization Guidelines

## Large Components to Split

### OnboardingQuestionnaire.jsx (1200+ lines)
This component should be split into:

1. **OnboardingQuestionnaire.jsx** - Main orchestrator
2. **components/onboarding/QuestionStep.jsx** - Individual question steps
3. **components/onboarding/ProgressBar.jsx** - Progress indication
4. **components/onboarding/QuestionTypes.jsx** - Different question renderers
5. **constants/onboardingQuestions.js** - All question data
6. **hooks/useOnboardingState.js** - State management logic

### Recommended Split:
```
src/
  components/
    onboarding/
      OnboardingQuestionnaire.jsx
      QuestionStep.jsx
      ProgressBar.jsx
      QuestionRenderer.jsx
    constants/
      onboardingQuestions.js
    hooks/
      useOnboardingState.js
```

## General Component Guidelines

1. **Single Responsibility**: Each component should have one clear purpose
2. **File Size**: Keep components under 300 lines when possible
3. **Reusability**: Extract common patterns into reusable components
4. **State Management**: Use custom hooks for complex state logic
5. **Constants**: Move large data sets to separate constant files

## Suggested Refactoring Priority

1. ✅ Split OnboardingQuestionnaire component
2. ✅ Extract question constants
3. ✅ Create custom hooks for state management
4. ✅ Review and consolidate utility functions
5. ✅ Standardize component file structure
