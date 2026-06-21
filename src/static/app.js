document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");

  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  const manageAnnouncementsButton = document.getElementById("manage-announcements-button");
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsModal = document.querySelector(".close-announcements-modal");
  const announcementsHelpText = document.getElementById("announcements-help-text");
  const announcementBannerContent = document.getElementById("announcement-banner-content");
  const announcementList = document.getElementById("announcement-list");
  const announcementForm = document.getElementById("announcement-form");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementTitleInput = document.getElementById("announcement-title");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById("announcement-start-date");
  const announcementEndDateInput = document.getElementById("announcement-end-date");
  const announcementFormSubmit = document.getElementById("announcement-form-submit");
  const announcementFormReset = document.getElementById("announcement-form-reset");

  const activityTypes = {
    sports: { label: "Sports", color: "#ffe8d9", textColor: "#9a3412" },
    arts: { label: "Arts", color: "#fdf2f8", textColor: "#9d174d" },
    academic: { label: "Academic", color: "#e0f2fe", textColor: "#0c4a6e" },
    community: { label: "Community", color: "#ecfccb", textColor: "#3f6212" },
    technology: { label: "Technology", color: "#ede9fe", textColor: "#5b21b6" },
  };

  let allActivities = {};
  let allAnnouncements = [];
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      manageAnnouncementsButton.classList.add("authenticated");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      manageAnnouncementsButton.classList.remove("authenticated");
    }

    updateAuthBodyClass();
    fetchActivities();
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(`/auth/check-session?username=${encodeURIComponent(username)}`);

      if (!response.ok) {
        logout(false);
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout(false);
      }
    }

    updateAuthBodyClass();
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout(showToast = true) {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    if (showToast) {
      showMessage("You have been logged out.", "info");
    }
    fetchAnnouncements();
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 250);
  }

  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div class="skeleton-line" style="height: 6px;"></div>
        <div class="skeleton-line skeleton-text short" style="height: 8px;"></div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);
      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("drama") ||
      desc.includes("creative")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning")
    ) {
      return "academic";
    }

    if (name.includes("volunteer") || name.includes("community") || desc.includes("service")) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("digital")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];
      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange && currentTimeRange !== "weekend") {
        const range = timeRanges[currentTimeRange];
        if (range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();
      allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";
    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const isWeekend = details.schedule_details.days.some((day) => timeRanges.weekend.days.includes(day));
        if (!isWeekend) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (!Object.keys(filteredActivities).length) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("article");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const safeName = escapeHtml(name);
    const safeDescription = escapeHtml(details.description);
    const safeSchedule = escapeHtml(formattedSchedule);

    activityCard.innerHTML = `
      <span class="activity-tag" style="background-color:${typeInfo.color};color:${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
      <h4>${safeName}</h4>
      <p>${safeDescription}</p>
      <p class="tooltip"><strong>Schedule:</strong> ${safeSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg"><div class="capacity-bar-fill" style="width:${capacityPercentage}%"></div></div>
        <div class="capacity-text"><span>${takenSpots} enrolled</span><span>${spotsLeft} spots left</span></div>
      </div>
      <div class="participants-list">
        <h5>Current Participants</h5>
        <ul>
          ${details.participants
            .map((email) => {
              const safeEmail = escapeHtml(email);
              const encodedEmail = encodeURIComponent(email);
              const encodedActivity = encodeURIComponent(name);
              if (!currentUser) {
                return `<li>${safeEmail}</li>`;
              }
              return `
                <li>
                  ${safeEmail}
                  <button class="delete-participant" data-activity="${encodedActivity}" data-email="${encodedEmail}" aria-label="Unregister ${safeEmail}">
                    ✖
                  </button>
                </li>
              `;
            })
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `<button class="register-button" ${isFull ? "disabled" : ""}>${
                isFull ? "Activity Full" : "Register Student"
              }</button>`
            : `<div class="auth-notice">Teachers can register students.</div>`
        }
      </div>
    `;

    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser && !isFull) {
      const registerButton = activityCard.querySelector(".register-button");
      registerButton.addEventListener("click", () => {
        openRegistrationModal(name);
      });
    }

    activitiesList.appendChild(activityCard);
  }

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    requestAnimationFrame(() => registrationModal.classList.add("show"));
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 250);
  }

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div class="confirm-actions">
            <button id="cancel-button" class="ghost-button">Cancel</button>
            <button id="confirm-button" class="danger-button">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);
    }

    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    confirmDialog.classList.remove("hidden");
    requestAnimationFrame(() => confirmDialog.classList.add("show"));

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => confirmDialog.classList.add("hidden"), 250);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => confirmDialog.classList.add("hidden"), 250);
    });
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = decodeURIComponent(event.currentTarget.dataset.activity || "");
    const email = decodeURIComponent(event.currentTarget.dataset.email || "");

    showConfirmationDialog(`Unregister ${email} from ${activity}?`, async () => {
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(
            currentUser.username
          )}`,
          { method: "POST" }
        );

        const result = await response.json();
        if (response.ok) {
          showMessage(result.message, "success");
          fetchActivities();
        } else {
          showMessage(result.detail || "An error occurred", "error");
        }
      } catch (error) {
        showMessage("Failed to unregister. Please try again.", "error");
        console.error("Error unregistering:", error);
      }
    });
  }

  function formatDateBadge(startDate, endDate) {
    if (!startDate) {
      return `Until ${endDate}`;
    }
    return `${startDate} to ${endDate}`;
  }

  function renderBannerAnnouncements() {
    if (!allAnnouncements.length) {
      announcementBannerContent.textContent = "No active announcements at the moment.";
      return;
    }

    announcementBannerContent.innerHTML = allAnnouncements
      .map((announcement) => {
        const safeTitle = escapeHtml(announcement.title);
        const safeMessage = escapeHtml(announcement.message);
        const safeDateRange = escapeHtml(formatDateBadge(announcement.start_date, announcement.end_date));
        return `<div class="banner-item"><strong>${safeTitle}:</strong> ${safeMessage} <span class="banner-date">(${safeDateRange})</span></div>`;
      })
      .join("");
  }

  function resetAnnouncementForm() {
    announcementIdInput.value = "";
    announcementTitleInput.value = "";
    announcementMessageInput.value = "";
    announcementStartDateInput.value = "";
    announcementEndDateInput.value = "";
    announcementFormSubmit.textContent = "Save Announcement";
  }

  function renderAnnouncementList(managementMode) {
    announcementList.innerHTML = "";

    if (!allAnnouncements.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-announcements";
      emptyState.textContent = "There are no announcements to display.";
      announcementList.appendChild(emptyState);
      return;
    }

    allAnnouncements.forEach((announcement) => {
      const card = document.createElement("article");
      card.className = "announcement-card";

      const title = document.createElement("h4");
      title.textContent = announcement.title;

      const message = document.createElement("p");
      message.textContent = announcement.message;

      const meta = document.createElement("div");
      meta.className = "announcement-meta";
      meta.textContent = formatDateBadge(announcement.start_date || "Immediately", announcement.end_date);

      card.appendChild(title);
      card.appendChild(message);
      card.appendChild(meta);

      if (managementMode) {
        const actions = document.createElement("div");
        actions.className = "announcement-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "ghost-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
          announcementIdInput.value = announcement.id;
          announcementTitleInput.value = announcement.title;
          announcementMessageInput.value = announcement.message;
          announcementStartDateInput.value = announcement.start_date || "";
          announcementEndDateInput.value = announcement.end_date;
          announcementFormSubmit.textContent = "Update Announcement";
          announcementTitleInput.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
          showConfirmationDialog(`Delete announcement \"${announcement.title}\"?`, async () => {
            await deleteAnnouncement(announcement.id);
          });
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        card.appendChild(actions);
      }

      announcementList.appendChild(card);
    });
  }

  async function fetchAnnouncements(managementMode = false) {
    try {
      const endpoint = managementMode
        ? `/announcements/manage?teacher_username=${encodeURIComponent(currentUser.username)}`
        : "/announcements";

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load announcements");
      }

      allAnnouncements = data;
      renderBannerAnnouncements();
      renderAnnouncementList(managementMode);
    } catch (error) {
      allAnnouncements = [];
      renderBannerAnnouncements();
      renderAnnouncementList(managementMode);
      if (managementMode) {
        showMessage("Failed to load announcements.", "error");
      }
      console.error("Error loading announcements:", error);
    }
  }

  async function upsertAnnouncement(payload) {
    const editId = announcementIdInput.value;
    const isEdit = Boolean(editId);

    const endpoint = isEdit
      ? `/announcements/manage/${encodeURIComponent(editId)}?teacher_username=${encodeURIComponent(currentUser.username)}`
      : `/announcements/manage?teacher_username=${encodeURIComponent(currentUser.username)}`;

    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Announcement save failed");
    }

    showMessage(isEdit ? "Announcement updated." : "Announcement created.", "success");
    resetAnnouncementForm();
    await fetchAnnouncements(true);
    await fetchAnnouncements(false);
  }

  async function deleteAnnouncement(announcementId) {
    try {
      const response = await fetch(
        `/announcements/manage/${encodeURIComponent(announcementId)}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Delete failed");
      }

      showMessage("Announcement deleted.", "success");
      resetAnnouncementForm();
      await fetchAnnouncements(true);
      await fetchAnnouncements(false);
    } catch (error) {
      console.error("Delete announcement failed:", error);
      showMessage("Failed to delete announcement.", "error");
    }
  }

  function openAnnouncementsModal() {
    announcementsModal.classList.remove("hidden");
    announcementsModal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => announcementsModal.classList.add("show"));

    if (currentUser) {
      announcementsHelpText.textContent = "Create, edit, and delete announcements below.";
      announcementForm.classList.remove("hidden");
      fetchAnnouncements(true);
    } else {
      announcementsHelpText.textContent = "View all active announcements. Log in to manage notices.";
      announcementForm.classList.add("hidden");
      fetchAnnouncements(false);
    }
  }

  function closeAnnouncementsModalHandler() {
    announcementsModal.classList.remove("show");
    announcementsModal.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
      resetAnnouncementForm();
    }, 250);
  }

  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", () => logout(true));
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);

  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
    if (event.target === announcementsModal) {
      closeAnnouncementsModalHandler();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&teacher_username=${encodeURIComponent(
          currentUser.username
        )}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("Login required to manage announcements.", "error");
      return;
    }

    const payload = {
      title: announcementTitleInput.value.trim(),
      message: announcementMessageInput.value.trim(),
      start_date: announcementStartDateInput.value || null,
      end_date: announcementEndDateInput.value,
    };

    if (!payload.title || !payload.message || !payload.end_date) {
      showMessage("Title, message, and end date are required.", "error");
      return;
    }

    if (payload.start_date && payload.start_date > payload.end_date) {
      showMessage("Start date cannot be later than end date.", "error");
      return;
    }

    try {
      await upsertAnnouncement(payload);
    } catch (error) {
      console.error("Save announcement failed:", error);
      showMessage("Failed to save announcement.", "error");
    }
  });

  announcementFormReset.addEventListener("click", () => {
    resetAnnouncementForm();
  });

  checkAuthentication();
  initializeFilters();
  fetchActivities();
  fetchAnnouncements(false);
});
