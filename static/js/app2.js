"use strict";
/* ==========================================
   API CONFIGURATION
========================================== */
const API_BASE = "/api";
const TOKEN_KEY = "medi_api_token";

/* ==========================================
   JWT
========================================== */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);}
/* ==========================================
   API REQUEST
========================================== */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {"Content-Type": "application/json"};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {...options, headers: {...headers, ...(options.headers || {})
            }});
    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }
    if (response.status === 401) {
        removeToken();
        window.location.href = "/login";
        return;
    }
    if (!response.ok) {
        throw new Error(data.message || "Request failed.")
    }
    return data;
}
/* ==========================================
   ALERT
========================================== */
function showAlert(element, message, type = "danger"
) {if (!element) {
        return;
    }
    element.className = `alert alert-${type}`;
    element.textContent = message;
    element.classList.remove("d-none");
}
function hideAlert(element) {
    if (!element) {
        return;
    }
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
   PATIENT STATE
========================================== */
let patientsPage = 1;
const patientsPerPage = 10;
let totalPatients = 0;
let totalPages = 1;
/* ==========================================
   LOAD PATIENTS
========================================== */
async function loadPatients(page = 1) {
    const tableBody = document.getElementById("patientsTableBody");
    if (!tableBody) {
        return;
    }
    tableBody.innerHTML = 
    `<tr>
            <td colspan="6" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                </div>
                <p class="text-muted mt-2 mb-0">Loading patients...</p>
            </td>
        </tr>`;
    try {
        const data = await apiRequest(`/patients/?page=${page}&per_page=${patientsPerPage}`);
        const patients = data.patients || [];
        patientsPage = data.page || page;
        totalPatients = data.total || patients.length;
        totalPages = data.pages || 1;
        renderPatients(patients);
        updatePatientsPagination();
    } catch (error) {
    tableBody.innerHTML = 
        `<tr>
                <td colspan="6" class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-circle fs-3"></i>
                    <p class="mt-2 mb-0">
                        ${escapeHtml(error.message)}
                    </p>
                </td>
            </tr>`;
    }}
/* ==========================================
   RENDER PATIENTS
========================================== */
function renderPatients(patients) {
    const tableBody = document.getElementById("patientsTableBody");
    if (!tableBody) {
        return;
    }
    if (!patients.length) {
        tableBody.innerHTML = 
        `<tr>
                <td colspan="6" class="text-center py-5">
                    <div class="mb-2">
                        <i class="bi bi-people fs-1 text-muted">
                        </i>
                    </div>
                    <h6 class="fw-semibold">No patients found</h6>
                    <p class="text-muted small mb-0">There are currently no patient records.</p>
                </td>
            </tr>`;
        return;}
    tableBody.innerHTML = patients.map(patient => 
                `<tr>
                <td class="ps-4">
                    <span class="fw-semibold">#${patient.id}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">${getInitials(patient.first_name, patient.last_name)}
                        </div>
                        <div>
                            <div class="fw-semibold">
                                ${escapeHtml(patient.first_name)}
                                ${escapeHtml(patient.last_name)}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    ${patient.email ? `<span>${escapeHtml(patient.email)}</span>` : `<span class="text-muted">—</span>`}
                </td>
                <td>
                    ${patient.phone ? `${escapeHtml(patient.phone)}` : `<span class="text-muted">—</span>`}
                </td>
                <td>
                    ${patient.date_of_birth ? ` ${formatDate(patient.date_of_birth)}` : `<span class="text-muted">—</span>`}
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-primary" title="View patient" onclick="viewPatient(${patient.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" title="Delete patient" onclick="deletePatient(${patient.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`).join("");
}
/* ==========================================
   PATIENT INITIALS
========================================== */
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : "";
    const last = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${first}${last}`;
}
/* ==========================================
   DATE FORMAT
========================================== */
function formatDate(dateString) {
    if (!dateString) {
        return "—";
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return escapeHtml(dateString);}
    return date.toLocaleDateString("en-NG", {day: "2-digit", month: "short", year: "numeric"}
    );}
/* ==========================================
   PAGINATION
========================================== */
function updatePatientsPagination() {
    const info = document.getElementById("patientsPaginationInfo");
    const previous = document.getElementById("previousPatientsPage");
    const next = document.getElementById("nextPatientsPage");
    if (info) {
        if (totalPatients === 0) {
            info.textContent = "No patients";
        } else {
            info.textContent = `Page ${patientsPage} of ${totalPages} • ${totalPatients} patients`;
        }}
    if (previous) {
        previous.disabled = patientsPage <= 1;
    }
    if (next) {
        next.disabled = patientsPage >= totalPages;
    }}
/* ==========================================
   PREVIOUS PAGE
========================================== */
const previousPatientsPage = document.getElementById("previousPatientsPage");
if (previousPatientsPage) {
    previousPatientsPage.addEventListener("click", function () {
            if (patientsPage > 1) {
                loadPatients(patientsPage - 1);
            }}
    );}
/* ==========================================
   NEXT PAGE
========================================== */
const nextPatientsPage = document.getElementById("nextPatientsPage");
if (nextPatientsPage) {
    nextPatientsPage.addEventListener("click", function () {
            if (patientsPage < totalPages) {
                loadPatients(patientsPage + 1);
            }}
    );}
/* ==========================================
   SEARCH PATIENTS
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
                            const data = await apiRequest(`/patients/search?q=${encodeURIComponent(query)}`);
                            const patients = data.patients || [];
                            renderPatients(patients);
                            const info = document.getElementById("patientsPaginationInfo");
                            if (info) {
                                info.textContent = `${patients.length} result${patients.length === 1 ? "" : "s"
                                    }`;
                                }
                            document.getElementById("previousPatientsPage")
                                ?.setAttribute("disabled", "disabled");
                            document.getElementById("nextPatientsPage")
                                    ?.setAttribute("disabled", "disabled");
                        } catch (error) {
                            const alert = document.getElementById("patientsAlert");
                            showAlert(alert, error.message);
                        }},
                    300);
        });
}
/* ==========================================
   CREATE PATIENT
========================================== */
const patientForm = document.getElementById("patientForm");
if (patientForm) {
    patientForm.addEventListener("submit",
        async function (event) {
            event.preventDefault();
            const alertBox = document.getElementById("patientFormAlert");
            const button = document.getElementById("savePatientButton");
            const buttonText = document.getElementById("savePatientText");
            const spinner = document.getElementById("savePatientSpinner");
            hideAlert(alertBox);
            const patientData = {
                first_name: document.getElementById("firstName").value.trim(),
                last_name: document.getElementById("lastName").value.trim(),
                date_of_birth: document.getElementById("dateOfBirth").value,
                email:document.getElementById("patientEmail").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                address: document.getElementById("address").value.trim()
            };
            button.disabled = true;
            buttonText.textContent = "Saving...";
            spinner.classList.remove("d-none");
            try {
                await apiRequest("/patients/", {method: "POST", body: JSON.stringify(patientData)});
                patientForm.reset();
                const modalElement = document.getElementById("patientModal");
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
                await loadPatients(1);
                const alert = document.getElementById("patientsAlert");
                showAlert(alert, "Patient added successfully.", "success");
            } catch (error) {
                showAlert(alertBox, error.message);
            } finally {
                button.disabled = false;
                buttonText.textContent = "Save Patient";
                spinner.classList.add("d-none");
            }});
}
/* ==========================================
   VIEW PATIENT
========================================== */
async function viewPatient(patientId) {
    try {
        const patient = await apiRequest(`/patients/${patientId}`);
        alert(`Patient #${patient.id}\n\n` + `Name: ${patient.first_name} ${patient.last_name}\n` + `Email: ${patient.email || "—"}\n` + `Phone: ${patient.phone || "—"}\n` + `Date of Birth: ${patient.date_of_birth || "—"}`);
    } catch (error) {
        const alertBox = document.getElementById("patientsAlert");
        showAlert(alertBox, error.message);}}
/* ==========================================
   DELETE PATIENT
========================================== */
async function deletePatient(patientId) {
    const confirmed = window.confirm("Are you sure you want to delete this patient?");
    if (!confirmed) {
        return;
    }
    try {
        await apiRequest(`/patients/${patientId}`, {method: "DELETE"});
        await loadPatients(patientsPage);
        const alert = document.getElementById("patientsAlert");
        showAlert(alert, "Patient deleted successfully.", "success");
    } catch (error) {
        const alert = document.getElementById("patientsAlert");
        showAlert(alert, error.message);}}
/* ==========================================
   PAGE INITIALIZATION
========================================== */
document.addEventListener("DOMContentLoaded", function () {
        const patientsTable = document.getElementById("patientsTableBody");
        if (patientsTable) {
            loadPatients();
        }});