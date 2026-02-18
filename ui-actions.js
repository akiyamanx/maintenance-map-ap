// ============================================
// メンテナンスマップ v2.0 - ui-actions.js
// グローバルUI関数（モーダル・メニュー・パネル制御）
// v2.0新規作成 - map-core.jsから分離
// ============================================

// v2.0 - メニュートグル
function toggleMenu() {
    const panel = document.getElementById('menuPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// v2.0 - メニュー以外をクリックしたら閉じる
document.addEventListener('click', (e) => {
    const panel = document.getElementById('menuPanel');
    if (panel && panel.style.display === 'block' && !e.target.closest('.menu-panel') && !e.target.closest('.btn-menu')) {
        panel.style.display = 'none';
    }
});

// v2.0 - 手動追加モーダル
function showAddModal() {
    document.getElementById('addModal').style.display = 'flex';
    if (document.getElementById('menuPanel').style.display === 'block') toggleMenu();
}
function hideAddModal() {
    document.getElementById('addModal').style.display = 'none';
    ['addCompany','addAddress','addPhone','addContact','addNote'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

// v2.0 - 新規追加実行
function addNewLocation() {
    const company = document.getElementById('addCompany').value.trim();
    const address = document.getElementById('addAddress').value.trim();
    if (!company || !address) {
        alert('会社名と住所は必須です。');
        return;
    }
    const customer = DataStorage.addCustomer({
        company, address,
        phone: document.getElementById('addPhone').value.trim(),
        contact: document.getElementById('addContact').value.trim(),
        note: document.getElementById('addNote').value.trim(),
        unitCount: 1
    });
    hideAddModal();
    MapCore.geocodeAndPlot([customer]);
}

// v2.0 - 編集モーダル
function hideEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// v2.0 - 編集保存
function saveEdit() {
    const id = MapCore.getCurrentEditId();
    if (!id) return;
    DataStorage.updateCustomer(id, {
        company: document.getElementById('editCompany').value.trim(),
        address: document.getElementById('editAddress').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        contact: document.getElementById('editContact').value.trim(),
        note: document.getElementById('editNote').value.trim(),
        status: document.getElementById('editStatus').value,
        routeId: document.getElementById('editRoute').value || null,
        appoDate: document.getElementById('editAppoDate').value || null
    });
    hideEditModal();
    MapCore.refreshAllMarkers();
    RouteManager.updateRoutePanel();
}

// v2.0 - 削除
function deleteLocation() {
    const id = MapCore.getCurrentEditId();
    if (!id) return;
    if (!confirm('この場所を削除しますか？')) return;
    DataStorage.deleteCustomer(id);
    hideEditModal();
    MapCore.refreshAllMarkers();
    RouteManager.updateRoutePanel();
}

// v2.0 - 設定モーダル
function showSettingsModal() {
    const settings = DataStorage.getSettings();
    document.getElementById('settingHomeAddress').value = settings.homeAddress || '';
    document.getElementById('settingApiKey').value = settings.apiKey || '';
    document.getElementById('settingsModal').style.display = 'flex';
    if (document.getElementById('menuPanel').style.display === 'block') toggleMenu();
}
function hideSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}
function saveSettings() {
    const apiKey = document.getElementById('settingApiKey').value.trim();
    const homeAddress = document.getElementById('settingHomeAddress').value.trim();
    DataStorage.saveSettings({ apiKey, homeAddress });
    hideSettingsModal();
    if (apiKey) {
        alert('設定を保存しました。ページをリロードします。');
        location.reload();
    }
}

// v2.0 - リセット確認
function showResetConfirm() {
    const customers = DataStorage.getCustomers();
    document.getElementById('resetCount').textContent = `${customers.length}件`;
    document.getElementById('resetModal').style.display = 'flex';
    if (document.getElementById('menuPanel').style.display === 'block') toggleMenu();
}
function hideResetConfirm() {
    document.getElementById('resetModal').style.display = 'none';
}
function resetAllData() {
    DataStorage.resetAll();
    hideResetConfirm();
    MapCore.clearMarkers();
    MapCore.updateCountBadge();
    MapCore.updateCustomerList();
    RouteManager.updateRoutePanel();
    alert('🗑️ 全データを削除しました。');
}

// v2.0 - バックアップ
function exportBackup() {
    DataStorage.exportBackup();
    toggleMenu();
}
function importBackup() {
    document.getElementById('backupInput').click();
    toggleMenu();
}

// v2.0 - PDF出力
function exportPDF() {
    if (document.getElementById('menuPanel').style.display === 'block') toggleMenu();
    RouteManager.exportPDF();
}

// v2.0 - 下部パネル制御
function togglePanel() {
    document.getElementById('bottomPanel').classList.toggle('collapsed');
}

// v2.0 - タブ切替
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    document.getElementById(tabId).classList.add('active');

    // v2.0 - 集計タブを開いたら更新
    if (tabName === 'summary') {
        RouteManager.updateSummary();
    }
}

// v2.0 - 凡例トグル
function toggleLegend() {
    const legend = document.getElementById('legend');
    legend.style.display = legend.style.display === 'none' ? 'block' : 'none';
}
