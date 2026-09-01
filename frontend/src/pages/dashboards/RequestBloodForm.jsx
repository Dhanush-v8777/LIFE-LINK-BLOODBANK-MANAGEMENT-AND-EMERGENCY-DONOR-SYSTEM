import { useState } from 'react';
import api from '../../utils/api';
import { PlusCircle, AlertCircle, Sparkles } from 'lucide-react';
import AddressAutocomplete from '../../components/AddressAutocomplete';

export default function RequestBloodForm({ onFinished }) {
  const [requestForm, setRequestForm] = useState({
    bloodGroup: 'O+',
    component: 'Whole Blood',
    volumeMl: 450,
    urgency: 'Normal',
    patientName: '',
    hospitalName: '',
    deliveryAddress: '',
    requiredDate: '',
    details: ''
  });

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    if (!requestForm.patientName || !requestForm.deliveryAddress || !requestForm.requiredDate) {
      setFormError('Please enter Patient Name, Delivery Address, and Required Date.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await api.post('/requests', requestForm);
      setFormLoading(false);

      if (res.data.success) {
        setFormSuccess(res.data.message);
        // Clear form
        setRequestForm({
          bloodGroup: 'O+',
          component: 'Whole Blood',
          volumeMl: 450,
          urgency: 'Normal',
          patientName: '',
          hospitalName: '',
          deliveryAddress: '',
          requiredDate: '',
          details: ''
        });
        
        if (onFinished) {
          onFinished();
        }
        setTimeout(() => setFormSuccess(''), 5000);
      } else {
        setFormError(res.data.message);
      }
    } catch (err) {
      setFormLoading(false);
      setFormError(err.response?.data?.message || 'Failed to place request');
    }
  };

  return (
    <div className="max-w-xl bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6">
      <div className="flex items-center space-x-2">
        <PlusCircle className="h-6 w-6 text-brand-600" />
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Place Blood Request Requisition</h3>
      </div>

      {formSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl text-xs font-bold flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-green-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="uppercase">Blood Group</label>
            <select
              value={requestForm.bloodGroup}
              onChange={(e) => setRequestForm({...requestForm, bloodGroup: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
            >
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="uppercase">Component</label>
            <select
              value={requestForm.component}
              onChange={(e) => setRequestForm({...requestForm, component: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
            >
              {['Whole Blood', 'Plasma', 'Platelets', 'RBC'].map(comp => <option key={comp} value={comp}>{comp}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="uppercase">Volume (ml)</label>
            <input
              type="number"
              required
              value={requestForm.volumeMl}
              onChange={(e) => setRequestForm({...requestForm, volumeMl: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="uppercase">Urgency Level</label>
            <select
              value={requestForm.urgency}
              onChange={(e) => setRequestForm({...requestForm, urgency: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400 font-semibold"
            >
              <option value="Normal">Normal</option>
              <option value="Emergency">Emergency (Alerts local matching donors)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="uppercase">Patient Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alice Smith"
              value={requestForm.patientName}
              onChange={(e) => setRequestForm({...requestForm, patientName: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="uppercase">Hospital Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. City General Hospital"
              value={requestForm.hospitalName}
              onChange={(e) => setRequestForm({...requestForm, hospitalName: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="uppercase">Required Date</label>
          <input
            type="date"
            required
            value={requestForm.requiredDate}
            onChange={(e) => setRequestForm({...requestForm, requiredDate: e.target.value})}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="uppercase">Delivery Location Address</label>
          <AddressAutocomplete
            required
            rows={2}
            name="deliveryAddress"
            placeholder="Hospital ward, floor, delivery address details"
            value={requestForm.deliveryAddress}
            onChange={(val) => setRequestForm({...requestForm, deliveryAddress: val})}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="uppercase">Medical Case details / Notes (Optional)</label>
          <textarea
            rows="2"
            placeholder="Mention reasons or notes..."
            value={requestForm.details}
            onChange={(e) => setRequestForm({...requestForm, details: e.target.value})}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
          />
        </div>

        <button
          type="submit"
          disabled={formLoading}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl shadow-lg transition font-extrabold uppercase"
        >
          {formLoading ? 'Submitting Requisition...' : 'Place Requisition'}
        </button>
      </form>
    </div>
  );
}
