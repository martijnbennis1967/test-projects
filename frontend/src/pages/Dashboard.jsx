import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Briefcase, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import useApi from '../hooks/useApi';

function Dashboard() {
  const { get } = useApi();
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [companies, participations, loans, balanceData] = await Promise.all([
          get('/companies'),
          get('/participations'),
          get('/loans'),
          get('/loans/summary/balances'),
        ]);

        const activeParticipations = participations.filter(p => p.status === 'active');
        const activeLoans = loans.filter(l => l.status === 'active');
        const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remaining_balance, 0);
        const totalInvested = activeParticipations.reduce((sum, p) => sum + p.current_value, 0);

        setStats({
          companies: companies.length,
          participations: activeParticipations.length,
          activeLoans: activeLoans.length,
          totalOutstanding,
          totalInvested,
        });
        setBalances(balanceData);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [get]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
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
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Vennootschappen"
          value={stats?.companies || 0}
          link="/companies"
          color="blue"
        />
        <StatCard
          icon={Briefcase}
          label="Actieve Deelnemingen"
          value={stats?.participations || 0}
          link="/participations"
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Actieve Leningen"
          value={stats?.activeLoans || 0}
          link="/loans"
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Totaal Ge\u00EFnvesteerd"
          value={formatCurrency(stats?.totalInvested)}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            Openstaande Schulden
          </h3>
          {balances.length === 0 ? (
            <p className="text-gray-500">Geen openstaande schulden</p>
          ) : (
            <div className="space-y-3">
              {balances.map((balance, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-700">
                      {balance.borrower_name}
                    </span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="text-gray-600">{balance.lender_name}</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(balance.outstanding_balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Totaal Uitstaand:</span>
              <span className="text-xl font-bold text-red-600">
                {formatCurrency(stats?.totalOutstanding)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Snelle Navigatie
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/participations"
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Briefcase className="text-green-600 mb-2" size={24} />
              <div className="font-medium text-green-700">Deelnemingen Beheren</div>
              <div className="text-sm text-green-600">Voeg toe of bewerk</div>
            </Link>
            <Link
              to="/loans"
              className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <CreditCard className="text-purple-600 mb-2" size={24} />
              <div className="font-medium text-purple-700">Leningen Beheren</div>
              <div className="text-sm text-purple-600">Betalingen registreren</div>
            </Link>
            <Link
              to="/structure"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors col-span-2"
            >
              <Building2 className="text-blue-600 mb-2" size={24} />
              <div className="font-medium text-blue-700">Bekijk Structuur</div>
              <div className="text-sm text-blue-600">
                Visualisatie van vennootschappen en financi\u00EBle relaties
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, link, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const content = (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block hover:shadow-md transition-shadow rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export default Dashboard;
