// src/components/AuditorDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

const DetailModal = ({ tx, onClose }) => {
  if (!tx) return null;
  const label = ['Pending','Approved','Declined','Review'][tx.status] || '—';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ maxWidth: 520, margin: '8% auto', background: 'white', borderRadius: 12, padding: 16 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Transaction details</h3>
        <div><strong>Tx ID:</strong> {tx.id}</div>
        <div><strong>Status:</strong> {label}</div>
        <div><strong>Receiver:</strong> {tx.receiver}</div>
        <div><strong>Amount (ETH):</strong> {tx.amount}</div>
        <div><strong>Purpose:</strong> {tx.purpose}</div>
        <div><strong>Priority:</strong> {tx.priority}</div>
        <div><strong>Comment:</strong> {tx.comment || '—'}</div>
        <div><strong>Created:</strong> {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</div>
        <div><strong>Decision time:</strong> {tx.reviewedAt ? new Date(tx.reviewedAt).toLocaleString() : '—'}</div>
        <div><strong>Etherscan:</strong> {tx.txHash ? <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer">{tx.txHash}</a> : '—'}</div>
        <button onClick={onClose} style={{ marginTop: 12, border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: 8, background: 'white' }}>Close</button>
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
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, system-ui, Arial' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div><strong>Institution:</strong> {institutionData?.institution?.name || '—'}</div>
          <div><strong>ID:</strong> {user?.institutionId || '—'}</div>
          <div><strong>Wallet:</strong> {institutionData?.institution?.walletAddress || '—'}</div>
        </div>
        <button onClick={onLogout} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '8px 12px' }}>Logout</button>
      </div>

      {/* Actions toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { setShowCreate(v => !v); setShowDelete(false); }} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '6px 10px' }}>
          {showCreate ? 'Close create' : 'Create associate'}
        </button>
        <button onClick={() => { setShowDelete(v => !v); setShowCreate(false); }} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '6px 10px' }}>
          {showDelete ? 'Close delete' : 'Delete associate'}
        </button>
      </div>

      {/* Create associate panel */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 8, maxWidth: 420, marginBottom: 16 }}>
          <input placeholder="New associate password" value={associatePassword} onChange={e => setAssociatePassword(e.target.value)} />
          <input placeholder="Auditor password" type="password" value={auditorPasswordCreate} onChange={e => setAuditorPasswordCreate(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ background: 'black', color: 'white', borderRadius: 8, padding: '6px 10px', border: 0 }}>Create</button>
            <button type="button" onClick={() => setShowCreate(false)} style={{ border: 0, background: 'transparent' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Delete associate panel */}
      {showDelete && (
        <form onSubmit={handleDelete} style={{ display: 'grid', gap: 8, maxWidth: 420, marginBottom: 16 }}>
          <select value={deleteEmpId} onChange={e => setDeleteEmpId(e.target.value)}>
            <option value="">Select associate</option>
            {associates.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
          </select>
          <input placeholder="Auditor password" type="password" value={auditorPasswordDelete} onChange={e => setAuditorPasswordDelete(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ background: 'black', color: 'white', borderRadius: 8, padding: '6px 10px', border: 0 }}>Delete</button>
            <button type="button" onClick={() => setShowDelete(false)} style={{ border: 0, background: 'transparent' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Available Balance</strong><div>{balance.toFixed(4)} ETH</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Total Requests</strong><div>{metrics?.totals?.totalRequests || 0}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Approved</strong><div>{metrics?.totals?.approved || 0}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Declined</strong><div>{metrics?.totals?.declined || 0}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Pending</strong><div>{metrics?.totals?.pending || 0}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Avg Requested (ETH)</strong><div>{(metrics?.financials?.avgMoneyRequested || 0).toFixed(4)}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Avg Spent (ETH)</strong><div>{(metrics?.financials?.avgMoneySpent || 0).toFixed(4)}</div></div>
        {metrics?.mostExpensive && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
            <strong>Most Expensive (ETH)</strong>
            <div>{metrics.mostExpensive.amount}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{metrics.mostExpensive.purpose}</div>
          </div>
        )}
      </div>

      {/* Pending table */}
      <h3>Pending</h3>
      <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead><tr><th>Tx ID</th><th>Receiver</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {pending.map(tx => (
            <tr key={tx.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td><button onClick={() => setSelectedTx(tx)} style={{ background: 'transparent', border: 0, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>{tx.id}</button></td>
              <td>{tx.receiver}</td>
              <td>{tx.amount}</td>
              <td>{tx.purpose}</td>
              <td>{['Pending','Approved','Declined','Review'][tx.status] || '—'}</td>
              <td>
                {askApprove === tx.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="password" placeholder="Auditor password" value={auditorPasswordApprove} onChange={e => setAuditorPasswordApprove(e.target.value)} />
                    <button disabled={loadingReview} onClick={() => handleApproveFlow(tx.id)}>Confirm</button>
                    <button onClick={() => { setAskApprove(null); setAuditorPasswordApprove(''); }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button disabled={loadingReview} onClick={() => handleDecision(tx.id, 'Approved')}>Approve</button>{' '}
                    <button disabled={loadingReview} onClick={() => handleDecision(tx.id, 'Declined')}>Decline</button>{' '}
                    <button disabled={loadingReview} onClick={() => handleDecision(tx.id, 'Review')}>Review</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* History table */}
      <h3>History</h3>
      <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th>Tx ID</th><th>Receiver</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Tx Hash</th></tr></thead>
        <tbody>
          {history.map(tx => (
            <tr key={tx.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td><button onClick={() => setSelectedTx(tx)} style={{ background: 'transparent', border: 0, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>{tx.id}</button></td>
              <td>{tx.receiver}</td>
              <td>{tx.amount}</td>
              <td>{tx.purpose}</td>
              <td>{['Pending','Approved','Declined','Review'][tx.status] || '—'}</td>
              <td>{tx.txHash ? <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer">Etherscan</a> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Associates list with quick delete access */}
      <div style={{ marginTop: 24 }}>
        <h3>Associates</h3>
        {associates.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 14 }}>No associates yet. Use “Create associate” to add one.</div>
        ) : (
          <ul style={{ marginTop: 8 }}>
            {associates.map(a => (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ minWidth: 90 }}>{a.id}</span>
                <button
                  onClick={() => { setShowDelete(true); setDeleteEmpId(a.id); }}
                  style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '4px 8px' }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
};

export default AuditorDashboard;
