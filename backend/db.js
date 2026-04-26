import { MongoClient } from 'mongodb';
import { config } from './config.js';

let mongoClient;
let mongoDatabase;
let mongoConnectionPromise;
let isMongoReady = false;

function resolveMongoDatabaseName() {
  const explicitName = String(config.mongodbDatabase || '').trim();
  if (explicitName) return explicitName;
  try {
    const parsed = new URL(config.mongodbUri);
    const uriName = (parsed.pathname || '').replace(/^\//, '');
    return uriName || 'hacklpu';
  } catch {
    return 'hacklpu';
  }
}

export async function getDatabase() {
  if (mongoDatabase) return mongoDatabase;

  if (!mongoConnectionPromise) {
    mongoClient = new MongoClient(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
    });

    mongoConnectionPromise = mongoClient
      .connect()
      .then((connectedClient) => {
        mongoDatabase = connectedClient.db(resolveMongoDatabaseName());
        isMongoReady = true;
        return mongoDatabase;
      })
      .catch((error) => {
        mongoConnectionPromise = null;
        isMongoReady = false;
        throw error;
      });
  }

  return mongoConnectionPromise;
}

export async function initializeMongoCollections() {
  const database = await getDatabase();
  await Promise.all([
    database.collection('registrations').createIndex({ id: 1 }, { unique: true }),
    database.collection('registrations').createIndex({ paymentSessionId: 1 }, { unique: true, sparse: true }),
    database.collection('volunteers').createIndex({ id: 1 }, { unique: true }),
  ]);
}

export { isMongoReady };
