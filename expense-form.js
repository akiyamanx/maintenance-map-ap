// ============================================
// メンテナンスマップ v2.3 - expense-form.js
// 交通費精算書フォーム・下書き管理
// v2.1新規作成 - CULOchanSEISANshoから統合
// PDF生成はexpense-pdf.jsに委譲
// v2.2改修 - ETC明細読込ボタン追加
// v2.2.4追加 - setDestination()で行先自動入力対応
// v2.3追加 - resetInitFlag()でワークスペース切替対応
// ============================================

const ExpenseForm = (() => {
    let rowCount = 0;
    let initialized = false;

    // v2.1 - 精算書タブの初期化
    function init() {
        if (!initialized) {
            renderExpensePanel();
            initialized = true;
        }
        loadDraftList();
    }

    // v2.1 - 精算書パネルのHTML生成
    function renderExpensePanel() {
        const container = document.getElementById('tabExpense');
        if (!container) return;

        container.innerHTML = `
            <div class="exp-panel">
                <div class="exp-section">
                    <div class="exp-section-title">📋 基本情報</div>
                    <div class="exp-form-grid">
                        <div class="exp-field">
                            <label>提出日</label>
                            <input type="date" id="expSubmitDate">
                        </div>
                        <div class="exp-field">
                            <label>SS名</label>
                            <input type="text" id="expSsName" value="千葉西SS">
                        </div>
                    </div>
                    <div class="exp-field" style="margin-top:8px;">
                        <label>行先（お客様名）</label>
                        <textarea id="expDestination" rows="2"
                            placeholder="逗子市&#10;クラフティ北村"></textarea>
                    </div>
                    <div class="exp-field" style="margin-top:8px;">
                        <label>氏名</label>
                        <input type="text" id="expEmployeeName" value="小出晃也">
                    </div>
                </div>

                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <a href="https://www.etc-meisai.jp/" target="_blank"
                       class="exp-etc-btn" style="flex:1;">
                        🛣️ ETC照会を開く
                    </a>
                    <label class="exp-etc-btn" style="flex:1;background:linear-gradient(135deg,#0d7377,#14919b);cursor:pointer;">
                        📂 ETC明細読込
                        <input type="file" accept=".csv" style="display:none"
                            onchange="EtcReader.handleFile(event)">
                    </label>
                </div>

                <div class="exp-section">
                    <div class="exp-section-title">🚃 交通費明細</div>
                    <div id="expRows"></div>
                    <button class="exp-add-row-btn"
                        onclick="ExpenseForm.addRow()">
                        ➕ 行を追加
                    </button>
                    <p class="exp-hint">
                        💡 走行距離100km以上でガソリン代自動計算</p>
                </div>

                <div class="exp-total-card">
                    <div class="exp-total-label">合計金額</div>
                    <div class="exp-total-amount" id="expGrandTotal">¥0</div>
                </div>

                <div class="exp-actions">
                    <button class="exp-btn exp-btn-pdf"
                        onclick="ExpenseForm.generatePDF()">
                        📄 PDF出力</button>
                    <button class="exp-btn exp-btn-save"
                        onclick="ExpenseForm.saveDraft()">
                        💾 下書き保存</button>
                    <button class="exp-btn exp-btn-clear"
                        onclick="ExpenseForm.clearAll()">
                        🗑️ クリア</button>
                </div>

                <div class="exp-section">
                    <div class="exp-section-title">📁 下書き一覧</div>
                    <div id="expDraftList" class="exp-draft-list">
                        <p class="empty-msg">下書きはありません</p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('expSubmitDate').value =
            new Date().toISOString().split('T')[0];
        rowCount = 0;
        addRow();
    }

    // v2.1 - 明細行を追加
    function addRow() {
        rowCount++;
        const container = document.getElementById('expRows');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'exp-row';
        row.id = `expRow-${rowCount}`;
        const num = rowCount;

        row.innerHTML = `
            <div class="exp-row-head">
                <span class="exp-row-num">${num}</span>
                <button class="exp-row-del"
                    onclick="ExpenseForm.deleteRow(${num})">✕</button>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field exp-field-sm">
                    <label>月</label>
                    <input type="number" class="exp-month"
                        placeholder="2" min="1" max="12">
                </div>
                <div class="exp-field exp-field-sm">
                    <label>日</label>
                    <input type="number" class="exp-day"
                        placeholder="21" min="1" max="31">
                </div>
                <div class="exp-field exp-field-grow">
                    <label>交通機関</label>
                    <input type="text" class="exp-transport"
                        placeholder="高速道路">
                </div>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field">
                    <label>走行距離(km)</label>
                    <input type="number" class="exp-distance"
                        placeholder="186"
                        onchange="ExpenseForm.updateGas(this)">
                </div>
                <div class="exp-field">
                    <label>ガソリン代</label>
                    <input type="number" class="exp-gas"
                        placeholder="自動" readonly>
                </div>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field exp-field-grow">
                    <label>高速代（カンマ区切り可）</label>
                    <input type="text" class="exp-highway"
                        placeholder="5110"
                        onchange="ExpenseForm.calcTotals()">
                </div>
                <div class="exp-field exp-field-sm">
                    <label>枚数</label>
                    <input type="number" class="exp-hw-count"
                        placeholder="8">
                </div>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field">
                    <label>その他</label>
                    <input type="number" class="exp-other"
                        placeholder="0"
                        onchange="ExpenseForm.calcTotals()">
                </div>
                <div class="exp-field">
                    <label>船賃</label>
                    <input type="number" class="exp-ship"
                        placeholder="0"
                        onchange="ExpenseForm.calcTotals()">
                </div>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field">
                    <label>電車賃</label>
                    <input type="number" class="exp-train"
                        placeholder="0"
                        onchange="ExpenseForm.calcTotals()">
                </div>
                <div class="exp-field">
                    <label>航空賃</label>
                    <input type="number" class="exp-air"
                        placeholder="0"
                        onchange="ExpenseForm.calcTotals()">
                </div>
            </div>
            <div class="exp-form-grid">
                <div class="exp-field">
                    <label>宿泊料</label>
                    <input type="number" class="exp-hotel"
                        placeholder="0"
                        onchange="ExpenseForm.calcTotals()">
                </div>
                <div class="exp-field">
                    <label>宿泊先</label>
                    <input type="text" class="exp-hotel-name"
                        placeholder="">
                </div>
            </div>
            <div class="exp-row-total">
                行合計: <span class="exp-row-total-val">¥0</span>
            </div>
        `;
        container.appendChild(row);
        updateRowNumbers();
    }

    // v2.1 - 行を削除
    function deleteRow(id) {
        const row = document.getElementById(`expRow-${id}`);
        const allRows = document.querySelectorAll('.exp-row');
        if (row && allRows.length > 1) {
            row.remove();
            updateRowNumbers();
            calcTotals();
        }
    }

    // v2.1 - 行番号を振り直す
    function updateRowNumbers() {
        document.querySelectorAll('.exp-row').forEach((row, i) => {
            row.querySelector('.exp-row-num').textContent = i + 1;
        });
    }

    // v2.1 - ガソリン代自動計算（100km以上で(km-100)×30円）
    function updateGas(input) {
        const row = input.closest('.exp-row');
        const km = parseInt(input.value) || 0;
        const gas = km >= 100 ? (km - 100) * 30 : 0;
        row.querySelector('.exp-gas').value = gas || '';
        calcTotals();
    }

    // v2.1 - 高速代のカンマ区切りパース
    function parseHighway(value) {
        if (!value) return 0;
        return value.split(/[,、，]/).reduce(
            (sum, v) => sum + (parseInt(v.trim()) || 0), 0
        );
    }

    // v2.1 - 合計金額計算
    function calcTotals() {
        let grandTotal = 0;
        document.querySelectorAll('.exp-row').forEach(row => {
            const gas = parseInt(row.querySelector('.exp-gas').value) || 0;
            const hw = parseHighway(row.querySelector('.exp-highway').value);
            const ot = parseInt(row.querySelector('.exp-other').value) || 0;
            const sh = parseInt(row.querySelector('.exp-ship').value) || 0;
            const tr = parseInt(row.querySelector('.exp-train').value) || 0;
            const ai = parseInt(row.querySelector('.exp-air').value) || 0;
            const ho = parseInt(row.querySelector('.exp-hotel').value) || 0;
            const rowTotal = gas + hw + ot + sh + tr + ai + ho;
            row.querySelector('.exp-row-total-val').textContent =
                `¥${rowTotal.toLocaleString()}`;
            grandTotal += rowTotal;
        });
        const el = document.getElementById('expGrandTotal');
        if (el) el.textContent = `¥${grandTotal.toLocaleString()}`;
    }

    // v2.1 - 全行データを収集
    function collectRowData() {
        const rows = [];
        document.querySelectorAll('.exp-row').forEach(row => {
            rows.push({
                month: row.querySelector('.exp-month').value,
                day: row.querySelector('.exp-day').value,
                transport: row.querySelector('.exp-transport').value,
                distance: row.querySelector('.exp-distance').value,
                gasCost: row.querySelector('.exp-gas').value,
                highway: row.querySelector('.exp-highway').value,
                highwayCount: row.querySelector('.exp-hw-count').value,
                other: row.querySelector('.exp-other').value,
                ship: row.querySelector('.exp-ship').value,
                train: row.querySelector('.exp-train').value,
                air: row.querySelector('.exp-air').value,
                hotel: row.querySelector('.exp-hotel').value,
                hotelName: row.querySelector('.exp-hotel-name').value
            });
        });
        return rows;
    }

    // v2.2.4追加 - 行先テキストを外部から設定（距離計算→精算書反映で使用）
    function setDestination(text) {
        const el = document.getElementById('expDestination');
        if (el) {
            el.value = text;
        }
    }

    // v2.1 - 下書き保存
    function saveDraft() {
        const draft = {
            submitDate: document.getElementById('expSubmitDate').value,
            ssName: document.getElementById('expSsName').value,
            destination: document.getElementById('expDestination').value,
            employeeName: document.getElementById('expEmployeeName').value,
            rows: collectRowData()
        };
        DataStorage.addExpense(draft);
        alert('💾 下書きを保存しました！');
        loadDraftList();
    }

    // v2.1 - 下書き一覧表示
    function loadDraftList() {
        const expenses = DataStorage.getExpenses();
        const listEl = document.getElementById('expDraftList');
        if (!listEl) return;

        if (expenses.length === 0) {
            listEl.innerHTML =
                '<p class="empty-msg">下書きはありません</p>';
            return;
        }

        let html = '';
        expenses.forEach(d => {
            const dateStr = d.createdAt
                ? new Date(d.createdAt).toLocaleString('ja-JP') : '';
            html += `<div class="exp-draft-item">
                <div class="exp-draft-info"
                    onclick="ExpenseForm.loadDraft('${d.id}')">
                    <div class="exp-draft-title">
                        ${d.destination || '（行先未入力）'}</div>
                    <div class="exp-draft-date">${dateStr}</div>
                </div>
                <button class="exp-draft-del"
                    onclick="ExpenseForm.deleteDraft('${d.id}')">
                    🗑️</button>
            </div>`;
        });
        listEl.innerHTML = html;
    }

    // v2.1 - 下書き読み込み
    function loadDraft(id) {
        const expenses = DataStorage.getExpenses();
        const draft = expenses.find(e => e.id === id);
        if (!draft) { alert('下書きが見つかりません'); return; }
        if (!confirm('現在の入力を破棄して読み込みますか？')) return;

        document.getElementById('expSubmitDate').value =
            draft.submitDate || new Date().toISOString().split('T')[0];
        document.getElementById('expSsName').value =
            draft.ssName || '千葉西SS';
        document.getElementById('expDestination').value =
            draft.destination || '';
        document.getElementById('expEmployeeName').value =
            draft.employeeName || '小出晃也';

        document.getElementById('expRows').innerHTML = '';
        rowCount = 0;

        if (draft.rows && draft.rows.length > 0) {
            draft.rows.forEach(rd => {
                addRow();
                const r = document.getElementById(`expRow-${rowCount}`);
                r.querySelector('.exp-month').value = rd.month || '';
                r.querySelector('.exp-day').value = rd.day || '';
                r.querySelector('.exp-transport').value = rd.transport || '';
                r.querySelector('.exp-distance').value = rd.distance || '';
                r.querySelector('.exp-gas').value = rd.gasCost || '';
                r.querySelector('.exp-highway').value = rd.highway || '';
                r.querySelector('.exp-hw-count').value = rd.highwayCount || '';
                r.querySelector('.exp-other').value = rd.other || '';
                r.querySelector('.exp-ship').value = rd.ship || '';
                r.querySelector('.exp-train').value = rd.train || '';
                r.querySelector('.exp-air').value = rd.air || '';
                r.querySelector('.exp-hotel').value = rd.hotel || '';
                r.querySelector('.exp-hotel-name').value = rd.hotelName || '';
            });
        } else { addRow(); }
        calcTotals();
        alert('📂 下書きを読み込みました！');
    }

    // v2.1 - 下書き削除
    function deleteDraft(id) {
        if (!confirm('この下書きを削除しますか？')) return;
        DataStorage.deleteExpense(id);
        loadDraftList();
    }

    // v2.1 - フォームクリア
    function clearAll() {
        if (!confirm('すべての入力をクリアしますか？')) return;
        document.getElementById('expDestination').value = '';
        document.getElementById('expRows').innerHTML = '';
        rowCount = 0;
        addRow();
        calcTotals();
    }

    // v2.1 - PDF生成（expense-pdf.jsに委譲）
    function generatePDF() {
        const formData = {
            submitDate: document.getElementById('expSubmitDate').value,
            ssName: document.getElementById('expSsName').value,
            destination: document.getElementById('expDestination').value,
            employeeName: document.getElementById('expEmployeeName').value
        };
        ExpensePdf.generate(formData, collectRowData());
    }

    // v2.3追加 - ワークスペース切替時にフラグリセット（再init可能にする）
    function resetInitFlag() {
        initialized = false;
    }

    return {
        init, addRow, deleteRow, updateGas, calcTotals,
        saveDraft, loadDraft, deleteDraft, loadDraftList,
        clearAll, generatePDF,
        setDestination,     // v2.2.4追加
        resetInitFlag       // v2.3追加
    };
})();
