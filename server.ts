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

// Helper to deeply merge two sets of marks without deleting existing entries
// Blank, null, undefined, or empty values from one teacher will NEVER overwrite a real mark entered by another teacher!
function mergeMarks(
  existingMarks: Record<string, Record<string, any>> = {},
  incomingMarks: Record<string, Record<string, any>> = {}
): Record<string, Record<string, number | null>> {
  const merged: Record<string, Record<string, number | null>> = {};

  // 1. Copy all existing valid marks from MongoDB
  for (const sId of Object.keys(existingMarks || {})) {
    merged[sId] = {};
    const studentExisting = existingMarks[sId] || {};
    for (const subId of Object.keys(studentExisting)) {
      const val = studentExisting[subId];
      if (val !== null && val !== undefined && val !== '' && !Number.isNaN(Number(val))) {
        merged[sId][subId] = Number(val);
      }
    }
  }

  // 2. Merge incoming marks: ONLY apply if incoming mark is a valid number (including 0 for absent).
  // Blank, null, undefined, or empty strings in incomingMarks must NEVER overwrite an existing mark!
  for (const sId of Object.keys(incomingMarks || {})) {
    if (!merged[sId]) merged[sId] = {};
    const studentIncoming = incomingMarks[sId] || {};
    for (const subId of Object.keys(studentIncoming)) {
      const incomingVal = studentIncoming[subId];
      if (
        incomingVal !== null &&
        incomingVal !== undefined &&
        incomingVal !== '' &&
        !Number.isNaN(Number(incomingVal))
      ) {
        merged[sId][subId] = Number(incomingVal);
      }
    }
  }

  return merged;
}

// Helper to merge student arrays without deleting previous students
function mergeStudents(existingStudents: any[] = [], incomingStudents: any[] = []): any[] {
  const map = new Map<string, any>();
  for (const s of existingStudents || []) {
    if (s && s.id) map.set(s.id, s);
  }
  for (const s of incomingStudents || []) {
    if (s && s.id) {
      const existing = map.get(s.id);
      if (existing) {
        map.set(s.id, {
          ...existing,
          ...s,
          name: s.name && s.name.trim() !== '' ? s.name : existing.name,
          rollNo: s.rollNo && s.rollNo.trim() !== '' ? s.rollNo : existing.rollNo,
        });
      } else {
        map.set(s.id, s);
      }
    }
  }
  return Array.from(map.values()).map((s, idx) => ({ ...s, sNo: idx + 1 }));
}

// Helper to merge subject arrays
function mergeSubjects(existingSubjects: any[] = [], incomingSubjects: any[] = []): any[] {
  const map = new Map<string, any>();
  for (const sub of existingSubjects || []) {
    if (sub && sub.id) map.set(sub.id, sub);
  }
  for (const sub of incomingSubjects || []) {
    if (sub && sub.id) {
      const existing = map.get(sub.id);
      map.set(sub.id, existing ? { ...existing, ...sub } : sub);
    }
  }
  return Array.from(map.values());
}

// PATCH: Update ONLY that student's marks for that particular subject ID (atomic update)
const handleUpdateStudentSubjectMark = async (req: Request, res: Response) => {
  const { classId, studentId, subjectId } = req.params;
  const { term, mark } = req.body;

  if (!classId || !term || !studentId || !subjectId) {
    return res.status(400).json({ success: false, message: 'Missing classId, term, studentId, or subjectId' });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);
    const classesCol = db.collection('classes');

    const marksField = term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';
    const fieldPath = `${marksField}.${studentId}.${subjectId}`;

    if (mark !== null && mark !== undefined && mark !== '' && !Number.isNaN(Number(mark))) {
      // Set ONLY this specific subject mark for this specific student ID
      await classesCol.updateOne(
        { id: classId },
        { 
          $set: { 
            [fieldPath]: Number(mark),
            updatedAt: new Date()
          } 
        },
        { upsert: true }
      );
    } else {
      // Mark is cleared for this student & subject only
      await classesCol.updateOne(
        { id: classId },
        { 
          $unset: { [fieldPath]: "" },
          $set: { updatedAt: new Date() }
        }
      );
    }

    res.json({
      success: true,
      classId,
      term,
      studentId,
      subjectId,
      mark: mark !== null && mark !== undefined && mark !== '' ? Number(mark) : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update student subject mark' });
  }
};

app.patch('/api/mongodb/classes/:classId/students/:studentId/subjects/:subjectId/mark', handleUpdateStudentSubjectMark);
app.put('/api/mongodb/classes/:classId/students/:studentId/subjects/:subjectId/mark', handleUpdateStudentSubjectMark);

// PATCH: Batch update ONLY the specific modified marks (studentId & subjectId array)
const handleBatchUpdateMarks = async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { term, marks } = req.body;

  if (!classId || !term || !Array.isArray(marks)) {
    return res.status(400).json({ success: false, message: 'Missing classId, term, or marks array' });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);
    const classesCol = db.collection('classes');

    const marksField = term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';
    const $set: Record<string, any> = { updatedAt: new Date() };
    const $unset: Record<string, any> = {};

    for (const item of marks) {
      if (!item.studentId || !item.subjectId) continue;
      const fieldPath = `${marksField}.${item.studentId}.${item.subjectId}`;
      if (item.mark !== null && item.mark !== undefined && item.mark !== '' && !Number.isNaN(Number(item.mark))) {
        $set[fieldPath] = Number(item.mark);
      } else {
        $unset[fieldPath] = "";
      }
    }

    const updateDoc: any = {};
    if (Object.keys($set).length > 0) updateDoc.$set = $set;
    if (Object.keys($unset).length > 0) updateDoc.$unset = $unset;

    await classesCol.updateOne({ id: classId }, updateDoc, { upsert: true });

    res.json({ success: true, classId, term, updatedCount: marks.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to batch update marks' });
  }
};

app.patch('/api/mongodb/classes/:classId/marks', handleBatchUpdateMarks);
app.put('/api/mongodb/classes/:classId/marks', handleBatchUpdateMarks);

// PATCH: Update School Config
app.patch('/api/mongodb/school-config', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);
    const configCol = db.collection('school_config');
    const existingConfig = await configCol.findOne({ _id: 'current_config' as any });

    const merged = {
      ...(existingConfig || {}),
      ...req.body,
      updatedAt: new Date()
    };
    await configCol.replaceOne({ _id: 'current_config' as any }, merged, { upsert: true });
    res.json({ success: true, schoolConfig: merged });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update school config' });
  }
});

// Explicit endpoint to clear marks for a class & term (supports PATCH, POST)
const handleClearMarks = async (req: Request, res: Response) => {
  const { classId, term } = req.body;
  if (!classId || !term) {
    return res.status(400).json({ success: false, message: 'classId and term required' });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);
    const classesCol = db.collection('classes');

    const marksField = term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';
    await classesCol.updateOne(
      { id: classId },
      { 
        $set: { 
          [marksField]: {},
          updatedAt: new Date()
        } 
      }
    );

    res.json({ success: true, message: `Marks cleared for ${classId} (${term})` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear marks' });
  }
};

app.patch('/api/mongodb/clear-marks', handleClearMarks);
app.post('/api/mongodb/clear-marks', handleClearMarks);

// Sync data to MongoDB (Push / Cloud Backup with Multi-User Safe Deep Merging)
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

    // DO NOT delete previous classes! Instead, deep merge incoming classes with existing classes
    for (const incomingClass of classes) {
      if (!incomingClass || !incomingClass.id) continue;

      const existing = await classesCol.findOne({ id: incomingClass.id });

      if (!existing) {
        await classesCol.insertOne({
          ...incomingClass,
          updatedAt: new Date(),
        });
      } else {
        // Deep merge students, subjects, and marks so multiple simultaneous users don't overwrite each other
        const mergedStudents = mergeStudents(existing.students || [], incomingClass.students || []);
        const mergedSubjects = mergeSubjects(existing.subjects || [], incomingClass.subjects || []);
        const mergedQuarterlyMarks = mergeMarks(existing.quarterlyMarks || {}, incomingClass.quarterlyMarks || {});
        const mergedHalfYearlyMarks = mergeMarks(existing.halfYearlyMarks || {}, incomingClass.halfYearlyMarks || {});

        const updatedDoc = {
          ...existing,
          ...incomingClass,
          students: mergedStudents,
          subjects: mergedSubjects,
          quarterlyMarks: mergedQuarterlyMarks,
          halfYearlyMarks: mergedHalfYearlyMarks,
          updatedAt: new Date(),
        };

        const { _id, ...cleanDoc } = updatedDoc;
        await classesCol.replaceOne({ id: incomingClass.id }, cleanDoc, { upsert: true });
      }
    }

    // Upsert school config if provided
    if (schoolConfig) {
      const existingConfig = await configCol.findOne({ _id: 'current_config' as any });
      const mergedConfig = {
        ...(existingConfig || {}),
        ...schoolConfig,
        updatedAt: new Date(),
      };
      await configCol.replaceOne(
        { _id: 'current_config' as any },
        mergedConfig,
        { upsert: true }
      );
    }

    // Fetch all current classes to return the merged state to the client
    const allClassDocs = await classesCol.find({}).toArray();
    const cleanedClasses = allClassDocs.map(({ _id, updatedAt, ...rest }) => rest);

    // Record audit sync log
    const totalStudents = cleanedClasses.reduce((sum: number, c: any) => sum + (c.students?.length || 0), 0);
    await historyCol.insertOne({
      syncedAt: new Date(),
      totalClasses: cleanedClasses.length,
      totalStudents,
      deviceInfo: req.headers['user-agent'] || 'Web Client',
    });

    res.json({
      success: true,
      mode: 'mongodb',
      message: `Successfully merged and saved ${classes.length} classes to MongoDB Atlas!`,
      syncedAt: new Date().toISOString(),
      classes: cleanedClasses,
      classesCount: cleanedClasses.length,
      studentsCount: totalStudents,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync data to MongoDB',
    });
  }
});

// Explicit endpoint to delete a specific class from MongoDB
app.delete('/api/mongodb/class/:id', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);
    const classesCol = db.collection('classes');
    await classesCol.deleteOne({ id: req.params.id });
    res.json({ success: true, message: `Class ${req.params.id} deleted` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete class' });
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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
