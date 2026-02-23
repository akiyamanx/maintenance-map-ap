// ============================================
// メンテナンスマップ v2.2.1 - route-manager.js
// ルート管理・色分け・PDF出力・凡例
// v2.0新規作成 - 分割ファイル構成対応
// v2.2.1変更 - 🔢ボタン削除（ルートタブは確認専用に）
// ============================================

const RouteManager = (() => {
    // v2.0 - ルート線（Polyline）の参照
    let polylines = [];

    // v2.0 - ルートパネル更新
    function updateRoutePanel() {
        const routes = DataStorage.getRoutes();
        const customers = DataStorage.getCustomers();
        const routeEl = document.getElementById('routeManager');

        let html = '';

        for (const route of routes) {
            const members = customers.filter(c => c.routeId === route.id);

            // v2.2追加 - order配列がある場合は訪問順で並べ替え
            if (route.order && route.order.length > 0) {
                members.sort((a, b) => {
                    const ai = route.order.indexOf(a.id);
                    const bi = route.order.indexOf(b.id);
                    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                });
            }

            html += `<div class="route-section">`;
            html += `<div class="route-header" onclick="RouteManager.toggleRouteSection(this)">`;
            html += `<span class="route-color-dot" style="background:${route.color}"></span>`;
            html += `<span>${route.name}</span>`;
            html += `<span class="route-count">${members.length}件</span>`;
            // v2.2.1変更 - 🔢ボタン削除（訪問順設定はポップアップから行う）
            // v2.2追加 - 距離計算ボタン（2件以上＋訪問順設定済みで表示）
            if (members.length >= 2 && route.order && route.order.length >= 2) {
                html += `<button class="route-dist-btn" onclick="event.stopPropagation();RouteManager.calcDistance('${route.id}')">📏</button>`;
            }
            html += `</div>`;

            if (members.length > 0) {
                html += `<div class="route-stops">`;
                members.forEach((m, idx) => {
                    html += `<div class="route-stop" onclick="MapCore.focusMarker('${m.id}')">`;
                    html += `<span class="stop-number">${idx + 1}</span>`;
                    html += `<span>${m.company || '不明'}`;
                    if (m.unitCount > 1) html += ` (${m.unitCount}台)`;
                    html += `</span>`;
                    html += `</div>`;
                });
                html += `</div>`;
            }

            html += `</div>`;
        }

        // v2.0 - 未割当顧客
        const unassigned = customers.filter(c => !c.routeId);
        if (unassigned.length > 0) {
            html += `<div class="route-section">`;
            html += `<div class="route-header">`;
            html += `<span class="route-color-dot" style="background:#9e9e9e"></span>`;
            html += `<span>未割当</span>`;
            html += `<span class="route-count">${unassigned.length}件</span>`;
            html += `</div>`;
            html += `<div class="route-stops">`;
            unassigned.forEach((m, idx) => {
                html += `<div class="route-stop" onclick="MapCore.focusMarker('${m.id}')">`;
                html += `<span class="stop-number">-</span>`;
                html += `<span>${m.company || '不明'}</span>`;
                html += `</div>`;
            });
            html += `</div></div>`;
        }

        routeEl.innerHTML = html || '<p class="empty-msg">まだルートが設定されていません</p>';

        // v2.0 - 凡例も更新
        updateLegend(routes, customers);
    }

    // v2.0 - ルートセクション開閉
    function toggleRouteSection(header) {
        const stops = header.nextElementSibling;
        if (stops) {
            stops.style.display = stops.style.display === 'none' ? 'block' : 'none';
        }
    }

    // v2.0 - 凡例更新
    function updateLegend(routes, customers) {
        const legendEl = document.getElementById('legend');
        const itemsEl = document.getElementById('legendItems');

        // v2.0 - ルートに顧客がいる場合のみ表示
        const activeRoutes = routes.filter(r => customers.some(c => c.routeId === r.id));

        if (activeRoutes.length === 0) {
            legendEl.style.display = 'none';
            return;
        }

        let html = '';
        activeRoutes.forEach(r => {
            const count = customers.filter(c => c.routeId === r.id).length;
            html += `<div class="legend-item">`;
            html += `<span class="legend-color" style="background:${r.color}"></span>`;
            html += `<span>${r.name}（${count}件）</span>`;
            html += `</div>`;
        });

        // v2.0 - ステータス凡例
        html += `<div style="border-top:1px solid #e2e8f0;margin:6px 0;"></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#ea4335"></span><span>未アポ</span></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#34a853"></span><span>アポ済み</span></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#9e9e9e"></span><span>完了</span></div>`;

        itemsEl.innerHTML = html;
        legendEl.style.display = 'block';
    }

    // v2.0 - ルート線を地図に描画
    function drawRouteLines() {
        // v2.0 - 既存の線をクリア
        polylines.forEach(p => p.setMap(null));
        polylines = [];

        const routes = DataStorage.getRoutes();
        const customers = DataStorage.getCustomers();
        const cache = DataStorage.getGeoCache();
        const map = MapCore.getMap();
        if (!map) return;

        for (const route of routes) {
            const members = customers.filter(c => c.routeId === route.id);
            if (members.length < 2) continue;

            const path = [];
            for (const m of members) {
                const cached = cache[m.address];
                if (cached) {
                    path.push(new google.maps.LatLng(cached.lat, cached.lng));
                } else if (m.lat && m.lng) {
                    path.push(new google.maps.LatLng(m.lat, m.lng));
                }
            }

            if (path.length >= 2) {
                const polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: route.color,
                    strokeOpacity: 0.7,
                    strokeWeight: 3,
                    map: map
                });
                polylines.push(polyline);
            }
        }
    }

    // v2.0 - PDF出力
    function exportPDF() {
        const customers = DataStorage.getCustomers();
        if (customers.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const routes = DataStorage.getRoutes();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // v2.0 - フォント設定（日本語対応はnoto-font.jsがあれば）
        const today = new Date().toLocaleDateString('ja-JP');

        doc.setFontSize(16);
        doc.text('メンテナンスマップ - 一覧表', 14, 20);
        doc.setFontSize(10);
        doc.text(`出力日: ${today}`, 14, 28);

        // v2.0 - ルートごとにテーブル出力
        let startY = 35;

        for (const route of routes) {
            const members = customers.filter(c => c.routeId === route.id);
            if (members.length === 0) continue;

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${route.name}（${members.length}件）`, 14, startY);
            startY += 3;

            const tableData = members.map((m, idx) => [
                idx + 1,
                m.company || '',
                m.address || '',
                m.phone || '',
                m.contact || '',
                m.unitCount > 1 ? `${m.unitCount}台` : '',
                m.status === 'appointed' ? 'アポ済' : m.status === 'completed' ? '完了' : '未アポ'
            ]);

            doc.autoTable({
                startY: startY,
                head: [['#', '会社名', '住所', '電話番号', '担当者', '台数', 'ステータス']],
                body: tableData,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: hexToRgb(route.color) },
                margin: { left: 14, right: 14 },
                theme: 'grid'
            });

            startY = doc.lastAutoTable.finalY + 10;

            // v2.0 - ページ跨ぎ対応
            if (startY > 260) {
                doc.addPage();
                startY = 20;
            }
        }

        // v2.0 - 未割当
        const unassigned = customers.filter(c => !c.routeId);
        if (unassigned.length > 0) {
            doc.setFontSize(12);
            doc.text(`未割当（${unassigned.length}件）`, 14, startY);
            startY += 3;

            const tableData = unassigned.map((m, idx) => [
                idx + 1, m.company || '', m.address || '',
                m.phone || '', m.contact || '',
                m.unitCount > 1 ? `${m.unitCount}台` : '', '未アポ'
            ]);

            doc.autoTable({
                startY: startY,
                head: [['#', '会社名', '住所', '電話番号', '担当者', '台数', 'ステータス']],
                body: tableData,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [158, 158, 158] },
                margin: { left: 14, right: 14 },
                theme: 'grid'
            });
        }

        doc.save(`maintenance_map_${today.replace(/\//g, '-')}.pdf`);
    }

    // v2.0 - HEXカラーをRGBに変換
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [66, 133, 244];
    }

    // v2.0 - 集計パネル更新
    function updateSummary() {
        const customers = DataStorage.getCustomers();
        const routes = DataStorage.getRoutes();
        const summaryEl = document.getElementById('summaryContent');

        if (customers.length === 0) {
            summaryEl.innerHTML = '<p class="empty-msg">データがありません</p>';
            return;
        }

        let html = '';

        // v2.0 - 全体集計
        const appointed = customers.filter(c => c.status === 'appointed').length;
        const completed = customers.filter(c => c.status === 'completed').length;
        const pending = customers.filter(c => c.status === 'pending' || !c.status).length;

        html += `<div class="summary-card">`;
        html += `<h3>📊 全体集計</h3>`;
        html += `<div class="summary-row"><span>総件数</span><span class="summary-value">${customers.length}件</span></div>`;
        html += `<div class="summary-row"><span>🔴 未アポ</span><span class="summary-value">${pending}件</span></div>`;
        html += `<div class="summary-row"><span>🟢 アポ済み</span><span class="summary-value">${appointed}件</span></div>`;
        html += `<div class="summary-row"><span>⚪ 完了</span><span class="summary-value">${completed}件</span></div>`;
        html += `</div>`;

        // v2.0 - ルート別集計
        for (const route of routes) {
            const members = customers.filter(c => c.routeId === route.id);
            if (members.length === 0) continue;

            const rAppointed = members.filter(c => c.status === 'appointed').length;
            const rCompleted = members.filter(c => c.status === 'completed').length;

            html += `<div class="summary-card">`;
            html += `<h3><span style="color:${route.color}">●</span> ${route.name}</h3>`;
            html += `<div class="summary-row"><span>件数</span><span class="summary-value">${members.length}件</span></div>`;
            html += `<div class="summary-row"><span>アポ済み</span><span class="summary-value">${rAppointed}件</span></div>`;
            html += `<div class="summary-row"><span>完了</span><span class="summary-value">${rCompleted}件</span></div>`;
            html += `</div>`;
        }

        summaryEl.innerHTML = html;
    }

    // v2.2追加 - ルートの走行距離を計算して結果を表示する
    async function calcDistance(routeId) {
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';
        document.getElementById('loadingProgress').textContent = '走行距離計算中...';

        try {
            const result = await DistanceCalc.calcRouteDistance(routeId);

            loading.style.display = 'none';

            // 結果をalertで表示＋精算書に反映するか確認
            const routes = DataStorage.getRoutes();
            const route = routes.find(r => r.id === routeId);
            const routeName = route ? route.name : routeId;

            let msg = `📏 ${routeName} の走行距離\n\n`;
            msg += `総距離: ${result.totalKm}km\n`;
            msg += `  🚗 下道: ${result.generalKm}km\n`;
            msg += `  🛣️ 高速: ${result.highwayKm}km\n\n`;
            msg += `--- 区間詳細 ---\n`;
            result.segments.forEach((s, i) => {
                const icon = s.type === 'highway' ? '🛣️' : '🚗';
                msg += `${i + 1}. ${icon} ${s.km}km (${s.duration})\n`;
            });
            msg += `\n精算書に反映しますか？`;

            if (confirm(msg)) {
                applyDistanceToExpense(result.totalKm);
            }
        } catch (err) {
            loading.style.display = 'none';
            alert('❌ 距離計算に失敗しました\n' + err.message);
        }
    }

    // v2.2追加 - 計算した距離を精算書フォームに反映する
    function applyDistanceToExpense(totalKm) {
        // 精算書タブに切り替え
        switchTab('expense');
        ExpenseForm.init();

        // 最初の行の走行距離に値を設定
        setTimeout(() => {
            const firstRow = document.querySelector('.exp-row');
            if (firstRow) {
                const distInput = firstRow.querySelector('.exp-distance');
                if (distInput) {
                    distInput.value = totalKm;
                    ExpenseForm.updateGas(distInput);
                }
            }
        }, 200);
    }

    // v2.0 - 公開API
    return {
        updateRoutePanel, toggleRouteSection,
        drawRouteLines, exportPDF, updateSummary,
        calcDistance
    };
})();
