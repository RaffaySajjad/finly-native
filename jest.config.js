/**
 * Jest Configuration for Finly React Native App
 * Enterprise-grade testing setup with comprehensive coverage
 */
module.exports = {
  preset: 'react-native',
  
  // Setup files to run before each test
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/react-native/extend-expect'
  ],
  
  // Transform files with ts-jest for TypeScript support
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Module name mapper for assets and mocks
  moduleNameMapper: {
    // Mock image and asset imports
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Mock Expo modules
    '^expo-(.*)$': '<rootDir>/__mocks__/expoMock.js',
    
    // Map @ imports to src directory
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  
  // Transform ignore patterns - don't transform node_modules except specific packages
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-redux|@reduxjs/toolkit|expo.*|@expo.*|react-native-.*|@react-native-community|@gorhom|@bottom-tabs)/)',
  ],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/types/**',
    '!src/theme/**', // Design system files don't need coverage
  ],
  
  // Coverage thresholds (enterprise standard: >80%)
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Global setup/teardown
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  
  // Increase timeout for slower tests
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
};

