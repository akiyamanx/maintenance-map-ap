// ============================================
// メンテナンスマップ v2.2.1 - route-order.js
// ルート訪問順管理（ポップアップからの設定）
// v2.2新規作成 → v2.2.1全面改修: ドラッグ&ドロップ廃止、ポップアップ内ドロップダウン方式に変更
// ============================================

const RouteOrder = (() => {

    // v2.2.1 - ポップアップのドロップダウンから訪問順を設定する
    // routeId: ルートID, customerId: 顧客ID, position: 選択された番号(1始まり、-1は未設定)
    function setVisitOrder(routeId, customerId, position) {
        position = parseInt(position);
        const routes = DataStorage.getRoutes();
        const route = routes.find(r => r.id === routeId);
        if (!route) return;

        // v2.2.1 - 現在のorder配列を取得（なければ空）
        let order = route.order ? [...route.order] : [];

        // v2.2.1 - まず対象の顧客をorderから除去
        order = order.filter(id => id !== customerId);

        if (position === -1) {
            // v2.2.1 - 「未設定」が選ばれた場合はorderから除去したまま
            DataStorage.updateRouteOrder(routeId, order);
        } else {
            // v2.2.1 - 指定位置に挿入（0始まりに変換）
            const insertIdx = Math.min(position - 1, order.length);
            order.splice(insertIdx, 0, customerId);
            DataStorage.updateRouteOrder(routeId, order);
        }

        // v2.2.1 - ルートタブの表示を更新
        RouteManager.updateRoutePanel();

        // v2.2.1 - ポップアップを更新（変更を即反映）
        const marker = MapCore.getMarkers().find(m => m.customData && m.customData.id === customerId);
        if (marker) {
            const updatedCustomer = DataStorage.getCustomers().find(c => c.id === customerId);
            if (updatedCustomer) {
                // 少し遅延させてInfoWindowを再描画
                setTimeout(() => {
                    MapCore.focusMarker(customerId);
                }, 100);
            }
        }
    }

    // v2.2.1 - 区間道路種別エディタを表示する（距離計算ボタンから呼ばれる）
    function showSegmentEditor(routeId, order) {
        if (!routeId || !order || order.length < 2) return;

        const customers = DataStorage.getCustomers();
        const segments = DataStorage.getSegments();
        const routeSegments = segments[routeId] || {};

        let html = '<div class="ro-modal-overlay" id="segmentEditorModal">';
        html += '<div class="ro-modal">';
        html += '<h3>🛣️ 区間の道路種別</h3>';
        html += '<p class="ro-hint">各区間で「高速」「下道」を選択</p>';
        html += '<div class="seg-list">';

        for (let i = 0; i < order.length - 1; i++) {
            const fromC = customers.find(c => c.id === order[i]);
            const toC = customers.find(c => c.id === order[i + 1]);
            if (!fromC || !toC) continue;

            const segKey = `${order[i]}_${order[i + 1]}`;
            const currentType = routeSegments[segKey] || 'general';

            const fromName = (fromC.company || '不明').substring(0, 10);
            const toName = (toC.company || '不明').substring(0, 10);

            html += `<div class="seg-item">`;
            html += `<div class="seg-label">${i + 1}. ${fromName} → ${toName}</div>`;
            html += `<div class="seg-toggle">`;
            html += `<button class="seg-btn ${currentType === 'general' ? 'seg-btn-active' : ''}" `;
            html += `onclick="RouteOrder.setSegType('${segKey}','general',this)">🚗 下道</button>`;
            html += `<button class="seg-btn ${currentType === 'highway' ? 'seg-btn-active' : ''}" `;
            html += `onclick="RouteOrder.setSegType('${segKey}','highway',this)">🛣️ 高速</button>`;
            html += `</div></div>`;
        }

        html += '</div>';
        html += '<div class="ro-actions">';
        html += '<button class="ro-btn ro-btn-cancel" onclick="RouteOrder.closeSegmentEditor()">閉じる</button>';
        html += '<button class="ro-btn ro-btn-save" onclick="RouteOrder.saveSegments()">✅ 保存</button>';
        html += '</div>';
        html += '</div></div>';

        RouteOrder._segRouteId = routeId;
        RouteOrder._segData = { ...routeSegments };

        const existing = document.getElementById('segmentEditorModal');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // v2.2.1 - 区間の道路種別を切り替える
    function setSegType(segKey, type, btn) {
        RouteOrder._segData[segKey] = type;
        const parent = btn.parentElement;
        parent.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('seg-btn-active'));
        btn.classList.add('seg-btn-active');
    }

    // v2.2.1 - 区間データを保存する
    function saveSegments() {
        const routeId = RouteOrder._segRouteId;
        if (!routeId) return;
        const allSegments = DataStorage.getSegments();
        allSegments[routeId] = RouteOrder._segData;
        DataStorage.saveSegments(allSegments);
        closeSegmentEditor();
        alert('✅ 区間の道路種別を保存しました！');
    }

    // v2.2.1 - 区間エディタを閉じる
    function closeSegmentEditor() {
        const modal = document.getElementById('segmentEditorModal');
        if (modal) modal.remove();
    }

    // v2.2.1 - 公開API
    return {
        setVisitOrder,
        showSegmentEditor, setSegType, saveSegments, closeSegmentEditor
    };
})();
