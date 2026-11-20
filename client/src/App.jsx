import { useEffect, useState } from 'react';
import api from './api.js';

const emptyMedicine = { name: '', category: '', price: '', stock: '' };
const emptyBill = { medicineId: '', quantity: 1, customerName: '' };

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function notify(message) {
    setNotice(message);
    setError('');
  }

  function fail(err, fallback) {
    setError(err?.response?.data?.message || fallback);
    setNotice('');
  }

  async function refresh() {
    try {
      const [summaryRes, medicinesRes, salesRes] = await Promise.all([
        api.get('/summary'),
        api.get('/medicines'),
        api.get('/sales'),
      ]);

      setSummary(summaryRes.data);
      setMedicines(medicinesRes.data);
      setSales(salesRes.data);
    } catch (err) {
      fail(err, 'Could not load data. Is the API running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <div>
            <strong>PharmaCare Lite</strong>
            <small>Simple MERN pharmacy manager</small>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {[
            ['dashboard', 'Dashboard'],
            ['medicines', 'Medicines'],
            ['billing', 'Billing'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={page === key ? 'active' : ''}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {error && (
          <div className="alert error">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="alert success">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setNotice('')}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <p className="empty">Loading…</p>
        ) : page === 'dashboard' ? (
          <Dashboard summary={summary} goTo={setPage} />
        ) : page === 'medicines' ? (
          <Medicines
            medicines={medicines}
            refresh={refresh}
            notify={notify}
            fail={fail}
          />
        ) : (
          <Billing
            medicines={medicines}
            sales={sales}
            refresh={refresh}
            notify={notify}
            fail={fail}
          />
        )}
      </main>

      <footer className="footer">React + Express + MongoDB · Roll 10 · PCCCS594</footer>
    </div>
  );
}

function Dashboard({ summary, goTo }) {
  if (!summary) return <p className="empty">No summary available.</p>;

  const cards = [
    { label: 'Medicines', value: summary.totalMedicines, hint: 'items in catalogue' },
    { label: 'Units in stock', value: summary.totalStock, hint: 'across all medicines' },
    { label: 'Low stock', value: summary.lowStock, hint: '10 units or fewer' },
    {
      label: 'Total revenue',
      value: money(summary.revenue),
      hint: `${summary.totalSales} bill(s) · ${money(summary.todayRevenue)} today`,
    },
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Pharmacy dashboard</h1>
          <p>Stock, sales and low-stock alerts at a glance.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => goTo('billing')}>
          + New bill
        </button>
      </div>

      <section className="stats" aria-label="Summary">
        {cards.map((card) => (
          <article className="stat" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Low stock</h2>
            <span className="tag">{summary.lowStock} item(s)</span>
          </div>

          {summary.lowStockItems.length === 0 ? (
            <p className="empty">Everything is well stocked.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lowStockItems.map((medicine) => (
                    <tr key={medicine._id}>
                      <td>{medicine.name}</td>
                      <td>{medicine.category}</td>
                      <td>
                        <span className="badge low">{medicine.stock} left</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent bills</h2>
            <span className="tag">{money(summary.todayRevenue)} today</span>
          </div>

          {summary.recentSales.length === 0 ? (
            <p className="empty">No bills yet. Create one from the Billing page.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Customer</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentSales.map((sale) => (
                    <tr key={sale._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{sale.billNo}</strong>
                          <small>
                            {sale.medicineName} × {sale.quantity}
                          </small>
                        </div>
                      </td>
                      <td>{sale.customerName}</td>
                      <td>{money(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Medicines({ medicines, refresh, notify, fail }) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyMedicine);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = medicines.filter((medicine) =>
    `${medicine.name} ${medicine.category}`.toLowerCase().includes(query)
  );

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function startEdit(medicine) {
    setEditingId(medicine._id);
    setForm({
      name: medicine.name,
      category: medicine.category,
      price: medicine.price,
      stock: medicine.stock,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyMedicine);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    };

    try {
      if (editingId) {
        await api.put(`/medicines/${editingId}`, payload);
        notify('Medicine updated.');
      } else {
        await api.post('/medicines', payload);
        notify('Medicine added.');
      }

      cancelEdit();
      await refresh();
    } catch (err) {
      fail(err, 'Could not save the medicine.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(medicine) {
    if (!window.confirm(`Delete ${medicine.name}?`)) return;

    try {
      await api.delete(`/medicines/${medicine._id}`);
      if (editingId === medicine._id) cancelEdit();
      notify('Medicine deleted.');
      await refresh();
    } catch (err) {
      fail(err, 'Could not delete the medicine.');
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY</p>
          <h1>Medicines</h1>
          <p>Add, edit and remove the medicines kept in the pharmacy.</p>
        </div>
      </div>

      <form className="card form-card" onSubmit={submit}>
        <div className="card-head">
          <h2>{editingId ? 'Edit medicine' : 'Add medicine'}</h2>
          {editingId && (
            <button type="button" className="btn ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>

        <div className="form-grid">
          <label className="field">
            Name
            <input
              name="name"
              value={form.name}
              onChange={change}
              placeholder="Paracetamol 500mg"
              required
            />
          </label>

          <label className="field">
            Category
            <input
              name="category"
              value={form.category}
              onChange={change}
              placeholder="Analgesic"
              required
            />
          </label>

          <label className="field">
            Price (₹)
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={change}
              placeholder="25"
              required
            />
          </label>

          <label className="field">
            Stock
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={change}
              placeholder="100"
              required
            />
          </label>
        </div>

        <div className="actions">
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update medicine' : 'Add medicine'}
          </button>
        </div>
      </form>

      <section className="card">
        <div className="card-head">
          <h2>Medicine list</h2>
          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or category"
            aria-label="Search medicines"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="empty">No medicines found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((medicine) => (
                  <tr key={medicine._id}>
                    <td>{medicine.name}</td>
                    <td>{medicine.category}</td>
                    <td>{money(medicine.price)}</td>
                    <td>
                      <span className={`badge ${medicine.stock <= 10 ? 'low' : 'ok'}`}>
                        {medicine.stock}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => startEdit(medicine)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={() => remove(medicine)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Billing({ medicines, sales, refresh, notify, fail }) {
  const [form, setForm] = useState(emptyBill);
  const [saving, setSaving] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  const selected = medicines.find((medicine) => medicine._id === form.medicineId);
  const quantity = Number(form.quantity) || 0;
  const total = selected ? selected.price * quantity : 0;

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.medicineId) {
      fail(null, 'Choose a medicine first.');
      return;
    }
    if (selected && quantity > selected.stock) {
      fail(null, `Only ${selected.stock} unit(s) available.`);
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.post('/sales', {
        medicineId: form.medicineId,
        quantity,
        customerName: form.customerName,
      });

      setLastBill(data);
      notify(`Bill ${data.billNo} created for ${money(data.total)}.`);
      setForm(emptyBill);
      await refresh();
    } catch (err) {
      fail(err, 'Could not create the bill.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">POINT OF SALE</p>
          <h1>Billing</h1>
          <p>Choose a medicine, enter the quantity and create a bill.</p>
        </div>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Create a bill</h2>
          </div>

          <form onSubmit={submit}>
            <label className="field">
              Medicine
              <select name="medicineId" value={form.medicineId} onChange={change} required>
                <option value="">Select a medicine</option>
                {medicines.map((medicine) => (
                  <option
                    key={medicine._id}
                    value={medicine._id}
                    disabled={medicine.stock === 0}
                  >
                    {medicine.name} — {money(medicine.price)} ({medicine.stock} left)
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label className="field">
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max={selected?.stock || 1}
                  step="1"
                  value={form.quantity}
                  onChange={change}
                  required
                />
              </label>

              <label className="field">
                Customer (optional)
                <input
                  name="customerName"
                  value={form.customerName}
                  onChange={change}
                  placeholder="Walk-in customer"
                />
              </label>
            </div>

            <div className="bill-preview">
              <div>
                <span>Medicine</span>
                <strong>{selected ? selected.name : 'Not selected'}</strong>
              </div>
              <div>
                <span>Quantity</span>
                <strong>{quantity || 0}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <div className="actions">
              <button className="btn primary" type="submit" disabled={saving || !selected}>
                {saving ? 'Creating…' : 'Create bill'}
              </button>
            </div>
          </form>

          {lastBill && (
            <div className="last-bill">
              <span>Last bill created</span>
              <strong>{lastBill.billNo}</strong>
              <p>
                {lastBill.medicineName} × {lastBill.quantity} · {money(lastBill.total)}
              </p>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent bills</h2>
            <span className="tag">{sales.length} total</span>
          </div>

          {sales.length === 0 ? (
            <p className="empty">No bills yet. Create one on the left.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{sale.billNo}</strong>
                          <small>
                            {sale.medicineName} × {sale.quantity}
                          </small>
                        </div>
                      </td>
                      <td>{sale.customerName}</td>
                      <td>{money(sale.total)}</td>
                      <td>{dateTime(sale.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
