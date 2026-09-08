const scheduleGrid = document.querySelector("#schedule-grid");
const pastoralCard = document.querySelector("#pastoral-card");
const notices = document.querySelector("#notices");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#primary-nav");

navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function youtubeEmbedUrl(value) {
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let videoId = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);

        if (["embed", "shorts", "live"].includes(parts[0])) {
          videoId = parts[1] || null;
        }
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return "";
    }

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return "";
  }
}
async function loadHome() {
  try {
    const response = await fetch("/api/home", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("No se pudo cargar el contenido.");
    const data = await response.json();

    if (data.schedules?.length) {
      scheduleGrid.innerHTML = data.schedules.map((item) => `
        <article class="schedule-item">
          <p class="schedule-category">${escapeHtml(item.category)}</p>
          <div class="schedule-day">${escapeHtml(item.day_label)}</div>
          <div class="schedule-time">${escapeHtml(item.time_label)}</div>
          ${item.detail ? `<p class="schedule-detail">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `).join("");
    } else {
      scheduleGrid.innerHTML = `
        <article class="schedule-item">
          <p class="schedule-category">Horarios</p>
          <div class="schedule-day">Información en actualización</div>
          <div class="schedule-time">Por confirmar</div>
        </article>
      `;
    }

    if (data.pastoral) {
      const embedUrl = youtubeEmbedUrl(data.pastoral.youtube_url);

      pastoralCard.innerHTML = `
        ${data.pastoral.image_url ? `
          <figure class="pastoral-image">
            <img
              src="${escapeHtml(data.pastoral.image_url)}"
              alt="${escapeHtml(data.pastoral.image_alt || "")}"
              loading="lazy"
            >
          </figure>
        ` : ""}

        <div class="pastoral-content">
          <h3>${escapeHtml(data.pastoral.title)}</h3>
          <p class="meta">
            ${escapeHtml(data.pastoral.author_name || "San Ignacio de Loyola")}
            ${data.pastoral.published_at ? ` · ${formatDate(data.pastoral.published_at)}` : ""}
          </p>

          ${data.pastoral.excerpt ? `<p><strong>${escapeHtml(data.pastoral.excerpt)}</strong></p>` : ""}

          ${embedUrl ? `
            <div class="pastoral-video">
              <iframe
                src="${embedUrl}"
                title="${escapeHtml(data.pastoral.title)}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          ` : ""}

          <div class="body">${escapeHtml(data.pastoral.body)}</div>
        </div>
      `;
    } else {
      pastoralCard.innerHTML = `
        <h3>Mensaje pastoral</h3>
        <p class="body">El próximo mensaje semanal aparecerá aquí.</p>
      `;
    }

    if (data.notices?.length) {
      notices.hidden = false;
      notices.innerHTML = data.notices.map((notice) => `
        <div class="notice">
          <strong>${escapeHtml(notice.title)}</strong>
          <p>${escapeHtml(notice.body)}</p>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error(error);
    scheduleGrid.innerHTML = `<p>No fue posible cargar los horarios.</p>`;
    pastoralCard.innerHTML = `<p>No fue posible cargar el mensaje pastoral.</p>`;
  }
}

loadHome();
