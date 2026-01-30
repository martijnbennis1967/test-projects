import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, RefreshCw } from 'lucide-react';
import useApi from '../hooks/useApi';

// Custom node component for companies
function CompanyNode({ data }) {
  const typeColors = {
    holding: 'border-blue-500 bg-blue-50',
    investment: 'border-purple-500 bg-purple-50',
    participation: 'border-green-500 bg-green-50',
  };

  const typeLabels = {
    holding: 'Holding',
    investment: 'Investeringsbedrijf',
    participation: 'Deelneming',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[150px] ${typeColors[data.type] || 'border-gray-300 bg-white'}`}>
      <div className="font-bold text-gray-800 text-center">{data.label}</div>
      <div className="text-xs text-gray-500 text-center mt-1">{typeLabels[data.type]}</div>
      {data.totalOwned !== undefined && (
        <div className="text-xs text-gray-600 text-center mt-2 border-t pt-2">
          Eigendom: {data.totalOwned.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// Custom node component for participations
function ParticipationNode({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="px-4 py-3 rounded-lg border-2 border-amber-500 bg-amber-50 shadow-md min-w-[150px]">
      <div className="font-bold text-gray-800 text-center">{data.label}</div>
      <div className="text-xs text-gray-500 text-center mt-1">{data.sector || 'Deelneming'}</div>
      {data.ownership && (
        <div className="text-xs text-amber-700 text-center mt-1">{data.ownership}% belang</div>
      )}
      {data.value && (
        <div className="text-xs text-gray-600 text-center mt-2 border-t pt-2">
          {formatCurrency(data.value)}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  company: CompanyNode,
  participation: ParticipationNode,
};

function Structure() {
  const { get } = useApi();
  const [companies, setCompanies] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [loans, setLoans] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoans, setShowLoans] = useState(true);
  const [showParticipations, setShowParticipations] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadData = async () => {
    try {
      const [companiesData, ownershipData, loansData, participationsData] = await Promise.all([
        get('/companies'),
        get('/ownership'),
        get('/loans?status=active'),
        get('/participations?status=active'),
      ]);
      setCompanies(companiesData);
      setOwnership(ownershipData);
      setLoans(loansData);
      setParticipations(participationsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Build graph when data changes
  useEffect(() => {
    if (companies.length === 0) return;

    const newNodes = [];
    const newEdges = [];

    // Calculate total ownership for each company
    const ownershipMap = {};
    ownership.forEach(o => {
      if (!ownershipMap[o.owned_id]) {
        ownershipMap[o.owned_id] = 0;
      }
      ownershipMap[o.owned_id] += o.percentage;
    });

    // Find VCA (investment company) as the central node
    const vcaCompany = companies.find(c => c.type === 'investment');
    const holdingCompanies = companies.filter(c => c.type === 'holding');

    // Position holding companies at the top
    holdingCompanies.forEach((company, index) => {
      const xOffset = (index - (holdingCompanies.length - 1) / 2) * 250;
      newNodes.push({
        id: `company-${company.id}`,
        type: 'company',
        position: { x: 400 + xOffset, y: 50 },
        data: {
          label: company.name,
          type: company.type,
        },
      });
    });

    // Position VCA in the middle
    if (vcaCompany) {
      newNodes.push({
        id: `company-${vcaCompany.id}`,
        type: 'company',
        position: { x: 400, y: 200 },
        data: {
          label: vcaCompany.name,
          type: vcaCompany.type,
          totalOwned: ownershipMap[vcaCompany.id] || 0,
        },
      });
    }

    // Add ownership edges
    ownership.forEach((o) => {
      newEdges.push({
        id: `ownership-${o.id}`,
        source: `company-${o.owner_id}`,
        target: `company-${o.owned_id}`,
        label: `${o.percentage}%`,
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        labelStyle: { fill: '#3b82f6', fontWeight: 'bold' },
        labelBgStyle: { fill: 'white' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      });
    });

    // Add loan edges
    if (showLoans) {
      loans.forEach((loan) => {
        newEdges.push({
          id: `loan-${loan.id}`,
          source: `company-${loan.lender_id}`,
          target: `company-${loan.borrower_id}`,
          label: formatCurrency(loan.remaining_balance),
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
          labelStyle: { fill: '#ef4444', fontWeight: 'bold' },
          labelBgStyle: { fill: 'white' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444',
          },
        });
      });
    }

    // Add participation nodes
    if (showParticipations && vcaCompany) {
      const activeParticipations = participations.filter(p => p.status === 'active');
      const participationCount = activeParticipations.length;

      activeParticipations.forEach((p, index) => {
        const angle = (index / participationCount) * Math.PI - Math.PI / 2;
        const radius = 200;
        const xOffset = Math.cos(angle) * radius * 1.5;
        const yOffset = Math.sin(angle) * radius + 150;

        newNodes.push({
          id: `participation-${p.id}`,
          type: 'participation',
          position: { x: 400 + xOffset, y: 350 + yOffset },
          data: {
            label: p.name,
            sector: p.sector,
            ownership: p.ownership_percentage,
            value: p.current_value,
          },
        });

        newEdges.push({
          id: `participation-edge-${p.id}`,
          source: `company-${vcaCompany.id}`,
          target: `participation-${p.id}`,
          label: p.ownership_percentage ? `${p.ownership_percentage}%` : '',
          type: 'smoothstep',
          style: { stroke: '#f59e0b', strokeWidth: 2 },
          labelStyle: { fill: '#f59e0b', fontWeight: 'bold' },
          labelBgStyle: { fill: 'white' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#f59e0b',
          },
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [companies, ownership, loans, participations, showLoans, showParticipations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <GitBranch className="text-blue-600" />
          Structuur Visualisatie
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showLoans}
              onChange={(e) => setShowLoans(e.target.checked)}
              className="rounded"
            />
            <span className="text-red-600">Leningen tonen</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showParticipations}
              onChange={(e) => setShowParticipations(e.target.checked)}
              className="rounded"
            />
            <span className="text-amber-600">Deelnemingen tonen</span>
          </label>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={16} />
            Vernieuwen
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Eigendom</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Leningen (gestreept)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span>Deelnemingen</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'participation') return '#f59e0b';
              const company = companies.find(c => `company-${c.id}` === node.id);
              if (company?.type === 'holding') return '#3b82f6';
              if (company?.type === 'investment') return '#8b5cf6';
              return '#6b7280';
            }}
          />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Vennootschappen</h3>
          <ul className="space-y-1 text-sm">
            {companies.map(c => (
              <li key={c.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  c.type === 'holding' ? 'bg-blue-500' :
                  c.type === 'investment' ? 'bg-purple-500' : 'bg-green-500'
                }`}></span>
                {c.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Actieve Leningen</h3>
          {loans.length === 0 ? (
            <p className="text-sm text-gray-500">Geen actieve leningen</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {loans.map(l => (
                <li key={l.id} className="flex items-center justify-between">
                  <span>{l.lender_name} → {l.borrower_name}</span>
                  <span className="text-red-600 font-medium">{formatCurrency(l.remaining_balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Deelnemingen</h3>
          {participations.length === 0 ? (
            <p className="text-sm text-gray-500">Geen actieve deelnemingen</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {participations.map(p => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-amber-600 font-medium">{formatCurrency(p.current_value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Structure;
