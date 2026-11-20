# PharmaCare Lite

A deliberately small **MERN** project for the Pharmaceutical Management System assignment
(Roll 10, PCCCS594). It does three things well:

1. **Dashboard** – totals for medicines, stock, low-stock items and revenue.
2. **Medicines** – add, edit, search and delete medicines.
3. **Billing** – create a bill, reduce stock and keep a bill history.

There is no login, no GST calculation and no payment gateway. That keeps the code short
enough to read and explain.

---

## Run it

```bash
cd pharmaceutical-management-system-simple
npm install
npm run dev
```

Open <http://localhost:5173>. The API runs on <http://localhost:5000>.

To run everything from one server instead:

```bash
npm start
```

That builds the React app and serves it from <http://localhost:5000>.

### Demo data

The database is empty on the first run, so eight medicines are inserted automatically.
Low-stock examples: **Amoxicillin 250mg** (8) and **Insulin Glargine** (6).

To wipe everything and recreate the demo medicines:

```bash
npm run seed
```

Stop the API first if it is running, then start it again.

---

## How it works

```text
React (client/src/App.jsx)
        │  axios request to /api/...
        ▼
Express (server/src/index.js)
        │  Mongoose query
        ▼
MongoDB  ──  medicines collection
         └─  sales collection
```

- `App.jsx` has three small screens. The top buttons switch between them.
- When the app opens, it calls `GET /api/summary`, `GET /api/medicines` and `GET /api/sales`.
  The results are stored in React state and rendered.
- Adding or editing a medicine sends `POST` or `PUT` and then reloads the data.
- Creating a bill sends `POST /api/sales`. The server checks the stock, subtracts the
  quantity and saves the bill. The frontend reloads the dashboard and bill list.
- The API uses `/api` routes. In development, Vite forwards `/api` to port 5000. In
  production, Express serves the built React files itself, so one URL is enough.

### The one important piece of logic

`POST /api/sales` in `server/src/index.js`:

```js
const medicine = await Medicine.findOneAndUpdate(
  { _id: medicineId, stock: { $gte: qty } },
  { $inc: { stock: -qty } },
  { new: true }
);
```

The filter only matches when enough stock exists, and the same query subtracts the stock.
So two bills cannot both take the last unit. If saving the bill fails, the stock is added
back.

---

## Project structure

```text
pharmaceutical-management-system-simple/
├── client/
│   ├── index.html
│   ├── vite.config.js          /api proxy to localhost:5000
│   └── src/
│       ├── App.jsx             all three screens
│       ├── api.js              axios instance
│       ├── main.jsx            React entry point
│       └── styles.css          simple responsive CSS
├── server/
│   ├── .env                    port and local MongoDB settings
│   ├── .env.example
│   └── src/
│       ├── index.js            Express app and all API routes
│       ├── database.js         MongoDB connection
│       ├── seed.js             demo medicines
│       ├── db-show.js          print collections
│       ├── db-shell.js         REPL for the live database
│       └── models/
│           ├── Medicine.js
│           └── Sale.js
├── package.json                npm workspaces + scripts
└── README.md
```

### Models

**Medicine**

| Field | Type | Notes |
| --- | --- | --- |
| name | String | required |
| category | String | required |
| price | Number | selling price |
| stock | Number | units available |

**Sale**

| Field | Type | Notes |
| --- | --- | --- |
| billNo | String | generated bill number |
| medicine | ObjectId | reference to Medicine |
| medicineName | String | copied at billing time |
| quantity | Number | units sold |
| price | Number | price per unit |
| total | Number | `price × quantity` |
| customerName | String | defaults to “Walk-in customer” |

`medicineName` and `price` are copied into the bill so old bills still make sense even if
the medicine is renamed or deleted later.

---

## API reference

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| GET | `/api/summary` | Dashboard totals, low-stock list and recent bills |
| GET | `/api/medicines` | List all medicines |
| POST | `/api/medicines` | Add a medicine |
| PUT | `/api/medicines/:id` | Update a medicine |
| DELETE | `/api/medicines/:id` | Delete a medicine |
| GET | `/api/sales` | List all bills, newest first |
| POST | `/api/sales` | Create a bill and reduce stock |

Create a medicine:

```json
{
  "name": "Paracetamol 500mg",
  "category": "Analgesic",
  "price": 25,
  "stock": 100
}
```

Create a bill:

```json
{
  "medicineId": "66f1c2a4e8b1a2c3d4e5f601",
  "quantity": 2,
  "customerName": "Rahul Sharma"
}
```

---

## Database

By default the project uses **mongodb-memory-server**. It starts a real local MongoDB
process and stores the files in `server/.data/mongo`, so data survives restarts. No MongoDB
installation is needed. The MongoDB binary is downloaded once on the first run.

To use your own MongoDB, add this to `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pharma_simple
```

Then restart the API.

### Where the data actually lives

The embedded MongoDB stores its files here:

```text
server/.data/mongo
```

Inside are WiredTiger files such as `collection-*.wt`, `index-*.wt` and
`_mdb_catalog.wt`. These are **binary database files**. Do not open or edit them in a text
editor. Use the app, the API, or a MongoDB client instead.

When the API is running, the database is also available at:

```text
mongodb://127.0.0.1:27018/pharma_simple
```

You can enter that address in MongoDB Compass or `mongosh` if you have one installed.
They are not required for the project.

### View the data from the terminal

With the app running (`npm run dev`), open a second terminal:

```bash
npm run db:show
```

This prints both collections as tables, including stock and bill totals.

### Edit the data from the terminal

```bash
npm run db:shell
```

This opens a Node REPL already connected to the live database. `Medicine` and `Sale` are
available as models.

```js
// See every medicine
await Medicine.find().lean()

// Change one medicine's stock
await Medicine.updateOne(
  { name: 'Paracetamol 500mg' },
  { $set: { stock: 200 } }
)

// Add a medicine directly
await Medicine.create({
  name: 'Aspirin 75mg',
  category: 'Analgesic',
  price: 20,
  stock: 50
})

// Delete all bills
await Sale.deleteMany({})
```

Type `.exit` to leave the shell. If a command accidentally breaks the demo data, run
`npm run seed` to restore the eight demo medicines.

> The embedded database only allows one process to use its files. Keep the app running and
> connect through port `27018`; do not start a second copy of the app at the same time.

---

## What to say in a viva

> This is a MERN pharmacy manager. React handles the interface, Express exposes a REST
> API, and MongoDB stores two collections: medicines and sales. The dashboard calls one
> summary endpoint that calculates totals from the database. The medicines page performs
> CRUD. In the billing page, creating a bill calls `POST /api/sales`, which checks the
> available stock, subtracts it in one atomic MongoDB update, and saves the bill with a
> snapshot of the medicine name and price. The UI then reloads the summary and bill list,
> so the dashboard immediately shows the new revenue and reduced stock. Development runs
> React and Express separately; the production build is served by Express on one port.

### Likely questions

**Why two collections?**
Medicines are the catalogue; sales are historical bills. A bill must keep its own price
and name, so it stores a snapshot instead of only pointing at the current medicine.

**How is stock protected?**
The update condition includes `stock: { $gte: qty }`. If there is not enough stock, the
query does not match and no sale is saved.

**Where is the database connection?**
`server/src/database.js`. If `MONGODB_URI` is set it uses that database; otherwise it starts
the embedded MongoDB.

**Why no login?**
To keep the demo small and focused on the assigned pharmacy workflow. Authentication
would add users, password hashing, tokens and protected routes without changing the core
inventory/billing logic.

**How does search work?**
The search box filters the medicine array already loaded in React. With a larger catalogue
the same filter could move to the API as a MongoDB query.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the API and Vite together |
| `npm start` | Build React and serve everything from Express |
| `npm run build` | Build the React app only |
| `npm run seed` | Reset the database and insert demo medicines |
| `npm run db:show` | Print medicines and bills from the running database |
| `npm run db:shell` | Open a REPL to query or edit the live database |

---

**Paper:** Software Engineering Laboratory using MERN (PCCCS594)
**Assignment:** Roll 10 — Pharmaceutical Management System
