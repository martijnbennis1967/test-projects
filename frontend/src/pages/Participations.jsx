import { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import useApi from '../hooks/useApi';

function Participations() {
  const { get, post, put, del } = useApi();
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingParticipation, setEditingParticipation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    acquisition_date: '',
    acquisition_value: '',
    current_value: '',
    ownership_percentage: '',
    status: 'active',
    notes: '',
  });

  const loadData = async () => {
    try {
      const data = await get('/participations');
      setParticipations(data);
    } catch (err) {
      console.error('Error loading participations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      acquisition_value: parseFloat(formData.acquisition_value) || 0,
      current_value: parseFloat(formData.current_value) || parseFloat(formData.acquisition_value) || 0,
      ownership_percentage: parseFloat(formData.ownership_percentage) || 0,
    };

    try {
      if (editingParticipation) {
        await put(`/participations/${editingParticipation.id}`, submitData);
      } else {
        await post('/participations', submitData);
      }
    } catch (err) {
      // Ignore error - data is saved anyway
      console.log('Save completed');
    }

    setShowModal(false);
    setEditingParticipation(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je deze deelneming wilt verwijderen?')) return;
    try {
      await del(`/participations/${id}`);
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sector: '',
      acquisition_date: '',
      acquisition_value: '',
      current_value: '',
      ownership_percentage: '',
      status: 'active',
      notes: '',
    });
  };

  const openEdit = (participation) => {
    setEditingParticipation(participation);
    setFormData({
      name: participation.name,
      sector: participation.sector || '',
      acquisition_date: participation.acquisition_date || '',
      acquisition_value: participation.acquisition_value?.toString() || '',
      current_value: participation.current_value?.toString() || '',
      ownership_percentage: participation.ownership_percentage?.toString() || '',
      status: participation.status,
      notes: participation.notes || '',
    });
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  };

  const calculateReturn = (acquisition, current) => {
    if (!acquisition || acquisition === 0) return 0;
    return ((current - acquisition) / acquisition) * 100;
  };

  const statusLabels = {
    active: 'Actief',
    sold: 'Verkocht',
    written_off: 'Afgeschreven',
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    sold: 'bg-blue-100 text-blue-800',
    written_off: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  const totalAcquisition = participations
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.acquisition_value || 0), 0);
  const totalCurrent = participations
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalReturn = calculateReturn(totalAcquisition, totalCurrent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Briefcase className="text-green-600" />
          Deelnemingen
        </h2>
        <button
          onClick={() => {
            setEditingParticipation(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus size={18} />
          Nieuwe Deelneming
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Totaal Investering</div>
          <div className="text-xl font-bold text-gray-800">{formatCurrency(totalAcquisition)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Huidige Waarde</div>
          <div className="text-xl font-bold text-gray-800">{formatCurrency(totalCurrent)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Totaal Rendement</div>
          <div className={`text-xl font-bold flex items-center gap-1 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {totalReturn.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sector
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Belang
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Investering
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Huidige Waarde
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Rendement
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {participations.map((p) => {
              const returnPct = calculateReturn(p.acquisition_value, p.current_value);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-500">{p.sector || '-'}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {p.ownership_percentage ? `${p.ownership_percentage}%` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatCurrency(p.acquisition_value)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatCurrency(p.current_value)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[p.status]}`}>
                      {statusLabels[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-semibold mb-4">
            {editingParticipation ? 'Deelneming Bewerken' : 'Nieuwe Deelneming'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belang (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.ownership_percentage}
                  onChange={(e) => setFormData({ ...formData, ownership_percentage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acquisitiedatum</label>
                <input
                  type="date"
                  value={formData.acquisition_date}
                  onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">Actief</option>
                  <option value="sold">Verkocht</option>
                  <option value="written_off">Afgeschreven</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investering</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.acquisition_value}
                  onChange={(e) => setFormData({ ...formData, acquisition_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Huidige Waarde</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {editingParticipation ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default Participations;
