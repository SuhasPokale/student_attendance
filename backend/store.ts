import mongoose from 'mongoose';

export const STATUSES = ['Present', 'Absent', 'Late'] as const;
export type AttendanceStatus = (typeof STATUSES)[number];

export interface AttendanceInput {
  studentName: string;
  status: AttendanceStatus;
  date?: Date;
}

export interface AttendanceRecord {
  _id: string;
  studentName: string;
  status: AttendanceStatus;
  date: Date;
}

export interface ListFilter {
  studentName?: string;
  status?: AttendanceStatus;
  from?: Date;
  to?: Date;
}

export interface AttendanceStore {
  create(input: AttendanceInput): Promise<AttendanceRecord>;
  list(filter?: ListFilter): Promise<AttendanceRecord[]>;
  update(id: string, input: Partial<AttendanceInput>): Promise<AttendanceRecord | null>;
  remove(id: string): Promise<boolean>;
}

const matches = (r: AttendanceRecord, f: ListFilter): boolean =>
  (!f.studentName || r.studentName.toLowerCase() === f.studentName.toLowerCase()) &&
  (!f.status || r.status === f.status) &&
  (!f.from || r.date >= f.from) &&
  (!f.to || r.date <= f.to);

export class MemoryStore implements AttendanceStore {
  private records: AttendanceRecord[] = [];

  async create(input: AttendanceInput): Promise<AttendanceRecord> {
    const record: AttendanceRecord = {
      _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      studentName: input.studentName,
      status: input.status,
      date: input.date ?? new Date()
    };
    this.records.unshift(record);
    return record;
  }

  async list(filter: ListFilter = {}): Promise<AttendanceRecord[]> {
    return this.records
      .filter((r) => matches(r, filter))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async update(id: string, input: Partial<AttendanceInput>): Promise<AttendanceRecord | null> {
    const record = this.records.find((r) => r._id === id);
    if (!record) return null;
    Object.assign(record, input);
    return record;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.records.length;
    this.records = this.records.filter((r) => r._id !== id);
    return this.records.length < before;
  }
}

const AttendanceModel = mongoose.model(
  'Attendance',
  new mongoose.Schema({
    studentName: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: STATUSES },
    date: { type: Date, default: Date.now }
  })
);

export class MongoStore implements AttendanceStore {
  async create(input: AttendanceInput): Promise<AttendanceRecord> {
    return (await AttendanceModel.create(input)).toObject() as unknown as AttendanceRecord;
  }

  async list(filter: ListFilter = {}): Promise<AttendanceRecord[]> {
    const query: Record<string, unknown> = {};
    if (filter.studentName) query.studentName = new RegExp(`^${escapeRegex(filter.studentName)}$`, 'i');
    if (filter.status) query.status = filter.status;
    if (filter.from || filter.to) {
      query.date = {
        ...(filter.from && { $gte: filter.from }),
        ...(filter.to && { $lte: filter.to })
      };
    }
    return (await AttendanceModel.find(query).sort({ date: -1 }).lean()) as unknown as AttendanceRecord[];
  }

  async update(id: string, input: Partial<AttendanceInput>): Promise<AttendanceRecord | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return (await AttendanceModel.findByIdAndUpdate(id, input, { new: true }).lean()) as unknown as AttendanceRecord | null;
  }

  async remove(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    return (await AttendanceModel.findByIdAndDelete(id)) !== null;
  }
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Uses MongoDB while connected, otherwise falls back to memory (same behaviour as before). */
export class FallbackStore implements AttendanceStore {
  private memory = new MemoryStore();
  private mongo = new MongoStore();

  private get active(): AttendanceStore {
    return mongoose.connection.readyState === 1 ? this.mongo : this.memory;
  }

  create(input: AttendanceInput) { return this.active.create(input); }
  list(filter?: ListFilter) { return this.active.list(filter); }
  update(id: string, input: Partial<AttendanceInput>) { return this.active.update(id, input); }
  remove(id: string) { return this.active.remove(id); }
}
