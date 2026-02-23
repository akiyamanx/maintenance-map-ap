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
        settings: 'mm_settings',
        expenses: 'mm_expenses'
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

    // v2.0.1更新 - ルート定義（10ルート、v1.0互換）
    const DEFAULT_ROUTES = [
        { id: 'route_1', name: 'ルート1', color: '#4285f4', order: [] },
        { id: 'route_2', name: 'ルート2', color: '#ea4335', order: [] },
        { id: 'route_3', name: 'ルート3', color: '#34a853', order: [] },
        { id: 'route_4', name: 'ルート4', color: '#ff9800', order: [] },
        { id: 'route_5', name: 'ルート5', color: '#9c27b0', order: [] },
        { id: 'route_6', name: 'ルート6', color: '#00bcd4', order: [] },
        { id: 'route_7', name: 'ルート7', color: '#e91e63', order: [] },
        { id: 'route_8', name: 'ルート8', color: '#795548', order: [] },
        { id: 'route_9', name: 'ルート9', color: '#607d8b', order: [] },
        { id: 'route_10', name: 'ルート10', color: '#ff5722', order: [] }
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

    // --- 精算書データ（v2.1追加） ---

    // v2.1追加 - 精算書下書き一覧取得
    function getExpenses() {
        try {
            const data = localStorage.getItem(KEYS.expenses);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('精算書データ読込エラー:', e);
            return [];
        }
    }

    // v2.1追加 - 精算書下書き保存
    function saveExpenses(expenses) {
        try {
            localStorage.setItem(KEYS.expenses, JSON.stringify(expenses));
            return true;
        } catch (e) {
            console.error('精算書データ保存エラー:', e);
            alert('精算書の保存に失敗しました。ストレージ容量を確認してください。');
            return false;
        }
    }

    // v2.1追加 - 精算書1件追加（最大20件）
    function addExpense(expense) {
        const expenses = getExpenses();
        expense.id = expense.id || 'exp_' + Date.now();
        expense.createdAt = new Date().toISOString();
        expenses.unshift(expense);
        if (expenses.length > 20) expenses.splice(20);
        saveExpenses(expenses);
        return expense;
    }

    // v2.1追加 - 精算書1件削除
    function deleteExpense(id) {
        let expenses = getExpenses();
        expenses = expenses.filter(e => e.id !== id);
        saveExpenses(expenses);
    }

    // --- バックアップ ---

    // v2.0 - JSONバックアップエクスポート
    function exportBackup() {
        const data = {
            version: '2.1',
            exportDate: new Date().toISOString(),
            customers: getCustomers(),
            routes: getRoutes(),
            segments: getSegments(),
            settings: getSettings(),
            expenses: getExpenses()
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

    // v2.0.1追加 - JSONバックアップインポート（v1.0互換対応）
    function importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // v2.0.1追加 - v1.0フォーマット検出＆変換
                if (data.version === '1.0' && data.data) {
                    const converted = convertV1toV2(data);
                    saveCustomers(converted.customers);
                    // v2.0.1 - v1.0の座標をキャッシュに保存
                    converted.customers.forEach(c => {
                        if (c.lat && c.lng && c.address) {
                            setGeoCache(c.address, { lat: c.lat, lng: c.lng });
                        }
                    });
                    alert(`📂 v1.0バックアップを変換して復元しました！\n${converted.customers.length}件のデータを読み込みました。\nページをリロードします。`);
                    location.reload();
                    return;
                }

                // v2.0 - v2.0フォーマットの通常復元
                if (data.customers) saveCustomers(data.customers);
                if (data.routes) saveRoutes(data.routes);
                if (data.segments) saveSegments(data.segments);
                if (data.expenses) saveExpenses(data.expenses);
                if (data.settings) {
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

    // v2.0.1追加 - v1.0→v2.0データ変換
    function convertV1toV2(v1Data) {
        const customers = [];
        const routes = getRoutes();

        for (const item of v1Data.data) {
            // v2.0.1 - v1.0のrouteId(数値0-10)→v2.0のrouteId(文字列)に変換
            let routeId = null;
            if (item.routeId && item.routeId > 0 && item.routeId <= 10) {
                routeId = 'route_' + item.routeId;
            }

            // v2.0.1 - ステータス判定
            let status = 'pending';
            if (item.appointmentDate) status = 'appointed';

            // v2.0.1 - アポ日時の統合
            let appoDate = null;
            if (item.appointmentDate) {
                appoDate = item.appointmentDate;
                if (item.appointmentTime) {
                    appoDate += 'T' + item.appointmentTime;
                }
            }

            // v2.0.1 - 台数（countフィールドまたはallItemsの長さ）
            const unitCount = item.count || (item.allItems ? item.allItems.length : 1);

            // v2.0.1 - 階数情報をメモに含める
            let note = item.note || '';
            if (item.floors && item.floors.length > 0 && !note.includes('階')) {
                note = '【階数】' + item.floors.join(', ') + (note ? '\n' + note : '');
            }

            const customer = {
                id: item.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                company: item.displayName || item.company || '',
                address: item.originalAddress || item.address || '',
                phone: item.phone || '',
                contact: item.contact || '',
                note: note,
                managementNo: item.no || '',
                model: item.model || '',
                reason: item.reason || '',
                info: item.info || '',
                routeId: routeId,
                status: status,
                appoDate: appoDate,
                unitCount: unitCount,
                lat: item.position ? item.position.lat : null,
                lng: item.position ? item.position.lng : null,
                floors: item.floors || [],
                allItems: item.allItems || [],
                createdAt: v1Data.exportDate || new Date().toISOString()
            };

            customers.push(customer);
        }

        return { customers };
    }

    // v2.2追加 - ルートの訪問順を更新
    function updateRouteOrder(routeId, orderArray) {
        const routes = getRoutes();
        const route = routes.find(r => r.id === routeId);
        if (route) {
            route.order = orderArray;
            saveRoutes(routes);
        }
    }

    // v2.0 - 全データリセット
    function resetAll() {
        localStorage.removeItem(KEYS.customers);
        localStorage.removeItem(KEYS.routes);
        localStorage.removeItem(KEYS.segments);
        localStorage.removeItem(KEYS.expenses);
        // v2.0 - 設定とキャッシュは残す
    }

    // v2.0 - 公開API
    return {
        getCustomers, saveCustomers, addCustomer, updateCustomer, deleteCustomer,
        getRoutes, saveRoutes, DEFAULT_ROUTES, updateRouteOrder,
        getSegments, saveSegments,
        getGeoCache, setGeoCache,
        getSettings, saveSettings,
        getExpenses, saveExpenses, addExpense, deleteExpense,
        exportBackup, importBackup, resetAll
    };
})();
