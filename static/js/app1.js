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
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || "Something went wrong.");
  }
  return data;
}
/* ==========================================
   ALERT
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
   LOGIN
========================================== */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function(event) {
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
   PASSWORD VISIBILITY
========================================== */
function setupPasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;
  button.addEventListener("click", function() {
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
  registerForm.addEventListener("submit", async function(event) {
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
   PATIENTS
========================================== */
let patientsPage = 1;
const patientsPerPage = 10;
let patientsCache = [];
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
    const data = await apiRequest(`/patients/?page=${page}&per_page=${patientsPerPage}`);
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
        <div class="fw-semibold">
          ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}
        </div>
      </td>
      <td>${escapeHtml(patient.date_of_birth)}</td>
      <td>${escapeHtml(patient.email || "—")}</td>
      <td>${escapeHtml(patient.phone || "—")}</td>
      <td>
        <span class="badge bg-light text-dark border">${patient.appointments_count || 0}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${patient.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}
/* ==========================================
   PATIENT SEARCH
========================================== */
const patientSearch = document.getElementById("patientSearch");
if (patientSearch) {
  patientSearch.addEventListener("input", async function() {
    const query = this.value.trim();
    if (!query) {
      loadPatients(patientsPage);
      return;
    }
    try {
      const data = await apiRequest(`/patients/search?q=${encodeURIComponent(query)}`);
      renderPatients(data.patients || []);
    } catch (error) {
      console.error(error);
    }
  });
}
/* ==========================================
   CREATE PATIENT
========================================== */
const patientForm = document.getElementById("patientForm");
if (patientForm) {
  patientForm.addEventListener("submit", async function(event) {
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
    const button = document.getElementById("savePatientButton");
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      await apiRequest("/patients/", {
        method: "POST",
        body: JSON.stringify(patient)
      });
      bootstrap.Modal.getInstance(document.getElementById("patientModal")).hide();
      patientForm.reset();
      await loadPatients(patientsPage);
      const alert = document.getElementById("patientsAlert");
      showAlert(alert, "Patient created successfully.", "success");
    } catch (error) {
      showAlert(alertBox, error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Save Patient";
    }
  });
}
/* ==========================================
   DELETE PATIENT
========================================== */
async function deletePatient(patientId) {
  if (!confirm("Are you sure you want to delete this patient?")) return;
  try {
    await apiRequest(`/patients/${patientId}`, { method: "DELETE" });
    await loadPatients(patientsPage);
  } catch (error) {
    const alert = document.getElementById("patientsAlert");
    showAlert(alert, error.message);
  }
}
/* ==========================================
   PATIENT PAGINATION
========================================== */
const previousPatientsPage = document.getElementById("previousPatientsPage");
if (previousPatientsPage) {
  previousPatientsPage.addEventListener("click", function() {
    if (patientsPage > 1) loadPatients(patientsPage - 1);
  });
}
const nextPatientsPage = document.getElementById("nextPatientsPage");
if (nextPatientsPage) {
  nextPatientsPage.addEventListener("click", function() {
    loadPatients(patientsPage + 1);
  });
}

/* ==========================================
   APPOINTMENTS
========================================== */
let appointmentsCache = [];
async function loadAppointments() {
    const tableBody = document.getElementById("appointmentsTableBody");
    if (!tableBody) {
        return;
    }
    tableBody.innerHTML = 
    `<tr>
            <td colspan="7" class="text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="text-muted small mt-2 mb-0">Loading appointments...</p>
            </td>
        </tr>`;
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
            </tr>`;
    }
}
function renderAppointments(appointments) {
    const tableBody = document.getElementById("appointmentsTableBody");
    if (!tableBody) {
        return;
    }
    const filter = document.getElementById("appointmentStatusFilter")?.value || "";
    const filtered = filter ? appointments.filter(appointment => appointment.status === filter) : appointments;
    if (!filtered.length) {
        tableBody.innerHTML = 
        `<tr>
                <td colspan="7"
                    class="text-center py-5">
                    <i class="bi bi-calendar-x fs-2 text-muted"></i>
                    <p class="text-muted mt-2 mb-0">No appointments found.</p>
                </td>
            </tr>`;
        return;
    }
    tableBody.innerHTML = filtered.map(appointment => 
                `<tr>
                <td>#${appointment.id}</td>
                <td>Patient #${appointment.patient_id}</td>
                <td>${escapeHtml(appointment.doctor_name)}</td>
                <td>${escapeHtml(appointment.date)}</td>
                <td>${escapeHtml(appointment.time)}</td>
                <td>${statusBadge(appointment.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment(${appointment.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join("");
}
function statusBadge(status) {
    const normalized = String(status || "").toLowerCase();
    let className = "pending";
    if (normalized === "completed") {
        className = "success";
    }
    if (normalized === "cancelled") {
        className = "cancelled";
    }
    return `<span class="status-badge ${className}"${escapeHtml(status || "Pending")}</span>`;
}
/* ==========================================
   APPOINTMENT FILTER
========================================== */
const appointmentStatusFilter = document.getElementById("appointmentStatusFilter");
if (appointmentStatusFilter) {
    appointmentStatusFilter.addEventListener("change", function () {
            renderAppointments(appointmentsCache);
        }
    );
}
/* ==========================================
   CREATE APPOINTMENT
========================================== */
const appointmentForm = document.getElementById("appointmentForm");
if (appointmentForm) {appointmentForm.addEventListener(
        "submit",async function (event) {
            event.preventDefault();
            const alertBox = document.getElementById("appointmentFormAlert");
            hideAlert(alertBox);
            const time = document.getElementById("appointmentTime").value;
            const appointment = {
                patient_id: Number(document.getElementById("appointmentPatient").value),
                doctor_name: document.getElementById("doctorName").value.trim(),
                date: document.getElementById("appointmentDate").value,
                time: time.length === 5 ? `${time}:00` : time,
                notes: document.getElementById("appointmentNotes").value.trim()
            };
            const button = document.getElementById("saveAppointmentButton");
            button.disabled = true;
            button.textContent = "Creating...";
            try {
                await apiRequest("/appointments/", {method: "POST", body: JSON.stringify(appointment)});
                bootstrap.Modal.getInstance(document.getElementById("appointmentModal")).hide();
                appointmentForm.reset();
                await loadAppointments();
                const alert = document.getElementById("appointmentsAlert");
                showAlert(alert, "Appointment created successfully.", "success"
                );
            } catch (error) {
                showAlert(alertBox, error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Create Appointment";
            }
        }
    );
}
/* ==========================================
   DELETE APPOINTMENT
========================================== */
async function deleteAppointment(appointmentId) {
    if (!confirm("Are you sure you want to delete this appointment?")) {
        return;
    }
    try {
        await apiRequest(`/appointments/${appointmentId}`, {method: "DELETE"});
        await loadAppointments();
    } catch (error) {
        const alert = document.getElementById("appointmentsAlert");
        showAlert(alert, error.message);
    }
}
/* ==========================================
   SIDEBAR
========================================== */
const sidebarToggle = document.getElementById("sidebarToggle");
if (sidebarToggle) {sidebarToggle.addEventListener("click", function () {
            const sidebar = document.querySelector(".sidebar");
            sidebar?.classList.toggle("show");
        }
    );
}
/* ==========================================
   ACTIVE SIDEBAR LINK
========================================== */
const currentPath = window.location.pathname;
document.querySelectorAll(".sidebar-link").forEach(link => {
        const href = link.getAttribute("href");
            if (href === currentPath || (href !== "/" && currentPath.startsWith(href))) {
                link.classList.add("active");
            }
        }
    );
/* ==========================================
   HTML ESCAPING
========================================== */
function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}
/* ==========================================
   PAGE INITIALIZATION
========================================== */
document.addEventListener("DOMContentLoaded", function() {
        if (document.getElementById("patientsTableBody")) {
            loadPatients();
        }
        if (document.getElementById("appointmentsTableBody")) {loadAppointments();}
    }
);