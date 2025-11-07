import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [inventory, setInventory] = useState({ categories: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [message, setMessage] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('lbs');
  const [qtyModal, setQtyModal] = useState({ open: false, item: null, mode: 'add', amount: 1 });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemUnit, setEditItemUnit] = useState('lbs');
  const [itemHistoryModal, setItemHistoryModal] = useState({ 
    open: false, 
    item: null, 
    history: [], 
    currentPage: 1, 
    total: 0,
    limit: 3 
  });
  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadInventory();
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventory(searchQuery);
      setInventory(data);
      
      // Auto-expand categories that have items
      const toExpand = new Set();
      data.categories.forEach(cat => {
        if (cat.items && cat.items.length > 0) {
          toExpand.add(cat.id);
        }
      });
      setExpandedCategories(toExpand);
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

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const openQtyModal = (item, mode) => {
    setQtyModal({ open: true, item, mode, amount: 1 });
  };

  const applyQuantityChange = async () => {
    if (!qtyModal.item) return;
    const amount = Number(qtyModal.amount) || 0;
    if (amount <= 0) {
      setQtyModal({ ...qtyModal, open: false });
      return;
    }
    try {
      if (qtyModal.mode === 'add') {
        await api.addItemQuantity(qtyModal.item.id, amount);
      } else {
        await api.takeItemQuantity(qtyModal.item.id, amount);
      }
      setQtyModal({ open: false, item: null, mode: 'add', amount: 1 });
      await loadInventory();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"? This will also delete all items in this category.`)) {
      return;
    }
    try {
      await api.deleteCategory(categoryId);
      await loadInventory();
      setMessage('Category deleted successfully');
    } catch (err) {
      setMessage(err.message || 'Failed to delete category');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
  };

  const handleSaveCategory = async (e, categoryId) => {
    e.preventDefault();
    if (!editCategoryName.trim()) {
      setMessage('Category name is required');
      return;
    }
    try {
      await api.updateCategory(categoryId, { name: editCategoryName.trim() });
      setEditingCategory(null);
      setEditCategoryName('');
      await loadInventory();
      setMessage('Category updated successfully');
    } catch (err) {
      setMessage(err.message || 'Failed to update category');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item.id);
    setEditItemName(item.name);
    setEditItemUnit(item.unit);
  };

  const handleSaveItem = async (e, itemId) => {
    e.preventDefault();
    if (!editItemName.trim()) {
      setMessage('Item name is required');
      return;
    }
    try {
      await api.updateItem(itemId, { name: editItemName.trim(), unit: editItemUnit });
      setEditingItem(null);
      setEditItemName('');
      setEditItemUnit('lbs');
      await loadInventory();
      setMessage('Item updated successfully');
    } catch (err) {
      setMessage(err.message || 'Failed to update item');
    }
  };

  const handleViewItemHistory = async (item, page = 1) => {
    try {
      const limit = 3;
      const offset = (page - 1) * limit;
      const data = await api.getItemHistory(item.id, limit, offset);
      setItemHistoryModal({ 
        open: true, 
        item: data.item, 
        history: data.logs,
        currentPage: page,
        total: data.total || 0,
        limit: limit
      });
    } catch (err) {
      setMessage(err.message || 'Failed to load item history');
    }
  };

  const getPaginatedItems = (items, categoryId) => {
    const page = currentPage[categoryId] || 1;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (items) => {
    return Math.ceil(items.length / itemsPerPage);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setMessage('Category name is required');
      return;
    }
    try {
      setMessage(''); // Clear any previous messages
      console.log('Creating category with name:', trimmedName);
      const result = await api.createCategory({ name: trimmedName });
      console.log('Category created:', result);
      setNewCategoryName('');
      setShowAddCategory(false);
      await loadInventory();
      setMessage('Category created successfully');
    } catch (err) {
      console.error('Error creating category:', err);
      setMessage(err.message || 'Failed to create category');
    }
  };

  const handleCreateItem = async (e, categoryId) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await api.createItem({
        categoryId,
        name: newItemName.trim(),
        quantity: parseFloat(newItemQuantity) || 0,
        unit: newItemUnit
      });
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('lbs');
      setShowAddItem(null);
      await loadInventory();
      setMessage('Item created successfully');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-purple-100">
      {/* Search Bar */}
      <div className="bg-white sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-5 py-3 text-gray-900 placeholder-gray-400 text-base"
              />
              <svg
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Link
              to="/activity-log"
              className="text-purple-darker hover:text-purple-700 font-medium px-4 py-2 rounded-full hover:bg-purple-50 transition-colors text-sm whitespace-nowrap"
            >
              Activity Log
            </Link>
            <button
              onClick={handleLogout}
              className="text-purple-darker hover:text-purple-700 font-medium px-4 py-2 rounded-full hover:bg-purple-50 transition-colors text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
            message.includes('error') || message.includes('Error') || message.includes('Failed') || message.includes('required') || message.includes('already exists')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            {message}
            <button onClick={() => setMessage('')} className="ml-2 font-semibold">×</button>
          </div>
        )}

        {/* Add Category Button */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => {
              setShowAddCategory(!showAddCategory);
              setMessage(''); // Clear message when toggling form
              if (showAddCategory) {
                setNewCategoryName(''); // Clear input when closing
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-full transition-colors text-sm shadow-md"
          >
            {showAddCategory ? 'Cancel' : '+ Add Category'}
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="mb-4 bg-white rounded-2xl shadow-md p-5">
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <input
                type="text"
                placeholder="Category name (e.g., Seafood, Dry Goods)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-5 py-3 text-gray-900 placeholder-gray-400 text-base"
                autoFocus
                required
              />
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-full transition-colors"
              >
                Create Category
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : inventory.categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No inventory items yet.</p>
            <p className="text-sm">Add a category above to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inventory.categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const hasItems = category.items && category.items.length > 0;

              return (
                <div key={category.id || 'uncategorized'} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    {editingCategory === category.id ? (
                      <form onSubmit={(e) => handleSaveCategory(e, category.id)} className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 text-base"
                          autoFocus
                          required
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryName('');
                          }}
                          className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full text-sm"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="flex-1 flex items-center justify-between transition-colors -mx-2 px-2 py-1 rounded"
                        >
                          <h2 className="text-lg font-semibold text-purple-darker">{category.name}</h2>
                          <svg
                            className={`w-5 h-5 text-purple-darker transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {category.id && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCategory(category);
                              }}
                              className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                              title="Edit category"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category.id, category.name);
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete category"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Category Items */}
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3">
                      {hasItems && (() => {
                        const paginatedItems = getPaginatedItems(category.items, category.id);
                        const totalPages = getTotalPages(category.items);
                        const currentPageNum = currentPage[category.id] || 1;
                        
                        return (
                          <>
                            {paginatedItems.map((item) => {
                              const quantity = Number(item.quantity) || 0;
                              const isOutOfStock = quantity === 0;
                              const isLowStock = quantity > 0 && quantity < 2;
                              
                              return editingItem === item.id ? (
                                <form key={item.id} onSubmit={(e) => handleSaveItem(e, item.id)} className="bg-purple-50 rounded-xl p-4 space-y-3">
                                  <input
                                    type="text"
                                    value={editItemName}
                                    onChange={(e) => setEditItemName(e.target.value)}
                                    className="w-full bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 text-sm"
                                    autoFocus
                                    required
                                  />
                                  <div className="flex gap-2">
                                    <select
                                      value={editItemUnit}
                                      onChange={(e) => setEditItemUnit(e.target.value)}
                                      className="bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 text-sm"
                                    >
                                      <option value="lbs">lbs</option>
                                      <option value="kg">kg</option>
                                      <option value="units">units</option>
                                      <option value="pcs">pcs</option>
                                    </select>
                                    <button
                                      type="submit"
                                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItem(null);
                                        setEditItemName('');
                                        setEditItemUnit('lbs');
                                      }}
                                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
                                    isOutOfStock 
                                      ? 'bg-red-50 border-2 border-red-200 hover:bg-red-100' 
                                      : isLowStock 
                                      ? 'bg-yellow-50 border-2 border-yellow-200 hover:bg-yellow-100' 
                                      : 'bg-purple-50 hover:bg-purple-100'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                                      {isOutOfStock && (
                                        <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-200 rounded-full">
                                          Out of Stock
                                        </span>
                                      )}
                                      {isLowStock && !isOutOfStock && (
                                        <span className="px-2 py-0.5 text-xs font-semibold text-yellow-700 bg-yellow-200 rounded-full">
                                          Low Stock
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Quantity: {item.quantity}{item.unit}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => openQtyModal(item, 'add')}
                                        className="bg-purple-200 hover:bg-purple-300 text-purple-darker font-medium px-4 py-2 rounded-full transition-colors text-sm shadow-sm"
                                      >
                                        Add
                                      </button>
                                      <button
                                        onClick={() => openQtyModal(item, 'take')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm shadow-sm"
                                      >
                                        Take
                                      </button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => handleEditItem(item)}
                                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                                        title="Edit item"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleViewItemHistory(item)}
                                        className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                                        title="View history"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                  onClick={() => setCurrentPage({ ...currentPage, [category.id]: Math.max(1, currentPageNum - 1) })}
                                  disabled={currentPageNum === 1}
                                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                  Page {currentPageNum} of {totalPages}
                                </span>
                                <button
                                  onClick={() => setCurrentPage({ ...currentPage, [category.id]: Math.min(totalPages, currentPageNum + 1) })}
                                  disabled={currentPageNum === totalPages}
                                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Add Item Button */}
                      <button
                        onClick={() => setShowAddItem(showAddItem === category.id ? null : category.id)}
                        className="w-full bg-purple-100 hover:bg-purple-200 text-purple-darker font-medium px-4 py-3 rounded-xl transition-colors text-sm border-2 border-dashed border-purple-300"
                      >
                        {showAddItem === category.id ? 'Cancel' : '+ Add Item'}
                      </button>

                      {/* Add Item Form */}
                      {showAddItem === category.id && (
                        <form onSubmit={(e) => handleCreateItem(e, category.id)} className="bg-purple-50 rounded-xl p-4 space-y-3">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 placeholder-gray-400 text-sm"
                            autoFocus
                            required
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Quantity"
                              value={newItemQuantity}
                              onChange={(e) => setNewItemQuantity(e.target.value)}
                              className="flex-1 bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 placeholder-gray-400 text-sm"
                            />
                            <select
                              value={newItemUnit}
                              onChange={(e) => setNewItemUnit(e.target.value)}
                              className="bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900 text-sm"
                            >
                              <option value="lbs">lbs</option>
                              <option value="kg">kg</option>
                              <option value="units">units</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
                          >
                            Create Item
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    {/* Item History Modal */}
    {itemHistoryModal.open && (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] shadow-xl p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-purple-darker">Item History</h2>
              <p className="text-sm text-gray-600 mt-1">{itemHistoryModal.item?.name}</p>
            </div>
            <button
              onClick={() => setItemHistoryModal({ 
                open: false, 
                item: null, 
                history: [], 
                currentPage: 1, 
                total: 0,
                limit: 3 
              })}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {itemHistoryModal.history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No history available for this item.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Action</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Details</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-darker uppercase tracking-wider">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {itemHistoryModal.history.map((log) => {
                        const getActionColor = (action) => {
                          switch (action) {
                            case 'created': return 'bg-green-100 text-green-700';
                            case 'added': return 'bg-blue-100 text-blue-700';
                            case 'took': return 'bg-orange-100 text-orange-700';
                            case 'updated': return 'bg-purple-100 text-purple-700';
                            case 'deleted': return 'bg-red-100 text-red-700';
                            default: return 'bg-gray-100 text-gray-700';
                          }
                        };
                        const getActionLabel = (action) => {
                          switch (action) {
                            case 'created': return 'Created';
                            case 'added': return 'Added';
                            case 'took': return 'Took';
                            case 'updated': return 'Updated';
                            case 'deleted': return 'Deleted';
                            default: return action.charAt(0).toUpperCase() + action.slice(1);
                          }
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
                        return (
                          <tr key={log.id} className="hover:bg-purple-50 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                                {getActionLabel(log.action)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-gray-600">
                                {log.details || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="text-xs text-gray-500">
                                {formatDate(log.createdAt)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Pagination for Item History */}
            {itemHistoryModal.total > itemHistoryModal.limit && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => handleViewItemHistory(itemHistoryModal.item, itemHistoryModal.currentPage - 1)}
                  disabled={itemHistoryModal.currentPage === 1}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  ←
                </button>
                <span className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium">
                  Page {itemHistoryModal.currentPage} of {Math.ceil(itemHistoryModal.total / itemHistoryModal.limit)}
                </span>
                <button
                  onClick={() => handleViewItemHistory(itemHistoryModal.item, itemHistoryModal.currentPage + 1)}
                  disabled={itemHistoryModal.currentPage >= Math.ceil(itemHistoryModal.total / itemHistoryModal.limit)}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-darker rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  →
                </button>
                <span className="text-xs text-gray-500 ml-1">
                  ({itemHistoryModal.total} total)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Quantity Modal */}
    {qtyModal.open && (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
        <div className="bg-purple-200 rounded-3xl w-full max-w-md shadow-xl p-6">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-700 mb-1">Item name:</div>
            <div className="text-lg font-semibold text-purple-darker">{qtyModal.item?.name}</div>
          </div>
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setQtyModal({ ...qtyModal, amount: Math.max(1, Number(qtyModal.amount) - 1) })}
              className="w-9 h-9 rounded-full bg-white text-purple-darker text-lg shadow hover:bg-purple-50"
              aria-label="decrease"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={qtyModal.amount}
              onChange={(e) => setQtyModal({ ...qtyModal, amount: e.target.value })}
              className="w-24 text-center bg-white rounded-full border border-purple-soft/50 focus:border-purple-medium focus:ring-2 focus:ring-purple-medium/10 outline-none px-4 py-2 text-gray-900"
            />
            <button
              onClick={() => setQtyModal({ ...qtyModal, amount: Number(qtyModal.amount) + 1 })}
              className="w-9 h-9 rounded-full bg-white text-purple-darker text-lg shadow hover:bg-purple-50"
              aria-label="increase"
            >
              +
            </button>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setQtyModal({ open: false, item: null, mode: 'add', amount: 1 })}
              className="px-5 py-2 rounded-full bg-white text-purple-darker border border-purple-soft shadow hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={applyQuantityChange}
              className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow"
            >
              {qtyModal.mode === 'add' ? 'Add' : 'Take'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

