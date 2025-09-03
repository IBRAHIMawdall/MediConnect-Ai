// Firestore Database Service
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirebaseError } from '../config/firebase.js';
import authService from './authService.js';

class FirestoreService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  // Generic CRUD Operations
  async create(collectionName, data, docId = null) {
    try {
      if (!db) {
        throw new Error('Firestore not available - billing may not be enabled');
      }
      
      const timestamp = serverTimestamp();
      const docData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: authService.getCurrentUser()?.uid || null
      };

      let docRef;
      if (docId) {
        docRef = doc(db, collectionName, docId);
        await setDoc(docRef, docData);
      } else {
        docRef = await addDoc(collection(db, collectionName), docData);
      }

      return { success: true, id: docRef.id, data: docData };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  async read(collectionName, docId) {
    try {
      if (!db) {
        throw new Error('Firestore not available - billing may not be enabled');
      }
      
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { 
          success: true, 
          data: { id: docSnap.id, ...docSnap.data() } 
        };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      console.error(`Error reading document from ${collectionName}:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  async update(collectionName, docId, data) {
    try {
      if (!db) {
        throw new Error('Firestore not available - billing may not be enabled');
      }
      
      const docRef = doc(db, collectionName, docId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: authService.getCurrentUser()?.uid || null
      };

      await updateDoc(docRef, updateData);
      return { success: true, data: updateData };
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  async delete(collectionName, docId) {
    try {
      if (!db) {
        throw new Error('Firestore not available - billing may not be enabled');
      }
      
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Query Operations
  async query(collectionName, constraints = [], options = {}) {
    try {
      if (!db) {
        throw new Error('Firestore not available - billing may not be enabled');
      }
      
      const { 
        limitCount = 20, 
        orderByField = 'createdAt', 
        orderDirection = 'desc',
        startAfterDoc = null,
        endBeforeDoc = null
      } = options;

      let q = collection(db, collectionName);

      // Apply where constraints
      constraints.forEach(constraint => {
        if (constraint.field && constraint.operator && constraint.value !== undefined) {
          q = query(q, where(constraint.field, constraint.operator, constraint.value));
        }
      });

      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Apply pagination
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }
      if (endBeforeDoc) {
        q = query(q, endBefore(endBeforeDoc));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return { 
        success: true, 
        data: documents,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        firstDoc: querySnapshot.docs[0] || null,
        size: querySnapshot.size
      };
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Real-time listeners
  subscribe(collectionName, constraints = [], callback, options = {}) {
    try {
      const { 
        limitCount = 20, 
        orderByField = 'createdAt', 
        orderDirection = 'desc'
      } = options;

      let q = collection(db, collectionName);

      // Apply constraints
      constraints.forEach(constraint => {
        if (constraint.field && constraint.operator && constraint.value !== undefined) {
          q = query(q, where(constraint.field, constraint.operator, constraint.value));
        }
      });

      // Apply ordering and limit
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const documents = [];
          querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
          });
          callback({ success: true, data: documents });
        },
        (error) => {
          console.error(`Error in ${collectionName} subscription:`, error);
          callback({ success: false, error: handleFirebaseError(error) });
        }
      );

      // Store listener for cleanup
      const listenerId = `${collectionName}_${Date.now()}`;
      this.listeners.set(listenerId, unsubscribe);

      return listenerId;
    } catch (error) {
      console.error(`Error setting up ${collectionName} subscription:`, error);
      callback({ success: false, error: handleFirebaseError(error) });
      return null;
    }
  }

  unsubscribe(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
      return true;
    }
    return false;
  }

  // Batch operations
  async batchWrite(operations) {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      const userId = authService.getCurrentUser()?.uid;

      operations.forEach(operation => {
        const { type, collection: collectionName, id, data } = operation;
        const docRef = doc(db, collectionName, id);

        switch (type) {
          case 'set':
            batch.set(docRef, {
              ...data,
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: userId
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...data,
              updatedAt: timestamp,
              updatedBy: userId
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error in batch write:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Transaction operations
  async runTransaction(transactionFunction) {
    try {
      const result = await runTransaction(db, transactionFunction);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error in transaction:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Medical-specific operations
  async getDrugs(filters = {}, pagination = {}) {
    const constraints = [];
    
    if (filters.category) {
      constraints.push({ field: 'category', operator: '==', value: filters.category });
    }
    if (filters.active !== undefined) {
      constraints.push({ field: 'active', operator: '==', value: filters.active });
    }
    if (filters.search) {
      // Simple text search - for production, consider using Algolia
      constraints.push({ 
        field: 'name', 
        operator: '>=', 
        value: filters.search 
      });
      constraints.push({ 
        field: 'name', 
        operator: '<=', 
        value: filters.search + '\uf8ff' 
      });
    }

    return await this.query('drugs', constraints, {
      limitCount: pagination.limit || 20,
      orderByField: pagination.orderBy || 'name',
      orderDirection: pagination.order || 'asc',
      startAfterDoc: pagination.startAfter
    });
  }

  async getDiagnoses(filters = {}, pagination = {}) {
    const constraints = [];
    
    if (filters.category) {
      constraints.push({ field: 'category', operator: '==', value: filters.category });
    }
    if (filters.code) {
      constraints.push({ field: 'code', operator: '>=', value: filters.code });
    }

    return await this.query('diagnoses', constraints, {
      limitCount: pagination.limit || 20,
      orderByField: pagination.orderBy || 'code',
      orderDirection: pagination.order || 'asc',
      startAfterDoc: pagination.startAfter
    });
  }

  async createDrugReview(drugId, reviewData) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      return { success: false, error: 'User must be authenticated' };
    }

    const review = {
      drugId,
      userId,
      rating: reviewData.rating,
      comment: reviewData.comment || '',
      helpful: 0,
      reported: false
    };

    return await this.create('drug_reviews', review);
  }

  async getUserBookmarks(userId) {
    const constraints = [
      { field: 'userId', operator: '==', value: userId }
    ];

    return await this.query('bookmarks', constraints, {
      orderByField: 'createdAt',
      orderDirection: 'desc'
    });
  }

  async addBookmark(itemType, itemId, title) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      return { success: false, error: 'User must be authenticated' };
    }

    const bookmark = {
      userId,
      itemType, // 'drug', 'diagnosis', etc.
      itemId,
      title
    };

    return await this.create('bookmarks', bookmark);
  }

  async removeBookmark(bookmarkId) {
    return await this.delete('bookmarks', bookmarkId);
  }

  async getUserSearchHistory(userId, limit = 10) {
    const constraints = [
      { field: 'userId', operator: '==', value: userId }
    ];

    return await this.query('search_history', constraints, {
      limitCount: limit,
      orderByField: 'timestamp',
      orderDirection: 'desc'
    });
  }

  async addSearchHistory(searchTerm, searchType, results) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) return { success: false, error: 'User not authenticated' };

    const searchRecord = {
      userId,
      searchTerm,
      searchType, // 'drug', 'diagnosis', 'icd10'
      resultCount: results?.length || 0,
      timestamp: serverTimestamp()
    };

    return await this.create('search_history', searchRecord);
  }

  // Analytics and reporting
  async incrementCounter(counterPath, value = 1) {
    try {
      const counterRef = doc(db, 'counters', counterPath);
      await updateDoc(counterRef, {
        count: increment(value),
        lastUpdated: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      // If document doesn't exist, create it
      try {
        await setDoc(counterRef, {
          count: value,
          lastUpdated: serverTimestamp()
        });
        return { success: true };
      } catch (createError) {
        console.error('Error incrementing counter:', createError);
        return { success: false, error: handleFirebaseError(createError) };
      }
    }
  }

  async getAnalytics(timeRange = '7d') {
    try {
      // Get various analytics data
      const [userCount, drugCount, searchCount] = await Promise.all([
        this.read('counters', 'users'),
        this.read('counters', 'drugs'),
        this.read('counters', 'searches')
      ]);

      return {
        success: true,
        data: {
          users: userCount.data?.count || 0,
          drugs: drugCount.data?.count || 0,
          searches: searchCount.data?.count || 0,
          timeRange
        }
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Cleanup
  cleanup() {
    // Unsubscribe from all listeners
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    
    // Clear cache
    this.cache.clear();
  }
}

// Create and export singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;

// Export individual methods for convenience
export const {
  create,
  read,
  update,
  delete: deleteDocument,
  query: queryFirestore,
  subscribe,
  unsubscribe,
  batchWrite,
  runTransaction: runFirestoreTransaction,
  getDrugs,
  getDiagnoses,
  createDrugReview,
  getUserBookmarks,
  addBookmark,
  removeBookmark,
  getUserSearchHistory,
  addSearchHistory,
  incrementCounter,
  getAnalytics
} = firestoreService;