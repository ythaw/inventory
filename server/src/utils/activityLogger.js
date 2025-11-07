import db from '../db.js';

export const logActivity = (userId, action, entityType, entityId = null, entityName = null, details = null) => {
  try {
    const insertLog = db.prepare(
      'INSERT INTO activity_logs (userId, action, entityType, entityId, entityName, details) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertLog.run(userId, action, entityType, entityId, entityName, details);
  } catch (err) {
    console.error('Error logging activity:', err);
    // Don't throw - logging failures shouldn't break the main operation
  }
};

