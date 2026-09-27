import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "https://backend-production-086b.up.railway.app/api"

const STAGES = [
  "New",
  "Contacted",
  "Site Visit",
  "Interested",
  "Negotiation",
  "Booked",
  "Lost",
];

async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
  headers.Authorization = `Bearer ${token}`;
}

  const response = await fetch(API + path, {
    ...options,
    headers,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@crm.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <div className="login">
      <form onSubmit={handleSubmit}>
        <h1>
          Estate<span>CRM</span>
        </h1>

        <p>Real Estate Sales CRM</p>

        {error && <div className="err">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Sign In</button>

        <small>
          Admin: admin@crm.local / admin123
          <br />
          Sales: sales@crm.local / sales123
        </small>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    api("/auth/me")
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <div className="app">
      <aside>
        <h2>
          Estate<span>CRM</span>
        </h2>

        <button
          className={page === "dashboard" ? "on" : ""}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={page === "leads" ? "on" : ""}
          onClick={() => setPage("leads")}
        >
          Leads
        </button>

        <button
          className={page === "properties" ? "on" : ""}
          onClick={() => setPage("properties")}
        >
          Properties
        </button>

        <button
          className={page === "bookings" ? "on" : ""}
          onClick={() => setPage("bookings")}
        >
          Bookings
        </button>

        <footer>
          <strong>{user.name}</strong>
          <br />
          <small>{user.role}</small>

          <button onClick={logout}>Logout</button>
        </footer>
      </aside>

      <main>
        <h1>
          {page.charAt(0).toUpperCase() + page.slice(1)}
        </h1>

        {page === "dashboard" && <Dashboard />}

        {page === "leads" && <Leads />}

        {page === "properties" && (
          <Properties admin={user.role === "ADMIN"} />
        )}

        {page === "bookings" && <Bookings />}
      </main>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="err">{error}</div>;
  }

  if (!data) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <>
      <div className="stats">
        {Object.entries(data.stats || {}).map(([key, value]) => (
          <div key={key}>
            <small>{key.replaceAll("_", " ")}</small>
            <b>{value}</b>
          </div>
        ))}
      </div>

      <section>
        <h3>Lead Pipeline</h3>

        {(data.stages || []).map((item) => (
          <p key={item.stage}>
            {item.stage}: <b>{item.n}</b>
          </p>
        ))}
      </section>

      <section>
        <h3>Upcoming Follow-ups</h3>

        {(data.upcoming_followups || []).map((item, index) => (
          <p key={index}>
            {item.name} — {item.follow_up_date} — {item.stage}
          </p>
        ))}
      </section>
    </>
  );
}
 
function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    source: "",
    notes: "",
    follow_up_date: "",
    stage: "New",
  };

  const [form, setForm] = useState(emptyForm);

  async function loadLeads() {
    try {
      const data = await api(
        "/leads?search=" + encodeURIComponent(search)
      );

      setLeads(data);
    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadLeads();
  }, [search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(lead) {
    setEditingId(lead.id);

    setForm({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      notes: lead.notes || "",
      follow_up_date: lead.follow_up_date || "",
      stage: lead.stage || "New",
    });

    setShowModal(true);
  }

  async function saveLead(e) {
    e.preventDefault();

    try {
      if (editingId) {
        await api(`/leads/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await api("/leads", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }

      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);

      loadLeads();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button onClick={openAdd}>+ Add Lead</button>
      </div>

      <section>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Source</th>
              <th>Follow-up</th>
              <th>Stage</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan="7">No leads found</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>

                  <td>{lead.phone || "-"}</td>

                  <td>{lead.email || "-"}</td>

                  <td>{lead.source || "-"}</td>

                  <td>{lead.follow_up_date || "-"}</td>

                  <td>{lead.stage}</td>

                  <td>
                    <button onClick={() => openEdit(lead)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <Modal
          title={editingId ? "Edit Lead" : "Add Lead"}
          close={() => setShowModal(false)}
        >
          <form onSubmit={saveLead}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              required
            />

            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value,
                })
              }
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />

            <input
              placeholder="Source"
              value={form.source}
              onChange={(e) =>
                setForm({
                  ...form,
                  source: e.target.value,
                })
              }
            />

            <input
              type="date"
              value={form.follow_up_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  follow_up_date: e.target.value,
                })
              }
            />

            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
            />

            <select
              value={form.stage}
              onChange={(e) =>
                setForm({
                  ...form,
                  stage: e.target.value,
                })
              }
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>

            <button type="submit">
              {editingId ? "Update Lead" : "Save Lead"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Properties({ admin }) {
  const [projects, setProjects] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);

  const [tab, setTab] = useState("units");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});

  async function loadProperties() {
    try {
      const [projectData, buildingData, unitData] =
        await Promise.all([
          api("/properties/projects"),
          api("/properties/buildings"),
          api("/properties/units"),
        ]);

      setProjects(projectData);
      setBuildings(buildingData);
      setUnits(unitData);
    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadProperties();
  }, []);

  function openAdd() {
    setForm({});
    setShowModal(true);
  }

  async function saveProperty(e) {
    e.preventDefault();

    try {
      let path = "";

      if (tab === "projects") {
        path = "/properties/projects";
      } else if (tab === "buildings") {
        path = "/properties/buildings";
      } else {
        path = "/properties/units";
      }

      await api(path, {
        method: "POST",
        body: JSON.stringify(form),
      });

      setShowModal(false);
      setForm({});

      loadProperties();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <button
          className={tab === "units" ? "on" : ""}
          onClick={() => setTab("units")}
        >
          Units
        </button>

        <button
          className={tab === "projects" ? "on" : ""}
          onClick={() => setTab("projects")}
        >
          Projects
        </button>

        <button
          className={tab === "buildings" ? "on" : ""}
          onClick={() => setTab("buildings")}
        >
          Buildings
        </button>

        {admin && <button onClick={openAdd}>+ Add</button>}
      </div>

      <section>
        <table>
          <thead>
            {tab === "units" && (
              <tr>
                <th>Project</th>
                <th>Unit</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            )}

            {tab === "projects" && (
              <tr>
                <th>Name</th>
                <th>Location</th>
              </tr>
            )}

            {tab === "buildings" && (
              <tr>
                <th>Project</th>
                <th>Building</th>
                <th>Floors</th>
              </tr>
            )}
          </thead>

          <tbody>
            {tab === "units" &&
              units.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.project_name}</td>
                  <td>{unit.unit_no}</td>
                  <td>{unit.unit_type}</td>
                  <td>
                    ₹{Number(unit.price || 0).toLocaleString("en-IN")}
                  </td>
                  <td>{unit.status}</td>
                </tr>
              ))}

            {tab === "projects" &&
              projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.location || "-"}</td>
                </tr>
              ))}

            {tab === "buildings" &&
              buildings.map((building) => (
                <tr key={building.id}>
                  <td>{building.project_name}</td>
                  <td>{building.name}</td>
                  <td>{building.floors || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
{showModal && (
        <Modal
          title={`Add ${tab}`}
          close={() => setShowModal(false)}
        >
          <form onSubmit={saveProperty}>
            {tab === "projects" && (
              <>
                <input
                  placeholder="Project name"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  required
                />

                <input
                  placeholder="Location"
                  value={form.location || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                    })
                  }
                />
              </>
            )}

            {tab === "buildings" && (
              <>
                <select
                  required
                  value={form.project_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      project_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select project</option>

                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Building name"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  required
                />

                <input
                  type="number"
                  placeholder="Floors"
                  value={form.floors || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      floors: e.target.value,
                    })
                  }
                />
              </>
            )}

            {tab === "units" && (
              <>
                <select
                  required
                  value={form.building_id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      building_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select building</option>

                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.project_name} / {building.name}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Unit number"
                  value={form.unit_no || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit_no: e.target.value,
                    })
                  }
                  required
                />

                <input
                  placeholder="Unit type"
                  value={form.unit_type || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit_type: e.target.value,
                    })
                  }
                  required
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </>
            )}

            <button type="submit">Save</button>
            </form>
        </Modal>
      )}
    </>
  );
}

function Bookings() {
  const [leads, setLeads] = useState([]);
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    lead_id: "",
    unit_id: "",
    amount: "",
  });

  async function loadBookings() {
    try {
      const [leadData, unitData, bookingData] =
        await Promise.all([
          api("/leads"),
          api("/properties/units"),
          api("/bookings"),
        ]);

      setLeads(leadData);

      setUnits(
        unitData.filter(
          (unit) => unit.status === "AVAILABLE"
        )
      );

      setBookings(bookingData);
    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function saveBooking(e) {
    e.preventDefault();

    try {
      await api("/bookings", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setShowModal(false);

      setForm({
        lead_id: "",
        unit_id: "",
        amount: "",
      });

      loadBookings();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <button onClick={() => setShowModal(true)}>
          + New Booking
        </button>
      </div>

      <section>
        <table>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Unit</th>
              <th>Amount</th>
              <th>Booked By</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="4">No bookings found</td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.lead_name}</td>

                  <td>
                    {booking.project_name} /{" "}
                    {booking.building_name} /{" "}
                    {booking.unit_no}
                  </td>

                  <td>
                    ₹
                    {Number(
                      booking.amount || 0
                    ).toLocaleString("en-IN")}
                  </td>

                  <td>{booking.booked_by_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <Modal
          title="New Booking"
          close={() => setShowModal(false)}
        >
          <form onSubmit={saveBooking}>
            <select
              required
              value={form.lead_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  lead_id: e.target.value,
                })
              }
            >
              <option value="">Select lead</option>

              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} — {lead.phone}
                </option>
              ))}
            </select>

            <select
              required
              value={form.unit_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  unit_id: e.target.value,
                })
              }
            >
              <option value="">
                Select available unit
              </option>

              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.project_name} / {unit.unit_no} — ₹
                  {Number(unit.price || 0).toLocaleString(
                    "en-IN"
                  )}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Booking amount"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              required
            />
            <button type="submit">
              Confirm Booking
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, close, children }) {
  return (
    <div className="modal">
      <div>
        <h2>{title}</h2>

        <button type="button" onClick={close}>
          ×
        </button>
      </div>

      {children}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <App />
);
