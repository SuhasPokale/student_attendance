import mongoose from 'mongoose';
import { createApp } from './app';
import { FallbackStore } from './store';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_db';

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown MongoDB connection error';
    console.warn('MongoDB unavailable, continuing in memory-only mode:', message);
  });

const app = createApp(new FallbackStore());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
