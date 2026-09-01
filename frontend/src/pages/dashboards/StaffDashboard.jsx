import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { 
  PlusSquare, FileSpreadsheet, PlusCircle, 
  AlertTriangle, Trash2, Edit, Heart, CheckCircle, XCircle,
  Clock, Search, Eye, Filter, RefreshCw
} from 'lucide-react';

export default function StaffDashboard({ activeTab }) {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Inventory State & Modals
  const [inventoryList, setInventoryList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUnit, setNewUnit] = useState({ bloodGroup: 'O+', component: 'Whole Blood', volumeMl: 450, units: 1, expiryDate: '' });
  const [editingUnit, setEditingUnit] = useState(null);

  // 2. Collection State
  const [collectionForm, setCollectionForm] = useState({ donorId: '', volumeMl: 450 });

  // 3. Testing Queue State & Modals
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [testResults, setTestResults] = useState({ hiv: 'Negative', hepB: 'Negative', hepC: 'Negative', syphilis: 'Negative' });
  const [testStatus, setTestStatus] = useState('Passed');

  // 5. Blood Bank Requests State
  const [bloodBankRequests, setBloodBankRequests] = useState([]);
  const [bbrLoading, setBbrLoading] = useState(false);
  const [bbrStatusFilter, setBbrStatusFilter] = useState('All');
  const [bbrGroupFilter, setBbrGroupFilter] = useState('All');
  const [bbrSearch, setBbrSearch] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBBR, setSelectedBBR] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [bbrActionLoading, setBbrActionLoading] = useState(false);

  const fetchStaffData = async () => {
    try {
      const res = await api.get('/bloodbanks/dashboard');
      if (res.data && res.data.success) {
        setData(res.data);
      }
      
      const invRes = await api.get('/bloodbanks/inventory');
      if (invRes.data && invRes.data.success) {
        setInventoryList(invRes.data.inventory || []);
      } else {
        setInventoryList([]);
      }
    } catch (err) {
      console.error('Staff dashboard loading error:', err);
      setError('Failed to retrieve blood bank parameters.');
      setInventoryList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchStaffData();
    });
  }, [activeTab]);

  // Fetch Blood Bank Requests
  const fetchBloodBankRequests = async () => {
    setBbrLoading(true);
    try {
      const params = new URLSearchParams();
      if (bbrStatusFilter !== 'All') params.append('status', bbrStatusFilter);
      if (bbrGroupFilter !== 'All') params.append('bloodGroup', bbrGroupFilter);
      if (bbrSearch) params.append('search', bbrSearch);
      const res = await api.get(`/bbr/incoming?${params.toString()}`);
      if (res.data && res.data.success) {
        setBloodBankRequests(res.data.requests || []);
      } else {
        setBloodBankRequests([]);
      }
    } catch (err) {
      console.error('Fetch blood bank requests error:', err);
      setBloodBankRequests([]);
    } finally {
      setBbrLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'blood-requests') {
      fetchBloodBankRequests();
    }
  }, [activeTab, bbrStatusFilter, bbrGroupFilter]);

  const handleBBRStatus = async (requestId, status) => {
    setBbrActionLoading(true);
    try {
      const body = { status };
      if (status === 'Rejected' && rejectReason) body.rejectionReason = rejectReason;
      await api.put(`/bbr/${requestId}/status`, body);
      setSuccess(`Request ${status} successfully`);
      setShowViewModal(false);
      setShowRejectModal(false);
      setRejectReason('');
      fetchBloodBankRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request');
    } finally {
      setBbrActionLoading(false);
    }
  };

  // Handlers
  const handleAddUnit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/bloodbanks/inventory', newUnit);
      if (res.data.success) {
        setSuccess('Blood unit registered in inventory.');
        setShowAddModal(false);
        setNewUnit({ bloodGroup: 'O+', component: 'Whole Blood', volumeMl: 450, units: 1, expiryDate: '' });
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to add blood unit');
    }
  };

  const handleEditUnit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/bloodbanks/inventory/${editingUnit.id}`, {
        bloodGroup: editingUnit.blood_group,
        component: editingUnit.component,
        volumeMl: parseInt(editingUnit.volume_ml),
        units: parseInt(editingUnit.units),
        status: editingUnit.status,
        expiryDate: editingUnit.expiry_date.split('T')[0]
      });
      if (res.data.success) {
        setSuccess('Blood unit details updated successfully.');
        setShowEditModal(false);
        setEditingUnit(null);
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update blood unit');
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!confirm('Are you sure you want to remove this unit?')) return;
    try {
      const res = await api.delete(`/bloodbanks/inventory/${id}`);
      if (res.data.success) {
        setSuccess('Unit removed successfully.');
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to remove unit');
    }
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/bloodbanks/collect', {
        donorId: parseInt(collectionForm.donorId),
        volumeMl: parseInt(collectionForm.volumeMl)
      });
      if (res.data.success) {
        setSuccess(res.data.message);
        setCollectionForm({ donorId: '', volumeMl: 450 });
        fetchStaffData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record donation');
    }
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/bloodbanks/test', {
        donationId: selectedDonation.id,
        testResults,
        status: testStatus
      });
      if (res.data.success) {
        setSuccess('Blood test record logged. Inventory updated.');
        setSelectedDonation(null);
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to log test record');
    }
  };

  const handleCleanExpired = async () => {
    try {
      const res = await api.post('/bloodbanks/clean-expired');
      if (res.data.success) {
        setSuccess(res.data.message);
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to clean expired units');
    }
  };

  // Report downloads trigger
  const handleReportDownload = (reportType, format) => {
    const token = localStorage.getItem('token');
    if (format === 'excel') {
      window.open(`http://localhost:5000/api/reports/excel/${reportType}?token=${token}`, '_blank');
    } else {
      window.open(`http://localhost:5000/api/reports/pdf?type=${reportType}&token=${token}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-semibold">Generating staff metrics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="p-8 text-center text-slate-400 text-sm font-semibold bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          No blood bank profile found. Please contact the administrator to set up your blood bank account.
        </div>
      </div>
    );
  }

  const { expiringUnits = [], completedDonationsWithoutTests = [], stockSummary = [] } = data;

  // Render Dynamic View depending on ActiveTab
  return (
    <div className="space-y-6">
      {/* Alert logs */}
      {success && <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl text-xs font-bold">{success}</div>}
      {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold">{error}</div>}

      {/* 0. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Blood Bank Operations Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Inventory Units</p>
              <h2 className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-2">
                {inventoryList.reduce((acc, item) => acc + item.units, 0)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">All blood units (Available + Reserved)</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiring in 7 Days</p>
              <h2 className={`text-3xl font-black mt-2 ${expiringUnits.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{expiringUnits.length}</h2>
              <p className="text-[10px] text-slate-400 mt-1">Units requiring urgent attention</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Safety Screens</p>
              <h2 className={`text-3xl font-black mt-2 ${completedDonationsWithoutTests.length > 0 ? 'text-blue-600' : 'text-green-600'}`}>{completedDonationsWithoutTests.length}</h2>
              <p className="text-[10px] text-slate-400 mt-1">Donations awaiting blood testing</p>
            </div>
          </div>

          {/* Stock Summary by Blood Group */}
          {data.stockSummary && data.stockSummary.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Available Stock by Blood Group</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.stockSummary.map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-black rounded">{item.blood_group}</span>
                    <p className="text-[10px] text-slate-500 mt-1">{item.component}</p>
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-0.5">{item.total_volume} ml</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 0b. ADD INVENTORY */}
      {activeTab === 'add-inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <PlusSquare className="h-5 w-5 text-brand-600" />
              <span>Register New Blood Unit</span>
            </h3>
          </div>
          <div className="max-w-md bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <p className="text-xs text-slate-500">Register a blood unit directly into inventory. Use "Record Collection" tab to log a donation from a donor first (which then goes to testing before inventory).</p>
            <form onSubmit={handleAddUnit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="uppercase text-[10px]">Blood Group</label>
                  <select 
                    value={newUnit.bloodGroup}
                    onChange={(e) => setNewUnit({...newUnit, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="uppercase text-[10px]">Component Type</label>
                  <select 
                    value={newUnit.component}
                    onChange={(e) => setNewUnit({...newUnit, component: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {['Whole Blood', 'Plasma', 'Platelets', 'RBC'].map(comp => <option key={comp} value={comp}>{comp}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="uppercase text-[10px]">Volume per Unit (ml)</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={newUnit.volumeMl}
                    onChange={(e) => setNewUnit({...newUnit, volumeMl: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="uppercase text-[10px]">Number of Units</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={newUnit.units}
                    onChange={(e) => setNewUnit({...newUnit, units: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="uppercase text-[10px]">Expiry Date (Optional - Calculated automatically if blank)</label>
                <input 
                  type="date"
                  value={newUnit.expiryDate}
                  onChange={(e) => setNewUnit({...newUnit, expiryDate: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs uppercase shadow transition"
              >
                Register Blood Unit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1. STOCK LISTING */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Blood inventory list</h3>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5"
            >
              <PlusSquare className="h-4 w-4" />
              <span>Add Blood Unit</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            {inventoryList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-semibold">No data available</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                    <th className="px-6 py-3">Unit ID</th>
                    <th className="px-6 py-3">Blood Group</th>
                    <th className="px-6 py-3">Component</th>
                    <th className="px-6 py-3">Volume per Unit</th>
                    <th className="px-6 py-3">Units</th>
                    <th className="px-6 py-3">Expiry Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                  {inventoryList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-slate-400 font-mono">#LL-UNIT-{item.id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-black text-[10px]">{item.blood_group}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.component}</td>
                      <td className="px-6 py-4 font-mono">{item.volume_ml} ml</td>
                      <td className="px-6 py-4 font-mono font-bold">{item.units}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.status === 'Available' ? 'bg-green-100 text-green-700' :
                          item.status === 'Reserved' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setEditingUnit(item);
                            setShowEditModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="Edit Unit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUnit(item.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Remove Unit"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add unit inline Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in shadow-2xl">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Register New Blood Unit</h4>
                <form onSubmit={handleAddUnit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Blood Group</label>
                      <select 
                        value={newUnit.bloodGroup}
                        onChange={(e) => setNewUnit({...newUnit, bloodGroup: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Component Type</label>
                      <select 
                        value={newUnit.component}
                        onChange={(e) => setNewUnit({...newUnit, component: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      >
                        {['Whole Blood', 'Plasma', 'Platelets', 'RBC'].map(comp => <option key={comp} value={comp}>{comp}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Volume per Unit (ml)</label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={newUnit.volumeMl}
                        onChange={(e) => setNewUnit({...newUnit, volumeMl: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Units</label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={newUnit.units}
                        onChange={(e) => setNewUnit({...newUnit, units: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="uppercase text-[10px]">Expiry Date (Optional - Leave blank for default calculation)</label>
                    <input 
                      type="date"
                      value={newUnit.expiryDate}
                      onChange={(e) => setNewUnit({...newUnit, expiryDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2 text-xs">
                    <button 
                      type="button" 
                      onClick={() => setShowAddModal(false)}
                      className="w-1/2 py-2 border rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="w-1/2 py-2 bg-brand-600 text-white rounded-xl"
                    >
                      Add Unit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit unit inline Modal */}
          {showEditModal && editingUnit && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in shadow-2xl">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Edit Blood Unit Details</h4>
                <form onSubmit={handleEditUnit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Blood Group</label>
                      <select 
                        value={editingUnit.blood_group}
                        onChange={(e) => setEditingUnit({...editingUnit, blood_group: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Component Type</label>
                      <select 
                        value={editingUnit.component}
                        onChange={(e) => setEditingUnit({...editingUnit, component: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      >
                        {['Whole Blood', 'Plasma', 'Platelets', 'RBC'].map(comp => <option key={comp} value={comp}>{comp}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Volume per Unit (ml)</label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={editingUnit.volume_ml}
                        onChange={(e) => setEditingUnit({...editingUnit, volume_ml: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Units</label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={editingUnit.units}
                        onChange={(e) => setEditingUnit({...editingUnit, units: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Status</label>
                      <select 
                        value={editingUnit.status}
                        onChange={(e) => setEditingUnit({...editingUnit, status: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      >
                        {['Available', 'Reserved', 'Expired'].map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase text-[10px]">Expiry Date</label>
                      <input 
                        type="date"
                        required
                        value={editingUnit.expiry_date ? editingUnit.expiry_date.split('T')[0] : ''}
                        onChange={(e) => setEditingUnit({...editingUnit, expiry_date: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2 text-xs">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUnit(null);
                      }}
                      className="w-1/2 py-2 border rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="w-1/2 py-2 bg-brand-600 text-white rounded-xl"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. COLLECTION */}
      {activeTab === 'collection' && (
        <div className="max-w-md bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
            <PlusCircle className="h-5 w-5 text-brand-600" />
            <span>Record New Blood Donation Collection</span>
          </h3>
          <p className="text-xs text-slate-500">Record donation. Collected units must undergo safety screens in the "Blood Testing Logs" tab before releasing to active inventory stock.</p>
          
          <form onSubmit={handleRecordCollection} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="space-y-1">
              <label className="uppercase">Donor Registry ID</label>
              <input 
                type="number"
                required
                placeholder="e.g. 1 (From Donor ID card)"
                value={collectionForm.donorId}
                onChange={(e) => setCollectionForm({...collectionForm, donorId: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="space-y-1">
              <label className="uppercase">Volume Collected (ml)</label>
              <input 
                type="number"
                required
                value={collectionForm.volumeMl}
                onChange={(e) => setCollectionForm({...collectionForm, volumeMl: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg transition"
            >
              Log Collection & Queue
            </button>
          </form>
        </div>
      )}

      {/* 3. TESTING QUEUE */}
      {activeTab === 'testing' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Safety Screening Queue</h3>
          
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            {completedDonationsWithoutTests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                All collected blood units have been tested and screened. No units in testing queue.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                    <th className="px-6 py-3">Donation ID</th>
                    <th className="px-6 py-3">Donor Name</th>
                    <th className="px-6 py-3">Blood Type</th>
                    <th className="px-6 py-3">Volume</th>
                    <th className="px-6 py-3">Date Collected</th>
                    <th className="px-6 py-3">Screening</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                  {completedDonationsWithoutTests.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-slate-400">#DONATION-{d.id}</td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{d.donor_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-black">{d.blood_group}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">{d.volume_ml} ml</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(d.donation_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedDonation(d)}
                          className="px-3 py-1 bg-brand-600 text-white rounded text-[10px] font-bold shadow hover:bg-brand-700 transition"
                        >
                          Enter Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Test entry modal */}
          {selectedDonation && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in shadow-2xl">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Safety Screen: Donation #{selectedDonation.id} ({selectedDonation.blood_group})
                </h4>
                
                <form onSubmit={handleSubmitTest} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {['hiv', 'hepB', 'hepC', 'syphilis'].map((disease) => (
                    <div key={disease} className="flex justify-between items-center py-1">
                      <span className="uppercase text-[10px]">{disease} Status</span>
                      <select
                        value={testResults[disease]}
                        onChange={(e) => setTestResults({...testResults, [disease]: e.target.value})}
                        className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border rounded-lg border-slate-200 dark:border-slate-700"
                      >
                        <option value="Negative">Negative (Safe)</option>
                        <option value="Positive">Positive (Unsafe)</option>
                      </select>
                    </div>
                  ))}

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <label className="uppercase text-[10px]">Overall Screening Outcome</label>
                    <select
                      value={testStatus}
                      onChange={(e) => setTestStatus(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                    >
                      <option value="Passed">PASSED (Releases to stock)</option>
                      <option value="Failed">FAILED (Incinerate / Cancel)</option>
                    </select>
                  </div>

                  <div className="flex space-x-2 pt-2 text-xs">
                    <button 
                      type="button" 
                      onClick={() => setSelectedDonation(null)}
                      className="w-1/2 py-2 border rounded-xl"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="w-1/2 py-2 bg-brand-600 text-white rounded-xl"
                    >
                      Log Results
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. EXPIRY CONTROLS */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Expiry Management & Warnings</h3>
            <button
              onClick={handleCleanExpired}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Verify & Clean Expiries</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 p-4 rounded-xl text-yellow-800 dark:text-yellow-400">
              <AlertTriangle className="h-6 w-6 shrink-0 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold">Automated Expiry Checks</p>
                <p className="mt-0.5">Clicking the Clean Expiries button queries all available stock units, flags units with expired timestamps, and marks their status as "Expired" to prevent allocation.</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring in next 7 days:</p>
            {expiringUnits.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs font-semibold">No inventory units expiring in the next 7 days.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                    <th className="px-6 py-3">Unit ID</th>
                    <th className="px-6 py-3">Blood Group</th>
                    <th className="px-6 py-3">Component</th>
                    <th className="px-6 py-3">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-semibold">
                  {expiringUnits.map(unit => (
                    <tr key={unit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 text-yellow-600 dark:text-yellow-500">
                      <td className="px-6 py-4 font-mono">#LL-UNIT-{unit.id}</td>
                      <td className="px-6 py-4 font-black">{unit.blood_group}</td>
                      <td className="px-6 py-4">{unit.component}</td>
                      <td className="px-6 py-4 font-bold">{new Date(unit.expiry_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 6. REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            <span>Generate System Reports</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Inventory export */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Inventory Stock Logs</h4>
              <p className="text-xs text-slate-500">Export active components stock, warnings status, expiries log.</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleReportDownload('inventory', 'excel')}
                  className="w-1/2 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg transition"
                >
                  Excel Sheet
                </button>
                <button
                  onClick={() => handleReportDownload('inventory', 'pdf')}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                >
                  PDF Report
                </button>
              </div>
            </div>

            {/* Donors export */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Donor Registry Logs</h4>
              <p className="text-xs text-slate-500">Export active matching donors list, eligibility logs, addresses.</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleReportDownload('donors', 'excel')}
                  className="w-1/2 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg transition"
                >
                  Excel Sheet
                </button>
                <button
                  onClick={() => handleReportDownload('donors', 'pdf')}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                >
                  PDF Report
                </button>
              </div>
            </div>

            {/* Requests export */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Requests Fulfillment Logs</h4>
              <p className="text-xs text-slate-500">Export requests, urgencies list, dispatches records.</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleReportDownload('requests', 'excel')}
                  className="w-1/2 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg transition"
                >
                  Excel Sheet
                </button>
                <button
                  onClick={() => handleReportDownload('requests', 'pdf')}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                >
                  PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          BLOOD REQUESTS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'blood-requests' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Blood Requests</h2>
                <p className="text-red-100 text-sm">Incoming requests from patients</p>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Status filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={bbrStatusFilter}
                  onChange={e => setBbrStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  {['All', 'Pending', 'Accepted', 'Rejected', 'Completed'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {/* Blood group filter */}
              <select
                value={bbrGroupFilter}
                onChange={e => setBbrGroupFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                  <option key={g} value={g}>{g === 'All' ? 'All Groups' : g}</option>
                ))}
              </select>
              {/* Search */}
              <div className="flex items-center flex-1 min-w-[200px] gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search patient name..."
                  value={bbrSearch}
                  onChange={e => setBbrSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchBloodBankRequests()}
                  className="flex-1 text-xs bg-transparent text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                onClick={fetchBloodBankRequests}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {bbrLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <div className="h-6 w-6 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">Loading requests...</span>
              </div>
            ) : bloodBankRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                  <Heart className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-slate-500 font-semibold">No blood requests found</p>
                <p className="text-slate-400 text-xs mt-1">Requests from patients will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Req ID</th>
                      <th className="px-5 py-3">Patient</th>
                      <th className="px-5 py-3">Blood Group</th>
                      <th className="px-5 py-3">Units</th>
                      <th className="px-5 py-3">Required Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-semibold">
                    {bloodBankRequests.map(req => {
                      const statusStyles = {
                        Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        Accepted: 'bg-blue-100 text-blue-700 border-blue-200',
                        Rejected: 'bg-red-100 text-red-700 border-red-200',
                        Completed: 'bg-green-100 text-green-700 border-green-200',
                      };
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="px-5 py-4 text-slate-400 font-mono">#{req.id}</td>
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-slate-800 dark:text-slate-100 font-bold">{req.patient_name}</p>
                              {req.contact_number && <p className="text-slate-400 text-[10px]">{req.contact_number}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-black text-xs">{req.blood_group}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{req.units_required} unit(s)</td>
                          <td className="px-5 py-4 text-slate-500">
                            {new Date(req.required_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[req.status] || statusStyles.Pending}`}>
                              {req.status === 'Pending' && <Clock className="h-3 w-3" />}
                              {req.status === 'Accepted' && <CheckCircle className="h-3 w-3" />}
                              {req.status === 'Rejected' && <XCircle className="h-3 w-3" />}
                              {req.status === 'Completed' && <CheckCircle className="h-3 w-3" />}
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedBBR(req); setShowViewModal(true); }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {req.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleBBRStatus(req.id, 'Accepted')}
                                    disabled={bbrActionLoading}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => { setSelectedBBR(req); setShowRejectModal(true); }}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {req.status === 'Accepted' && (
                                <button
                                  onClick={() => handleBBRStatus(req.id, 'Completed')}
                                  disabled={bbrActionLoading}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition disabled:opacity-50"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Request Details Modal */}
      {showViewModal && selectedBBR && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Request #{selectedBBR.id}</h3>
                <p className="text-red-100 text-xs mt-0.5">Blood Request Details</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                ['Patient Name', selectedBBR.patient_name],
                ['Blood Group', selectedBBR.blood_group],
                ['Units Required', selectedBBR.units_required + ' unit(s)'],
                ['Contact Number', selectedBBR.contact_number],
                ['Hospital', selectedBBR.hospital_name || '—'],
                ['Required Date', new Date(selectedBBR.required_date).toLocaleDateString()],
                ['Status', selectedBBR.status],
                ['Submitted', new Date(selectedBBR.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] w-32 shrink-0">{label}</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold text-right">{value}</span>
                </div>
              ))}
              {selectedBBR.emergency_notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Emergency Notes</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">{selectedBBR.emergency_notes}</p>
                </div>
              )}
              {selectedBBR.rejection_reason && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Rejection Reason</p>
                  <p className="text-xs text-red-800 dark:text-red-300">{selectedBBR.rejection_reason}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedBBR.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleBBRStatus(selectedBBR.id, 'Accepted')}
                      disabled={bbrActionLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      {bbrActionLoading ? 'Processing...' : 'Accept Request'}
                    </button>
                    <button
                      onClick={() => { setShowViewModal(false); setShowRejectModal(true); }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedBBR.status === 'Accepted' && (
                  <button
                    onClick={() => handleBBRStatus(selectedBBR.id, 'Completed')}
                    disabled={bbrActionLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    {bbrActionLoading ? 'Processing...' : 'Mark as Completed'}
                  </button>
                )}
                <button onClick={() => setShowViewModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedBBR && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="bg-red-600 p-5 text-white">
              <h3 className="font-black text-base">Reject Request #{selectedBBR.id}</h3>
              <p className="text-red-100 text-xs mt-0.5">Patient will be notified via email</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Reason for Rejection (Optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Insufficient stock, blood group mismatch..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition">Cancel</button>
                <button
                  onClick={() => handleBBRStatus(selectedBBR.id, 'Rejected')}
                  disabled={bbrActionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                >
                  {bbrActionLoading ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

