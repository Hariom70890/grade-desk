import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Load environment variables from .env
dotenv.config();
dns.setServers( ['8.8.8.8', '1.1.1.1', '0.0.0.0'] );

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable JSON body parsing with high limit for batch tabulation data
app.use(express.json({ limit: '25mb' }));

// Cached MongoDB client instance
let cachedClient: MongoClient | null = null;
let cachedUri: string | null = null;

async function getMongoClient(uri?: string): Promise<{ client: MongoClient; dbName: string }> {
  const targetUri = uri || process.env.MONGODB_URI;
  if (!targetUri) {
    throw new Error('MONGODB_URI is not set in environment or provided in request');
  }

  // Parse DB name from URI or use default
  let dbName = 'gradedesk';
  try {
    const urlObj = new URL(targetUri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    const pathname = urlObj.pathname.replace(/^\//, '');
    if (pathname && !pathname.includes('?')) {
      dbName = pathname;
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }

  if (cachedClient && cachedUri === targetUri) {
    return { client: cachedClient, dbName };
  }

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

  return { client, dbName };
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

// MongoDB Connection Status & Latency Check
app.get('/api/mongodb/status', async (req: Request, res: Response) => {
  const configuredUri = process.env.MONGODB_URI;

  if (!configuredUri) {
    return res.json({
      configured: false,
      connected: false,
      message: 'MONGODB_URI is not set in environment variables (.env)',
      recommendation: 'Add MONGODB_URI to your .env file or Vercel Environment Variables.',
    });
  }

  const startTime = Date.now();
  try {
    const { client, dbName } = await getMongoClient(configuredUri);
    const db = client.db(dbName);
    
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
      dbName,
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

// Test custom or provided MongoDB URI
app.post('/api/mongodb/test', async (req: Request, res: Response) => {
  const { uri } = req.body;
  const targetUri = uri || process.env.MONGODB_URI;

  if (!targetUri) {
    return res.status(400).json({
      success: false,
      message: 'No MongoDB URI provided and MONGODB_URI is not set in environment',
    });
  }

  // Basic format sanity check
  if (!targetUri.startsWith('mongodb://') && !targetUri.startsWith('mongodb+srv://')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URI format: Connection string must start with mongodb:// or mongodb+srv://',
    });
  }

  const startTime = Date.now();
  try {
    const { client, dbName } = await getMongoClient(targetUri);
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - startTime;

    // Mask password in response for security
    const maskedUri = targetUri.replace(/:(.*?)@/, ':******@');

    res.json({
      success: true,
      message: 'Successfully connected to MongoDB cluster!',
      latencyMs,
      dbName,
      maskedUri,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Connection failed',
    });
  }
});

// Sync data to MongoDB (Push / Cloud Backup)
app.post('/api/mongodb/sync', async (req: Request, res: Response) => {
  const { classes, schoolConfig, customUri } = req.body;

  if (!classes || !Array.isArray(classes)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload: classes array is required',
    });
  }

  try {
    const { client, dbName } = await getMongoClient(customUri);
    const db = client.db(dbName);

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
      totalClasses: classes.length,
      totalStudents,
      deviceInfo: req.headers['user-agent'] || 'Web Client',
    });

    res.json({
      success: true,
      mode: 'mongodb',
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

// Pull data from MongoDB (Load / Restore)
app.get('/api/mongodb/pull', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);

    const classesCol = db.collection('classes');
    const configCol = db.collection('school_config');

    const classes = await classesCol.find({}).toArray();
    const configDoc = await configCol.findOne({ _id: 'current_config' as any });

    const cleanedClasses = classes.map(({ _id, updatedAt, ...rest }) => rest);
    let cleanedConfig = null;
    if (configDoc) {
      const { _id, updatedAt, ...rest } = configDoc;
      cleanedConfig = rest;
    }

    res.json({
      success: true,
      source: 'mongodb',
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

  // Server-side audit check
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

    // Check marks
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
    // Serve static build from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`GradeDesk server running on http://0.0.0.0:${PORT} [${isProduction ? 'production' : 'development'}]`);
  });
}


if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
