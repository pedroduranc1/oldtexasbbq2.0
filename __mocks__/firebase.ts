/**
 * Mock de Firebase SDK para tests
 * Old Texas BBQ - CRM
 */

// Mock de Firestore
export const mockCollection = jest.fn();
export const mockDoc = jest.fn();
export const mockGetDocs = jest.fn();
export const mockGetDoc = jest.fn();
export const mockAddDoc = jest.fn();
export const mockUpdateDoc = jest.fn();
export const mockDeleteDoc = jest.fn();
export const mockQuery = jest.fn();
export const mockWhere = jest.fn();
export const mockOrderBy = jest.fn();
export const mockLimit = jest.fn();
export const mockServerTimestamp = jest.fn(() => ({ seconds: Date.now() / 1000 }));
export const mockWriteBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}));
export const mockOnSnapshot = jest.fn();

// Mock de Auth
export const mockSignInWithEmailAndPassword = jest.fn();
export const mockSignOut = jest.fn();
export const mockOnAuthStateChanged = jest.fn();
export const mockCreateUserWithEmailAndPassword = jest.fn();
export const mockSendPasswordResetEmail = jest.fn();

// Mock de Storage
export const mockRef = jest.fn();
export const mockUploadBytes = jest.fn();
export const mockGetDownloadURL = jest.fn();
export const mockDeleteObject = jest.fn();

// Configuración del mock de firebase/firestore
jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: mockServerTimestamp,
  writeBatch: mockWriteBatch,
  onSnapshot: mockOnSnapshot,
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }),
  },
}));

// Configuración del mock de firebase/auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  getAuth: jest.fn(),
}));

// Configuración del mock de firebase/storage
jest.mock('firebase/storage', () => ({
  ref: mockRef,
  uploadBytes: mockUploadBytes,
  getDownloadURL: mockGetDownloadURL,
  deleteObject: mockDeleteObject,
  getStorage: jest.fn(),
}));

// Helper para resetear todos los mocks
export const resetAllFirebaseMocks = () => {
  jest.clearAllMocks();
};

// Helper para simular documentos de Firestore
export const createMockDoc = (id: string, data: Record<string, any>) => ({
  id,
  data: () => data,
  exists: () => true,
});

// Helper para simular QuerySnapshot
export const createMockQuerySnapshot = (docs: Array<{ id: string; data: Record<string, any> }>) => ({
  docs: docs.map((d) => createMockDoc(d.id, d.data)),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback: (doc: any) => void) => {
    docs.forEach((d) => callback(createMockDoc(d.id, d.data)));
  },
});
