const db = require('../config/db');

exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE, status = "Read" WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.clearAll = async (req, res) => {
  const userId = req.user.id;
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE, status = "Read" WHERE user_id = ?',
      [userId]
    );
    return res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
