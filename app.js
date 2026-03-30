/* Shop Account Manager - Core Application */

// ===== PASSWORD GATE =====
const SESSION_KEY = 'sam_auth_token';

async function checkPassword() {
    const input = document.getElementById('gate-password').value;
    const err = document.getElementById('gate-error');
    err.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/dashboard/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: input })
        });
        const data = await res.json();
        if (data.ok) {
            sessionStorage.setItem(SESSION_KEY, data.token);
            API_TOKEN = data.token;
            document.getElementById('password-gate').style.display = 'none';
            await loadData();
            renderAll();
        } else {
            throw new Error(data.error || 'Sai mật khẩu!');
        }
    } catch(e) {
        err.style.display = 'block';
        err.textContent = '❌ ' + e.message;
        document.getElementById('gate-password').value = '';
        document.getElementById('gate-password').focus();
        document.getElementById('password-gate').classList.add('gate-shake');
        setTimeout(() => document.getElementById('password-gate').classList.remove('gate-shake'), 500);
    }
}

function initPasswordGate() {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
        API_TOKEN = saved;
        document.getElementById('password-gate').style.display = 'none';
        return true;
    } else {
        document.getElementById('password-gate').style.display = 'flex';
        setTimeout(() => document.getElementById('gate-password').focus(), 100);
        return false;
    }
}

const DB_KEY = 'netflix_accounts_db';
let accounts = [];
let currentFilter = 'all';
let serviceFilter = 'all';
let searchQuery = '';
let openDropdownId = null;

// ===== SERVICE CONFIG =====
const SERVICE_META = {
    netflix:  { label: 'Netflix',          emoji: '🎬', color: 'red-n'   },
    spotify:  { label: 'Spotify',          emoji: '🎵', color: 'green'  },
    youtube:  { label: 'YouTube Premium',  emoji: '▶️', color: 'red'    },
    discord:  { label: 'Discord Nitro',    emoji: '💙', color: 'purple' },
    other:    { label: 'Khác',             emoji: '📦', color: 'blue'   }
};

// ===== DATA =====
const API_BASE_URL = 'http://node.sang0023.io.vn:2753';
let API_TOKEN = '';

async function loadData() {
    try {
        const res = await fetch(`${API_BASE_URL}/dashboard/api/accounts`, {
            headers: { 'x-dashboard-token': API_TOKEN }
        });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        if (data.ok) accounts = data.accounts || [];
        else accounts = [];
    } catch(e) { 
        console.error('Failed to load API, fallback to local', e);
        try {
            const raw = localStorage.getItem(DB_KEY);
            accounts = raw ? JSON.parse(raw) : [];
        } catch(err) { accounts = []; }
    }
}

async function apiSaveAccount(acc, isNew) {
    const url = isNew ? `${API_BASE_URL}/dashboard/api/accounts` : `${API_BASE_URL}/dashboard/api/accounts/${acc.id}`;
    fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'x-dashboard-token': API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(acc)
    }).catch(e => console.error(e));
}

async function apiDeleteAccount(id) {
    fetch(`${API_BASE_URL}/dashboard/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'x-dashboard-token': API_TOKEN }
    }).catch(e => console.error(e));
}

function saveData() {
    localStorage.setItem(DB_KEY, JSON.stringify(accounts));
}
function genId() {
    return 'CR_W_' + Math.floor(Math.random()*1000000);
}

// ===== ACCOUNT STATUS =====
function getAccountStatus(acc) {
    const now = new Date();
    const expiry = new Date(acc.expiryDate);
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { status: 'expired', days: 0, label: 'Hết Hạn', color: 'red' };
    if (diffDays <= 7) return { status: 'warning', days: diffDays, label: 'Sắp Hết', color: 'yellow' };
    return { status: 'active', days: diffDays, label: 'Hoạt Động', color: 'green' };
}

function getProgressPercent(acc) {
    const start = new Date(acc.startDate).getTime();
    const end = new Date(acc.expiryDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    if (total <= 0) return 0;
    const remaining = Math.max(0, 100 - (elapsed / total) * 100);
    return Math.min(100, Math.max(0, remaining));
}

// ===== RENDER =====
function renderAll() {
    updateStats();
    renderCards();
    renderChart();
}

let dashboardChart = null;
function renderChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const count = { netflix: 0, spotify: 0, youtube: 0, discord: 0, other: 0 };
    accounts.forEach(a => {
        const t = a.service || 'netflix';
        if (count[t] !== undefined) count[t]++;
        else count.other++;
    });

    const data = {
        labels: ['Netflix', 'Spotify', 'YouTube', 'Discord', 'Khác'],
        datasets: [{
            label: 'Số dư tài khoản',
            data: [count.netflix, count.spotify, count.youtube, count.discord, count.other],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(100, 116, 139, 0.8)'
            ],
            borderColor: 'transparent',
            borderRadius: 6
        }]
    };

    if (dashboardChart) {
        dashboardChart.data = data;
        dashboardChart.update();
    } else {
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'PHÂN BỔ DỊCH VỤ CREAME STORE', color: '#94a3b8', font: { size: 14, weight: '700' } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

function updateStats() {
    let total = accounts.length, active = 0, warning = 0, expired = 0;
    accounts.forEach(a => {
        const s = getAccountStatus(a);
        if (s.status === 'active') active++;
        else if (s.status === 'warning') warning++;
        else expired++;
    });
    document.getElementById('stat-total-num').textContent = total;
    document.getElementById('stat-active-num').textContent = active;
    document.getElementById('stat-warning-num').textContent = warning;
    document.getElementById('stat-expired-num').textContent = expired;

    // Update tab counts
    document.getElementById('tab-count-all').textContent = total;
    document.getElementById('tab-count-active').textContent = active;
    document.getElementById('tab-count-warning').textContent = warning;
    document.getElementById('tab-count-expired').textContent = expired;

    // Update notification bell
    updateNotifications(warning, expired);
}

function filterAccounts() {
    let filtered = [...accounts];

    // Status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => getAccountStatus(a).status === currentFilter);
    }

    // Service filter
    if (serviceFilter !== 'all') {
        filtered = filtered.filter(a => (a.service || 'netflix') === serviceFilter);
    }

    // Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a => {
            const svcLabel = (SERVICE_META[a.service || 'netflix']?.label || '').toLowerCase();
            return (a.email || '').toLowerCase().includes(q) ||
                (a.profileName || '').toLowerCase().includes(q) ||
                (a.customerName || '').toLowerCase().includes(q) ||
                (a.customerDiscord || '').toLowerCase().includes(q) ||
                (a.customerGmail || '').toLowerCase().includes(q) ||
                svcLabel.includes(q);
        });
    }

    // Apply sort
    const sort = (document.getElementById('sort-select') || {}).value || 'newest';
    filtered.sort((a, b) => {
        if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sort === 'expiry-asc') return new Date(a.expiryDate) - new Date(b.expiryDate);
        if (sort === 'expiry-desc') return new Date(b.expiryDate) - new Date(a.expiryDate);
        if (sort === 'name-asc') return (a.customerName || '').localeCompare(b.customerName || '');
        if (sort === 'name-desc') return (b.customerName || '').localeCompare(a.customerName || '');
        return 0;
    });

    return filtered;
}

function formatDate(d) {
    if (!d) return '--';
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d) {
    if (!d) return '--';
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderCards() {
    const grid = document.getElementById('cards-grid');
    const empty = document.getElementById('empty-state');
    const filtered = filterAccounts();

    if (filtered.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    grid.style.display = 'grid';
    empty.style.display = 'none';

    grid.innerHTML = filtered.map((acc, i) => {
        const st = getAccountStatus(acc);
        const pct = getProgressPercent(acc);
        const renCount = (acc.history || []).length;
        const svc = SERVICE_META[acc.service || 'netflix'];
        return `
        <div class="account-card status-${st.status}" style="animation-delay:${i * 0.05}s" data-id="${acc.id}">
            <div class="card-content">
                <div class="card-top-row">
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                        <span class="card-status-badge badge-${st.status}">
                            <span class="badge-dot"></span>
                            ${st.label}
                        </span>
                        <span class="service-badge">${svc.emoji} ${svc.label}</span>
                    </div>
                    <div class="card-actions-dropdown">
                        <button class="card-menu-btn" onclick="toggleDropdown('${acc.id}', event)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                        </button>
                        <div class="card-dropdown" id="dropdown-${acc.id}">
                            <button class="dropdown-item" onclick="openDetailModal('${acc.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                Xem Chi Tiết
                            </button>
                            <button class="dropdown-item" onclick="openEditModal('${acc.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Chỉnh Sửa
                            </button>
                            <button class="dropdown-item success" onclick="openRenewModal('${acc.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                Gia Hạn
                            </button>
                            <button class="dropdown-item" onclick="openHistoryModal('${acc.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Lịch Sử (${renCount})
                            </button>
                            <button class="dropdown-item danger" onclick="openDeleteModal('${acc.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-account-email">${escHtml(acc.email)}</div>
                <div class="card-profile-info">
                    <span>👤 ${escHtml(acc.profileName)}</span>
                    ${acc.pin ? `<span class="separator"></span><span>🔒 PIN: ${escHtml(acc.pin)}</span>` : ''}
                </div>

                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Khách Hàng</span>
                        <span class="detail-value">${escHtml(acc.customerName)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Discord</span>
                        <span class="detail-value">${escHtml(acc.customerDiscord || '—')}</span>
                    </div>
                    ${acc.customerGmail ? `<div class="detail-item" style="grid-column:span 2">
                        <span class="detail-label">Gmail KH</span>
                        <span class="detail-value">${escHtml(acc.customerGmail)}</span>
                    </div>` : ''}
                    ${acc.service === 'spotify' && (acc.spotifyOwner || acc.spotifyMember) ? `
                    <div class="detail-item">
                        <span class="detail-label">🎵 Chủ Gói</span>
                        <span class="detail-value">${escHtml(acc.spotifyOwner || '—')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🎵 Thành Viên</span>
                        <span class="detail-value">${escHtml(acc.spotifyMember || '—')}</span>
                    </div>` : ''}
                    ${(() => {
                        if (acc.service !== 'discord') return '';
                        const nextRen = getNextRenewalDate(acc);
                        if (!nextRen) return '';
                        const daysUntil = Math.ceil((nextRen - new Date()) / (1000 * 60 * 60 * 24));
                        const urgentClass = daysUntil <= 5 ? 'discord-renew-urgent' : 'discord-renew-ok';
                        return `
                        <div class="detail-item" style="grid-column:span 2">
                            <span class="detail-label">💙 Gmail Google Pay</span>
                            <span class="detail-value">${escHtml(acc.discordPaymentGmail || '—')}</span>
                        </div>
                        <div class="detail-item" style="grid-column:span 2">
                            <span class="detail-label">💙 Gia Hạn Tiếp Theo</span>
                            <span class="detail-value ${urgentClass}">${formatDate(nextRen.toISOString())} <small>(còn ${daysUntil} ngày)</small></span>
                        </div>`;
                    })()}
                </div>

                <div class="card-countdown">
                    <div class="countdown-header">
                        <span class="countdown-label">${st.status === 'expired' ? '⚠️ Đã Hết Hạn' : 'Thời gian còn lại'}</span>
                        <span class="countdown-days text-${st.color}">${st.days} ngày</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill fill-${st.color}" style="width:${pct}%"></div>
                    </div>
                    <div class="countdown-dates">
                        <span>Bắt đầu: ${formatDate(acc.startDate)}</span>
                        <span>Hết hạn: ${formatDate(acc.expiryDate)}</span>
                    </div>
                </div>

                <div class="card-bottom">
                    ${st.status === 'expired' ? 
                        `<button class="btn btn-success btn-sm" onclick="openRenewModal('${acc.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            Gia Hạn Ngay
                        </button>` :
                        `<button class="btn btn-ghost btn-sm" onclick="openDetailModal('${acc.id}')">Chi Tiết</button>`
                    }
                    <button class="btn btn-ghost btn-sm" onclick="openHistoryModal('${acc.id}')">Lịch Sử</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function escHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function closeModalOnOverlay(e, id) { if (e.target === e.currentTarget) closeModal(id); }

// ===== DROPDOWN =====
function toggleDropdown(accId, e) {
    e.stopPropagation();
    const dd = document.getElementById('dropdown-' + accId);
    if (openDropdownId && openDropdownId !== accId) {
        const prev = document.getElementById('dropdown-' + openDropdownId);
        if (prev) prev.classList.remove('show');
    }
    dd.classList.toggle('show');
    openDropdownId = dd.classList.contains('show') ? accId : null;
}
document.addEventListener('click', () => {
    if (openDropdownId) {
        const dd = document.getElementById('dropdown-' + openDropdownId);
        if (dd) dd.classList.remove('show');
        openDropdownId = null;
    }
});


function handleServiceChange() {
    const svc = document.getElementById('form-service').value;
    const spotifyFields = document.getElementById('spotify-fields');
    const discordFields = document.getElementById('discord-fields');
    const pinWrap = document.getElementById('field-pin-wrap');
    // Spotify family fields
    if (spotifyFields) spotifyFields.style.display = svc === 'spotify' ? 'block' : 'none';
    // Discord Nitro renewal fields
    if (discordFields) discordFields.style.display = svc === 'discord' ? 'block' : 'none';
    // PIN only relevant for Netflix profiles
    if (pinWrap) pinWrap.style.display = svc === 'netflix' ? 'grid' : 'none';
}

// Calculate next renewal date for Discord Nitro
function getNextRenewalDate(acc) {
    if ((acc.service || 'netflix') !== 'discord') return null;
    const cycle = acc.discordRenewalCycle || 2;
    const start = new Date(acc.startDate);
    const now = new Date();
    let next = new Date(start);
    while (next <= now) {
        next.setMonth(next.getMonth() + cycle);
    }
    return next;
}

function openAddModal() {
    document.getElementById('modal-account-title').textContent = 'Thêm Tài Khoản Mới';
    document.getElementById('btn-submit-account').textContent = 'Thêm Tài Khoản';
    document.getElementById('form-edit-id').value = '';
    document.getElementById('account-form').reset();
    document.getElementById('form-service').value = 'netflix';
    handleServiceChange();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('form-start-date').value = today;
    openModal('modal-account');
}

function openEditModal(id) {
    closeAllDropdowns();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('modal-account-title').textContent = 'Chỉnh Sửa Tài Khoản';
    document.getElementById('btn-submit-account').textContent = 'Lưu Thay Đổi';
    document.getElementById('form-edit-id').value = id;
    document.getElementById('form-email').value = acc.email || '';
    document.getElementById('form-password').value = acc.password || '';
    document.getElementById('form-profile').value = acc.profileName || '';
    document.getElementById('form-pin').value = acc.pin || '';
    document.getElementById('form-service').value = acc.service || 'netflix';
    handleServiceChange();
    document.getElementById('form-customer').value = acc.customerName || '';
    document.getElementById('form-discord').value = acc.customerDiscord || '';
    document.getElementById('form-customer-gmail').value = acc.customerGmail || '';
    document.getElementById('form-spotify-owner').value = acc.spotifyOwner || '';
    document.getElementById('form-spotify-member').value = acc.spotifyMember || '';
    document.getElementById('form-discord-payment-gmail').value = acc.discordPaymentGmail || '';
    document.getElementById('form-discord-renewal-cycle').value = acc.discordRenewalCycle || 2;
    document.getElementById('form-months').value = acc.monthsPurchased || 1;
    document.getElementById('form-start-date').value = acc.startDate ? acc.startDate.split('T')[0] : '';
    openModal('modal-account');
}

function handleAccountSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('form-edit-id').value;
    const service = document.getElementById('form-service').value || 'netflix';
    const email = document.getElementById('form-email').value.trim();
    const password = document.getElementById('form-password').value.trim();
    const profileName = document.getElementById('form-profile').value.trim();
    const pin = document.getElementById('form-pin').value.trim();
    const customerName = document.getElementById('form-customer').value.trim();
    const customerDiscord = document.getElementById('form-discord').value.trim();
    const customerGmail = document.getElementById('form-customer-gmail').value.trim();
    const spotifyOwner = document.getElementById('form-spotify-owner').value.trim();
    const spotifyMember = document.getElementById('form-spotify-member').value.trim();
    const discordPaymentGmail = document.getElementById('form-discord-payment-gmail').value.trim();
    const discordRenewalCycle = parseInt(document.getElementById('form-discord-renewal-cycle').value) || 2;
    const months = parseInt(document.getElementById('form-months').value) || 1;
    const startDate = document.getElementById('form-start-date').value;

    if (!email || !password || !customerName || !startDate) {
        showToast('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    const start = new Date(startDate);
    const expiry = new Date(start);
    expiry.setMonth(expiry.getMonth() + months);

    if (editId) {
        const idx = accounts.findIndex(a => a.id === editId);
        if (idx === -1) return;
        accounts[idx] = {
            ...accounts[idx], service, email, password, profileName, pin,
            customerName, customerDiscord, customerGmail,
            spotifyOwner, spotifyMember,
            discordPaymentGmail, discordRenewalCycle,
            monthsPurchased: months,
            startDate: start.toISOString(), expiryDate: expiry.toISOString()
        };
        apiSaveAccount(accounts[idx], false);
        showToast('Đã cập nhật tài khoản lên hệ thống bot!', 'success');
    } else {
        const newAcc = {
            id: genId(), service, email, password, profileName, pin,
            customerName, customerDiscord, customerGmail,
            spotifyOwner, spotifyMember,
            discordPaymentGmail, discordRenewalCycle,
            monthsPurchased: months,
            startDate: start.toISOString(), expiryDate: expiry.toISOString(),
            createdAt: new Date().toISOString(),
            history: [{
                id: genId(), type: 'initial', date: new Date().toISOString(),
                months, startDate: start.toISOString(), expiryDate: expiry.toISOString(),
                accountEmail: email
            }]
        };
        accounts.unshift(newAcc);
        apiSaveAccount(newAcc, true);
        showToast('Đã thêm tài khoản mới vào hệ thống bot!', 'success');
    }

    saveData();
    renderAll();
    closeModal('modal-account');
}

// ===== RENEW =====
function openRenewModal(id) {
    closeAllDropdowns();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const st = getAccountStatus(acc);
    document.getElementById('renew-account-id').value = id;
    document.getElementById('renew-info').innerHTML = `
        <div class="renew-info-row"><span>Tài khoản:</span><span>${escHtml(acc.email)}</span></div>
        <div class="renew-info-row"><span>Khách hàng:</span><span>${escHtml(acc.customerName)}</span></div>
        <div class="renew-info-row"><span>Trạng thái:</span><span style="color:var(--${st.color})">${st.label}</span></div>
        <div class="renew-info-row"><span>Hết hạn:</span><span>${formatDate(acc.expiryDate)}</span></div>
        <div class="renew-info-row"><span>Số lần thuê:</span><span>${(acc.history||[]).length} lần</span></div>
    `;
    document.getElementById('renew-months').value = '';
    openModal('modal-renew');
}

function handleRenewSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('renew-account-id').value;
    const months = parseInt(document.getElementById('renew-months').value) || 0;
    if (months <= 0) { showToast('Vui lòng nhập số tháng hợp lệ!', 'error'); return; }
    
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return;
    
    const acc = accounts[idx];
    const now = new Date();
    const currentExpiry = new Date(acc.expiryDate);
    const newStart = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(newStart);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    acc.startDate = newStart.toISOString();
    acc.expiryDate = newExpiry.toISOString();
    acc.monthsPurchased = months;

    if (!acc.history) acc.history = [];
    acc.history.push({
        id: genId(), type: 'renewal', date: now.toISOString(),
        months, startDate: newStart.toISOString(), expiryDate: newExpiry.toISOString(),
        accountEmail: acc.email
    });

    apiSaveAccount(acc, false);
    saveData();
    renderAll();
    closeModal('modal-renew');
    showToast(`Đã gia hạn ${months} tháng cho ${acc.customerName}!`, 'success');
}

// ===== HISTORY =====
function openHistoryModal(id) {
    closeAllDropdowns();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const history = acc.history || [];
    
    document.getElementById('history-title').textContent = `Lịch Sử - ${acc.customerName}`;
    
    const totalMonths = history.reduce((s, h) => s + (h.months || 0), 0);
    document.getElementById('history-stats').innerHTML = `
        <div class="history-stat-item">
            <div class="history-stat-number">${history.length}</div>
            <div class="history-stat-label">Số Lần Thuê</div>
        </div>
        <div class="history-stat-item">
            <div class="history-stat-number">${totalMonths}</div>
            <div class="history-stat-label">Tổng Số Tháng</div>
        </div>
        <div class="history-stat-item">
            <div class="history-stat-number">${acc.customerDiscord}</div>
            <div class="history-stat-label">Discord ID</div>
        </div>
    `;

    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('history-timeline').innerHTML = sorted.length === 0 ?
        '<p style="color:var(--text3);text-align:center;padding:20px">Chưa có lịch sử</p>' :
        sorted.map(h => `
            <div class="timeline-item">
                <div class="timeline-dot ${h.type === 'initial' ? 'dot-initial' : 'dot-renewal'}"></div>
                <div class="timeline-content">
                    <span class="timeline-tag ${h.type === 'initial' ? 'tag-initial' : 'tag-renewal'}">
                        ${h.type === 'initial' ? 'Đăng ký mới' : 'Gia hạn'}
                    </span>
                    <div class="timeline-date">${formatDateTime(h.date)}</div>
                    <div class="timeline-detail">
                        <strong>${h.months} tháng</strong> — Tài khoản: ${escHtml(h.accountEmail)}<br>
                        Từ ${formatDate(h.startDate)} đến ${formatDate(h.expiryDate)}
                    </div>
                </div>
            </div>
        `).join('');

    openModal('modal-history');
}

// ===== DETAIL =====
function openDetailModal(id) {
    closeAllDropdowns();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const st = getAccountStatus(acc);
    const svc = SERVICE_META[acc.service || 'netflix'];
    const copyBtn = (val) => `<button class="copy-detail-btn" onclick="copyText('${escHtml(val)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
    document.getElementById('detail-body').innerHTML = `
        <div class="detail-grid">
            <div class="detail-block detail-block-full">
                <div class="detail-block-label">Dịch Vụ</div>
                <div class="detail-block-value">
                    <span class="service-badge" style="font-size:13px;padding:4px 14px">${svc.emoji} ${svc.label}</span>
                    <span style="color:var(--${st.color});font-size:13px;margin-left:8px">${st.label} (${st.days} ngày)</span>
                </div>
            </div>
            <div class="detail-block">
                <div class="detail-block-label">Tài Khoản</div>
                <div class="detail-block-value">${escHtml(acc.email)} ${copyBtn(acc.email)}</div>
            </div>
            <div class="detail-block">
                <div class="detail-block-label">Mật Khẩu</div>
                <div class="detail-block-value">${escHtml(acc.password)} ${copyBtn(acc.password)}</div>
            </div>
            ${acc.profileName ? `
            <div class="detail-block">
                <div class="detail-block-label">Profile</div>
                <div class="detail-block-value">${escHtml(acc.profileName)}</div>
            </div>` : ''}
            ${acc.pin ? `
            <div class="detail-block">
                <div class="detail-block-label">PIN</div>
                <div class="detail-block-value">${escHtml(acc.pin)}</div>
            </div>` : ''}
            <div class="detail-block">
                <div class="detail-block-label">Khách Hàng</div>
                <div class="detail-block-value">${escHtml(acc.customerName)}</div>
            </div>
            <div class="detail-block">
                <div class="detail-block-label">Discord</div>
                <div class="detail-block-value">${escHtml(acc.customerDiscord || '—')} ${acc.customerDiscord ? copyBtn(acc.customerDiscord) : ''}</div>
            </div>
            ${acc.customerGmail ? `
            <div class="detail-block detail-block-full">
                <div class="detail-block-label">Gmail Khách Hàng</div>
                <div class="detail-block-value">${escHtml(acc.customerGmail)} ${copyBtn(acc.customerGmail)}</div>
            </div>` : ''}
            ${acc.service === 'spotify' && acc.spotifyOwner ? `
            <div class="detail-block">
                <div class="detail-block-label">🎵 Email Chủ Gói</div>
                <div class="detail-block-value">${escHtml(acc.spotifyOwner)} ${copyBtn(acc.spotifyOwner)}</div>
            </div>` : ''}
            ${acc.service === 'discord' && acc.discordPaymentGmail ? `
            <div class="detail-block detail-block-full">
                <div class="detail-block-label">💙 Gmail Google Pay (vào gia hạn)</div>
                <div class="detail-block-value">${escHtml(acc.discordPaymentGmail)} ${copyBtn(acc.discordPaymentGmail)}</div>
            </div>` : ''}
            ${(() => {
                if (acc.service !== 'discord') return '';
                const nextRen = getNextRenewalDate(acc);
                if (!nextRen) return '';
                const daysUntil = Math.ceil((nextRen - new Date()) / (1000 * 60 * 60 * 24));
                const cls = daysUntil <= 5 ? 'discord-renew-urgent' : 'discord-renew-ok';
                return `
                <div class="detail-block detail-block-full">
                    <div class="detail-block-label">💙 Lịch Gia Hạn Tiếp Theo (mỗi ${acc.discordRenewalCycle || 2} tháng)</div>
                    <div class="detail-block-value ${cls}">${formatDate(nextRen.toISOString())} <small>(còn ${daysUntil} ngày)</small></div>
                </div>`;
            })()}
            <div class="detail-block">
                <div class="detail-block-label">Số Lần Thuê</div>
                <div class="detail-block-value">${(acc.history||[]).length} lần</div>
            </div>
            <div class="detail-block detail-block-full">
                <div class="detail-block-label">Thời Hạn</div>
                <div class="detail-block-value">${formatDate(acc.startDate)} → ${formatDate(acc.expiryDate)} (${acc.monthsPurchased} tháng)</div>
            </div>
        </div>
    `;
    openModal('modal-detail');
}

// ===== DELETE =====
function openDeleteModal(id) {
    closeAllDropdowns();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('delete-account-id').value = id;
    document.getElementById('delete-account-name').textContent = acc.email;
    openModal('modal-delete');
}

function confirmDelete() {
    const id = document.getElementById('delete-account-id').value;
    accounts = accounts.filter(a => a.id !== id);
    apiDeleteAccount(id);
    saveData();
    renderAll();
    closeModal('modal-delete');
    showToast('Đã xóa tài khoản!', 'info');
}

// ===== UTILITIES =====
function closeAllDropdowns() {
    document.querySelectorAll('.card-dropdown.show').forEach(d => d.classList.remove('show'));
    openDropdownId = null;
}

function togglePassword(inputId, btn) {
    const inp = document.getElementById(inputId);
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!', 'success'))
        .catch(() => showToast('Không thể sao chép', 'error'));
}

function handleSearch() {
    searchQuery = document.getElementById('search-input').value;
    renderCards();
}

function handleSort() {
    renderCards();
}

function handleServiceFilter() {
    serviceFilter = (document.getElementById('service-filter-select') || {}).value || 'all';
    renderCards();
}

function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === f);
    });
    renderCards();
}

// ===== NOTIFICATIONS =====
function updateNotifications(warningCount, expiredCount) {
    const badge = document.getElementById('bell-badge');
    const countText = document.getElementById('notification-count-text');
    const list = document.getElementById('notification-list');

    // Count Discord renewals due within 5 days
    const discordSoon = accounts.filter(a => {
        if ((a.service || 'netflix') !== 'discord') return false;
        const next = getNextRenewalDate(a);
        if (!next) return false;
        return Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24)) <= 5;
    });

    const total = warningCount + expiredCount + discordSoon.length;

    if (total === 0) {
        badge.style.display = 'none';
        countText.textContent = '0 cảnh báo';
        list.innerHTML = '<div class="notification-empty">Không có thông báo</div>';
        return;
    }

    badge.style.display = 'flex';
    badge.textContent = total;
    countText.textContent = `${total} cảnh báo`;

    const items = [];

    // Expired accounts
    accounts.filter(a => getAccountStatus(a).status === 'expired').forEach(a => {
        items.push(`
            <div class="notification-item notif-expired" onclick="openDetailModal('${a.id}');toggleNotificationPanel(event)">
                <div class="notif-icon notif-icon-expired">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div class="notif-body">
                    <div class="notif-title">Đã Hết Hạn</div>
                    <div class="notif-sub">${escHtml(a.customerName)} — ${escHtml(a.email)}</div>
                </div>
            </div>`);
    });

    // Warning accounts (expiring within 7 days)
    accounts.filter(a => getAccountStatus(a).status === 'warning').forEach(a => {
        const st = getAccountStatus(a);
        items.push(`
            <div class="notification-item notif-warning" onclick="openDetailModal('${a.id}');toggleNotificationPanel(event)">
                <div class="notif-icon notif-icon-warning">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div class="notif-body">
                    <div class="notif-title">Còn ${st.days} ngày</div>
                    <div class="notif-sub">${escHtml(a.customerName)} — ${escHtml(a.email)}</div>
                </div>
            </div>`);
    });

    // Discord Nitro renewal alerts
    discordSoon.forEach(a => {
        const next = getNextRenewalDate(a);
        const days = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
        const gmail = a.discordPaymentGmail ? ` (→ ${a.discordPaymentGmail})` : '';
        items.push(`
            <div class="notification-item notif-discord" onclick="openDetailModal('${a.id}');toggleNotificationPanel(event)">
                <div class="notif-icon notif-icon-discord">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div class="notif-body">
                    <div class="notif-title">💙 Cần Gia Hạn Discord (còn ${days} ngày)</div>
                    <div class="notif-sub">${escHtml(a.customerName)}${gmail}</div>
                </div>
            </div>`);
    });

    list.innerHTML = items.join('');
}

function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('show');
}

document.addEventListener('click', e => {
    const wrapper = document.getElementById('notification-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('notification-panel').classList.remove('show');
    }
});

// ===== EXPORT / IMPORT =====
function exportData() {
    if (accounts.length === 0) {
        showToast('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    const payload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        total: accounts.length,
        accounts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `netflix-accounts-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${accounts.length} tài khoản!`, 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            let imported = [];
            if (Array.isArray(data)) {
                imported = data;
            } else if (data.accounts && Array.isArray(data.accounts)) {
                imported = data.accounts;
            } else {
                throw new Error('Định dạng không hợp lệ');
            }
            // Merge: skip duplicates by id
            const existingIds = new Set(accounts.map(a => a.id));
            const newOnes = imported.filter(a => a.id && !existingIds.has(a.id));
            accounts = [...newOnes, ...accounts];
            saveData();
            renderAll();
            showToast(`Đã nhập ${newOnes.length} tài khoản mới!`, 'success');
        } catch (err) {
            showToast('Lỗi: File không hợp lệ!', 'error');
        }
        // Reset input so same file can be re-imported
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${msg}</span>`;
    toast.onclick = () => removeToast(toast);
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), 4000);
}

function removeToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('toast-out');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
}

// ===== AUTO UPDATE COUNTDOWN =====
setInterval(() => { renderAll(); }, 60000);

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['modal-account','modal-renew','modal-history','modal-delete','modal-detail'].forEach(id => closeModal(id));
    }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = initPasswordGate();
    if (isLoggedIn) {
        await loadData();
        renderAll();
    }
});
