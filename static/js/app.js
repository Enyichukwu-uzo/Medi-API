"use strict";

/* ==========================================
   CONFIGURATION
========================================== */
const API_BASE = "/api";

/* ==========================================
   AUTHENTICATION
========================================== */
const TOKEN_KEY = "medi_api_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}
function isAuthenticated() {
  return Boolean(getToken());
}

/* ==========================================
   API REQUEST HELPER
========================================== */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    removeToken();
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    // Throw so callers don't try to read properties off undefined.
    throw new Error(data.message || "Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || "Something went wrong.");
  }
  return data;
}

/* ==========================================
   ALERTS
========================================== */
function showAlert(element, message, type = "danger") {
  if (!element) return;
  element.className = `alert alert-${type}`;
  element.textContent = message;
  element.classList.remove("d-none");
}
function hideAlert(element) {
  if (!element) return;
  element.classList.add("d-none");
}

/* ==========================================
   HTML ESCAPING
========================================== */
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

/* ==========================================
   SMALL HELPERS
========================================== */
function getInitials(firstName, lastName) {
  const first = firstName ? firstName.charAt(0).toUpperCase() : "";
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return `${first}${last}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return escapeHtml(dateString);
  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* ==========================================
   LOGIN
========================================== */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const alertBox = document.getElementById("loginAlert");
    const button = document.getElementById("loginButton");
    const buttonText = document.getElementById("loginButtonText");
    const spinner = document.getElementById("loginSpinner");

    hideAlert(alertBox);
    button.disabled = true;
    buttonText.textContent = "Signing in...";
    spinner.classList.remove("d-none");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveToken(data.access_token);
      showAlert(alertBox, "Login successful. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      showAlert(alertBox, error.message);
      button.disabled = false;
      buttonText.textContent = "Sign in";
      spinner.classList.add("d-none");
    }
  });
}

/* ==========================================
   PASSWORD VISIBILITY TOGGLES
========================================== */
function setupPasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;

  button.addEventListener("click", function () {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    const icon = button.querySelector("i");
    if (icon) {
      icon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
    }
  });
}
setupPasswordToggle("togglePassword", "password");
setupPasswordToggle("toggleRegisterPassword", "password");

/* ==========================================
   REGISTER
========================================== */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const alertBox = document.getElementById("registerAlert");
    const button = document.getElementById("registerButton");
    const buttonText = document.getElementById("registerButtonText");
    const spinner = document.getElementById("registerSpinner");

    hideAlert(alertBox);

    if (password !== confirmPassword) {
      showAlert(alertBox, "Passwords do not match.");
      return;
    }

    button.disabled = true;
    buttonText.textContent = "Creating account...";
    spinner.classList.remove("d-none");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      showAlert(alertBox, "Account created successfully. Redirecting to login...", "success");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (error) {
      showAlert(alertBox, error.message);
      button.disabled = false;
      buttonText.textContent = "Create Account";
      spinner.classList.add("d-none");
    }
  });
}

/* ==========================================
   PATIENTS — STATE
========================================== */
let patientsPage = 1;
const patientsPerPage = 10;
let patientsCache = [];

/* ==========================================
   PATIENTS — LOAD
========================================== */
async function loadPatients(page = 1) {
  const tableBody = document.getElementById("patientsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="text-muted small mt-2 mb-0">Loading patients...</p>
      </td>
    </tr>
  `;

  try {
    const data = await apiRequest(
      `/patients/?page=${page}&per_page=${patientsPerPage}`
    );
    patientsCache = data.patients || [];
    patientsPage = data.page || page;
    renderPatients(patientsCache);

    const info = document.getElementById("patientsPaginationInfo");
    if (info) {
      info.textContent = `Page ${data.page} of ${data.pages} • ${data.total} patients`;
    }

    const previous = document.getElementById("previousPatientsPage");
    const next = document.getElementById("nextPatientsPage");
    if (previous) previous.disabled = data.page <= 1;
    if (next) next.disabled = data.page >= data.pages;
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-danger">
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

/* ==========================================
   PATIENTS — RENDER
========================================== */
function renderPatients(patients) {
  const tableBody = document.getElementById("patientsTableBody");
  if (!tableBody) return;

  if (!patients.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <i class="bi bi-people fs-2 text-muted"></i>
          <p class="text-muted mt-2 mb-0">No patients found.</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = patients.map(patient => `
    <tr>
      <td>#${patient.id}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="rounded-circle bg-primary-subtle text-primary d-flex
                      align-items-center justify-content-center me-3"
               style="width:40px;height:40px;">
            ${getInitials(patient.first_name, patient.last_name)}
          </div>
          <div class="fw-semibold">
            ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}
          </div>
        </div>
      </td>
      <td>${escapeHtml(patient.date_of_birth || "—")}</td>
      <td>${escapeHtml(patient.email || "—")}</td>
      <td>${escapeHtml(patient.phone || "—")}</td>
      <td>
        <span class="badge bg-light text-dark border">
          ${patient.appointments_count || 0}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary"
                title="Edit patient"
                onclick="editPatient(${patient.id})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger"
                title="Delete patient"
                onclick="deletePatient(${patient.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

/* ==========================================
   PATIENTS — SEARCH (debounced)
========================================== */
const patientSearch = document.getElementById("patientSearch");
if (patientSearch) {
  let searchTimeout;
  patientSearch.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    const query = this.value.trim();

    searchTimeout = setTimeout(async function () {
      if (!query) {
        loadPatients(1);
        return;
      }
      try {
        const data = await apiRequest(
          `/patients/search?q=${encodeURIComponent(query)}`
        );
        renderPatients(data.patients || []);

        const info = document.getElementById("patientsPaginationInfo");
        if (info) {
          const count = (data.patients || []).length;
          info.textContent = `${count} result${count === 1 ? "" : "s"}`;
        }
        document.getElementById("previousPatientsPage")?.setAttribute("disabled", "disabled");
        document.getElementById("nextPatientsPage")?.setAttribute("disabled", "disabled");
      } catch (error) {
        showAlert(document.getElementById("patientsAlert"), error.message);
      }
    }, 300);
  });
}

/* ==========================================
   PATIENTS — CREATE / UPDATE (single handler)
========================================== */
const patientForm = document.getElementById("patientForm");
if (patientForm) {
  patientForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const alertBox = document.getElementById("patientFormAlert");
    hideAlert(alertBox);

    const patient = {
      first_name: document.getElementById("firstName").value.trim(),
      last_name: document.getElementById("lastName").value.trim(),
      date_of_birth: document.getElementById("dateOfBirth").value,
      email: document.getElementById("patientEmail").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim()
    };

    // If the hidden ID field is populated, we're editing; otherwise creating.
    const idField = document.getElementById("patientId");
    const patientId = idField ? idField.value : "";
    const isEdit = Boolean(patientId);

    const url = isEdit ? `/patients/${patientId}` : "/patients/";
    const method = isEdit ? "PUT" : "POST";

    const button = document.getElementById("savePatientButton");
    const buttonText = document.getElementById("savePatientText");
    button.disabled = true;
    if (buttonText) buttonText.textContent = isEdit ? "Updating..." : "Saving...";

    try {
      await apiRequest(url, { method, body: JSON.stringify(patient) });

      const modalEl = document.getElementById("patientModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide(); // the "hidden.bs.modal" listener resets the form

      await loadPatients(isEdit ? patientsPage : 1);

      showAlert(
        document.getElementById("patientsAlert"),
        isEdit ? "Patient updated successfully." : "Patient created successfully.",
        "success"
      );
    } catch (error) {
      showAlert(alertBox, error.message);
      button.disabled = false;
      if (buttonText) buttonText.textContent = isEdit ? "Update Patient" : "Save Patient";
    }
  });
}

/* ==========================================
   PATIENTS — EDIT (populate + open modal)
========================================== */
async function editPatient(patientId) {
  try {
    const p = await apiRequest(`/patients/${patientId}`);

    document.getElementById("patientId").value    = p.id;
    document.getElementById("firstName").value    = p.first_name || "";
    document.getElementById("lastName").value     = p.last_name  || "";
    document.getElementById("dateOfBirth").value  = p.date_of_birth || "";
    document.getElementById("patientEmail").value = p.email || "";
    document.getElementById("phone").value        = p.phone || "";
    document.getElementById("address").value      = p.address || "";

    document.getElementById("patientModalLabel").textContent = "Edit Patient";
    document.getElementById("savePatientText").textContent   = "Update Patient";

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("patientModal")
    ).show();
  } catch (err) {
    showAlert(document.getElementById("patientsAlert"), err.message);
  }
}

/* ==========================================
   PATIENTS — MODAL RESET
========================================== */
const patientModalEl = document.getElementById("patientModal");
if (patientModalEl) {
  patientModalEl.addEventListener("hidden.bs.modal", function () {
    patientForm?.reset();
    const idField = document.getElementById("patientId");
    if (idField) idField.value = "";

    const label = document.getElementById("patientModalLabel");
    if (label) label.textContent = "Add New Patient";

    const btnText = document.getElementById("savePatientText");
    if (btnText) btnText.textContent = "Save Patient";

    hideAlert(document.getElementById("patientFormAlert"));
  });
}

/* ==========================================
   PATIENTS — DELETE
========================================== */
async function deletePatient(patientId) {
  if (!confirm("Are you sure you want to delete this patient?")) return;

  try {
    await apiRequest(`/patients/${patientId}`, { method: "DELETE" });
    await loadPatients(patientsPage);
    showAlert(
      document.getElementById("patientsAlert"),
      "Patient deleted successfully.",
      "success"
    );
  } catch (error) {
    showAlert(document.getElementById("patientsAlert"), error.message);
  }
}

/* ==========================================
   PATIENTS — PAGINATION
========================================== */
const previousPatientsPage = document.getElementById("previousPatientsPage");
if (previousPatientsPage) {
  previousPatientsPage.addEventListener("click", function () {
    if (patientsPage > 1) loadPatients(patientsPage - 1);
  });
}
const nextPatientsPage = document.getElementById("nextPatientsPage");
if (nextPatientsPage) {
  nextPatientsPage.addEventListener("click", function () {
    loadPatients(patientsPage + 1);
  });
}

/* ==========================================
   PATIENTS — VIEW (simple alert fallback)
========================================== */
async function viewPatient(patientId) {
  try {
    const p = await apiRequest(`/patients/${patientId}`);
    alert(
      `Patient #${p.id}\n\n` +
      `Name: ${p.first_name} ${p.last_name}\n` +
      `Email: ${p.email || "—"}\n` +
      `Phone: ${p.phone || "—"}\n` +
      `Date of Birth: ${p.date_of_birth || "—"}`
    );
  } catch (error) {
    showAlert(document.getElementById("patientsAlert"), error.message);
  }
}

/* ==========================================
   APPOINTMENTS
========================================== */
let appointmentsCache = [];

async function loadAppointments() {
  const tableBody = document.getElementById("appointmentsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="text-muted small mt-2 mb-0">Loading appointments...</p>
      </td>
    </tr>
  `;

  try {
    const data = await apiRequest("/appointments/");
    appointmentsCache = data.appointments || [];
    renderAppointments(appointmentsCache);
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-danger">
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

function renderAppointments(appointments) {
  const tableBody = document.getElementById("appointmentsTableBody");
  if (!tableBody) return;

  const filter = document.getElementById("appointmentStatusFilter")?.value || "";
  const filtered = filter
    ? appointments.filter(a => a.status === filter)
    : appointments;

  if (!filtered.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <i class="bi bi-calendar-x fs-2 text-muted"></i>
          <p class="text-muted mt-2 mb-0">No appointments found.</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(a => `
    <tr>
      <td>#${a.id}</td>
      <td>Patient #${a.patient_id}</td>
      <td>${escapeHtml(a.doctor_name)}</td>
      <td>${escapeHtml(a.date)}</td>
      <td>${escapeHtml(a.time)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger"
                onclick="deleteAppointment(${a.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

function statusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  let className = "pending";
  if (normalized === "completed") className = "success";
  if (normalized === "cancelled") className = "cancelled";
  // NOTE: fixed the missing ">" that was in the original file.
  return `<span class="status-badge ${className}">${escapeHtml(status || "Pending")}</span>`;
}

/* ==========================================
   APPOINTMENTS — FILTER
========================================== */
const appointmentStatusFilter = document.getElementById("appointmentStatusFilter");
if (appointmentStatusFilter) {
  appointmentStatusFilter.addEventListener("change", function () {
    renderAppointments(appointmentsCache);
  });
}

/* ==========================================
   APPOINTMENTS — CREATE
========================================== */
const appointmentForm = document.getElementById("appointmentForm");
if (appointmentForm) {
  appointmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const alertBox = document.getElementById("appointmentFormAlert");
    hideAlert(alertBox);

    const time = document.getElementById("appointmentTime").value;
    const appointment = {
      patient_id: Number(document.getElementById("appointmentPatient").value),
      doctor_name: document.getElementById("doctorName").value.trim(),
      date: document.getElementById("appointmentDate").value,
      // HTML time input gives "HH:MM"; the API expects "HH:MM:SS".
      time: time.length === 5 ? `${time}:00` : time,
      notes: document.getElementById("appointmentNotes").value.trim()
    };

    const button = document.getElementById("saveAppointmentButton");
    button.disabled = true;
    button.textContent = "Creating...";

    try {
      await apiRequest("/appointments/", {
        method: "POST",
        body: JSON.stringify(appointment)
      });
      bootstrap.Modal.getInstance(
        document.getElementById("appointmentModal")
      ).hide();
      appointmentForm.reset();
      await loadAppointments();
      showAlert(
        document.getElementById("appointmentsAlert"),
        "Appointment created successfully.",
        "success"
      );
    } catch (error) {
      showAlert(alertBox, error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Create Appointment";
    }
  });
}

/* ==========================================
   APPOINTMENTS — DELETE
========================================== */
async function deleteAppointment(appointmentId) {
  if (!confirm("Are you sure you want to delete this appointment?")) return;

  try {
    await apiRequest(`/appointments/${appointmentId}`, { method: "DELETE" });
    await loadAppointments();
  } catch (error) {
    showAlert(document.getElementById("appointmentsAlert"), error.message);
  }
}

/* ==========================================
   DASHBOARD
========================================== */
async function loadDashboard() {
  if (!document.getElementById("statTotalPatients")) return;

  try {
    const data = await apiRequest("/stats/");

    document.getElementById("statTotalPatients").textContent = data.total_patients;
    document.getElementById("statTotalAppointments").textContent = data.total_appointments;
    document.getElementById("statCompleted").textContent = data.completed;
    document.getElementById("statPending").textContent = data.pending;

    const body = document.getElementById("recentAppointmentsBody");
    if (!body) return;

    if (!data.recent_appointments?.length) {
      body.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-5 text-muted">
            No appointments available
          </td>
        </tr>
      `;
    } else {
      body.innerHTML = data.recent_appointments.map(a => `
        <tr>
          <td>#${a.patient_id}</td>
          <td>${escapeHtml(a.doctor_name)}</td>
          <td>${formatDate(a.date)}</td>
          <td>${statusBadge(a.status)}</td>
        </tr>
      `).join("");
    }
  } catch (err) {
    console.error("Dashboard load failed:", err);
  }
}

/* ==========================================
   SIDEBAR
========================================== */
const sidebarToggle = document.getElementById("sidebarToggle");
if (sidebarToggle) {
  sidebarToggle.addEventListener("click", function () {
    document.querySelector(".sidebar")?.classList.toggle("show");
  });
}

/* ==========================================
   ACTIVE SIDEBAR LINK
========================================== */
(function highlightActiveLink() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".sidebar-link").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (href === currentPath || (href !== "/" && currentPath.startsWith(href))) {
      link.classList.add("active");
    }
  });
})();

/* ==========================================
   PAGE INITIALIZATION
========================================== */
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("patientsTableBody")) loadPatients();
  if (document.getElementById("appointmentsTableBody")) loadAppointments();
  loadDashboard();
});