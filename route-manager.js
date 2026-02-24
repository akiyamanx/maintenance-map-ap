// ============================================
// メンテナンスマップ v2.2.3 - route-manager.js
// ルート管理・色分け・PDF出力・凡例
// v2.0新規作成 - 分割ファイル構成対応
// v2.2.1変更 - 🔢ボタン削除（ルートタブは確認専用に）
// v2.2.2変更 - 距離計算に高速/下道選択ダイアログ追加
// v2.2.3変更 - 区間別の高速/下道選択UIに変更
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

        html += `<div style="border-top:1px solid #e2e8f0;margin:6px 0;"></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#ea4335"></span><span>未アポ</span></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#34a853"></span><span>アポ済み</span></div>`;
        html += `<div class="legend-item"><span class="legend-color" style="background:#9e9e9e"></span><span>完了</span></div>`;

        itemsEl.innerHTML = html;
        legendEl.style.display = 'block';
    }

    // v2.0 - ルート線を地図に描画
    function drawRouteLines() {
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

        const today = new Date().toLocaleDateString('ja-JP');

        doc.setFontSize(16);
        doc.text('メンテナンスマップ - 一覧表', 14, 20);
        doc.setFontSize(10);
        doc.text(`出力日: ${today}`, 14, 28);

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

            if (startY > 260) {
                doc.addPage();
                startY = 20;
            }
        }

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

    // v2.2.3追加 - 区間別の高速/下道選択ダイアログを表示
    function showSegmentDialog(routeId, points, savedSegments) {
        return new Promise((resolve) => {
            // 既存ダイアログがあれば削除
            const old = document.getElementById('segmentDialog');
            if (old) old.remove();

            // 区間リストを構築
            const segList = [];
            for (let i = 0; i < points.length - 1; i++) {
                const segKey = `${points[i].id}_${points[i + 1].id}`;
                const saved = savedSegments[segKey] || 'general';
                segList.push({
                    key: segKey,
                    fromLabel: points[i].label,
                    toLabel: points[i + 1].label,
                    type: saved
                });
            }

            const overlay = document.createElement('div');
            overlay.id = 'segmentDialog';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';

            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#fff;border-radius:12px;padding:20px;max-width:380px;width:92%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

            // v2.2.3 - ヘッダー
            let headerHtml = `
                <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">📏 区間別 道路選択</div>
                <div style="font-size:13px;color:#666;margin-bottom:12px;">各区間をタップで 🚗下道 ⇔ 🛣️高速 切替</div>
            `;

            // v2.2.3 - 区間リスト（スクロール可能）
            let listHtml = `<div style="overflow-y:auto;flex:1;margin-bottom:12px;">`;
            segList.forEach((seg, idx) => {
                const isHw = seg.type === 'highway';
                const bg = isHw ? '#E3F2FD' : '#E8F5E9';
                const border = isHw ? '#2196F3' : '#4CAF50';
                const icon = isHw ? '🛣️' : '🚗';
                const label = isHw ? '高速' : '下道';

                listHtml += `
                    <div id="seg_${idx}" data-key="${seg.key}" data-type="${seg.type}"
                         onclick="RouteManager._toggleSegType(${idx})"
                         style="display:flex;align-items:center;padding:10px 12px;margin-bottom:6px;
                                border:2px solid ${border};border-radius:8px;background:${bg};
                                cursor:pointer;user-select:none;transition:all 0.2s;">
                        <span style="font-size:20px;margin-right:10px;" id="segIcon_${idx}">${icon}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${seg.fromLabel}
                            </div>
                            <div style="font-size:11px;color:#888;">↓</div>
                            <div style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${seg.toLabel}
                            </div>
                        </div>
                        <span style="font-size:14px;font-weight:bold;margin-left:8px;" id="segLabel_${idx}">${label}</span>
                    </div>
                `;
            });
            listHtml += `</div>`;

            // v2.2.3 - ボタン
            let btnHtml = `
                <div style="display:flex;gap:8px;">
                    <button id="segCancel" style="flex:1;padding:12px;border:1px solid #ccc;border-radius:8px;background:#f5f5f5;font-size:14px;cursor:pointer;color:#666;">
                        キャンセル
                    </button>
                    <button id="segCalc" style="flex:2;padding:12px;border:none;border-radius:8px;background:#1976D2;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;">
                        📏 計算する
                    </button>
                </div>
            `;

            dialog.innerHTML = headerHtml + listHtml + btnHtml;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // イベント設定
            document.getElementById('segCancel').onclick = () => { overlay.remove(); resolve(null); };
            document.getElementById('segCalc').onclick = () => {
                const result = {};
                segList.forEach((seg, idx) => {
                    const el = document.getElementById(`seg_${idx}`);
                    result[seg.key] = el.dataset.type;
                });
                overlay.remove();
                resolve(result);
            };
            overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } };
        });
    }

    // v2.2.3追加 - 区間の道路種別をトグル切替
    function _toggleSegType(idx) {
        const el = document.getElementById(`seg_${idx}`);
        const icon = document.getElementById(`segIcon_${idx}`);
        const label = document.getElementById(`segLabel_${idx}`);

        if (el.dataset.type === 'general') {
            el.dataset.type = 'highway';
            el.style.background = '#E3F2FD';
            el.style.borderColor = '#2196F3';
            icon.textContent = '🛣️';
            label.textContent = '高速';
        } else {
            el.dataset.type = 'general';
            el.style.background = '#E8F5E9';
            el.style.borderColor = '#4CAF50';
            icon.textContent = '🚗';
            label.textContent = '下道';
        }
    }

    // v2.2.3変更 - 区間別選択→距離計算→結果表示
    async function calcDistance(routeId) {
        const routes = DataStorage.getRoutes();
        const route = routes.find(r => r.id === routeId);
        if (!route) { alert('ルートが見つかりません'); return; }

        const customers = DataStorage.getCustomers();
        const members = customers.filter(c => c.routeId === routeId);

        // 訪問順で並べ替え
        const ordered = [];
        if (route.order && route.order.length > 0) {
            for (const cid of route.order) {
                const found = members.find(m => m.id === cid);
                if (found) ordered.push(found);
            }
            for (const m of members) {
                if (!ordered.find(o => o.id === m.id)) ordered.push(m);
            }
        } else {
            ordered.push(...members);
        }

        // 自宅住所チェック
        const settings = DataStorage.getSettings();
        const homeAddress = settings.homeAddress;
        if (!homeAddress) { alert('設定で自宅住所（出発点）を登録してください'); return; }

        // v2.2.3 - ポイントリスト（表示名付き）
        const points = [];
        points.push({ id: 'home_start', address: homeAddress, label: '🏠 自宅（出発）' });
        ordered.forEach(m => {
            const name = (m.company || '不明').substring(0, 15);
            points.push({ id: m.id, address: m.address, label: name });
        });
        points.push({ id: 'home_end', address: homeAddress, label: '🏠 自宅（帰着）' });

        // v2.2.3 - 保存済み区間設定を取得
        const allSegments = DataStorage.getSegments();
        const savedSegments = allSegments[routeId] || {};

        // v2.2.3 - 区間選択ダイアログ
        const segmentChoices = await showSegmentDialog(routeId, points, savedSegments);
        if (!segmentChoices) return;

        // v2.2.3 - 選択結果を保存（次回用）
        allSegments[routeId] = segmentChoices;
        DataStorage.saveSegments(allSegments);

        // 計算実行
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';
        document.getElementById('loadingProgress').textContent = '走行距離計算中...';

        try {
            // v2.2.3 - segmentChoicesを直接渡す
            const result = await DistanceCalc.calcRouteDistance(routeId, segmentChoices);
            loading.style.display = 'none';

            let msg = `📏 ${route.name} の走行距離\n\n`;
            msg += `総距離: ${result.totalKm}km\n`;
            msg += `  🚗 下道: ${result.generalKm}km\n`;
            msg += `  🛣️ 高速: ${result.highwayKm}km\n\n`;
            msg += `--- 区間詳細 ---\n`;
            result.segments.forEach((s, i) => {
                const icon = s.type === 'highway' ? '🛣️' : '🚗';
                msg += `${i + 1}. ${icon} ${s.km}km (${s.duration})\n`;
                msg += `   ${s.from} → ${s.to}\n`;
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

    // v2.2追加 - 計算した距離を精算書フォームに反映
    function applyDistanceToExpense(totalKm) {
        switchTab('expense');
        ExpenseForm.init();

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
        calcDistance, _toggleSegType
    };
})();
