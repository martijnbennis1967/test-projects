import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, X } from 'lucide-react';
import useApi from '../hooks/useApi';

function Companies() {
  const { get, post, put, del } = useApi();
  const [companies, setCompanies] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'holding', description: '' });
  const [ownershipForm, setOwnershipForm] = useState({
    owner_id: '',
    owned_id: '',
    percentage: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const [companiesData, ownershipData] = await Promise.all([
        get('/companies'),
        get('/ownership'),
      ]);
      setCompanies(companiesData);
      setOwnership(ownershipData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await put(`/companies/${editingCompany.id}`, formData);
      } else {
        await post('/companies', formData);
      }
      setShowModal(false);
      setEditingCompany(null);
      setFormData({ name: '', type: 'holding', description: '' });
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const handleOwnershipSubmit = async (e) => {
    e.preventDefault();
    try {
      await post('/ownership', {
        ...ownershipForm,
        percentage: parseFloat(ownershipForm.percentage),
      });
      setShowOwnershipModal(false);
      setOwnershipForm({ owner_id: '', owned_id: '', percentage: '', notes: '' });
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je deze vennootschap wilt verwijderen?')) return;
    try {
      await del(`/companies/${id}`);
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const handleDeleteOwnership = async (id) => {
    if (!confirm('Weet je zeker dat je deze eigendomsrelatie wilt verwijderen?')) return;
    try {
      await del(`/ownership/${id}`);
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const openEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      type: company.type,
      description: company.description || '',
    });
    setShowModal(true);
  };

  const typeLabels = {
    holding: 'Holding',
    investment: 'Investeringsbedrijf',
    participation: 'Deelneming',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building2 className="text-blue-600" />
          Vennootschappen
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOwnershipModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={18} />
            Eigendomsrelatie
          </button>
          <button
            onClick={() => {
              setEditingCompany(null);
              setFormData({ name: '', type: 'holding', description: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Nieuwe Vennootschap
          </button>
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
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Beschrijving
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.type === 'holding'
                        ? 'bg-blue-100 text-blue-800'
                        : company.type === 'investment'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {typeLabels[company.type]}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{company.description || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEdit(company)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Eigendomsrelaties</h3>
        {ownership.length === 0 ? (
          <p className="text-gray-500">Geen eigendomsrelaties gedefinieerd</p>
        ) : (
          <div className="space-y-2">
            {ownership.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{rel.owner_name}</span>
                  <span className="text-gray-500 mx-2">bezit</span>
                  <span className="font-semibold text-blue-600">{rel.percentage}%</span>
                  <span className="text-gray-500 mx-2">van</span>
                  <span className="font-medium">{rel.owned_name}</span>
                </div>
                <button
                  onClick={() => handleDeleteOwnership(rel.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-semibold mb-4">
            {editingCompany ? 'Vennootschap Bewerken' : 'Nieuwe Vennootschap'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="holding">Holding</option>
                <option value="investment">Investeringsbedrijf</option>
                <option value="participation">Deelneming</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCompany ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showOwnershipModal && (
        <Modal onClose={() => setShowOwnershipModal(false)}>
          <h3 className="text-lg font-semibold mb-4">Nieuwe Eigendomsrelatie</h3>
          <form onSubmit={handleOwnershipSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eigenaar</label>
              <select
                value={ownershipForm.owner_id}
                onChange={(e) =>
                  setOwnershipForm({ ...ownershipForm, owner_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecteer...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bezit aandelen in
              </label>
              <select
                value={ownershipForm.owned_id}
                onChange={(e) =>
                  setOwnershipForm({ ...ownershipForm, owned_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecteer...</option>
                {companies
                  .filter((c) => c.id !== parseInt(ownershipForm.owner_id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={ownershipForm.percentage}
                onChange={(e) =>
                  setOwnershipForm({ ...ownershipForm, percentage: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notities
              </label>
              <textarea
                value={ownershipForm.notes}
                onChange={(e) =>
                  setOwnershipForm({ ...ownershipForm, notes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOwnershipModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Toevoegen
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
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

export default Companies;
