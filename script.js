// =====================
// Phase 4: Storage + Seed
// =====================
const STORAGE_KEY = "ipt_demo_v1"; // guide key
let currentUser = null;

window.db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("No storage yet");

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.accounts) throw new Error("Corrupt");

    window.db = parsed;
  } catch (e) {
    // Seed data (guide mentions: 1 admin + 2 departments)
    window.db = {
      accounts: [
        {
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
          password: "Password123!",
          role: "Admin",
          verified: true
        }
      ],
      departments: [
        { id: "eng", name: "Engineering", description: "Software team" },
        { id: "hr", name: "HR", description: "Human Resources" }
      ],
      employees: [],
      requests: []
    };
    saveToStorage();
  }
}

// =====================
// Helpers
// =====================
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function navigateTo(hash) {
  window.location.hash = hash;
}

function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;

  document.body.classList.toggle("authenticated", !!currentUser);
  document.body.classList.toggle("not-authenticated", !currentUser);

  const isAdmin = !!currentUser && currentUser.role === "Admin";
  document.body.classList.toggle("is-admin", isAdmin);

  $("#nav-username").textContent = currentUser ? `${currentUser.firstName}` : "User";
}

function requireAuth(route) {
  const protectedRoutes = ["#/profile", "#/requests", "#/accounts", "#/departments", "#/employees"];
  if (protectedRoutes.includes(route) && !currentUser) {
    navigateTo("#/login");
    return true;
  }
  return false;
}

function requireAdmin(route) {
  const adminRoutes = ["#/accounts", "#/departments", "#/employees"];
  if (adminRoutes.includes(route)) {
    if (!currentUser) { navigateTo("#/login"); return true; }
    if (currentUser.role !== "Admin") { navigateTo("#/profile"); return true; }
  }
  return false;
}

function showPage(pageId) {
  $all(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");
}

// =====================
// Phase 2: Router
// =====================
function handleRouting() {
  const hash = window.location.hash || "#/";
  if (!window.location.hash) navigateTo("#/");

  // guards
  if (requireAuth(hash)) return;
  if (requireAdmin(hash)) return;

  switch (hash) {
    case "#/":
      showPage("home-page");
      break;

    case "#/register":
      showPage("register-page");
      $("#register-error").textContent = "";
      break;

    case "#/verify-email":
      showPage("verify-email-page");
      {
        const email = localStorage.getItem("unverified_email") || "(unknown)";
        $("#verify-msg").textContent = `A verification link has been sent to ${email}.`;
      }
      break;

    case "#/login":
      showPage("login-page");
      $("#login-error").textContent = "";
      break;

    case "#/profile":
      showPage("profile-page");
      renderProfile();
      break;

    case "#/accounts":
      showPage("accounts-page");
      renderAccountsList();
      break;

    case "#/departments":
      showPage("departments-page");
      renderDepartments();
      break;

    case "#/employees":
      showPage("employees-page");
      renderEmployees();
      break;

    case "#/requests":
      showPage("requests-page");
      renderRequests();
      break;

    default:
      showPage("home-page");
  }
}

window.addEventListener("hashchange", handleRouting);

// =====================
// Phase 3: Auth
// =====================
function findAccountByEmail(email) {
  return window.db.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
}

function initAuthFromToken() {
  const tokenEmail = localStorage.getItem("auth_token");
  if (!tokenEmail) return;

  const acc = findAccountByEmail(tokenEmail);
  if (acc && acc.verified) setAuthState(true, acc);
}

$("#btn-logout").addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  navigateTo("#/");
});

// Register
$("#register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#register-error").textContent = "";

  const fd = new FormData(e.target);
  const firstName = (fd.get("firstName") || "").trim();
  const lastName  = (fd.get("lastName") || "").trim();
  const email     = (fd.get("email") || "").trim();
  const password  = (fd.get("password") || "").trim();

  if (password.length < 6) {
    $("#register-error").textContent = "Password must be at least 6 characters.";
    return;
  }
  if (findAccountByEmail(email)) {
    $("#register-error").textContent = "Email already exists.";
    return;
  }

  window.db.accounts.push({
    firstName, lastName, email, password,
    role: "User",
    verified: false
  });

  saveToStorage();
  localStorage.setItem("unverified_email", email);
  e.target.reset();
  navigateTo("#/verify-email");
});

// Simulated email verification
$("#btn-sim-verify").addEventListener("click", () => {
  const email = localStorage.getItem("unverified_email");
  if (!email) return navigateTo("#/login");

  const acc = findAccountByEmail(email);
  if (!acc) return navigateTo("#/register");

  acc.verified = true;
  saveToStorage();
  localStorage.removeItem("unverified_email");
  navigateTo("#/login");
});

// Login
$("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#login-error").textContent = "";

  const fd = new FormData(e.target);
  const email = (fd.get("email") || "").trim();
  const password = (fd.get("password") || "").trim();

  const acc = window.db.accounts.find(a =>
    a.email.toLowerCase() === email.toLowerCase() &&
    a.password === password &&
    a.verified === true
  );

  if (!acc) {
    $("#login-error").textContent = "Invalid credentials or email not verified.";
    return;
  }

  localStorage.setItem("auth_token", acc.email);
  setAuthState(true, acc);
  e.target.reset();
  navigateTo("#/profile");
});

// =====================
// Phase 5: Profile
// =====================
function renderProfile() {
  if (!currentUser) return;

  $("#profile-body").innerHTML = `
    <div class="fw-semibold">${currentUser.firstName} ${currentUser.lastName}</div>
    <div>Email: ${currentUser.email}</div>
    <div>Role: ${currentUser.role}</div>
    <button class="btn btn-outline-primary btn-sm mt-3" id="btn-edit-profile">Edit Profile</button>
  `;

  $("#btn-edit-profile").addEventListener("click", () => {
    alert("Edit profile (optional).");
  });
}

// =====================
// Phase 6: Admin - Accounts (CRUD-lite)
// =====================
function renderAccountsList() {
  const tbody = $("#accounts-tbody");
  tbody.innerHTML = "";

  for (const a of window.db.accounts) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.firstName} ${a.lastName}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.verified ? "✔" : "—"}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" data-act="edit" data-email="${a.email}">Edit</button>
        <button class="btn btn-sm btn-outline-warning" data-act="reset" data-email="${a.email}">Reset PW</button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-email="${a.email}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function openAccountForm(mode, account = null) {
  $("#account-error").textContent = "";
  $("#account-form-card").style.display = "block";
  $("#account-form-title").textContent = mode === "create" ? "Add Account" : "Edit Account";

  const form = $("#account-form");
  form.mode.value = mode;

  if (mode === "create") {
    form.emailOriginal.value = "";
    form.firstName.value = "";
    form.lastName.value = "";
    form.email.value = "";
    form.password.value = "";
    form.role.value = "User";
    form.verified.checked = false;
  } else {
    form.emailOriginal.value = account.email;
    form.firstName.value = account.firstName;
    form.lastName.value = account.lastName;
    form.email.value = account.email;
    form.password.value = "";
    form.role.value = account.role;
    form.verified.checked = !!account.verified;
  }
}

function closeAccountForm() {
  $("#account-form-card").style.display = "none";
}

$("#btn-add-account").addEventListener("click", () => openAccountForm("create"));

$("#btn-cancel-account").addEventListener("click", closeAccountForm);

$("#accounts-tbody").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const email = btn.dataset.email;
  const act = btn.dataset.act;
  const acc = findAccountByEmail(email);
  if (!acc) return;

  if (act === "edit") {
    openAccountForm("edit", acc);
  }
  if (act === "reset") {
    const newPw = prompt("New password (min 6):");
    if (!newPw) return;
    if (newPw.length < 6) return alert("Too short.");
    acc.password = newPw;
    saveToStorage();
    alert("Password updated.");
  }
  if (act === "del") {
    if (currentUser && email.toLowerCase() === currentUser.email.toLowerCase()) {
      return alert("You cannot delete your own account.");
    }
    if (!confirm(`Delete account ${email}?`)) return;
    window.db.accounts = window.db.accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase());
    saveToStorage();
    renderAccountsList();
  }
});

$("#account-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#account-error").textContent = "";

  const fd = new FormData(e.target);
  const mode = fd.get("mode");
  const emailOriginal = (fd.get("emailOriginal") || "").trim();

  const firstName = (fd.get("firstName") || "").trim();
  const lastName = (fd.get("lastName") || "").trim();
  const email = (fd.get("email") || "").trim();
  const password = (fd.get("password") || "").trim();
  const role = fd.get("role");
  const verified = fd.get("verified") === "on";

  if (mode === "create") {
    if (findAccountByEmail(email)) {
      $("#account-error").textContent = "Email already exists.";
      return;
    }
    if (password.length < 6) {
      $("#account-error").textContent = "Password must be at least 6 characters.";
      return;
    }
    window.db.accounts.push({ firstName, lastName, email, password, role, verified });
  } else {
    const acc = findAccountByEmail(emailOriginal);
    if (!acc) return;

    // if email changes, ensure uniqueness
    if (email.toLowerCase() !== emailOriginal.toLowerCase() && findAccountByEmail(email)) {
      $("#account-error").textContent = "Email already exists.";
      return;
    }

    acc.firstName = firstName;
    acc.lastName = lastName;
    acc.email = email;
    acc.role = role;
    acc.verified = verified;

    if (password) {
      if (password.length < 6) {
        $("#account-error").textContent = "Password must be at least 6 characters.";
        return;
      }
      acc.password = password;
    }

    // If admin edited the logged-in user email, keep token consistent
    if (currentUser && emailOriginal.toLowerCase() === currentUser.email.toLowerCase()) {
      localStorage.setItem("auth_token", email);
      currentUser = acc;
      setAuthState(true, acc);
    }
  }

  saveToStorage();
  closeAccountForm();
  renderAccountsList();
});

// =====================
// Phase 6: Admin - Departments
// =====================
function renderDepartments() {
  const tbody = $("#departments-tbody");
  tbody.innerHTML = "";

  for (const d of window.db.departments) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.description}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" data-act="edit" data-id="${d.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${d.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

$("#btn-add-dept").addEventListener("click", () => {
  // guide says "Not implemented" is OK
  alert("Add Department (not implemented yet).");
});

$("#departments-tbody").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const act = btn.dataset.act;
  const dept = window.db.departments.find(d => d.id === id);
  if (!dept) return;

  if (act === "edit") {
    const name = prompt("Department name:", dept.name);
    if (!name) return;
    const desc = prompt("Description:", dept.description) ?? dept.description;
    dept.name = name;
    dept.description = desc;
    saveToStorage();
    renderDepartments();
  }
  if (act === "del") {
    if (!confirm("Delete this department?")) return;
    window.db.departments = window.db.departments.filter(d => d.id !== id);
    saveToStorage();
    renderDepartments();
  }
});

// =====================
// Phase 6: Admin - Employees
// =====================
function refreshDeptSelect() {
  const sel = $("#emp-dept-select");
  sel.innerHTML = "";
  for (const d of window.db.departments) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  }
}

function renderEmployees() {
  refreshDeptSelect();

  const tbody = $("#employees-tbody");
  tbody.innerHTML = "";

  for (const emp of window.db.employees) {
    const dept = window.db.departments.find(d => d.id === emp.deptId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.empId}</td>
      <td>${emp.userEmail}</td>
      <td>${emp.position}</td>
      <td>${dept ? dept.name : "—"}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${emp.empId}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function openEmpForm() {
  $("#emp-error").textContent = "";
  $("#emp-form-card").style.display = "block";
  $("#emp-form").reset();
  refreshDeptSelect();
}

function closeEmpForm() {
  $("#emp-form-card").style.display = "none";
}

$("#btn-add-emp").addEventListener("click", openEmpForm);
$("#btn-cancel-emp").addEventListener("click", closeEmpForm);

$("#emp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#emp-error").textContent = "";

  const fd = new FormData(e.target);
  const empId = (fd.get("empId") || "").trim();
  const userEmail = (fd.get("userEmail") || "").trim();
  const position = (fd.get("position") || "").trim();
  const deptId = fd.get("deptId");
  const hireDate = fd.get("hireDate");

  if (window.db.employees.some(x => x.empId === empId)) {
    $("#emp-error").textContent = "Employee ID already exists.";
    return;
  }
  if (!findAccountByEmail(userEmail)) {
    $("#emp-error").textContent = "User email not found in Accounts.";
    return;
  }

  window.db.employees.push({ empId, userEmail, position, deptId, hireDate });
  saveToStorage();
  closeEmpForm();
  renderEmployees();
});

$("#employees-tbody").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.act !== "del") return;

  const empId = btn.dataset.id;
  if (!confirm("Delete this employee?")) return;
  window.db.employees = window.db.employees.filter(x => x.empId !== empId);
  saveToStorage();
  renderEmployees();
});

// =====================
// Phase 7: Requests (simple prompt-based UI)
// =====================
function badgeClass(status) {
  if (status === "Approved") return "bg-success";
  if (status === "Rejected") return "bg-danger";
  return "bg-warning text-dark";
}

function renderRequests() {
  const tbody = $("#requests-tbody");
  tbody.innerHTML = "";

  const my = window.db.requests.filter(r => r.employeeEmail === currentUser.email);

  for (const r of my) {
    const itemsText = r.items.map(i => `${i.name} (x${i.qty})`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.type}</td>
      <td>${itemsText}</td>
      <td><span class="badge ${badgeClass(r.status)}">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

$("#btn-new-request").addEventListener("click", () => {
  if (!currentUser) return navigateTo("#/login");

  const type = prompt("Request type: Equipment, Leave, Resources", "Equipment");
  if (!type) return;

  // simple items entry (you can later replace this with a Bootstrap modal + dynamic fields like the guide)
  const itemName = prompt("Item name (required):");
  if (!itemName) return alert("At least one item is required.");

  const qtyStr = prompt("Quantity:", "1");
  const qty = Math.max(1, parseInt(qtyStr || "1", 10) || 1);

  const req = {
    type,
    items: [{ name: itemName, qty }],
    status: "Pending",
    date: new Date().toLocaleDateString(),
    employeeEmail: currentUser.email
  };

  window.db.requests.push(req);
  saveToStorage();
  renderRequests();
});

// =====================
// Init
// =====================
loadFromStorage();
initAuthFromToken();

if (!window.location.hash) navigateTo("#/");
handleRouting();