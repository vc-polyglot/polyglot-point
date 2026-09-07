const form = document.querySelector("#login-form");
const errorBox = document.querySelector("#login-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const data = new FormData(form);

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password")
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo iniciar sesión.");
    }

    location.href = "/admin/dashboard";
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }
});
