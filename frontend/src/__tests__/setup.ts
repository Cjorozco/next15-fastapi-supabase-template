import '@testing-library/jest-dom';

// Ensure localStorage mock is always available in tests
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

if (typeof window !== 'undefined') {
  const storageMock = createLocalStorageMock();
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
  });
}
