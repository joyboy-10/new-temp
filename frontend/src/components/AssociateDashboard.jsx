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
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div><strong>Institution:</strong> {institutionData?.institution?.name}</div>
          <div><strong>ID:</strong> {user?.institutionId}</div>
          <div><strong>Wallet Address:</strong> {institutionData?.institution?.walletAddress || '—'}</div>
        </div>
        <button onClick={onLogout} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '8px 12px' }}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Available Balance</strong><div>{parseFloat(institutionData?.balance || '0').toFixed(4)} ETH</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>My Requests</strong><div>{userTransactions.length}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>My Approved</strong><div>{approvedTransactions.length}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>My Declined</strong><div>{userTransactions.filter(t => t.status === 2).length}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Avg Requested (ETH)</strong><div>{userTransactions.length ? (totalRequested / userTransactions.length).toFixed(4) : '0.0000'}</div></div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}><strong>Avg Approved (ETH)</strong><div>{approvedTransactions.length ? (totalApproved / approvedTransactions.length).toFixed(4) : '0.0000'}</div></div>
      </div>

      <button onClick={() => setShowCreateTransaction(v => !v)} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
        {showCreateTransaction ? 'Close' : 'Create transaction'}
      </button>

      {showCreateTransaction && (
        <form onSubmit={handleCreateTransactionSubmit} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <input placeholder="Receiver address" value={transactionData.receiver} onChange={e => handleInputChange('receiver', e.target.value)} />
          <input placeholder="Amount (ETH)" value={transactionData.amountEther} onChange={e => handleInputChange('amountEther', e.target.value)} />
          <input placeholder="Purpose" value={transactionData.purpose} onChange={e => handleInputChange('purpose', e.target.value)} />
          <input type="date" value={transactionData.deadline} onChange={e => handleInputChange('deadline', e.target.value)} />
          <select value={transactionData.priority} onChange={e => handleInputChange('priority', e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <textarea placeholder="Comment" value={transactionData.comment} onChange={e => handleInputChange('comment', e.target.value)} />
          <button type="submit" disabled={loading} style={{ background: 'black', color: 'white', padding: '10px 12px', borderRadius: 8, border: 0 }}>Create</button>
        </form>
      )}

      <h3>My Transactions</h3>
      <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th>Tx ID</th><th>Receiver</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Hash</th></tr></thead>
        <tbody>
          {userTransactions.map(tx => (
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

      <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
};

export default AssociateDashboard;
