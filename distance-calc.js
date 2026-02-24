// ============================================
// メンテナンスマップ v2.2.1 - distance-calc.js
// 走行距離計算モジュール（Directions API使用）
// v2.2新規作成
// v2.2.1変更 - 高速/下道モード選択対応
// ============================================

const DistanceCalc = (() => {
    // v2.2 - Directions APIで2点間の距離を取得する
    function getDistance(origin, destination, avoidHighways) {
        return new Promise((resolve, reject) => {
            const service = new google.maps.DirectionsService();
            service.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways: avoidHighways
            }, (result, status) => {
                if (status === 'OK' && result.routes[0]) {
                    const leg = result.routes[0].legs[0];
                    resolve({
                        distanceM: leg.distance.value,
                        distanceKm: Math.round(leg.distance.value / 1000),
                        distanceText: leg.distance.text,
                        durationSec: leg.duration.value,
                        durationText: leg.duration.text
                    });
                } else {
                    reject(new Error('Directions API error: ' + status));
                }
            });
        });
    }

    // v2.2 - ルート全体の走行距離を計算する
    // v2.2.1変更 - roadType引数追加（'general' | 'highway' | 'segment'）
    // homeAddress（出発地）→ 訪問順の各顧客 → homeAddress（帰着）
    async function calcRouteDistance(routeId, roadType) {
        const routes = DataStorage.getRoutes();
        const route = routes.find(r => r.id === routeId);
        if (!route) throw new Error('ルートが見つかりません');

        const customers = DataStorage.getCustomers();
        const members = customers.filter(c => c.routeId === routeId);
        if (members.length === 0) throw new Error('ルートにメンバーがいません');

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

        // 自宅住所を取得
        const settings = DataStorage.getSettings();
        const homeAddress = settings.homeAddress;
        if (!homeAddress) throw new Error('設定で自宅住所（出発点）を登録してください');

        // 区間データ取得（segmentモード時のみ使用）
        const allSegments = DataStorage.getSegments();
        const routeSegments = allSegments[routeId] || {};

        // 全ポイントリスト: 自宅 → 各顧客 → 自宅
        const points = [];
        points.push({ address: homeAddress, id: 'home_start' });
        ordered.forEach(m => points.push({ address: m.address, id: m.id }));
        points.push({ address: homeAddress, id: 'home_end' });

        // 区間ごとに距離計算
        let totalKm = 0;
        let highwayKm = 0;
        let generalKm = 0;
        const segments = [];

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];

            // v2.2.1変更 - roadTypeに応じてavoidHighwaysを決定
            let avoidHighways;
            if (roadType === 'general') {
                // 下道のみ：全区間で高速を回避
                avoidHighways = true;
            } else if (roadType === 'highway') {
                // 高速OK：全区間で高速を許可
                avoidHighways = false;
            } else {
                // segmentモード（従来動作）：区間ごとの設定に従う
                const segKey = `${from.id}_${to.id}`;
                const segType = routeSegments[segKey] || 'general';
                avoidHighways = (segType === 'general');
            }

            // v2.2.1変更 - 表示用の区間種別
            const displayType = avoidHighways ? 'general' : 'highway';

            // Directions API呼び出し（レート制限対策で500ms間隔）
            if (i > 0) await sleep(500);

            try {
                const result = await getDistance(from.address, to.address, avoidHighways);
                const seg = {
                    from: from.address.substring(0, 20),
                    to: to.address.substring(0, 20),
                    type: displayType,
                    km: result.distanceKm,
                    duration: result.durationText
                };
                segments.push(seg);
                totalKm += result.distanceKm;
                if (displayType === 'highway') highwayKm += result.distanceKm;
                else generalKm += result.distanceKm;
            } catch (err) {
                console.warn(`区間距離計算失敗: ${from.address} → ${to.address}`, err);
                segments.push({
                    from: from.address.substring(0, 20),
                    to: to.address.substring(0, 20),
                    type: displayType,
                    km: 0,
                    duration: '計算失敗',
                    error: true
                });
            }
        }

        return { totalKm, highwayKm, generalKm, segments, roadType };
    }

    // v2.2 - 待機関数
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return { getDistance, calcRouteDistance };
})();
