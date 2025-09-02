// src/components/AuditorDashboard.jsx
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

const AuditorDashboard = ({ user, onCreateAssociate, onDeleteAssociate, onReviewTransaction, onLogout }) => {
  const [institutionData, setInstitutionData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [associates, setAssociates] = useState([]);

  // UI state for side-by-side actions
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Create inputs
  const [associatePassword, setAssociatePassword] = useState('');
  const [auditorPasswordCreate, setAuditorPasswordCreate] = useState('');

  // Delete inputs
  const [deleteEmpId, setDeleteEmpId] = useState('');
  const [auditorPasswordDelete, setAuditorPasswordDelete] = useState('');

  // Approve inline password
  const [askApprove, setAskApprove] = useState(null); // txId or null
  const [auditorPasswordApprove, setAuditorPasswordApprove] = useState('');

  const [loadingReview, setLoadingReview] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [summaryRes, txRes, assocRes] = await Promise.all([
        axios.get(`${BACKEND}/institutions/${user.institutionId}/summary`),
        axios.get(`${BACKEND}/transactions`),
        axios.get(`${BACKEND}/institutions/${user.institutionId}/associates`)
      ]);
      setInstitutionData(summaryRes.data);
      setTransactions(txRes.data.transactions || []);
      setAssociates(assocRes.data.items || []);

      // Determine onchainId for analytics; reuse tx institutionId if available
      const ocid = txRes.data.transactions?.[0]?.institutionId || null;
      if (ocid) {
        const analyticsRes = await axios.get(`${BACKEND}/analytics/summary?onchainId=${ocid}`);
        setMetrics(analyticsRes.data);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error('Auditor fetchAll failed:', err?.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 2000); // fast polling
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; };
  }, [user.institutionId]);

  // Create associate submit
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!associatePassword || !auditorPasswordCreate) return;
    await onCreateAssociate(associatePassword, auditorPasswordCreate);
    setShowCreate(false);
    setAssociatePassword('');
    setAuditorPasswordCreate('');
    fetchAll();
  };

  // Delete associate submit
  const handleDelete = async (e) => {
    e.preventDefault();
    if (!deleteEmpId || !auditorPasswordDelete) return;
    await onDeleteAssociate(deleteEmpId, auditorPasswordDelete);
    setShowDelete(false);
    setDeleteEmpId('');
    setAuditorPasswordDelete('');
    fetchAll();
  };

  // Approve flow with inline password
  const handleApproveFlow = async (txId) => {
    try {
      setLoadingReview(true);
      if (!auditorPasswordApprove) return;
      await onReviewTransaction(txId, 'Approved', '', auditorPasswordApprove);
      setAskApprove(null);
      setAuditorPasswordApprove('');
      await fetchAll();
    } finally {
      setLoadingReview(false);
    }
  };

  const handleDecision = async (txId, action) => {
    try {
      setLoadingReview(true);
      if (action === 'Approved') {
        setAskApprove(txId); // open inline password UI
      } else {
        await onReviewTransaction(txId, action, '');
        await fetchAll();
      }
    } finally {
      setLoadingReview(false);
    }
  };

  const pending = transactions.filter(t => t.status === 0 || t.status === 3);
  const history = transactions.filter(t => t.status === 1 || t.status === 2);
  const balance = parseFloat(institutionData?.balance || '0');

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="sketch-header">
        <div>
          <h2 className="sketch-title" style={{ fontSize: 24 }}>Auditor Dashboard</h2>
          <div className="sketch-subtitle">
            <strong>Institution:</strong> {institutionData?.institution?.name || '—'} • 
            <strong> ID:</strong> {user?.institutionId || '—'}
          </div>
          <div className="sketch-text-small">
            <strong>Wallet:</strong> {institutionData?.institution?.walletAddress || '—'}
          </div>
        </div>
        <button onClick={onLogout} className="sketch-btn">Logout</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => { setShowCreate(v => !v); setShowDelete(false); }} className="sketch-btn">
          {showCreate ? 'Close create' : 'Create associate'}
        </button>
        <button onClick={() => { setShowDelete(v => !v); setShowCreate(false); }} className="sketch-btn">
          {showDelete ? 'Close delete' : 'Delete associate'}
        </button>
      </div>

      {showCreate && (
        <div className="sketch-card">
          <h3 style={{ marginTop: 0, fontWeight: 400 }}>Create New Associate</h3>
          <form onSubmit={handleCreate} className="sketch-form" style={{ maxWidth: 400 }}>
            <input 
              className="sketch-input" 
              placeholder="New associate password" 
              value={associatePassword} 
              onChange={e => setAssociatePassword(e.target.value)} 
            />
            <input 
              className="sketch-input" 
              placeholder="Auditor password" 
              type="password" 
              value={auditorPasswordCreate} 
              onChange={e => setAuditorPasswordCreate(e.target.value)} 
            />
            <div className="sketch-form-row">
              <button type="submit" className="sketch-btn sketch-btn-primary">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="sketch-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showDelete && (
        <div className="sketch-card">
          <h3 style={{ marginTop: 0, fontWeight: 400 }}>Delete Associate</h3>
          <form onSubmit={handleDelete} className="sketch-form" style={{ maxWidth: 400 }}>
            <select 
              className="sketch-input" 
              value={deleteEmpId} 
              onChange={e => setDeleteEmpId(e.target.value)}
            >
              <option value="">Select associate to delete</option>
              {associates.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
            </select>
            <input 
              className="sketch-input" 
              placeholder="Auditor password" 
              type="password" 
              value={auditorPasswordDelete} 
              onChange={e => setAuditorPasswordDelete(e.target.value)} 
            />
            <div className="sketch-form-row">
              <button type="submit" className="sketch-btn sketch-btn-primary">Delete</button>
              <button type="button" onClick={() => setShowDelete(false)} className="sketch-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="sketch-grid sketch-mb-16">
        <div className="sketch-metric">
          <div className="sketch-metric-value">{balance.toFixed(4)} ETH</div>
          <div className="sketch-metric-label">Available Balance</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{metrics?.totals?.totalRequests || 0}</div>
          <div className="sketch-metric-label">Total Requests</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{metrics?.totals?.approved || 0}</div>
          <div className="sketch-metric-label">Approved</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{metrics?.totals?.declined || 0}</div>
          <div className="sketch-metric-label">Declined</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{metrics?.totals?.pending || 0}</div>
          <div className="sketch-metric-label">Pending</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{(metrics?.financials?.avgMoneyRequested || 0).toFixed(4)}</div>
          <div className="sketch-metric-label">Avg Requested (ETH)</div>
        </div>
        <div className="sketch-metric">
          <div className="sketch-metric-value">{(metrics?.financials?.avgMoneySpent || 0).toFixed(4)}</div>
          <div className="sketch-metric-label">Avg Spent (ETH)</div>
        </div>
        {metrics?.mostExpensive && (
          <div className="sketch-metric">
            <div className="sketch-metric-value">{metrics.mostExpensive.amount}</div>
            <div className="sketch-metric-label">Most Expensive (ETH)</div>
            <div className="sketch-text-small">{metrics.mostExpensive.purpose}</div>
          </div>
        )}
      </div>

      <div className="sketch-card">
        <h3 style={{ marginTop: 0, fontWeight: 400 }}>Pending Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sketch-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
        <tbody>
          {pending.map(tx => (
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
                {askApprove === tx.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      className="sketch-input" 
                      type="password" 
                      placeholder="Password" 
                      value={auditorPasswordApprove} 
                      onChange={e => setAuditorPasswordApprove(e.target.value)}
                      style={{ width: '120px', fontSize: '12px' }}
                    />
                    <button 
                      disabled={loadingReview} 
                      onClick={() => handleApproveFlow(tx.id)}
                      className="sketch-btn sketch-btn-primary"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => { setAskApprove(null); setAuditorPasswordApprove(''); }}
                      className="sketch-btn"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button 
                      disabled={loadingReview} 
                      onClick={() => handleDecision(tx.id, 'Approved')}
                      className="sketch-btn"
                      style={{ fontSize: '12px', padding: '4px 8px', borderColor: 'var(--sketch-success)', color: 'var(--sketch-success)' }}
                    >
                      Approve
                    </button>
                    <button 
                      disabled={loadingReview} 
                      onClick={() => handleDecision(tx.id, 'Declined')}
                      className="sketch-btn"
                      style={{ fontSize: '12px', padding: '4px 8px', borderColor: 'var(--sketch-error)', color: 'var(--sketch-error)' }}
                    >
                      Decline
                    </button>
                    <button 
                      disabled={loadingReview} 
                      onClick={() => handleDecision(tx.id, 'Review')}
                      className="sketch-btn"
                      style={{ fontSize: '12px', padding: '4px 8px', borderColor: 'var(--sketch-warning)', color: 'var(--sketch-warning)' }}
                    >
                      Review
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
          </table>
        </div>
      </div>

      <div className="sketch-card">
        <h3 style={{ marginTop: 0, fontWeight: 400 }}>Transaction History</h3>
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
          {history.map(tx => (
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

      <div className="sketch-card">
        <h3 style={{ marginTop: 0, fontWeight: 400 }}>Current Associates</h3>
        <div style={{ marginTop: 16 }}>
          {associates.length === 0 ? (
            <div className="sketch-text-small">No associates yet. Use "Create associate" to add one.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {associates.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--sketch-border)' }}>
                  <span style={{ fontWeight: 400 }}>{a.id}</span>
                  <button
                    onClick={() => { setShowDelete(true); setDeleteEmpId(a.id); }}
                    className="sketch-btn"
                    style={{ fontSize: '12px', padding: '4px 8px', borderColor: 'var(--sketch-error)', color: 'var(--sketch-error)' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
};

export default AuditorDashboard;
