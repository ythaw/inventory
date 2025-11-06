import db from '../db.js';

/**
 * Clean up activity logs older than 6 months
 * This function should be called periodically or on server startup
 */
export const cleanupOldLogs = () => {
  try {
    const sixMonthsAgo = Math.floor(Date.now() / 1000) - (6 * 30 * 24 * 60 * 60); // 6 months in seconds
    
    const deleteOldLogs = db.prepare(
      'DELETE FROM activity_logs WHERE createdAt < ?'
    );
    
    const result = deleteOldLogs.run(sixMonthsAgo);
    
    if (result.changes > 0) {
      console.log(`✅ Cleaned up ${result.changes} activity log(s) older than 6 months`);
    }
    
    return { deleted: result.changes };
  } catch (err) {
    console.error('Error cleaning up old logs:', err);
    return { deleted: 0, error: err.message };
  }
};

/**
 * Run cleanup on a schedule (every 24 hours)
 */
export const startCleanupSchedule = () => {
  // Run cleanup immediately on startup
  cleanupOldLogs();
  
  // Then run every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(() => {
    cleanupOldLogs();
  }, intervalMs);
  
  console.log('📅 Activity log cleanup scheduled (runs every 24 hours)');
};

