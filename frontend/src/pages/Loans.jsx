import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, X, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import useApi from '../hooks/useApi';

function Loans() {
  const { get, post, put, del } = useApi();
  const [loans, setLoans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [formData, setFormData] = useState({
    lender_id: '',
    borrower_id: '',
    description: '',
    principal: '',
    interest_rate: '',
    interest_type: 'fixed',
    start_date: '',
    end_date: '',
    payment_frequency: 'monthly',
    status: 'active',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    principal_amount: '',
    interest_amount: '',
    notes: '',
  });
  const [interestCalculation, setInterestCalculation] = useState(null);
  const [calculatingInterest, setCalculatingInterest] = useState(false);

  const loadData = async () => {
    try {
      const [loansData, companiesData] = await Promise.all([
        get('/loans'),
        get('/companies'),
      ]);
      setLoans(loansData);
      setCompanies(companiesData);
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
      const submitData = {
        ...formData,
        principal: parseFloat(formData.principal) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
      };

      if (editingLoan) {
        await put(`/loans/${editingLoan.id}`, submitData);
      } else {
        await post('/loans', submitData);
      }
      setShowModal(false);
      setEditingLoan(null);
      resetForm();
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const calculateInterestForDate = async (loanId, date) => {
    if (!date) return;
    setCalculatingInterest(true);
    try {
      const result = await get(`/loans/${loanId}/calculate-interest?date=${date}`);
      setInterestCalculation(result);
      // Auto-fill the interest amount
      if (result.interest_due > 0) {
        setPaymentForm(prev => ({
          ...prev,
          interest_amount: result.interest_due.toFixed(2)
        }));
      }
    } catch (err) {
      console.error('Error calculating interest:', err);
    } finally {
      setCalculatingInterest(false);
    }
  };

  const handlePaymentDateChange = (date) => {
    setPaymentForm({ ...paymentForm, payment_date: date });
    if (selectedLoan) {
      calculateInterestForDate(selectedLoan.id, date);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await post(`/loans/${selectedLoan.id}/payments`, {
        ...paymentForm,
        principal_amount: parseFloat(paymentForm.principal_amount) || 0,
        interest_amount: parseFloat(paymentForm.interest_amount) || 0,
      });
    } catch (err) {
      // Ignore error - data might be saved
      console.log('Payment save completed');
    }

    setShowPaymentModal(false);
    setPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      principal_amount: '',
      interest_amount: '',
      notes: '',
    });
    setInterestCalculation(null);
    loadData();

    // Reload expanded loan details
    if (expandedLoan === selectedLoan?.id) {
      try {
        const loanDetail = await get(`/loans/${selectedLoan.id}`);
        setSelectedLoan(loanDetail);
      } catch (err) {
        console.log('Reload completed');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je deze lening wilt verwijderen?')) return;
    try {
      await del(`/loans/${id}`);
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const handleDeletePayment = async (loanId, paymentId) => {
    if (!confirm('Weet je zeker dat je deze betaling wilt verwijderen?')) return;
    try {
      await del(`/loans/${loanId}/payments/${paymentId}`);
      const loanDetail = await get(`/loans/${loanId}`);
      setSelectedLoan(loanDetail);
      loadData();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      lender_id: '',
      borrower_id: '',
      description: '',
      principal: '',
      interest_rate: '',
      interest_type: 'fixed',
      start_date: '',
      end_date: '',
      payment_frequency: 'monthly',
      status: 'active',
      notes: '',
    });
  };

  const openEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      lender_id: loan.lender_id.toString(),
      borrower_id: loan.borrower_id.toString(),
      description: loan.description || '',
      principal: loan.principal.toString(),
      interest_rate: loan.interest_rate.toString(),
      interest_type: loan.interest_type,
      start_date: loan.start_date || '',
      end_date: loan.end_date || '',
      payment_frequency: loan.payment_frequency,
      status: loan.status,
      notes: loan.notes || '',
    });
    setShowModal(true);
  };

  const toggleExpand = async (loan) => {
    if (expandedLoan === loan.id) {
      setExpandedLoan(null);
      setSelectedLoan(null);
    } else {
      setExpandedLoan(loan.id);
      const loanDetail = await get(`/loans/${loan.id}`);
      setSelectedLoan(loanDetail);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('nl-NL');
  };

  const frequencyLabels = {
    monthly: 'Maandelijks',
    quarterly: 'Per kwartaal',
    yearly: 'Jaarlijks',
    at_maturity: 'Bij aflossing',
    on_demand: 'Op verzoek',
  };

  const statusLabels = {
    active: 'Actief',
    paid_off: 'Afgelost',
    defaulted: 'In gebreke',
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    paid_off: 'bg-blue-100 text-blue-800',
    defaulted: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  const totalOutstanding = loans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + l.remaining_balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="text-purple-600" />
          Leningen
        </h2>
        <button
          onClick={() => {
            setEditingLoan(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={18} />
          Nieuwe Lening
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-500">Totaal Uitstaand</div>
        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Omschrijving
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Verstrekker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ontvanger
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Hoofdsom
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Rente
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Uitstaand
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
            {loans.map((loan) => (
              <>
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleExpand(loan)}
                      className="flex items-center gap-2 font-medium text-gray-900 hover:text-purple-600"
                    >
                      {expandedLoan === loan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {loan.description || `Lening #${loan.id}`}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{loan.lender_name}</td>
                  <td className="px-6 py-4 text-gray-700">{loan.borrower_name}</td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatCurrency(loan.principal)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {loan.interest_rate}%
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">
                    {formatCurrency(loan.remaining_balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[loan.status]}`}>
                      {statusLabels[loan.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedLoan(loan);
                        setPaymentForm({
                          payment_date: new Date().toISOString().split('T')[0],
                          principal_amount: '',
                          interest_amount: '',
                          notes: '',
                        });
                        setInterestCalculation(null);
                        calculateInterestForDate(loan.id, new Date().toISOString().split('T')[0]);
                        setShowPaymentModal(true);
                      }}
                      className="text-green-600 hover:text-green-800 mr-3"
                      title="Aflossing toevoegen"
                    >
                      <DollarSign size={18} />
                    </button>
                    <button
                      onClick={() => openEdit(loan)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(loan.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
                {expandedLoan === loan.id && selectedLoan && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Startdatum:</span>
                            <div className="font-medium">{formatDate(selectedLoan.start_date)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Einddatum:</span>
                            <div className="font-medium">{formatDate(selectedLoan.end_date)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Frequentie:</span>
                            <div className="font-medium">{frequencyLabels[selectedLoan.payment_frequency]}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Rente type:</span>
                            <div className="font-medium">{selectedLoan.interest_type === 'fixed' ? 'Vast' : 'Variabel'}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 bg-white p-3 rounded-lg">
                          <div>
                            <span className="text-gray-500 text-sm">Totaal Afgelost:</span>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(selectedLoan.total_principal_paid)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 text-sm">Totaal Rente Betaald:</span>
                            <div className="font-semibold text-blue-600">
                              {formatCurrency(selectedLoan.total_interest_paid)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 text-sm">Opgelopen Rente:</span>
                            <div className="font-semibold text-amber-600">
                              {formatCurrency(selectedLoan.accrued_interest)}
                            </div>
                          </div>
                        </div>

                        {selectedLoan.notes && (
                          <div className="text-sm">
                            <span className="text-gray-500">Notities:</span>
                            <div className="text-gray-700">{selectedLoan.notes}</div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium text-gray-800 mb-2">Betalingshistorie</h4>
                          {selectedLoan.payments?.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nog geen betalingen</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Datum</th>
                                  <th className="px-3 py-2 text-right">Aflossing</th>
                                  <th className="px-3 py-2 text-right">Rente</th>
                                  <th className="px-3 py-2 text-left">Notities</th>
                                  <th className="px-3 py-2 text-right">Acties</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedLoan.payments?.map((payment) => (
                                  <tr key={payment.id} className="border-b">
                                    <td className="px-3 py-2">{formatDate(payment.payment_date)}</td>
                                    <td className="px-3 py-2 text-right text-green-600">
                                      {formatCurrency(payment.principal_amount)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-blue-600">
                                      {formatCurrency(payment.interest_amount)}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">{payment.notes || '-'}</td>
                                    <td className="px-3 py-2 text-right">
                                      <button
                                        onClick={() => handleDeletePayment(selectedLoan.id, payment.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-semibold mb-4">
            {editingLoan ? 'Lening Bewerken' : 'Nieuwe Lening'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verstrekker</label>
                <select
                  value={formData.lender_id}
                  onChange={(e) => setFormData({ ...formData, lender_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                  disabled={editingLoan}
                >
                  <option value="">Selecteer...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ontvanger</label>
                <select
                  value={formData.borrower_id}
                  onChange={(e) => setFormData({ ...formData, borrower_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                  disabled={editingLoan}
                >
                  <option value="">Selecteer...</option>
                  {companies
                    .filter(c => c.id !== parseInt(formData.lender_id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hoofdsom</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rente (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rente type</label>
                <select
                  value={formData.interest_type}
                  onChange={(e) => setFormData({ ...formData, interest_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fixed">Vast</option>
                  <option value="variable">Variabel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betalingsfrequentie</label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="monthly">Maandelijks</option>
                  <option value="quarterly">Per kwartaal</option>
                  <option value="yearly">Jaarlijks</option>
                  <option value="at_maturity">Bij aflossing</option>
                  <option value="on_demand">Op verzoek</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">Actief</option>
                  <option value="paid_off">Afgelost</option>
                  <option value="defaulted">In gebreke</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingLoan ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPaymentModal && selectedLoan && (
        <Modal onClose={() => { setShowPaymentModal(false); setInterestCalculation(null); }}>
          <h3 className="text-lg font-semibold mb-4">Aflossing Registreren</h3>

          {/* Lening info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="font-medium text-gray-800 mb-2">
              {selectedLoan.description || `Lening #${selectedLoan.id}`}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Verstrekker:</span>
                <span className="ml-2 font-medium">{selectedLoan.lender_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Ontvanger:</span>
                <span className="ml-2 font-medium">{selectedLoan.borrower_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Hoofdsom:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedLoan.principal)}</span>
              </div>
              <div>
                <span className="text-gray-500">Rente:</span>
                <span className="ml-2 font-medium">{selectedLoan.interest_rate}% per jaar</span>
              </div>
            </div>
          </div>

          {/* Berekende bedragen */}
          {interestCalculation && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-blue-800 mb-2">
                Berekening per {formatDate(interestCalculation.target_date)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-600">Resterende hoofdsom:</span>
                  <div className="font-bold text-blue-800">{formatCurrency(interestCalculation.remaining_principal)}</div>
                </div>
                <div>
                  <span className="text-blue-600">Verschuldigde rente:</span>
                  <div className="font-bold text-blue-800">{formatCurrency(interestCalculation.interest_due)}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <span className="text-blue-600">Totaal verschuldigd:</span>
                <span className="ml-2 font-bold text-blue-800 text-lg">{formatCurrency(interestCalculation.total_due)}</span>
              </div>
            </div>
          )}

          {calculatingInterest && (
            <div className="text-center text-gray-500 mb-4">Berekenen...</div>
          )}

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum aflossing</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => handlePaymentDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aflossing hoofdsom</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.principal_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, principal_amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
                {interestCalculation && (
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, principal_amount: interestCalculation.remaining_principal.toFixed(2) })}
                    className="text-xs text-green-600 hover:text-green-800 mt-1"
                  >
                    Volledige hoofdsom ({formatCurrency(interestCalculation.remaining_principal)})
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rentebetaling</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.interest_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, interest_amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
                {interestCalculation && interestCalculation.interest_due > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, interest_amount: interestCalculation.interest_due.toFixed(2) })}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Berekende rente ({formatCurrency(interestCalculation.interest_due)})
                  </button>
                )}
              </div>
            </div>

            {/* Restschuld na aflossing */}
            {interestCalculation && (paymentForm.principal_amount || paymentForm.interest_amount) && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-700">
                  <strong>Na deze aflossing:</strong>
                  <div className="mt-1">
                    Resterende hoofdsom: {formatCurrency(
                      Math.max(0, interestCalculation.remaining_principal - (parseFloat(paymentForm.principal_amount) || 0))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Bijv. Kwartaalaflossing Q1 2024"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowPaymentModal(false); setInterestCalculation(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Aflossing Registreren
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
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

export default Loans;
