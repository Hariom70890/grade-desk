import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable JSON body parsing with high limit for batch tabulation data
app.use(express.json({ limit: '25mb' }));

// -------------------------------------------------------------
// Single source of truth for the MongoDB connection.
//
// Every real data endpoint (status/sync/pull) goes through
// getMongoClient(), which ALWAYS uses process.env.MONGODB_URI —
// nothing from a request body can redirect reads or writes to a
// different cluster or database. If MONGODB_URI changes (e.g. you
// edit .env and restart), the previous cached connection is closed
// and a fresh one is opened, so stale data from an old URI can never
// be served.
// -------------------------------------------------------------
let cachedClient: MongoClient | null = null;
let cachedUri: string | null = null;
let cachedDbName: string = '';

/**
 * Pulls the database name out of a mongodb:// or mongodb+srv:// URI's
 * path segment, e.g. ".../myCluster.mongodb.net/gradedesk?retryWrites=..."
 * -> "gradedesk". Returns '' if the URI doesn't specify one, in which
 * case the driver's own default (the db named in the URI, or "test")
 * is used instead.
 */
function extractDbName(uri: string): string {
  try {
    const urlObj = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    const pathname = urlObj.pathname.replace(/^\//, '');
    if (pathname && !pathname.includes('?')) {
      return pathname;
    }
  } catch (e: any) {
    console.warn('Could not parse a database name out of MONGODB_URI, using the driver default instead:', e?.message);
  }
  return '';
}

async function getMongoClient(): Promise<{ client: MongoClient; dbName: string }> {
  const targetUri = process.env.MONGODB_URI;
  if (!targetUri) {
    throw new Error('MONGODB_URI is not set in environment (.env)');
  }

  // Fast path: already connected to exactly this URI.
  if (cachedClient && cachedUri === targetUri) {
    return { client: cachedClient, dbName: cachedDbName };
  }

  // The URI changed since the last connection (env var was updated and the
  // server restarted, or dotenv was reloaded) — close the old connection so
  // we never keep silently serving data from a previous cluster.
  if (cachedClient && cachedUri !== targetUri) {
    try {
      await cachedClient.close();
    } catch {
      // ignore errors closing a stale connection
    }
    cachedClient = null;
    cachedUri = null;
    cachedDbName = '';
  }

  const dbName = extractDbName(targetUri);

  const client = new MongoClient(targetUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  cachedClient = client;
  cachedUri = targetUri;
  cachedDbName = dbName;

  return { client, dbName };
}

/** client.db('') is not the same as "use the URI's default database" — guard it. */
function getDb(client: MongoClient, dbName: string) {
  return dbName ? client.db(dbName) : client.db();
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const hasMongoUri = Boolean(process.env.MONGODB_URI);
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongodbConfigured: hasMongoUri,
    timestamp: new Date().toISOString(),
  });
});

// MongoDB Connection Status & Latency Check — always the configured URI.
app.get('/api/mongodb/status', async (req: Request, res: Response) => {
  if (!process.env.MONGODB_URI) {
    return res.json({
      configured: false,
      connected: false,
      message: 'MONGODB_URI is not set in environment variables (.env)',
      recommendation: 'Add MONGODB_URI to your .env file or hosting provider\'s Environment Variables.',
    });
  }

  const startTime = Date.now();
  try {
    const { client, dbName } = await getMongoClient();
    const db = getDb(client, dbName);

    // Ping the deployment
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;

    // Fetch collection statistics
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    let classesCount = 0;
    if (collectionNames.includes('classes')) {
      classesCount = await db.collection('classes').countDocuments();
    }

    res.json({
      configured: true,
      connected: true,
      dbName: db.databaseName,
      latencyMs,
      collections: collectionNames,
      classesInCloud: classesCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      configured: true,
      connected: false,
      error: err.message || 'Failed to connect to MongoDB cluster',
    });
  }
});

// Test-connect to an arbitrary URI, purely for verification. This is
// intentionally isolated from getMongoClient()/cachedClient — it never
// touches or replaces the live connection used by sync/pull, so pasting a
// URI in here to "test" it can never redirect where your real data goes.
app.post('/api/mongodb/test', async (req: Request, res: Response) => {
  const { uri } = req.body;
  const targetUri = uri || process.env.MONGODB_URI;

  if (!targetUri) {
    return res.status(400).json({
      success: false,
      message: 'No MongoDB URI provided and MONGODB_URI is not set in environment',
    });
  }

  if (!targetUri.startsWith('mongodb://') && !targetUri.startsWith('mongodb+srv://')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URI format: Connection string must start with mongodb:// or mongodb+srv://',
    });
  }

  const startTime = Date.now();
  let testClient: MongoClient | null = null;
  try {
    testClient = new MongoClient(targetUri, {
      serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });
    await testClient.connect();
    const dbName = extractDbName(targetUri);
    const db = dbName ? testClient.db(dbName) : testClient.db();
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;

    const maskedUri = targetUri.replace(/:(.*?)@/, ':******@');
    const isActiveUri = targetUri === process.env.MONGODB_URI;

    res.json({
      success: true,
      message: 'Successfully connected to MongoDB cluster!',
      latencyMs,
      dbName: db.databaseName,
      maskedUri,
      isActiveUri,
      note: isActiveUri
        ? undefined
        : 'This URI is NOT your configured MONGODB_URI — it was only tested, nothing was read or written to it.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Connection failed',
    });
  } finally {
    if (testClient) {
      try {
        await testClient.close();
      } catch {
        // ignore
      }
    }
  }
});

// Sync data to MongoDB (Push / Cloud Backup) — always the configured URI.
// Any `customUri` in the request body is intentionally ignored: this
// endpoint must only ever write to process.env.MONGODB_URI.
app.post('/api/mongodb/sync', async (req: Request, res: Response) => {
  const { classes, schoolConfig } = req.body;

  if (req.body.customUri) {
    console.warn('[mongodb/sync] Ignoring customUri from request body — writes always go to the configured MONGODB_URI.');
  }

  if (!classes || !Array.isArray(classes)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload: classes array is required',
    });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const db = getDb(client, dbName);

    const classesCol = db.collection('classes');
    const configCol = db.collection('school_config');
    const historyCol = db.collection('sync_history');

    // Remove any classes that are no longer in the payload
    const classIds = classes.map((cls: any) => cls.id);
    await classesCol.deleteMany({ id: { $nin: classIds } });

    // Upsert each class record
    const bulkOps = classes.map((cls: any) => ({
      replaceOne: {
        filter: { id: cls.id },
        replacement: {
          ...cls,
          updatedAt: new Date(),
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await classesCol.bulkWrite(bulkOps);
    }

    // Upsert school config
    if (schoolConfig) {
      await configCol.replaceOne(
        { _id: 'current_config' as any },
        { ...schoolConfig, updatedAt: new Date() },
        { upsert: true }
      );
    }

    // Record audit sync log
    const totalStudents = classes.reduce((sum: number, c: any) => sum + (c.students?.length || 0), 0);
    await historyCol.insertOne({
      syncedAt: new Date(),
      dbName: db.databaseName,
      totalClasses: classes.length,
      totalStudents,
      deviceInfo: req.headers['user-agent'] || 'Web Client',
    });

    res.json({
      success: true,
      mode: 'mongodb',
      dbName: db.databaseName,
      message: `Successfully saved ${classes.length} classes and ${totalStudents} students!`,
      syncedAt: new Date().toISOString(),
      classesCount: classes.length,
      studentsCount: totalStudents,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync data to MongoDB',
    });
  }
});

// Pull data from MongoDB (Load / Restore) — always the configured URI.
app.get('/api/mongodb/pull', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const db = getDb(client, dbName);

    const classesCol = db.collection('classes');
    const configCol = db.collection('school_config');

    const classes = await classesCol.find({}).toArray();
    const configDoc = await configCol.findOne({ _id: 'current_config' as any });

    const cleanedClasses = classes.map(({ _id, updatedAt, ...rest }: any) => rest);
    let cleanedConfig = null;
    if (configDoc) {
      const { _id, updatedAt, ...rest } = configDoc as any;
      cleanedConfig = rest;
    }

    res.json({
      success: true,
      source: 'mongodb',
      dbName: db.databaseName,
      classes: cleanedClasses,
      schoolConfig: cleanedConfig,
      count: cleanedClasses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to pull data from MongoDB',
    });
  }
});

// Server-side Data Validation Endpoint
app.post('/api/validate', (req: Request, res: Response) => {
  const { classes } = req.body;
  if (!classes || !Array.isArray(classes)) {
    return res.status(400).json({ error: 'classes array is required' });
  }

  const issues: any[] = [];
  let totalMarks = 0;
  let exceeding = 0;
  let negative = 0;
  let duplicateRolls = 0;

  classes.forEach((cls: any) => {
    const rollMap = new Map<string, string[]>();
    cls.students?.forEach((st: any) => {
      const roll = (st.rollNo || '').trim().toLowerCase();
      if (roll) {
        const list = rollMap.get(roll) || [];
        list.push(st.name || 'Unnamed');
        rollMap.set(roll, list);
      }
    });

    rollMap.forEach((names, roll) => {
      if (names.length > 1) {
        duplicateRolls++;
        issues.push({
          type: 'error',
          class: `${cls.name} (${cls.section})`,
          message: `Duplicate Roll No. ${roll} found on students: ${names.join(', ')}`,
        });
      }
    });

    const checkMarks = (store: any, exam: string) => {
      cls.students?.forEach((st: any) => {
        cls.subjects?.forEach((sub: any) => {
          totalMarks++;
          const val = store?.[st.id]?.[sub.id];
          if (typeof val === 'number') {
            if (val > sub.maxMarks) {
              exceeding++;
              issues.push({
                type: 'error',
                class: `${cls.name} (${cls.section})`,
                student: st.name,
                subject: sub.name,
                message: `Mark (${val}) exceeds maximum (${sub.maxMarks}) in ${exam}`,
              });
            } else if (val < 0) {
              negative++;
              issues.push({
                type: 'error',
                class: `${cls.name} (${cls.section})`,
                student: st.name,
                subject: sub.name,
                message: `Negative mark (${val}) in ${exam}`,
              });
            }
          }
        });
      });
    };

    checkMarks(cls.quarterlyMarks, 'Quarterly');
    checkMarks(cls.halfYearlyMarks, 'Half-Yearly');
  });

  res.json({
    valid: issues.length === 0,
    issuesCount: issues.length,
    totalMarks,
    exceeding,
    negative,
    duplicateRolls,
    issues: issues.slice(0, 50),
  });
});

// -------------------------------------------------------------
// Vite Dev Integration vs Production Static Serving
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`GradeDesk server running on http://0.0.0.0:${PORT} [${isProduction ? 'production' : 'development'}]`);
    console.log(`MongoDB target: ${process.env.MONGODB_URI ? '(configured — see MONGODB_URI in .env)' : 'NOT CONFIGURED'}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;