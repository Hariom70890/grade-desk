import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '25mb' }));

let cachedClient: MongoClient | null = null;
let cachedUri: string | null = null;

async function getMongoClient(
  uri?: string
): Promise<{ client: MongoClient; dbName: string }> {
  const targetUri = uri || process.env.MONGODB_URI;

  if (!targetUri) {
    throw new Error(
      'MONGODB_URI is not set in environment or provided in request'
    );
  }

  let dbName = 'grade-desk';

  try {
    const urlObj = new URL(
      targetUri
        .replace('mongodb+srv://', 'https://')
        .replace('mongodb://', 'http://')
    );
    const pathname = urlObj.pathname.replace(/^\//, '');

    if (pathname && !pathname.includes('?')) {
      dbName = pathname;
    }
  } catch {
    // Use default database name.
  }

  if (cachedClient && cachedUri === targetUri) {
    return { client: cachedClient, dbName };
  }

  if (cachedClient && cachedUri !== targetUri) {
    await cachedClient.close().catch(() => undefined);
    cachedClient = null;
    cachedUri = null;
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

function validTerm(term: unknown): term is 'quarterly' | 'halfYearly' {
  return term === 'quarterly' || term === 'halfYearly';
}

function validClassData(value: any): boolean {
  return Boolean(
    value &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.section === 'string' &&
      Array.isArray(value.students) &&
      Array.isArray(value.subjects)
  );
}

/* ------------------------------------------------------------------ */
/* Health and connection endpoints                                      */
/* ------------------------------------------------------------------ */

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongodbConfigured: Boolean(process.env.MONGODB_URI),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/mongodb/status', async (_req: Request, res: Response) => {
  const configuredUri = process.env.MONGODB_URI;

  if (!configuredUri) {
    return res.json({
      configured: false,
      connected: false,
      message: 'MONGODB_URI is not set in environment variables (.env)',
      recommendation:
        'Add MONGODB_URI to your .env file or deployment environment variables.',
    });
  }

  const startTime = Date.now();

  try {
    const { client, dbName } = await getMongoClient(configuredUri);
    const db = client.db(dbName);

    await db.command({ ping: 1 });

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name);

    const classesCount = collectionNames.includes('classes')
      ? await db.collection('classes').countDocuments()
      : 0;

    res.json({
      configured: true,
      connected: true,
      dbName,
      latencyMs: Date.now() - startTime,
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

app.post('/api/mongodb/test', async (req: Request, res: Response) => {
  const { uri } = req.body || {};
  const targetUri = uri || process.env.MONGODB_URI;

  if (!targetUri) {
    return res.status(400).json({
      success: false,
      message:
        'No MongoDB URI provided and MONGODB_URI is not set in environment',
    });
  }

  if (
    !targetUri.startsWith('mongodb://') &&
    !targetUri.startsWith('mongodb+srv://')
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid URI format: Connection string must start with mongodb:// or mongodb+srv://',
    });
  }

  const startTime = Date.now();

  try {
    const { client, dbName } = await getMongoClient(targetUri);
    await client.db(dbName).command({ ping: 1 });

    const maskedUri = targetUri.replace(/:(.*?)@/, ':******@');

    res.json({
      success: true,
      message: 'Successfully connected to MongoDB cluster!',
      latencyMs: Date.now() - startTime,
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

/* ------------------------------------------------------------------ */
/* Class endpoints                                                      */
/* ------------------------------------------------------------------ */

// Save the complete class document. This supports structural changes,
// including deleting students or subjects.
app.put('/api/mongodb/classes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const incoming = req.body;

  if (!validClassData(incoming) || incoming.id !== id) {
    return res.status(400).json({
      success: false,
      error: 'Invalid class data or class ID mismatch',
    });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const classesCol = client.db(dbName).collection('classes');

    const { _id: _ignoredId, updatedAt: _ignoredUpdatedAt, ...classData } =
      incoming;

    await classesCol.replaceOne(
      { id },
      { ...classData, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true, class: classData });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to save class',
    });
  }
});

app.delete('/api/mongodb/class/:id', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    await client.db(dbName).collection('classes').deleteOne({
      id: req.params.id,
    });

    res.json({
      success: true,
      message: `Class ${req.params.id} deleted`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete class',
    });
  }
});

/* ------------------------------------------------------------------ */
/* Mark endpoints                                                       */
/* ------------------------------------------------------------------ */

const handleUpdateStudentSubjectMark = async (
  req: Request,
  res: Response
) => {
  const { classId, studentId, subjectId } = req.params;
  const { term, mark } = req.body || {};

  if (!classId || !studentId || !subjectId || !validTerm(term)) {
    return res.status(400).json({
      success: false,
      error: 'Missing IDs or invalid term',
    });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const classesCol = client.db(dbName).collection('classes');

    const marksField =
      term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';
    const fieldPath = `${marksField}.${studentId}.${subjectId}`;

    if (
      mark !== null &&
      mark !== undefined &&
      mark !== '' &&
      !Number.isNaN(Number(mark))
    ) {
      await classesCol.updateOne(
        { id: classId },
        {
          $set: {
            [fieldPath]: Number(mark),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else {
      await classesCol.updateOne(
        { id: classId },
        {
          $unset: { [fieldPath]: '' },
          $set: { updatedAt: new Date() },
        }
      );
    }

    res.json({
      success: true,
      classId,
      term,
      studentId,
      subjectId,
      mark:
        mark !== null && mark !== undefined && mark !== ''
          ? Number(mark)
          : null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to update student subject mark',
    });
  }
};

app.patch(
  '/api/mongodb/classes/:classId/students/:studentId/subjects/:subjectId/mark',
  handleUpdateStudentSubjectMark
);
app.put(
  '/api/mongodb/classes/:classId/students/:studentId/subjects/:subjectId/mark',
  handleUpdateStudentSubjectMark
);

const handleBatchUpdateMarks = async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { term, marks } = req.body || {};

  if (!classId || !validTerm(term) || !Array.isArray(marks)) {
    return res.status(400).json({
      success: false,
      error: 'Missing classId, invalid term, or marks array',
    });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const classesCol = client.db(dbName).collection('classes');

    const marksField =
      term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    const unsetFields: Record<string, ''> = {};

    for (const item of marks) {
      if (
        !item ||
        typeof item.studentId !== 'string' ||
        typeof item.subjectId !== 'string'
      ) {
        continue;
      }

      const fieldPath = `${marksField}.${item.studentId}.${item.subjectId}`;

      if (
        item.mark !== null &&
        item.mark !== undefined &&
        item.mark !== '' &&
        !Number.isNaN(Number(item.mark))
      ) {
        setFields[fieldPath] = Number(item.mark);
      } else {
        unsetFields[fieldPath] = '';
      }
    }

    const updateDoc: Record<string, unknown> = { $set: setFields };

    if (Object.keys(unsetFields).length > 0) {
      updateDoc.$unset = unsetFields;
    }

    await classesCol.updateOne({ id: classId }, updateDoc, { upsert: true });

    res.json({
      success: true,
      classId,
      term,
      updatedCount: marks.length,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to batch update marks',
    });
  }
};

app.patch('/api/mongodb/classes/:classId/marks', handleBatchUpdateMarks);
app.put('/api/mongodb/classes/:classId/marks', handleBatchUpdateMarks);

const handleClearMarks = async (req: Request, res: Response) => {
  const { classId, term } = req.body || {};

  if (!classId || !validTerm(term)) {
    return res.status(400).json({
      success: false,
      error: 'classId and a valid term are required',
    });
  }

  try {
    const { client, dbName } = await getMongoClient();
    const marksField =
      term === 'halfYearly' ? 'halfYearlyMarks' : 'quarterlyMarks';

    await client
      .db(dbName)
      .collection('classes')
      .updateOne(
        { id: classId },
        { $set: { [marksField]: {}, updatedAt: new Date() } }
      );

    res.json({
      success: true,
      message: `Marks cleared for ${classId} (${term})`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to clear marks',
    });
  }
};

app.patch('/api/mongodb/clear-marks', handleClearMarks);
app.post('/api/mongodb/clear-marks', handleClearMarks);

/* ------------------------------------------------------------------ */
/* School configuration                                                */
/* ------------------------------------------------------------------ */

app.patch('/api/mongodb/school-config', async (req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const configCol = client.db(dbName).collection('school_config');

    const existingConfig = await configCol.findOne({
      _id: 'current_config' as any,
    });

    const merged = {
      ...(existingConfig || {}),
      ...(req.body || {}),
      _id: 'current_config',
      updatedAt: new Date(),
    };

    await configCol.replaceOne(
      { _id: 'current_config' as any },
      merged,
      { upsert: true }
    );

    res.json({ success: true, schoolConfig: merged });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to update school config',
    });
  }
});

/* ------------------------------------------------------------------ */
/* Pull data                                                           */
/* ------------------------------------------------------------------ */

app.get('/api/mongodb/pull', async (_req: Request, res: Response) => {
  try {
    const { client, dbName } = await getMongoClient();
    const db = client.db(dbName);

    const [classes, configDoc, gradingDoc] = await Promise.all([
      db.collection('classes').find({}).toArray(),
      db.collection('school_config').findOne({
        _id: 'current_config' as any,
      }),
      db.collection('grading_rules').findOne({
        _id: 'current_rules' as any,
      }),
    ]);

    const cleanedClasses = classes.map(
      ({ _id, updatedAt, ...rest }) => rest
    );

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
      gradingRules: Array.isArray(gradingDoc?.rules) ? gradingDoc.rules : [],
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

/* ------------------------------------------------------------------ */
/* Optional full sync endpoint                                         */
/* ------------------------------------------------------------------ */

app.post('/api/mongodb/sync', async (req: Request, res: Response) => {
  const { classes, schoolConfig, customUri } = req.body || {};

  if (!Array.isArray(classes)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload: classes array is required',
    });
  }

  try {
    const { client, dbName } = await getMongoClient(customUri);
    const db = client.db(dbName);
    const classesCol = db.collection('classes');

    for (const incomingClass of classes) {
      if (!validClassData(incomingClass)) continue;

      const { _id: _ignoredId, updatedAt: _ignoredUpdatedAt, ...classData } =
        incomingClass;

      await classesCol.replaceOne(
        { id: classData.id },
        { ...classData, updatedAt: new Date() },
        { upsert: true }
      );
    }

    if (schoolConfig) {
      const configCol = db.collection('school_config');
      const { _id: _ignoredId, ...configData } = schoolConfig;

      await configCol.replaceOne(
        { _id: 'current_config' as any },
        {
          ...configData,
          _id: 'current_config',
          updatedAt: new Date(),
        },
        { upsert: true }
      );
    }

    const allClassDocs = await classesCol.find({}).toArray();
    const cleanedClasses = allClassDocs.map(
      ({ _id, updatedAt, ...rest }) => rest
    );

    const totalStudents = cleanedClasses.reduce(
      (sum: number, cls: any) => sum + (cls.students?.length || 0),
      0
    );

    await db.collection('sync_history').insertOne({
      syncedAt: new Date(),
      totalClasses: cleanedClasses.length,
      totalStudents,
      deviceInfo: req.headers['user-agent'] || 'Web Client',
    });

    res.json({
      success: true,
      mode: 'mongodb',
      message: `Successfully saved ${classes.length} classes to MongoDB Atlas`,
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

/* ------------------------------------------------------------------ */
/* Server-side data validation                                         */
/* ------------------------------------------------------------------ */

app.post('/api/validate', (req: Request, res: Response) => {
  const { classes } = req.body || {};

  if (!Array.isArray(classes)) {
    return res.status(400).json({
      success: false,
      error: 'classes array is required',
    });
  }

  const issues: any[] = [];
  let totalMarks = 0;
  let exceeding = 0;
  let negative = 0;
  let duplicateRolls = 0;

  for (const cls of classes) {
    const rollMap = new Map<string, string[]>();

    for (const student of cls.students || []) {
      const roll = (student.rollNo || '').trim().toLowerCase();

      if (roll) {
        const names = rollMap.get(roll) || [];
        names.push(student.name || 'Unnamed');
        rollMap.set(roll, names);
      }
    }

    for (const [roll, names] of rollMap) {
      if (names.length > 1) {
        duplicateRolls++;
        issues.push({
          type: 'error',
          class: `${cls.name} (${cls.section})`,
          message: `Duplicate Roll No. ${roll} found on students: ${names.join(', ')}`,
        });
      }
    }

    const checkMarks = (store: any, exam: string) => {
      for (const student of cls.students || []) {
        for (const subject of cls.subjects || []) {
          totalMarks++;

          const value = store?.[student.id]?.[subject.id];

          if (typeof value === 'number') {
            if (value > subject.maxMarks) {
              exceeding++;
              issues.push({
                type: 'error',
                class: `${cls.name} (${cls.section})`,
                student: student.name,
                subject: subject.name,
                message: `Mark (${value}) exceeds maximum (${subject.maxMarks}) in ${exam}`,
              });
            } else if (value < 0) {
              negative++;
              issues.push({
                type: 'error',
                class: `${cls.name} (${cls.section})`,
                student: student.name,
                subject: subject.name,
                message: `Negative mark (${value}) in ${exam}`,
              });
            }
          }
        }
      }
    };

    checkMarks(cls.quarterlyMarks, 'Quarterly');
    checkMarks(cls.halfYearlyMarks, 'Half-Yearly');
  }

  res.json({
    success: true,
    valid: issues.length === 0,
    issuesCount: issues.length,
    totalMarks,
    exceeding,
    negative,
    duplicateRolls,
    issues: issues.slice(0, 50),
  });
});

/* ------------------------------------------------------------------ */
/* Vite development / production serving                               */
/* ------------------------------------------------------------------ */

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

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(
      `GradeDesk server running on http://0.0.0.0:${PORT} [${
        isProduction ? 'production' : 'development'
      }]`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;