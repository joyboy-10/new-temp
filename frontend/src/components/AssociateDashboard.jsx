import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

const DetailModal = ({ tx, onClose }) => {
  if (!tx) return null;
  const label = ['Pending','Approved','Declined','Review'][tx.status] || '—';
  return (
    <div className="sketch-modal" onClick={onClose}>
      <div className="sketch-modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, fontWeight: 400 }}>Transaction Details</h3>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <div><strong>Tx ID:</strong> {tx.id}</div>
          <div><strong>Status:</strong> <span className={`sketch-status sketch-status-${['pending','approved','declined','review'][tx.status]}`}>{label}</span></div>
          <div><strong>Receiver:</strong> {tx.receiver}</div>
          <div><strong>Amount (ETH):</strong> {tx.amount}</div>
          <div><strong>Purpose:</strong> {tx.purpose}</div>
          <div><strong>Priority:</strong> {tx.priority}</div>
          <div><strong>Comment:</strong> {tx.comment || '—'}</div>
          <div><strong>Created:</strong> {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</div>
          <div><strong>Decision time:</strong> {tx.reviewedAt ? new Date(tx.reviewedAt).toLocaleString() : '—'}</div>
          <div><strong>Etherscan:</strong> {tx.txHash ? <a className="sketch-link" href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer">{tx.txHash}</a> : '—'}</div>
        </div>
        <button onClick={onClose} className="sketch-btn">Close</button>
      </div>
    </div>
  );
};

const AssociateDashboard = ({ user, onCreateTransaction, onLogout }) => {
  const [showCreateTransaction, setShowCreateTransaction] = useState(false);
  const [transactionData, setTransactionData] = useState({ receiver: '', amountEther: '', purpose: '', deadline: '', priority: 'medium', comment: '' });
  const [institutionData, setInstitutionData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const summaryRes = await axios.get(`${BACKEND}/institutions/${user.institutionId}/summary`);
      setInstitutionData(summaryRes.data);
      const historyRes = await axios.get(`${BACKEND}/transactions`);
      setTransactions(historyRes.data.transactions || []);
      const ocid = historyRes.data.transactions?.[0]?.institutionId || null;
      if (ocid) {
        const analyticsRes = await axios.get(`${BACKEND}/analytics/summary?onchainId=${ocid}`);
        setMetrics(analyticsRes.data);
      }
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; };
  }, [user.institutionId]);

  const handleInputChange = (field, value) => setTransactionData(prev => ({ ...prev, [field]: value }));

  const handleCreateTransactionSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(transactionData.amountEther || '0');
    if (!transactionData.receiver || !transactionData.amountEther || !transactionData.purpose) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      setLoading(true);
      const txPayload = { ...transactionData, deadline: transactionData.deadline ? new Date(transactionData.deadline).toISOString() : null };
      await onCreateTransaction(txPayload);
      await fetchData();
      setTransactionData({ receiver: '', amountEther: '', purpose: '', deadline: '', priority: 'medium', comment: '' });
      setShowCreateTransaction(false);
    } finally {
      setLoading(false);
    }
  };

  const userTransactions = transactions.filter(tx => tx.creatorId === user.id);
  const approvedTransactions = userTransactions.filter(tx => tx.status === 1);
  const totalRequested = userTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
  const totalApproved = approvedTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="sketch-header">
        <div>
          <h2 className="sketch-title" style={{ fontSize: 24 }}>Associate Dashboard</h2>
          <div className="sketch-subtitle">
            <strong>Institution:</strong> {institutionData?.institution?.name} • 
            <strong> ID:</strong> {user?.institutionId}
          </div>
          <div className="sketch-text-small">
            <strong>Wallet:</strong> {institutionData?.institution?.walletAddress || '—'}
          </div>
        </div>
        <button onClick={onLogout} className="sketch-btn">Logout</button>
      </div>

      <div className="sketch-grid sketch-mb-16">
        <div className="sketch-metric">
          <div className="sketch-metric-value">{parseFloat(institutionData?.balance || '0').toFixed(4)} ETH</div>
          <div className="sketch-metric-label">Available Balance</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{userTransactions.length}</div>
          <div className="sketch-metric-label">My Requests</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{approvedTransactions.length}</div>
          <div className="sketch-metric-label">My Approved</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{userTransactions.filter(t => t.status === 2).length}</div>
          <div className="sketch-metric-label">My Declined</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{userTransactions.length ? (totalRequested / userTransactions.length).toFixed(4) : '0.0000'}</div>
          <div className="sketch-metric-label">Avg Requested (ETH)</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{approvedTransactions.length ? (totalApproved / approvedTransactions.length).toFixed(4) : '0.0000'}</div>
          <div className="sketch-metric-label">Avg Approved (ETH)</div>
        </div>
      </div>

      <button onClick={() => setShowCreateTransaction(v => !v)} className="sketch-btn sketch-mb-16">
        {showCreateTransaction ? 'Close' : 'Create transaction'}
      </button>

      {showCreateTransaction && (
        <div className="sketch-card">
          <h3 style={{ marginTop: 0, fontWeight: 400 }}>New Transaction Request</h3>
          <form onSubmit={handleCreateTransactionSubmit} className="sketch-form">
            <input 
              className="sketch-input" 
              placeholder="Receiver address" 
              value={transactionData.receiver} 
              onChange={e => handleInputChange('receiver', e.target.value)} 
            />
            <input 
              className="sketch-input" 
              placeholder="Amount (ETH)" 
              value={transactionData.amountEther} 
              onChange={e => handleInputChange('amountEther', e.target.value)} 
            />
            <input 
              className="sketch-input" 
              placeholder="Purpose" 
              value={transactionData.purpose} 
              onChange={e => handleInputChange('purpose', e.target.value)} 
            />
            <div className="sketch-form-row">
              <input 
                className="sketch-input" 
                type="date" 
                value={transactionData.deadline} 
                onChange={e => handleInputChange('deadline', e.target.value)} 
              />
              <select 
                className="sketch-input" 
                value={transactionData.priority} 
                onChange={e => handleInputChange('priority', e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <textarea 
              className="sketch-input" 
              placeholder="Additional comments..." 
              value={transactionData.comment} 
              onChange={e => handleInputChange('comment', e.target.value)}
              rows="3"
            />
            <button 
              type="submit" 
              disabled={loading} 
              className={`sketch-btn sketch-btn-primary ${loading ? 'sketch-loading' : ''}`}
            >
              Create Transaction
            </button>
          </form>
        </div>
      )}

      <div className="sketch-card">
        <h3 style={{ marginTop: 0, fontWeight: 400 }}>My Transaction History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sketch-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Hash</th>
              </tr>
            </thead>
        <tbody>
          {userTransactions.map(tx => (
            <tr key={tx.id}>
              <td>
                <button 
                  onClick={() => setSelectedTx(tx)} 
                  className="sketch-link"
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', font: 'inherit' }}
                >
                  {tx.id}
                </button>
              </td>
              <td>{tx.receiver}</td>
              <td>{tx.amount}</td>
              <td>{tx.purpose}</td>
              <td>
                <span className={`sketch-status sketch-status-${['pending','approved','declined','review'][tx.status]}`}>
                  {['Pending','Approved','Declined','Review'][tx.status] || '—'}
                </span>
              </td>
              <td>
                {tx.txHash ? (
                  <a className="sketch-link" href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
          </table>
        </div>
      </div>

      <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
};

export default AssociateDashboard;
