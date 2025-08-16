require('@testing-library/jest-dom');

// Essential React setup for test environment
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('@testing-library/react');

// Global React setup
global.React = React;
global.ReactDOM = ReactDOM;
global.act = act;

// Fix React hooks in test environment
const originalCreateElement = React.createElement;
React.createElement = function(component, props, ...children) {
  return originalCreateElement.call(this, component, props, ...children);
};

// Ensure React internal state is properly initialized
const { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } = React;
if (__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED && 
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher) {
  // Initialize React's internal dispatcher
  const dispatcher = __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  if (!dispatcher.current) {
    dispatcher.current = null;
  }
}

// Polyfill for React's internal state
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  fetchAuthSession: jest.fn()
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    section: 'section',
    article: 'article',
    header: 'header',
    nav: 'nav',
    aside: 'aside',
    main: 'main',
    footer: 'footer',
    span: 'span',
    p: 'p',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    button: 'button',
    img: 'img'
  },
  AnimatePresence: ({ children }) => children
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null })
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});