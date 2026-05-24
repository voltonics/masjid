document.addEventListener('DOMContentLoaded', () => {
    // ─── 1. Sticky Navbar ───────────────────────────────────────────────────
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // ─── 2. Hamburger Menu (Mobile) ─────────────────────────────────────────
    const hamburger = document.querySelector('.hamburger');
    const navLinks  = document.querySelector('.nav-links');
    const overlay   = document.querySelector('.overlay');

    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (overlay)   overlay.addEventListener('click', toggleMenu);

    function toggleMenu() {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    }

    // ─── 3. Dark Mode Toggle ─────────────────────────────────────────────────
    // All three toggle buttons (desktop nav, mobile nav, any future extras)
    const toggleButtons = [
        document.getElementById('theme-toggle-btn'),        // desktop nav
        document.getElementById('theme-toggle-btn-mobile'), // mobile nav
    ].filter(Boolean); // remove nulls

    const iconNav    = document.getElementById('theme-icon');
    const iconMobile = document.getElementById('theme-icon-mobile');

    const ICON_LIGHT = 'light_mode';  // displayed when in LIGHT mode (click → go dark)
    const ICON_DARK  = 'dark_mode';   // displayed when in DARK mode  (click → go light)

    /**
     * Apply a theme to the document and persist the user's choice.
     * @param {boolean} isDark   - true = dark mode
     * @param {boolean} animate  - trigger spin animation on buttons
     * @param {boolean} persist  - write to localStorage (false on initial load)
     */
    function applyTheme(isDark, animate = false, persist = true) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        if (persist) {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }

        const icon = isDark ? ICON_DARK : ICON_LIGHT;
        if (iconNav)    iconNav.textContent    = icon;
        if (iconMobile) iconMobile.textContent = icon;

        if (animate) {
            toggleButtons.forEach(btn => {
                btn.classList.add('spinning');
                btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
            });
        }
    }

    function handleToggle() {
        const currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(!currentlyDark, true, true);
    }

    toggleButtons.forEach(btn => btn.addEventListener('click', handleToggle));

    // ─── Initial theme resolution (priority: localStorage > system preference) ──
    // Note: the <head> inline script already sets data-theme to avoid FOUC.
    // Here we just sync the icons to match whatever theme is already active.
    const activeTheme = document.documentElement.getAttribute('data-theme');
    applyTheme(activeTheme === 'dark', false, false);

    // ─── 4. Prayer Times (Home page only) ───────────────────────────────────
    initPrayerTimes();
});

/* ══════════════════════════════════════════════════════════
   PRAYER TIMES MODULE
   Uses browser Geolocation + Aladhan API
   ══════════════════════════════════════════════════════════ */
function initPrayerTimes() {
    const grid         = document.getElementById('prayer-times-grid');
    const countdownEl  = document.getElementById('prayer-countdown');
    const nextNameEl   = document.getElementById('next-prayer-name');
    const cityEl       = document.getElementById('prayer-city');
    const dateEl       = document.getElementById('prayer-date');
    const hijriEl      = document.getElementById('prayer-hijri');

    if (!grid) return; // Not on home page

    const PRAYERS = [
        { key: 'Fajr',    label: 'Subuh'   },
        { key: 'Dhuhr',   label: 'Dzuhur'  },
        { key: 'Asr',     label: 'Ashar'   },
        { key: 'Maghrib', label: 'Maghrib' },
        { key: 'Isha',    label: 'Isya'    },
    ];

    let prayerMinutes = [];  // Array of { label, minutes (from midnight) }
    let countdownInterval = null;

    // ── Fetch times ─────────────────────────────────────────────────────────
    async function fetchTimes(lat, lon) {
        const today = new Date();
        const d = today.getDate().toString().padStart(2, '0');
        const m = (today.getMonth() + 1).toString().padStart(2, '0');
        const y = today.getFullYear();

        const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lon}&method=11`;
        const res  = await fetch(url);
        const data = await res.json();
        return data.data;
    }

    // ── Parse "HH:MM" → minutes since midnight ──────────────────────────────
    function toMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    // ── Format minutes → "HH:MM" ────────────────────────────────────────────
    function formatTime(timeStr) {
        const [h, m] = timeStr.split(':');
        const hh = parseInt(h);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const hh12 = ((hh % 12) || 12).toString().padStart(2, '0');
        return `${hh12}:${m} ${ampm}`;
    }

    // ── Render the prayer grid ───────────────────────────────────────────────
    function renderGrid(timings, nextIdx) {
        grid.innerHTML = '';
        PRAYERS.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'prayer-time-item' + (i === nextIdx ? ' active' : '');
            item.innerHTML = `
                <div class="p-name">${p.label}</div>
                <div class="p-time">${formatTime(timings[p.key])}</div>
            `;
            grid.appendChild(item);
        });
    }

    // ── Countdown ticker ────────────────────────────────────────────────────
    function startCountdown(targetMinutes) {
        if (countdownInterval) clearInterval(countdownInterval);

        function tick() {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const nowSec = now.getSeconds();

            let diff = (targetMinutes * 60) - (nowMin * 60 + nowSec);
            if (diff < 0) diff += 24 * 3600; // next day

            const hh = Math.floor(diff / 3600).toString().padStart(2, '0');
            const mm = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const ss = (diff % 60).toString().padStart(2, '0');

            if (countdownEl) countdownEl.textContent = `${hh}:${mm}:${ss}`;
        }

        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    // ── Main bootstrap ───────────────────────────────────────────────────────
    async function bootstrap(lat, lon, cityName) {
        try {
            const data = await fetchTimes(lat, lon);

            // City & date
            if (cityEl)  cityEl.textContent  = cityName || 'Lokasi Anda';
            const today = new Date();
            if (dateEl)  dateEl.textContent  =
                today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            // Hijri
            if (hijriEl && data.date && data.date.hijri) {
                const h = data.date.hijri;
                hijriEl.textContent = `${h.day} ${h.month.en} ${h.year} H`;
            }

            // Build prayerMinutes list
            const timings = data.timings;
            prayerMinutes = PRAYERS.map(p => ({
                label:   p.label,
                minutes: toMinutes(timings[p.key]),
            }));

            // Find next prayer
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            let nextIdx  = prayerMinutes.findIndex(p => p.minutes > nowMin);
            if (nextIdx === -1) nextIdx = 0; // all passed → Subuh tomorrow

            if (nextNameEl) nextNameEl.textContent = prayerMinutes[nextIdx].label;

            renderGrid(timings, nextIdx);
            startCountdown(prayerMinutes[nextIdx].minutes);

            // Re-render on minute boundary to update active state
            setInterval(() => {
                const nowNow = new Date().getHours() * 60 + new Date().getMinutes();
                let ni = prayerMinutes.findIndex(p => p.minutes > nowNow);
                if (ni === -1) ni = 0;
                if (nextNameEl) nextNameEl.textContent = prayerMinutes[ni].label;
                renderGrid(timings, ni);
                startCountdown(prayerMinutes[ni].minutes);
            }, 60000);

        } catch (err) {
            console.error('Prayer times fetch failed:', err);
            if (grid) grid.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.8rem;text-align:center;grid-column:1/-1;">Gagal memuat jadwal sholat.</p>';
        }
    }

    // ── Geolocation ─────────────────────────────────────────────────────────
    async function resolveCity(lat, lon) {
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const d = await r.json();
            return d.address.city || d.address.town || d.address.village || d.address.county || 'Lokasi Anda';
        } catch {
            return 'Lokasi Anda';
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                const city = await resolveCity(lat, lon);
                bootstrap(lat, lon, city);
            },
            () => {
                // Denied or failed → fallback to Jakarta
                if (cityEl) cityEl.textContent = 'Jakarta (default)';
                bootstrap(-6.2088, 106.8456, 'Jakarta');
            },
            { timeout: 8000 }
        );
    } else {
        bootstrap(-6.2088, 106.8456, 'Jakarta');
    }
}
