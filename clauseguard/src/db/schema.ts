import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).default(new Date()),
  contractText: text('contract_text'),
  analysisResult: text('analysis_result'),
  overallRiskScore: integer('overall_risk_score'),
  contractType: text('contract_type'),
  status: text('status').default('pending'),
});
