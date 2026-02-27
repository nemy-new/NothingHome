const WEATHER_CODES = {
    0: 'CLEAR SKY', 1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
    45: 'FOG', 48: 'RIME FOG', 51: 'LIGHT DRIZZLE', 53: 'DRIZZLE', 55: 'DENSE DRIZZLE',
    61: 'LIGHT RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 71: 'LIGHT SNOW', 73: 'SNOW', 75: 'HEAVY SNOW',
    80: 'SHOWERS', 81: 'RAIN SHOWERS', 82: 'HEAVY SHOWERS', 95: 'THUNDERSTORM'
};

const internalStatus = { ram: 'SIMULATED', cpu: 'SIMULATED' };

function updateClock() {
    const clock = document.getElementById('geometric-clock');
    const miniClockEl = document.getElementById('mini-clock');
    const miniDateEl = document.getElementById('mini-date');
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    if (clock) {
        clock.querySelector('.hour').textContent = h;
        clock.querySelector('.minute').textContent = m;
    }
    if (miniClockEl) miniClockEl.textContent = `${h}:${m}`;
    if (miniDateEl) {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        miniDateEl.textContent = days[now.getDay()];
    }
}

function initBatteryGrid() {
    const grid = document.getElementById('battery-dot-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 50; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        grid.appendChild(dot);
    }
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const update = () => {
                const percent = Math.round(battery.level * 100);
                document.getElementById('batt-percent').textContent = `${percent}%`;
                document.getElementById('batt-status').textContent = battery.charging ? 'Charging' : 'Discharging';
                const dots = grid.querySelectorAll('.dot');
                const activeDots = Math.floor(battery.level * 50);
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index < activeDots);
                    dot.style.animationDelay = '0s';
                });
            };
            update();
            battery.addEventListener('levelchange', update);
            battery.addEventListener('chargingchange', update);
        }).catch(e => console.error('Battery Error:', e));
    }
}

async function fetchWeather() {
    const DEFAULT_LAT = 35.6895;
    const DEFAULT_LON = 139.6917;
    const CACHE_DURATION = 30 * 60 * 1000;

    let shouldFetch = true;

    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['lastWeather', 'weatherCacheTime'], (result) => {
            const now = Date.now();

            if (result && result.lastWeather) {
                const data = { ...result.lastWeather, isMock: result.lastWeather.isMock ?? true };
                applyWeatherData(data);

                if (result.weatherCacheTime && now - result.weatherCacheTime < CACHE_DURATION) {
                    shouldFetch = false;
                }
            }

            if (shouldFetch) {
                fetchLocationAndWeather(DEFAULT_LAT, DEFAULT_LON);
            } else {
                console.log('[Weather] Using cached data');
            }
        });
    } else {
        fetchLocationAndWeather(DEFAULT_LAT, DEFAULT_LON);
    }
}

function fetchLocationAndWeather(defaultLat, defaultLon) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => performWeatherFetch(pos.coords.latitude, pos.coords.longitude, false),
            () => performWeatherFetch(defaultLat, defaultLon, true),
            { timeout: 5000 }
        );
    } else {
        performWeatherFetch(defaultLat, defaultLon, true);
    }
}

async function performWeatherFetch(lat, lon, isMock) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const data = await response.json();
        const weatherData = { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, isMock };
        applyWeatherData(weatherData);
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                lastWeather: weatherData,
                weatherCacheTime: Date.now()
            });
        }
    } catch (e) {
        console.error('Weather Fetch Error:', e);
    }
}

function applyWeatherData(data) {
    const tempEl = document.getElementById('mini-temp');
    const descEl = document.getElementById('mini-desc');
    if (tempEl) tempEl.textContent = `${data.temp}°C`;
    if (descEl) descEl.textContent = WEATHER_CODES[data.code] || 'CLEAR';
    drawMiniWeather(data.code);
    updateStatusDisplay('weather', data.isMock ? 'SIMULATED' : 'LIVE');
}

function drawMiniWeather(code) {
    const canvas = document.getElementById('mini-weather-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 40, 40);

    // Explicitly check for light mode class on body, fallback to computed
    const isLightMode = document.body.classList.contains('theme-light');
    ctx.fillStyle = isLightMode ? '#121212' : '#ffffff';

    const spacing = 4;
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            if (Math.sqrt(i * i + j * j) <= 2) {
                ctx.beginPath();
                ctx.arc(20 + i * spacing, 20 + j * spacing, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function initRAMWidget() {
    const canvas = document.getElementById('ram-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const update = () => {
        const hasAPI = typeof chrome !== 'undefined' && chrome.system && chrome.system.memory;
        console.log('[System Check] RAM API:', hasAPI ? 'Available' : 'Missing');
        if (hasAPI) {
            chrome.system.memory.getInfo(info => {
                const ratio = (info.capacity - info.availableCapacity) / info.capacity;
                document.getElementById('ram-percent').textContent = `${Math.round(ratio * 100)}%`;
                drawCircularProgress(ctx, ratio);
                setInternalStatus('ram', 'LIVE');
            });
        } else {
            const mock = 0.45 + (Math.random() * 0.1);
            document.getElementById('ram-percent').textContent = `${Math.round(mock * 100)}%`;
            drawCircularProgress(ctx, mock);
            setInternalStatus('ram', 'SIMULATED');
        }
    };
    update(); setInterval(update, 10000);
}

function initCPUWidget() {
    const canvas = document.getElementById('cpu-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const update = () => {
        const hasAPI = typeof chrome !== 'undefined' && chrome.system && chrome.system.cpu;
        console.log('[System Check] CPU API:', hasAPI ? 'Available' : 'Missing');
        if (hasAPI) {
            chrome.system.cpu.getInfo(info => {
                let load = 0;
                info.processors.forEach(p => { if (p.usage.total > 0) load += (p.usage.user + p.usage.kernel) / p.usage.total; });
                const ratio = Math.min(1, load / info.processors.length);
                document.getElementById('cpu-load').textContent = `${Math.round(ratio * 100)}%`;
                drawCircularProgress(ctx, ratio);
                setInternalStatus('cpu', 'LIVE');
            });
        } else {
            const mock = 0.12 + (Math.random() * 0.05);
            document.getElementById('cpu-load').textContent = `${Math.round(mock * 100)}%`;
            drawCircularProgress(ctx, mock);
            setInternalStatus('cpu', 'SIMULATED');
        }
    };
    update(); setInterval(update, 5000);
}

function drawCircularProgress(ctx, val) {
    ctx.clearRect(0, 0, 80, 80);
    const color = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const trackColor = getComputedStyle(document.body).getPropertyValue('--glass-border');

    ctx.beginPath();
    ctx.arc(40, 40, 35, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(40, 40, 35, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * val));
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function setInternalStatus(key, val) {
    internalStatus[key] = val;
    updateStatusDisplay(key, val);
}

function updateStatusDisplay(widget, status) {
    const badge = document.getElementById(`status-${widget}`);
    if (badge) {
        badge.textContent = status;
        badge.className = `status-badge ${status === 'LIVE' ? 'live' : 'simulated'}`;
    }
}

function initTopSites() {
    const container = document.getElementById('top-sites-container');
    if (!container) return;

    const renderShortcuts = (customShortcuts, browserSites) => {
        container.innerHTML = '';

        // Merge custom shortcuts and browser sites, capped at 8 total
        const combined = [...customShortcuts];
        let i = 0;
        while (combined.length < 8 && i < browserSites.length) {
            combined.push(browserSites[i]);
            i++;
        }

        combined.forEach(site => {
            const item = document.createElement('a');
            item.className = 'top-site-item';
            item.href = site.url;
            item.title = site.title || site.url;

            const img = document.createElement('img');
            img.src = `/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=64`;
            img.onerror = () => {
                img.remove();
                const fb = document.createElement('span');
                fb.className = 'letter-fallback ndot';
                fb.textContent = (site.title || site.url.replace(/^https?:\/\/(www\.)?/, '')).charAt(0).toUpperCase();
                item.appendChild(fb);
            };
            item.appendChild(img);

            // Allow double-click to remove custom shortcuts
            if (site.isCustom) {
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (confirm(`Remove shortcut for ${site.title}?`)) {
                        const newShortcuts = customShortcuts.filter(s => s.url !== site.url);
                        chrome.storage.local.set({ customShortcuts: newShortcuts }, () => {
                            renderShortcuts(newShortcuts, browserSites);
                        });
                    }
                });
            }

            // If it's a custom link, use Google's favicon service
            if (site.isCustom) {
                img.src = `https://s2.googleusercontent.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64`;
            }

            container.appendChild(item);
        });

        // Add button (only if less than 8)
        if (combined.length < 8) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-shortcut-btn';
            addBtn.innerHTML = '+';
            addBtn.title = "Add custom shortcut (Double-click custom sites to remove)";
            addBtn.onclick = (e) => {
                e.preventDefault();
                document.getElementById('shortcut-modal').classList.add('active');
            };
            container.appendChild(addBtn);
        }

        // Sync the bottom AI custom shortcut button with the first custom shortcut (if any)
        const bottomShortcutBtn = document.getElementById('bottom-custom-shortcut');
        if (bottomShortcutBtn) {
            if (customShortcuts && customShortcuts.length > 0) {
                const firstCS = customShortcuts[0];
                bottomShortcutBtn.href = firstCS.url;
                bottomShortcutBtn.target = '_blank';
                bottomShortcutBtn.onclick = null; // Remove modal click

                try {
                    const urlObj = new URL(firstCS.url);
                    bottomShortcutBtn.innerHTML = `<img src="https://s2.googleusercontent.com/s2/favicons?domain=${urlObj.hostname}&sz=64" alt="Shortcut">`;
                } catch (e) { /* silent fail for invalid url */ }
            } else {
                bottomShortcutBtn.href = '#';
                bottomShortcutBtn.removeAttribute('target');
                bottomShortcutBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                `;
                bottomShortcutBtn.onclick = (e) => {
                    e.preventDefault();
                    const modal = document.getElementById('shortcut-modal');
                    if (modal) modal.classList.add('active');
                };
            }
        }
    };

    chrome.storage.local.get(['customShortcuts'], (res) => {
        const customShortcuts = res.customShortcuts || [];
        if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get(sites => {
                renderShortcuts(customShortcuts, sites);
            });
        } else {
            renderShortcuts(customShortcuts, []);
        }
    });
}

function initSettings() {
    const trigger = document.getElementById('settings-trigger');
    const drawer = document.getElementById('settings-drawer');
    const closeBtn = document.getElementById('settings-close');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const toggles = document.querySelectorAll('.nothing-switch input[data-toggle]');

    if (trigger && drawer) trigger.onclick = () => drawer.classList.add('open');
    if (closeBtn && drawer) closeBtn.onclick = () => drawer.classList.remove('open');

    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['widgetStates', 'theme'], (res) => {
            const states = res.widgetStates || {};

            // Standard widget visibility toggles
            toggles.forEach(chk => {
                const key = chk.getAttribute('data-toggle');

                // Specific default overrides: Custom shortcut is initially OFF
                if (key === 'ai-custom') {
                    chk.checked = states[key] === true;
                } else {
                    chk.checked = states[key] !== false;
                }

                const el = document.querySelector(`[data-widget="${key}"]`);
                if (el) el.classList.toggle('widget-hidden', !chk.checked);
                chk.onchange = () => {
                    const toggleEl = document.querySelector(`[data-widget="${key}"]`);
                    if (toggleEl) toggleEl.classList.toggle('widget-hidden', !chk.checked);
                    saveWidgetStates();
                };
            });

            // New CSS class toggles (hover, blink, etc)
            const classToggles = document.querySelectorAll('.nothing-switch input[data-toggle-class]');
            classToggles.forEach(chk => {
                const cls = chk.getAttribute('data-toggle-class');
                const invert = chk.getAttribute('data-invert') === 'true'; // If checked=true means class is REMOVED

                // Default to checked (feature enabled, class removed), except hover effects which default to off
                if (cls === 'no-hover-effects') {
                    chk.checked = states[cls] === true;
                } else {
                    chk.checked = states[cls] !== false;
                }

                if (invert) {
                    document.body.classList.toggle(cls, !chk.checked);
                } else {
                    document.body.classList.toggle(cls, chk.checked);
                }

                chk.onchange = () => {
                    if (invert) {
                        document.body.classList.toggle(cls, !chk.checked);
                    } else {
                        document.body.classList.toggle(cls, chk.checked);
                    }
                    saveWidgetStates();
                };
            });

            const isLight = res.theme === 'light';
            if (themeCheckbox) {
                themeCheckbox.checked = isLight;
                document.body.classList.toggle('theme-light', isLight);
                document.body.classList.toggle('theme-dark', !isLight);
            }
        });
    }

    function saveWidgetStates() {
        const newStates = {};
        document.querySelectorAll('.nothing-switch input[data-toggle]').forEach(c => {
            newStates[c.getAttribute('data-toggle')] = c.checked;
        });
        document.querySelectorAll('.nothing-switch input[data-toggle-class]').forEach(c => {
            newStates[c.getAttribute('data-toggle-class')] = c.checked;
        });
        chrome.storage.local.set({ widgetStates: newStates });
    }

    if (themeCheckbox) {
        themeCheckbox.onchange = (e) => {
            const light = e.target.checked;
            document.body.classList.toggle('theme-light', light);
            document.body.classList.toggle('theme-dark', !light);
            chrome.storage.local.set({ theme: light ? 'light' : 'dark' });

            // Redraw everything to catch new colors
            setTimeout(() => {
                initRAMWidget();
                initCPUWidget();
                const temp = document.getElementById('mini-temp')?.textContent;
                if (temp) {
                    const code = WEATHER_CODES['CLEAR SKY']; // Just forces a redraw
                    drawMiniWeather(0);
                }
            }, 50);
        };
    }
}

function initMemo() {
    const input = document.getElementById('memo-input');
    if (!input) return;

    // Load
    chrome.storage.local.get(['quickMemo'], (res) => {
        if (res.quickMemo) input.value = res.quickMemo;
    });

    // Save
    input.addEventListener('input', () => {
        chrome.storage.local.set({ quickMemo: input.value });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Debug] App Started');
    if (typeof chrome !== 'undefined' && chrome.permissions) {
        chrome.permissions.getAll(p => console.log('[Debug] Active Permissions:', p.permissions));
    }
    updateClock();
    initBatteryGrid();
    initRAMWidget();
    initCPUWidget();
    fetchWeather();
    initTopSites();
    initSettings();
    initShortcutModal();
    initMemo();
    initWallpaper();
    initSearch(); // Added search initialization
    setInterval(updateClock, 1000);
});

function initShortcutModal() {
    const modal = document.getElementById('shortcut-modal');
    const cancelBtn = document.getElementById('shortcut-cancel');
    const saveBtn = document.getElementById('shortcut-save');
    const nameInput = document.getElementById('shortcut-name');
    const urlInput = document.getElementById('shortcut-url');
    const settingsTriggerBtn = document.getElementById('settings-shortcut-trigger');

    if (!modal) return;

    if (settingsTriggerBtn) {
        settingsTriggerBtn.onclick = () => {
            document.getElementById('settings-drawer').classList.remove('open');
            modal.classList.add('active');
        };
    }

    cancelBtn.onclick = () => {
        modal.classList.remove('active');
        nameInput.value = '';
        urlInput.value = '';
    };

    saveBtn.onclick = () => {
        let url = urlInput.value.trim();
        const name = nameInput.value.trim();

        if (!url) return alert('URL is required');
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        chrome.storage.local.get(['customShortcuts'], (res) => {
            const arr = res.customShortcuts || [];
            if (arr.length >= 8) return alert('Maximum shortcuts reached');

            arr.push({ title: name || url, url: url, isCustom: true });
            chrome.storage.local.set({ customShortcuts: arr }, () => {
                modal.classList.remove('active');
                nameInput.value = '';
                urlInput.value = '';
                initTopSites(); // Re-render
            });
        });
    };
}

function initWallpaper() {
    const input = document.getElementById('wallpaper-input');
    const trigger = document.getElementById('wallpaper-trigger');
    const reset = document.getElementById('wallpaper-reset');
    const bgLayer = document.querySelector('.background-layer');

    if (trigger && input) {
        trigger.onclick = () => {
            console.log('[Wallpaper] Triggering file input');
            input.click();
        };
    }

    const applyBG = (dataUrl) => {
        if (dataUrl) {
            bgLayer.style.setProperty('--custom-bg', `url(${dataUrl})`);
        } else {
            bgLayer.style.removeProperty('--custom-bg');
        }
    };

    // Load saved
    chrome.storage.local.get(['customWallpaper'], (res) => {
        if (res.customWallpaper) applyBG(res.customWallpaper);
    });

    if (input) {
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                chrome.storage.local.set({ customWallpaper: dataUrl }, () => {
                    if (chrome.runtime.lastError) {
                        alert('Storage limit exceeded. Try a smaller image.');
                        return;
                    }
                    applyBG(dataUrl);
                });
            };
            reader.readAsDataURL(file);
        };
    }

    if (reset) {
        reset.onclick = () => {
            chrome.storage.local.remove('customWallpaper', () => {
                applyBG(null);
            });
        };
    }
}

function initSearch() {
    const searchInput = document.getElementById('main-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                if (typeof chrome !== 'undefined' && chrome.search) {
                    chrome.search.query({ text: query, disposition: 'CURRENT_TAB' }, () => {
                        // Optional: Clear input or handle errors if search fails
                    });
                } else {
                    // Fallback for local testing outside extension environment
                    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                }
            }
        }
    });
}
