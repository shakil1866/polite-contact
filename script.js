/**
 * Contact Form - Vanilla JavaScript
 *
 * Mirrors the logic from the original React/TanStack Router implementation:
 *  - Real-time validation after first touch or submit attempt
 *  - Submits via fetch() POST to the n8n webhook (via /api/contact proxy or direct)
 *  - Shows spinner + disables button while submitting
 *  - Displays success or error alert after submission
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL =
  "https://shakil1866.app.n8n.cloud/webhook/6f72b2fa-51cf-4df6-bbce-e2a02e37f2e0";

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  values: { name: "", email: "", phone: "", message: "" },
  errors: {},
  touched: {},
  submitted: false,
  submitting: false,
};

// ─── DOM References ───────────────────────────────────────────────────────────

const form = document.getElementById("contact-form");
const successAlert = document.getElementById("success-alert");
const submitErrorEl = document.getElementById("submit-error");
const submitErrorMsg = document.getElementById("submit-error-msg");
const submitBtn = document.getElementById("submit-btn");
const btnText = document.getElementById("btn-text");
const spinner = document.getElementById("spinner");
const charCount = document.getElementById("char-count");

const fields = ["name", "email", "phone", "message"];

// ─── Validation ───────────────────────────────────────────────────────────────

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

function validate(values) {
  const errors = {};

  // Name
  const name = (values.name || "").trim();
  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (name.length > 100) {
    errors.name = "Name must be less than 100 characters";
  }

  // Email
  const email = (values.email || "").trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address";
  } else if (email.length > 255) {
    errors.email = "Email must be less than 255 characters";
  }

  // Phone
  const phone = (values.phone || "").trim();
  if (!phone) {
    errors.phone = "Phone number is required";
  } else if (!PHONE_REGEX.test(phone)) {
    errors.phone = "Enter a valid phone number (7–20 digits)";
  }

  // Message
  const message = (values.message || "").trim();
  if (message.length < 10) {
    errors.message = "Message must be at least 10 characters";
  } else if (message.length > 1000) {
    errors.message = "Message must be less than 1000 characters";
  }

  return errors;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function showError(field, message) {
  const input = document.getElementById(field);
  const errorEl = document.getElementById(`${field}-error`);
  if (!input || !errorEl) return;

  input.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError(field) {
  const input = document.getElementById(field);
  const errorEl = document.getElementById(`${field}-error`);
  if (!input || !errorEl) return;

  input.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function displayErrors(errors) {
  fields.forEach((field) => {
    if (errors[field]) {
      showError(field, errors[field]);
    } else {
      clearError(field);
    }
  });
}

function setSubmitting(isSubmitting) {
  state.submitting = isSubmitting;
  submitBtn.disabled = isSubmitting;
  spinner.hidden = !isSubmitting;
  btnText.textContent = isSubmitting ? "Sending…" : "Send Message";
}

function resetForm() {
  form.reset();
  state.values = { name: "", email: "", phone: "", message: "" };
  state.touched = {};
  state.errors = {};
  charCount.textContent = "0";
  fields.forEach(clearError);
}

function showSuccess() {
  successAlert.hidden = false;
  // Smooth scroll to alert
  successAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showSubmitError(message) {
  submitErrorMsg.textContent =
    message || "We couldn't send your message right now. Please try again in a moment.";
  submitErrorEl.hidden = false;
}

function hideSubmitError() {
  submitErrorEl.hidden = true;
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

// Input change: update state, revalidate if touched or submitted
fields.forEach((field) => {
  const input = document.getElementById(field);
  if (!input) return;

  input.addEventListener("input", (e) => {
    state.values[field] = e.target.value;

    // Update character counter for message
    if (field === "message") {
      charCount.textContent = e.target.value.length;
    }

    if (state.touched[field] || state.submitted) {
      state.errors = validate(state.values);
      displayErrors(state.errors);
    }

    // Hide general submit error if user is editing
    hideSubmitError();
  });

  // Blur: mark as touched, run validation
  input.addEventListener("blur", () => {
    state.touched[field] = true;
    state.errors = validate(state.values);
    displayErrors(state.errors);
  });
});

// ─── Form Submit ──────────────────────────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Mark all touched, validate
  fields.forEach((f) => (state.touched[f] = true));
  state.submitted = true;
  state.errors = validate(state.values);
  displayErrors(state.errors);

  if (Object.keys(state.errors).length > 0) {
    // Focus first errored field
    const firstErrorField = fields.find((f) => state.errors[f]);
    if (firstErrorField) document.getElementById(firstErrorField)?.focus();
    return;
  }

  setSubmitting(true);
  hideSubmitError();

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.values.name.trim(),
        email: state.values.email.trim(),
        phone: state.values.phone.trim(),
        message: state.values.message.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Submission failed with status ${response.status}`);
    }

    // Success!
    resetForm();
    showSuccess();
  } catch (err) {
    console.error("Webhook submission failed:", err);
    showSubmitError(
      "We couldn't send your message right now. Please try again in a moment."
    );
  } finally {
    setSubmitting(false);
  }
});
