// ============================================
// メンテナンスマップ v2.0 - data-storage.js
// LocalStorage保存・読込・バックアップ・設定管理
// v2.0新規作成 - 分割ファイル構成対応
// ============================================

const DataStorage = (() => {
    // v2.0 - ストレージキー定義
    const KEYS = {
        customers: 'mm_customers',
        routes: 'mm_routes',
        segments: 'mm_segments',
        geocache: 'mm_geocache',
        settings: 'mm_settings'
    };

    // --- 顧客データ ---

    // v2.0 - 顧客リスト取得
    function getCustomers() {
        try {
            const data = localStorage.getItem(KEYS.customers);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('顧客データ読込エラー:', e);
            return [];
        }
    }

    // v2.0 - 顧客リスト保存
    function saveCustomers(customers) {
        try {
            localStorage.setItem(KEYS.customers, JSON.stringify(customers));
            return true;
        } catch (e) {
            console.error('顧客データ保存エラー:', e);
            alert('データの保存に失敗しました。ストレージ容量を確認してください。');
            return false;
        }
    }

    // v2.0 - 顧客1件追加
    function addCustomer(customer) {
        const customers = getCustomers();
        customer.id = customer.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        customer.status = customer.status || 'pending';
        customer.routeId = customer.routeId || null;
        customer.appoDate = customer.appoDate || null;
        customer.createdAt = new Date().toISOString();
        customers.push(customer);
        saveCustomers(customers);
        return customer;
    }

    // v2.0 - 顧客更新
    function updateCustomer(id, updates) {
        const customers = getCustomers();
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) {
            customers[idx] = { ...customers[idx], ...updates };
            saveCustomers(customers);
            return customers[idx];
        }
        return null;
    }

    // v2.0 - 顧客削除
    function deleteCustomer(id) {
        let customers = getCustomers();
        customers = customers.filter(c => c.id !== id);
        saveCustomers(customers);
    }

    // --- ルートデータ ---

    // v2.0 - ルート定義（デフォルト5ルート）
    const DEFAULT_ROUTES = [
        { id: 'route_1', name: 'ルート1', color: '#4285f4', order: [] },
        { id: 'route_2', name: 'ルート2', color: '#ea4335', order: [] },
        { id: 'route_3', name: 'ルート3', color: '#34a853', order: [] },
        { id: 'route_4', name: 'ルート4', color: '#ff9800', order: [] },
        { id: 'route_5', name: 'ルート5', color: '#9c27b0', order: [] }
    ];

    // v2.0 - ルート取得
    function getRoutes() {
        try {
            const data = localStorage.getItem(KEYS.routes);
            return data ? JSON.parse(data) : [...DEFAULT_ROUTES];
        } catch (e) {
            return [...DEFAULT_ROUTES];
        }
    }

    // v2.0 - ルート保存
    function saveRoutes(routes) {
        localStorage.setItem(KEYS.routes, JSON.stringify(routes));
    }

    // --- 区間データ（高速/下道） ---

    // v2.0 - 区間データ取得
    function getSegments() {
        try {
            const data = localStorage.getItem(KEYS.segments);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    // v2.0 - 区間データ保存
    function saveSegments(segments) {
        localStorage.setItem(KEYS.segments, JSON.stringify(segments));
    }

    // --- ジオコーディングキャッシュ ---

    // v2.0 - キャッシュ取得
    function getGeoCache() {
        try {
            const data = localStorage.getItem(KEYS.geocache);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    // v2.0 - キャッシュに座標保存
    function setGeoCache(address, latLng) {
        const cache = getGeoCache();
        cache[address] = latLng;
        localStorage.setItem(KEYS.geocache, JSON.stringify(cache));
    }

    // --- 設定 ---

    // v2.0 - 設定取得
    function getSettings() {
        try {
            const data = localStorage.getItem(KEYS.settings);
            return data ? JSON.parse(data) : { homeAddress: '', apiKey: '' };
        } catch (e) {
            return { homeAddress: '', apiKey: '' };
        }
    }

    // v2.0 - 設定保存
    function saveSettings(settings) {
        localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    }

    // --- バックアップ ---

    // v2.0 - JSONバックアップエクスポート
    function exportBackup() {
        const data = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            customers: getCustomers(),
            routes: getRoutes(),
            segments: getSegments(),
            settings: getSettings()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `maintenance_map_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('💾 バックアップを保存しました！');
    }

    // v2.0 - JSONバックアップインポート
    function importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.customers) saveCustomers(data.customers);
                if (data.routes) saveRoutes(data.routes);
                if (data.segments) saveSegments(data.segments);
                if (data.settings) {
                    // v2.0 - APIキーは現在のを維持（バックアップに含めない）
                    const current = getSettings();
                    data.settings.apiKey = current.apiKey;
                    saveSettings(data.settings);
                }
                alert('📂 バックアップを復元しました！\nページをリロードします。');
                location.reload();
            } catch (err) {
                alert('❌ バックアップファイルの読み込みに失敗しました。');
                console.error('バックアップ復元エラー:', err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // v2.0 - 全データリセット
    function resetAll() {
        localStorage.removeItem(KEYS.customers);
        localStorage.removeItem(KEYS.routes);
        localStorage.removeItem(KEYS.segments);
        // v2.0 - 設定とキャッシュは残す
    }

    // v2.0 - 公開API
    return {
        getCustomers, saveCustomers, addCustomer, updateCustomer, deleteCustomer,
        getRoutes, saveRoutes, DEFAULT_ROUTES,
        getSegments, saveSegments,
        getGeoCache, setGeoCache,
        getSettings, saveSettings,
        exportBackup, importBackup, resetAll
    };
})();
