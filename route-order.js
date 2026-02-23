// ============================================
// メンテナンスマップ v2.2 - route-order.js
// ルート内の訪問順ドラッグ&ドロップ管理
// v2.2新規作成
// ============================================

const RouteOrder = (() => {
    // 訪問順編集モードの状態
    let editingRouteId = null;

    // v2.2 - 訪問順編集モードを開始する
    function startEdit(routeId) {
        editingRouteId = routeId;
        renderSortableList(routeId);
    }

    // v2.2 - 並び替えリストを描画する
    function renderSortableList(routeId) {
        const routes = DataStorage.getRoutes();
        const route = routes.find(r => r.id === routeId);
        const customers = DataStorage.getCustomers();
        const members = customers.filter(c => c.routeId === routeId);

        if (members.length === 0) return;

        // orderがあればその順番で並べ替え、なければ現状の順
        const ordered = [];
        if (route.order && route.order.length > 0) {
            for (const cid of route.order) {
                const found = members.find(m => m.id === cid);
                if (found) ordered.push(found);
            }
            // orderに含まれない新メンバーを末尾に追加
            for (const m of members) {
                if (!ordered.find(o => o.id === m.id)) ordered.push(m);
            }
        } else {
            ordered.push(...members);
        }

        // モーダルで表示
        let html = '<div class="ro-modal-overlay" id="routeOrderModal">';
        html += '<div class="ro-modal">';
        html += `<h3>🔢 ${route.name} の訪問順</h3>`;
        html += '<p class="ro-hint">長押しでドラッグして順番を変更</p>';
        html += '<div class="ro-list" id="roSortList">';

        ordered.forEach((m, idx) => {
            html += `<div class="ro-item" data-id="${m.id}" draggable="true">`;
            html += `<span class="ro-num">${idx + 1}</span>`;
            html += `<span class="ro-grip">☰</span>`;
            html += `<span class="ro-name">${m.company || '不明'}`;
            if (m.unitCount > 1) html += ` (${m.unitCount}台)`;
            html += `</span>`;
            html += '</div>';
        });

        html += '</div>';
        html += '<div class="ro-actions">';
        html += '<button class="ro-btn ro-btn-cancel" onclick="RouteOrder.cancelEdit()">キャンセル</button>';
        html += '<button class="ro-btn ro-btn-save" onclick="RouteOrder.saveOrder()">✅ 保存</button>';
        html += '</div>';
        html += '</div></div>';

        // 既存のモーダルがあれば削除
        const existing = document.getElementById('routeOrderModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', html);
        initDragAndDrop();
    }

    // v2.2 - HTML5 Drag and Drop + タッチ対応の初期化
    function initDragAndDrop() {
        const list = document.getElementById('roSortList');
        if (!list) return;
        let dragItem = null;

        // --- マウス/HTML5 DnD ---
        list.addEventListener('dragstart', (e) => {
            dragItem = e.target.closest('.ro-item');
            if (!dragItem) return;
            dragItem.classList.add('ro-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.ro-item');
            if (target && target !== dragItem) {
                const rect = target.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    list.insertBefore(dragItem, target);
                } else {
                    list.insertBefore(dragItem, target.nextSibling);
                }
            }
        });

        list.addEventListener('dragend', () => {
            if (dragItem) dragItem.classList.remove('ro-dragging');
            dragItem = null;
            updateNumbers();
        });

        // --- タッチ対応 ---
        let touchItem = null;

        list.addEventListener('touchstart', (e) => {
            const item = e.target.closest('.ro-item');
            if (!item) return;
            touchItem = item;
            // 長押し判定は省略、即ドラッグ可能にする
            touchItem.classList.add('ro-dragging');
        }, { passive: true });

        list.addEventListener('touchmove', (e) => {
            if (!touchItem) return;
            e.preventDefault();
            const touchY = e.touches[0].clientY;
            const items = [...list.querySelectorAll('.ro-item:not(.ro-dragging)')];
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (touchY < mid) {
                    list.insertBefore(touchItem, item);
                    break;
                }
                if (item === items[items.length - 1] && touchY >= mid) {
                    list.appendChild(touchItem);
                }
            }
        }, { passive: false });

        list.addEventListener('touchend', () => {
            if (touchItem) touchItem.classList.remove('ro-dragging');
            touchItem = null;
            updateNumbers();
        });
    }

    // v2.2 - 番号を振り直す
    function updateNumbers() {
        const items = document.querySelectorAll('#roSortList .ro-item');
        items.forEach((item, idx) => {
            item.querySelector('.ro-num').textContent = idx + 1;
        });
    }

    // v2.2 - 順序を保存する
    function saveOrder() {
        if (!editingRouteId) return;
        const items = document.querySelectorAll('#roSortList .ro-item');
        const order = [...items].map(item => item.dataset.id);

        DataStorage.updateRouteOrder(editingRouteId, order);
        cancelEdit();
        RouteManager.updateRoutePanel();
        alert('✅ 訪問順を保存しました！');
    }

    // v2.2 - 編集をキャンセルする
    function cancelEdit() {
        editingRouteId = null;
        const modal = document.getElementById('routeOrderModal');
        if (modal) modal.remove();
    }

    return { startEdit, saveOrder, cancelEdit };
})();
