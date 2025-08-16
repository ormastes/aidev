# React Native Architecture

## Overview

This React Native project follows the Hierarchical Encapsulation Architecture (HEA) pattern, adapted for mobile development. The architecture ensures clear separation of concerns, maintainability, and scalability.

## Layer Structure

### 1. Presentation Layer (`src/layers/presentation/`)

Responsible for all UI-related code:

- **Components**: Reusable UI components
- **Screens**: Full screen components
- **Navigation**: Navigation configuration and helpers

### 2. Application Layer (`src/layers/application/`)

Contains business logic and application state:

- **Services**: Business logic services
- **Hooks**: Custom React hooks
- **State**: Redux store and slices

### 3. Domain Layer (`src/layers/domain/`)

Core business entities and rules:

- **Models**: TypeScript interfaces and types
- **Repositories**: Data repository interfaces
- **Use Cases**: Business use cases

### 4. Infrastructure Layer (`src/layers/infrastructure/`)

External services and platform-specific code:

- **API**: HTTP client and API endpoints
- **Storage**: Local storage (MMKV)
- **Native**: Native module bridges

## Key Architectural Decisions

### 1. TypeScript Strict Mode

All code is written with TypeScript strict mode enabled to ensure type safety and catch errors at compile time.

### 2. State Management

- **Redux Toolkit**: For global application state
- **React Context**: For cross-cutting concerns (auth, theme)
- **MMKV**: For persistent local storage

### 3. Navigation

- **React Navigation v6**: Type-safe navigation
- **Deep Linking**: Support for universal links
- **Authentication Flow**: Separate navigation stacks

### 4. API Layer

- **Axios**: HTTP client with interceptors
- **RTK Query**: For data fetching and caching
- **Token Refresh**: Automatic token refresh logic

### 5. Testing Strategy

- **Unit Tests**: Jest for business logic
- **Component Tests**: React Native Testing Library
- **E2E Tests**: Detox for end-to-end testing

## Data Flow

```
User Interaction
       ↓
   Screen/Component
       ↓
   Custom Hook / Action
       ↓
   Service / Use Case
       ↓
   API Client / Storage
       ↓
   External Service
```

## File Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` (prefixed with `use`)
- Services: `camelCase.ts`
- Types: `PascalCase.ts`
- Constants: `UPPER_SNAKE_CASE.ts`

## Import Order

1. External libraries
2. React/React Native imports
3. Navigation imports
4. Internal aliases (@components, @services, etc.)
5. Relative imports
6. Type imports

## Performance Considerations

1. **Lazy Loading**: Screens are lazy loaded
2. **Memoization**: Heavy computations are memoized
3. **List Optimization**: FlatList with proper key extractors
4. **Image Optimization**: Cached and optimized images
5. **Bundle Splitting**: Per-platform code splitting

## Security

1. **API Keys**: Stored in environment variables
2. **Token Storage**: Encrypted MMKV storage
3. **Certificate Pinning**: For production builds
4. **Biometric Auth**: Optional biometric authentication

## Platform-Specific Code

```typescript
// Use platform-specific files
Component.ios.tsx
Component.android.tsx

// Or use Platform API
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
});
```

## Error Handling

1. **Error Boundaries**: Catch and display errors gracefully
2. **API Errors**: Centralized error handling in API client
3. **Crash Reporting**: Integration with crash reporting services
4. **User Feedback**: Clear error messages for users

## Deployment

1. **Environment Configuration**: .env files for different environments
2. **Build Variants**: Debug, staging, and production builds
3. **Code Signing**: Automated code signing for CI/CD
4. **OTA Updates**: Support for over-the-air updates