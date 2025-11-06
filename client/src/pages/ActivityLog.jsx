import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12); // Show ~12 rows that fit on screen
  const [dateFilter, setDateFilter] = useState('lastWeek'); // 'lastWeek', 'lastMonth', 'allTime', 'custom'
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const navigate = useNavigate();

  // Calculate date ranges
  const getDateRange = () => {
    const now = Math.floor(Date.now() / 1000);
    let fromDate = null;
    let toDate = now;

    switch (dateFilter) {
      case 'lastWeek':
        fromDate = now - (7 * 24 * 60 * 60); // 7 days ago
        break;
      case 'lastMonth':
        fromDate = now - (30 * 24 * 60 * 60); // 30 days ago
        break;
      case 'custom':
        if (customFromDate) {
          fromDate = Math.floor(new Date(customFromDate).getTime() / 1000);
        }
        if (customToDate) {
          toDate = Math.floor(new Date(customToDate + 'T23:59:59').getTime() / 1000);
        }
        break;
      case 'allTime':
      default:
        fromDate = null;
        toDate = null;
        break;
    }

    return { fromDate, toDate };
  };

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const { fromDate, toDate } = getDateRange();
      const data = await api.getActivityLogs(limit, offset, fromDate, toDate);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when date filter changes
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customFromDate, customToDate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadActivityLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, currentPage, dateFilter, customFromDate, customToDate]);

  const totalPages = Math.ceil(total / limit);

  const formatDateRange = () => {
    const { fromDate, toDate } = getDateRange();
    if (!fromDate && !toDate) return 'All Time';
    if (!fromDate) return `Up to ${new Date(toDate * 1000).toLocaleDateString()}`;
    if (!toDate) return `From ${new Date(fromDate * 1000).toLocaleDateString()}`;
    return `${new Date(fromDate * 1000).toLocaleDateString()} - ${new Date(toDate * 1000).toLocaleDateString()}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700';
      case 'added':
        return 'bg-blue-100 text-blue-700';
      case 'took':
        return 'bg-orange-100 text-orange-700';
      case 'updated':
        return 'bg-purple-100 text-purple-700';
      case 'deleted':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'added':
        return 'Added';
      case 'took':
        return 'Took';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      default:
        return action;
    }
  };

  const getEntityLabel = (entityType) => {
    return entityType === 'category' ? 'Category' : 'Item';
  };

  return (
    <div className="min-h-screen bg-purple-100">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-purple-darker">Activity Log</h1>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-purple-darker hover:text-purple-700 font-medium px-4 py-2 rounded-full hover:bg-purple-50 transition-colors text-sm"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  navigate('/login');
                }}
                className="text-purple-darker hover:text-purple-700 font-medium px-4 py-2 rounded-full hover:bg-purple-50 transition-colors text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
            message.includes('error') || message.includes('Error') || message.includes('Failed')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            {message}
            <button onClick={() => setMessage('')} className="ml-2 font-semibold">×</button>
          </div>
        )}

        {/* Date Filter */}
        <div className="mb-6 bg-white rounded-2xl shadow-md p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm font-medium text-gray-700">Filter by:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 text-sm rounded-full"
              >
                <option value="lastWeek">Last Week</option>
                <option value="lastMonth">Last Month</option>
                <option value="allTime">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateFilter !== 'custom' && (
                <span className="text-sm text-gray-500 ml-2">
                  Showing: {formatDateRange()}
                </span>
              )}
            </div>
            
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">From:</label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-3 py-2 text-gray-900 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">To:</label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-3 py-2 text-gray-900 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No activity logs yet.</p>
            <p className="text-sm">Activities will appear here as you manage your inventory.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {getEntityLabel(log.entityType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {log.entityName || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {log.details || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              →
            </button>
            <span className="text-xs text-gray-500 ml-2">
              ({total} total)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

