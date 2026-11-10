// Единственное место, где задаётся адрес поддержки. Замените SUPPORT_EMAIL на реальный адрес.
window.SUPPORT_EMAIL = "SUPPORT_EMAIL";

document.addEventListener("DOMContentLoaded", function () {
  var email = window.SUPPORT_EMAIL;
  var configured = email && email !== "SUPPORT_EMAIL";
  document.querySelectorAll("[data-support-email]").forEach(function (el) {
    if (configured) {
      el.textContent = email;
      el.setAttribute("href", "mailto:" + email);
    } else {
      el.textContent = el.getAttribute("data-placeholder") || "support e-mail";
      el.removeAttribute("href");
    }
  });
});
