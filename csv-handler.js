// ============================================
// メンテナンスマップ v2.0 - csv-handler.js
// CSV/Excelアップロード・パース・同一住所まとめ
// v2.0新規作成 - 分割ファイル構成対応
// ============================================

const CsvHandler = (() => {

    // v2.0 - ファイル読み込みハンドラー
    function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'csv') {
            readCSV(file);
        } else if (ext === 'xlsx' || ext === 'xls') {
            readExcel(file);
        } else {
            alert('CSV, XLSX, XLS ファイルを選択してください。');
        }
        event.target.value = '';
    }

    // v2.0 - CSV読み込み
    function readCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = parseCSV(text);
            processRows(rows);
        };
        reader.readAsText(file, 'UTF-8');
    }

    // v2.0 - CSVパース（カンマ区切り、ダブルクォート対応）
    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const rows = [];
        for (const line of lines) {
            const cols = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                    cols.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            cols.push(current.trim());
            rows.push(cols);
        }
        return rows;
    }

    // v2.0 - Excel読み込み（SheetJS/xlsx使用）
    function readExcel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                processRows(rows);
            } catch (err) {
                alert('❌ Excelファイルの読み込みに失敗しました。');
                console.error('Excel読込エラー:', err);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // v2.0 - 行データを顧客データに変換
    function processRows(rows) {
        if (rows.length < 2) {
            alert('データが見つかりません。ヘッダー行＋データ行が必要です。');
            return;
        }

        // v2.0 - ヘッダー行からカラムを自動検出
        const header = rows[0].map(h => String(h || '').trim());
        const colMap = detectColumns(header);

        if (colMap.company === -1 && colMap.address === -1) {
            alert('会社名または住所の列が見つかりません。\nヘッダー行に「会社名」「住所」が含まれているか確認してください。');
            return;
        }

        const dataRows = rows.slice(1).filter(r => r.length > 1 && r.some(c => c));
        const newCustomers = [];

        for (const row of dataRows) {
            const company = colMap.company >= 0 ? String(row[colMap.company] || '').trim() : '';
            const address = colMap.address >= 0 ? String(row[colMap.address] || '').trim() : '';

            if (!company && !address) continue;

            const customer = {
                company: company,
                address: address,
                phone: colMap.phone >= 0 ? String(row[colMap.phone] || '').trim() : '',
                contact: colMap.contact >= 0 ? String(row[colMap.contact] || '').trim() : '',
                note: colMap.note >= 0 ? String(row[colMap.note] || '').trim() : '',
                managementNo: colMap.managementNo >= 0 ? String(row[colMap.managementNo] || '').trim() : ''
            };
            newCustomers.push(customer);
        }

        if (newCustomers.length === 0) {
            alert('有効なデータが見つかりません。');
            return;
        }

        // v2.0 - 同一住所をまとめる処理
        const grouped = groupByAddress(newCustomers);

        // v2.0 - データを保存してジオコーディング開始
        const existing = DataStorage.getCustomers();
        for (const item of grouped) {
            DataStorage.addCustomer(item);
        }

        alert(`✅ ${grouped.length}件のデータを読み込みました！\n（元データ: ${newCustomers.length}件、同一住所まとめ後: ${grouped.length}件）`);

        // v2.0 - 地図にマーカー追加
        if (typeof MapCore !== 'undefined') {
            MapCore.geocodeAndPlot(grouped);
        }
    }

    // v2.0 - ヘッダーからカラム位置を自動検出
    function detectColumns(header) {
        const map = {
            company: -1,
            address: -1,
            phone: -1,
            contact: -1,
            note: -1,
            managementNo: -1
        };

        for (let i = 0; i < header.length; i++) {
            const h = header[i].toLowerCase();
            if (h.includes('会社') || h.includes('設置先') || h.includes('名称') || h.includes('company')) {
                if (map.company === -1) map.company = i;
            } else if (h.includes('住所') || h.includes('address') || h.includes('所在地')) {
                if (map.address === -1) map.address = i;
            } else if (h.includes('電話') || h.includes('tel') || h.includes('phone')) {
                if (map.phone === -1) map.phone = i;
            } else if (h.includes('担当') || h.includes('contact') || h.includes('受付')) {
                if (map.contact === -1) map.contact = i;
            } else if (h.includes('備考') || h.includes('情報') || h.includes('note') || h.includes('memo')) {
                if (map.note === -1) map.note = i;
            } else if (h.includes('管理') || h.includes('no') || h.includes('番号')) {
                if (map.managementNo === -1) map.managementNo = i;
            }
        }

        // v2.0 - カラムが見つからない場合、位置ベースで推定
        if (map.company === -1 && map.address === -1 && header.length >= 3) {
            map.managementNo = 0;
            map.company = 1;
            map.address = 2;
            if (header.length >= 4) map.phone = 3;
            if (header.length >= 5) map.contact = 4;
            if (header.length >= 6) map.note = 5;
        }

        return map;
    }

    // v2.0 - 同一住所のデータをまとめる
    function groupByAddress(customers) {
        const addressMap = {};

        for (const c of customers) {
            // v2.0 - 住所を正規化（全角→半角、スペース除去）
            const normalizedAddr = normalizeAddress(c.address);

            if (addressMap[normalizedAddr]) {
                // v2.0 - 同一住所に追加 → 台数カウント
                const existing = addressMap[normalizedAddr];
                existing.unitCount = (existing.unitCount || 1) + 1;
                // v2.0 - 会社名が異なる場合はメモに追記
                if (existing.company !== c.company) {
                    existing.note = (existing.note ? existing.note + '\n' : '') + `[${c.company}] ${c.note || ''}`;
                } else {
                    if (c.note) {
                        existing.note = (existing.note ? existing.note + '\n' : '') + c.note;
                    }
                }
            } else {
                addressMap[normalizedAddr] = { ...c, unitCount: 1 };
            }
        }

        return Object.values(addressMap);
    }

    // v2.0 - 住所正規化
    function normalizeAddress(address) {
        if (!address) return '';
        return address
            .replace(/\s+/g, '')
            .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            .replace(/[ー−‐]/g, '-')
            .replace(/　/g, '');
    }

    // v2.0 - 公開API
    return { handleFile, processRows, groupByAddress };
})();
