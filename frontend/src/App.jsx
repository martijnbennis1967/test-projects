import { Routes, Route, NavLink } from 'react-router-dom';
import { Building2, GitBranch, Briefcase, CreditCard, LayoutDashboard } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Participations from './pages/Participations';
import Loans from './pages/Loans';
import Structure from './pages/Structure';

function App() {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/companies', icon: Building2, label: 'Vennootschappen' },
    { path: '/participations', icon: Briefcase, label: 'Deelnemingen' },
    { path: '/loans', icon: CreditCard, label: 'Leningen' },
    { path: '/structure', icon: GitBranch, label: 'Structuur' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">VCA Investeringen</h1>
            </div>
            <div className="flex space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/participations" element={<Participations />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/structure" element={<Structure />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
