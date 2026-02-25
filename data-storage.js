// ============================================
// メンテナンスマップ v2.3 - data-storage.js
// LocalStorage保存・読込・バックアップ・設定管理
// v2.0新規作成 - 分割ファイル構成対応
// v2.3追加 - 月別ワークスペース切り替え機能
// ============================================

const DataStorage = (() => {
    // v2.3 - ワークスペース管理キー（共通・月に依存しない）
    const WS_KEYS = {
        workspaces: 'mm_workspaces',
        currentWs: 'mm_workspace_current',
        settings: 'mm_settings',
        geocache: 'mm_geocache'
    };

    // v2.3 - ワークスペース依存キーのベース名
    const WS_DATA_KEYS = ['customers', 'routes', 'segments', 'expenses'];

    // v2.3 - 現在のワークスペースIDを取得
    function getCurrentWorkspaceId() {
        return localStorage.getItem(WS_KEYS.currentWs) || null;
    }

    // v2.3 - ワークスペースIDからキーを生成（例: mm_customers_2026-02）
    function wsKey(baseName) {
        const wsId = getCurrentWorkspaceId();
        if (!wsId) return 'mm_' + baseName; // v2.3 - マイグレーション前のフォールバック
        return 'mm_' + baseName + '_' + wsId;
    }

    // v2.3 - 動的KEYSゲッター（現在のワークスペースに応じたキーを返す）
    function getKeys() {
        return {
            customers: wsKey('customers'),
            routes: wsKey('routes'),
            segments: wsKey('segments'),
            expenses: wsKey('expenses'),
            geocache: WS_KEYS.geocache,   // v2.3 - 共通
            settings: WS_KEYS.settings     // v2.3 - 共通
        };
    }

    // =============================================
    // v2.3 - ワークスペース管理
    // =============================================

    // v2.3 - ワークスペース一覧を取得
    function getWorkspaces() {
        try {
            const data = localStorage.getItem(WS_KEYS.workspaces);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('ワークスペース読込エラー:', e);
            return [];
        }
    }

    // v2.3 - ワークスペース一覧を保存
    function saveWorkspaces(workspaces) {
        localStorage.setItem(WS_KEYS.workspaces, JSON.stringify(workspaces));
    }

    // v2.3 - 新しいワークスペースを作成
    function createWorkspace(yearMonth, name) {
        const workspaces = getWorkspaces();
        // v2.3 - 同じIDが既にあれば作成しない
        if (workspaces.find(ws => ws.id === yearMonth)) {
            console.warn('ワークスペース既に存在:', yearMonth);
            return null;
        }
        const ws = {
            id: yearMonth,         // 例: "2026-02"
            name: name || yearMonth.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${parseInt(m)}月`),
            createdAt: new Date().toISOString()
        };
        workspaces.push(ws);
        // v2.3 - 日付順にソート
        workspaces.sort((a, b) => a.id.localeCompare(b.id));
        saveWorkspaces(workspaces);

        // v2.3 - デフォルトルートを新ワークスペースに設定
        const routeKey = 'mm_routes_' + yearMonth;
        if (!localStorage.getItem(routeKey)) {
            localStorage.setItem(routeKey, JSON.stringify([...DEFAULT_ROUTES]));
        }
        return ws;
    }

    // v2.3 - ワークスペースを切り替え
    function switchWorkspace(wsId) {
        const workspaces = getWorkspaces();
        if (!workspaces.find(ws => ws.id === wsId)) {
            console.error('ワークスペースが見つかりません:', wsId);
            return false;
        }
        localStorage.setItem(WS_KEYS.currentWs, wsId);
        return true;
    }

    // v2.3 - ワークスペースを削除（データも削除）
    function deleteWorkspace(wsId) {
        let workspaces = getWorkspaces();
        workspaces = workspaces.filter(ws => ws.id !== wsId);
        saveWorkspaces(workspaces);
        // v2.3 - 関連データも削除
        WS_DATA_KEYS.forEach(key => {
            localStorage.removeItem('mm_' + key + '_' + wsId);
        });
        // v2.3 - 削除したのが現在のワークスペースなら、最初のに切り替え
        if (getCurrentWorkspaceId() === wsId) {
            if (workspaces.length > 0) {
                localStorage.setItem(WS_KEYS.currentWs, workspaces[0].id);
            } else {
                localStorage.removeItem(WS_KEYS.currentWs);
            }
        }
    }

    // v2.3 - ワークスペース名を変更
    function renameWorkspace(wsId, newName) {
        const workspaces = getWorkspaces();
        const ws = workspaces.find(w => w.id === wsId);
        if (ws) {
            ws.name = newName;
            saveWorkspaces(workspaces);
        }
    }

    // v2.3 - 初回マイグレーション（旧キー→ワークスペース形式に変換）
    function migrateIfNeeded() {
        // v2.3 - 既にワークスペースが存在すればスキップ
        if (getWorkspaces().length > 0) return;

        // v2.3 - 旧データが存在するかチェック
        const oldCustomers = localStorage.getItem('mm_customers');
        const oldRoutes = localStorage.getItem('mm_routes');
        if (!oldCustomers && !oldRoutes) {
            // v2.3 - 旧データなし→今月のワークスペースだけ作って終了
            const now = new Date();
            const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            createWorkspace(currentMonth);
            localStorage.setItem(WS_KEYS.currentWs, currentMonth);
            return;
        }

        // v2.3 - 旧データを今月のワークスペースに移行
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

        // v2.3 - ワークスペース作成
        createWorkspace(currentMonth);
        localStorage.setItem(WS_KEYS.currentWs, currentMonth);

        // v2.3 - 旧キー→新キーにコピー
        const migrations = [
            { old: 'mm_customers', new: 'mm_customers_' + currentMonth },
            { old: 'mm_routes', new: 'mm_routes_' + currentMonth },
            { old: 'mm_segments', new: 'mm_segments_' + currentMonth },
            { old: 'mm_expenses', new: 'mm_expenses_' + currentMonth }
        ];

        migrations.forEach(m => {
            const data = localStorage.getItem(m.old);
            if (data) {
                localStorage.setItem(m.new, data);
                localStorage.removeItem(m.old); // v2.3 - 旧キーを削除
            }
        });

    }

    // --- 顧客データ ---

    // v2.0 - 顧客リスト取得（v2.3でワークスペース対応）
    function getCustomers() {
        try {
            const data = localStorage.getItem(getKeys().customers);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('顧客データ読込エラー:', e);
            return [];
        }
    }

    // v2.0 - 顧客リスト保存（v2.3でワークスペース対応）
    function saveCustomers(customers) {
        try {
            localStorage.setItem(getKeys().customers, JSON.stringify(customers));
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

    // v2.0 - ルート取得（v2.3でワークスペース対応）
    function getRoutes() {
        try {
            const data = localStorage.getItem(getKeys().routes);
            return data ? JSON.parse(data) : [...DEFAULT_ROUTES];
        } catch (e) {
            return [...DEFAULT_ROUTES];
        }
    }

    // v2.0 - ルート保存（v2.3でワークスペース対応）
    function saveRoutes(routes) {
        localStorage.setItem(getKeys().routes, JSON.stringify(routes));
    }

    // --- 区間データ（高速/下道） ---

    // v2.0 - 区間データ取得（v2.3でワークスペース対応）
    function getSegments() {
        try {
            const data = localStorage.getItem(getKeys().segments);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    // v2.0 - 区間データ保存（v2.3でワークスペース対応）
    function saveSegments(segments) {
        localStorage.setItem(getKeys().segments, JSON.stringify(segments));
    }

    // --- ジオコーディングキャッシュ（v2.3 ワークスペース共通） ---

    // v2.0 - キャッシュ取得
    function getGeoCache() {
        try {
            const data = localStorage.getItem(WS_KEYS.geocache);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    // v2.0 - キャッシュに座標保存
    function setGeoCache(address, latLng) {
        const cache = getGeoCache();
        cache[address] = latLng;
        localStorage.setItem(WS_KEYS.geocache, JSON.stringify(cache));
    }

    // --- 設定（v2.3 ワークスペース共通） ---

    // v2.0 - 設定取得
    function getSettings() {
        try {
            const data = localStorage.getItem(WS_KEYS.settings);
            return data ? JSON.parse(data) : { homeAddress: '', apiKey: '' };
        } catch (e) {
            return { homeAddress: '', apiKey: '' };
        }
    }

    // v2.0 - 設定保存
    function saveSettings(settings) {
        localStorage.setItem(WS_KEYS.settings, JSON.stringify(settings));
    }

    // --- 精算書データ（v2.1追加、v2.3でワークスペース対応） ---

    // v2.1追加 - 精算書下書き一覧取得
    function getExpenses() {
        try {
            const data = localStorage.getItem(getKeys().expenses);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('精算書データ読込エラー:', e);
            return [];
        }
    }

    // v2.1追加 - 精算書下書き保存
    function saveExpenses(expenses) {
        try {
            localStorage.setItem(getKeys().expenses, JSON.stringify(expenses));
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

    // v2.3更新 - JSONバックアップエクスポート（ワークスペース情報付き）
    function exportBackup() {
        const wsId = getCurrentWorkspaceId();
        const workspaces = getWorkspaces();
        const currentWs = workspaces.find(ws => ws.id === wsId);
        const wsName = currentWs ? currentWs.name : wsId;

        const data = {
            version: '2.3',
            exportDate: new Date().toISOString(),
            workspaceId: wsId,
            workspaceName: wsName,
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
        a.download = `maintenance_map_${wsId || 'backup'}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`💾 バックアップを保存しました！\n📅 ${wsName}`);
    }

    // v2.0.1追加 - JSONバックアップインポート（v1.0互換対応、v2.3でワークスペース対応）
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
                    converted.customers.forEach(c => {
                        if (c.lat && c.lng && c.address) {
                            setGeoCache(c.address, { lat: c.lat, lng: c.lng });
                        }
                    });
                    alert(`📂 v1.0バックアップを変換して復元しました！\n${converted.customers.length}件のデータを読み込みました。\nページをリロードします。`);
                    location.reload();
                    return;
                }

                // v2.3 / v2.0 - 通常復元（現在のワークスペースに読み込む）
                if (data.customers) saveCustomers(data.customers);
                if (data.routes) saveRoutes(data.routes);
                if (data.segments) saveSegments(data.segments);
                if (data.expenses) saveExpenses(data.expenses);
                if (data.settings) {
                    const current = getSettings();
                    data.settings.apiKey = current.apiKey;
                    saveSettings(data.settings);
                }
                const wsName = data.workspaceName || '';
                alert(`📂 バックアップを復元しました！${wsName ? '\n📅 ' + wsName : ''}\nページをリロードします。`);
                location.reload();
            } catch (err) {
                alert('❌ バックアップファイルの読み込みに失敗しました。');
                console.error('バックアップ復元エラー:', err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // v2.3 - v1.0→v2.0データ変換はv1-converter.jsに分離（500行ルール対応）
    // convertV1toV2()はグローバル関数として利用可能

    // v2.2追加 - ルートの訪問順を更新
    function updateRouteOrder(routeId, orderArray) {
        const routes = getRoutes();
        const route = routes.find(r => r.id === routeId);
        if (route) {
            route.order = orderArray;
            saveRoutes(routes);
        }
    }

    // v2.3更新 - 現在のワークスペースのデータのみリセット
    function resetAll() {
        const KEYS = getKeys();
        localStorage.removeItem(KEYS.customers);
        localStorage.removeItem(KEYS.routes);
        localStorage.removeItem(KEYS.segments);
        localStorage.removeItem(KEYS.expenses);
        // v2.0 - 設定とキャッシュは残す（v2.3: ワークスペース共通なので残す）
    }

    // v2.3 - 公開API（ワークスペース関連を追加）
    return {
        // v2.3 - ワークスペース管理
        getWorkspaces, createWorkspace, switchWorkspace, deleteWorkspace,
        renameWorkspace, getCurrentWorkspaceId, migrateIfNeeded,
        // v2.0 - 顧客
        getCustomers, saveCustomers, addCustomer, updateCustomer, deleteCustomer,
        // v2.0 - ルート
        getRoutes, saveRoutes, DEFAULT_ROUTES, updateRouteOrder,
        // v2.0 - 区間
        getSegments, saveSegments,
        // v2.0 - キャッシュ
        getGeoCache, setGeoCache,
        // v2.0 - 設定
        getSettings, saveSettings,
        // v2.1 - 精算書
        getExpenses, saveExpenses, addExpense, deleteExpense,
        // v2.0 - バックアップ
        exportBackup, importBackup, resetAll
    };
})();
