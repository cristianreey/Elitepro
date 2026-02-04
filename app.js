(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  const closeMenu = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (
        navMenu.classList.contains("is-open") &&
        !navMenu.contains(target) &&
        !navToggle.contains(target)
      ) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Reveal
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12 },
  );
  revealEls.forEach((el) => io.observe(el));

  // Contact form
  const form = document.getElementById("contactForm");
  const copyBtn = document.getElementById("copyMailBtn");
  const ELITEPRO_EMAIL = "salvamentoelitepro@gmail.com";

  const setError = (id, msg) => {
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (err) err.textContent = msg || "";
  };

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(ELITEPRO_EMAIL);
        copyBtn.textContent = "Email copiado ✓";
        setTimeout(() => (copyBtn.textContent = "Copiar email"), 1200);
      } catch {
        window.location.href = `mailto:${ELITEPRO_EMAIL}`;
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.querySelector("#name");
      const email = form.querySelector("#email");
      const message = form.querySelector("#message");
      const community = form.querySelector("#community");

      let ok = true;
      setError("name", "");
      setError("email", "");
      setError("message", "");

      if (!name.value.trim()) {
        setError("name", "Indica tu nombre.");
        ok = false;
      }
      if (!email.value.trim() || !isEmail(email.value.trim())) {
        setError("email", "Indica un email válido.");
        ok = false;
      }
      if (!message.value.trim() || message.value.trim().length < 10) {
        setError("message", "Escribe un mensaje (mínimo 10 caracteres).");
        ok = false;
      }

      if (!ok) return;

      const subject = "Solicitud de información - ELITEPRO";
      const body =
        `Nombre: ${name.value.trim()}\n` +
        `Email: ${email.value.trim()}\n` +
        `Comunidad: ${(community?.value || "").trim()}\n\n` +
        `Mensaje:\n${message.value.trim()}\n`;

      const mailto = `mailto:${encodeURIComponent(ELITEPRO_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      const submitBtn = form.querySelector('button[type="submit"]');
      const oldText = submitBtn.textContent;
      submitBtn.textContent = "Preparando envío…";
      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = mailto;
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
      }, 250);
    });
  }
})();
