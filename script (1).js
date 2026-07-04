/* Smart Parking System - shared page interactions */
(function () {
  "use strict";

  const slotStates = ["available", "occupied", "reserved"];
  const slotLabels = {
    available: "Available",
    occupied: "Occupied",
    reserved: "Reserved"
  };

  const defaultSlots = [
    { code: "A1", status: "available" },
    { code: "A2", status: "occupied" },
    { code: "A3", status: "reserved" },
    { code: "A4", status: "available" },
    { code: "B1", status: "occupied" },
    { code: "B2", status: "available" },
    { code: "B3", status: "occupied" },
    { code: "B4", status: "reserved" },
    { code: "C1", status: "available" },
    { code: "C2", status: "available" },
    { code: "C3", status: "occupied" },
    { code: "C4", status: "available" }
  ];

  document.addEventListener("DOMContentLoaded", () => {
    setActiveNavigation();
    initMobileMenuToggle();
    initDarkMode();
    renderDashboardSlots();
    initReservationForm();
    initHistorySearch();
    initNotifications();
    initAdminLogin();
    initContactForm();
  });

  function setActiveNavigation() {
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar .nav-link").forEach((link) => {
      const target = link.getAttribute("href");
      if (target === current) link.classList.add("active");
    });
  }

  function initMobileMenuToggle() {
    const nav = document.querySelector("#mainNav");
    if (!nav) return;

    document.querySelectorAll("#mainNav .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth >= 992 || !nav.classList.contains("show")) return;
        const collapse = bootstrap.Collapse.getOrCreateInstance(nav, { toggle: false });
        collapse.hide();
      });
    });
  }

  function initDarkMode() {
    const savedTheme = localStorage.getItem("smartParkingTheme");
    if (savedTheme === "dark") document.body.classList.add("dark-mode");

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("smartParkingTheme", document.body.classList.contains("dark-mode") ? "dark" : "light");
        updateThemeIcon();
      });
    });
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.body.classList.contains("dark-mode");
    document.querySelectorAll("[data-theme-toggle] i").forEach((icon) => {
      icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });
  }

  function getSlots() {
    const saved = localStorage.getItem("smartParkingSlots");
    if (!saved) return defaultSlots.map((slot) => ({ ...slot }));
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length ? parsed : defaultSlots.map((slot) => ({ ...slot }));
    } catch {
      return defaultSlots.map((slot) => ({ ...slot }));
    }
  }

  function saveSlots(slots) {
    localStorage.setItem("smartParkingSlots", JSON.stringify(slots));
  }

  function renderDashboardSlots() {
    const grid = document.querySelector("[data-slot-grid]");
    const liveFeed = document.querySelector("[data-live-feed]");
    if (!grid) return;

    const slots = getSlots();
    grid.innerHTML = slots.map((slot) => slotButton(slot)).join("");
    updateCounters(slots);

    if (liveFeed) {
      liveFeed.prepend(feedItem("System connected to IR sensor gateway", "Just now", "fa-wifi"));
    }

    setInterval(() => {
      const currentSlots = getSlots();
      const randomIndex = Math.floor(Math.random() * currentSlots.length);
      const randomStatus = slotStates[Math.floor(Math.random() * slotStates.length)];
      currentSlots[randomIndex].status = randomStatus;
      saveSlots(currentSlots);
      grid.innerHTML = currentSlots.map((slot) => slotButton(slot)).join("");
      updateCounters(currentSlots);

      if (liveFeed) {
        liveFeed.prepend(feedItem(`${currentSlots[randomIndex].code} changed to ${slotLabels[randomStatus]}`, "Live update", "fa-satellite-dish"));
        trimChildren(liveFeed, 5);
      }
    }, 6500);
  }

  function slotButton(slot) {
    return `
      <button class="slot ${slot.status}" type="button" aria-label="${slot.code} ${slotLabels[slot.status]}">
        <span class="slot-code">${slot.code}</span>
        <span class="slot-status"><i class="fa-solid fa-car-side me-2"></i>${slotLabels[slot.status]}</span>
      </button>
    `;
  }

  function updateCounters(slots) {
    const values = {
      total: 100,
      available: slots.filter((slot) => slot.status === "available").length + 39,
      occupied: slots.filter((slot) => slot.status === "occupied").length + 46,
      reserved: slots.filter((slot) => slot.status === "reserved").length + 3
    };

    Object.entries(values).forEach(([key, value]) => {
      document.querySelectorAll(`[data-counter="${key}"]`).forEach((element) => animateNumber(element, value));
    });
  }

  function animateNumber(element, value) {
    const current = Number(element.textContent) || 0;
    const diff = value - current;
    const steps = 14;
    let frame = 0;
    clearInterval(element._timer);
    element._timer = setInterval(() => {
      frame += 1;
      element.textContent = Math.round(current + (diff * frame) / steps);
      if (frame >= steps) {
        element.textContent = value;
        clearInterval(element._timer);
      }
    }, 22);
  }

  function feedItem(text, time, icon) {
    const wrapper = document.createElement("div");
    wrapper.className = "activity-item";
    wrapper.innerHTML = `
      <span class="icon-box"><i class="fa-solid ${icon}"></i></span>
      <span><strong>${text}</strong><br><small class="text-muted">${time}</small></span>
    `;
    return wrapper;
  }

  function trimChildren(parent, max) {
    while (parent.children.length > max) parent.lastElementChild.remove();
  }

  function initReservationForm() {
    const form = document.querySelector("#reservationForm");
    if (!form) return;

    refreshReservationSlotOptions(form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const reservationId = `SPR-${Date.now().toString().slice(-6)}`;
      const reservation = {
        id: reservationId,
        name: data.fullName,
        mobile: data.mobile,
        vehicle: data.vehicle,
        zone: data.zone,
        slot: data.slot,
        arrival: data.arrival,
        createdAt: new Date().toISOString()
      };

      const reservations = JSON.parse(localStorage.getItem("smartParkingReservations") || "[]");
      reservations.unshift(reservation);
      localStorage.setItem("smartParkingReservations", JSON.stringify(reservations));

      const slots = getSlots().map((slot) => slot.code === data.slot ? { ...slot, status: "reserved" } : slot);
      saveSlots(slots);

      document.querySelector("#reservationId").textContent = reservationId;
      document.querySelector("#reservationSummary").textContent = `${data.slot} in ${data.zone} is reserved for ${data.vehicle}.`;

      const modal = new bootstrap.Modal(document.querySelector("#reservationModal"));
      modal.show();
      form.reset();
      form.classList.remove("was-validated");
      refreshReservationSlotOptions(form);
    });
  }

  function refreshReservationSlotOptions(form) {
    const slotSelect = form.querySelector("#slot");
    if (!slotSelect) return;
    const availableSlots = getSlots().filter((slot) => slot.status === "available");
    slotSelect.innerHTML = '<option value="">Choose an available slot</option>' +
      availableSlots.map((slot) => `<option value="${slot.code}">${slot.code} - Available</option>`).join("");
  }

  function initHistorySearch() {
    const search = document.querySelector("#historySearch");
    const table = document.querySelector("#historyTable");
    const download = document.querySelector("#downloadHistory");
    if (!table) return;

    const reservations = JSON.parse(localStorage.getItem("smartParkingReservations") || "[]");
    const body = table.querySelector("tbody");
    reservations.slice(0, 5).forEach((reservation) => {
      const date = new Date(reservation.createdAt).toLocaleDateString();
      body.insertAdjacentHTML("afterbegin", `
        <tr>
          <td>${date}</td>
          <td>${reservation.slot}</td>
          <td>Reserved</td>
          <td>Rs. 0</td>
          <td><span class="badge-soft badge-active">Upcoming</span></td>
        </tr>
      `);
    });

    if (search) {
      search.addEventListener("input", () => {
        const term = search.value.trim().toLowerCase();
        table.querySelectorAll("tbody tr").forEach((row) => {
          row.style.display = row.textContent.toLowerCase().includes(term) ? "" : "none";
        });
      });
    }

    if (download) {
      download.addEventListener("click", () => {
        const rows = [...table.querySelectorAll("tr")].map((row) =>
          [...row.children].map((cell) => `"${cell.textContent.trim()}"`).join(",")
        );
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "parking-history.csv";
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  function initNotifications() {
    const stampTargets = document.querySelectorAll("[data-now]");
    if (!stampTargets.length) return;
    stampTargets.forEach((target, index) => {
      const date = new Date(Date.now() - index * 18 * 60000);
      target.textContent = date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    });
  }

  function initAdminLogin() {
    const form = document.querySelector("#adminLoginForm");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const alert = document.querySelector("#adminAlert");
      alert.classList.remove("d-none");
      alert.textContent = "Admin session preview opened successfully. Demo credentials accepted.";
    });
  }

  function initContactForm() {
    const form = document.querySelector("#contactForm");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      document.querySelector("#contactAlert").classList.remove("d-none");
      form.reset();
      form.classList.remove("was-validated");
    });
  }
})();
