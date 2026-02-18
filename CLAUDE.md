# メンテナンスマップ v2.0

## プロジェクト概要
ウォーターサーバーメンテナンス先の地図管理PWAアプリ

## 技術スタック
- HTML + CSS + Vanilla JS（フレームワークなし）
- Google Maps API（Geocoding, Places, Geometry）
- LocalStorage（データ永続化）
- jsPDF + AutoTable（PDF出力）
- SheetJS/xlsx（Excel読込）
- Service Worker（PWAオフライン対応）

## ファイル構成
| ファイル | 役割 |
|---|---|
| `index.html` | メインHTML、UIレイアウト、モーダル、API初期化 |
| `styles.css` | 全スタイル定義（CSS変数ベース） |
| `data-storage.js` | LocalStorage管理、顧客CRUD、バックアップ、v1.0互換変換 |
| `csv-handler.js` | CSV/Excel読込、パース、同一住所まとめ |
| `map-core.js` | Google Maps初期化、マーカー管理、ジオコーディング |
| `route-manager.js` | ルート管理、色分け、PDF出力、集計 |
| `ui-actions.js` | グローバルUI関数、モーダル・メニュー・パネル制御 |
| `sw.js` | Service Worker、キャッシュ管理 |
| `manifest.json` | PWAマニフェスト |

## コーディングルール
- 1ファイル500行以内に収める
- コメントは日本語で記述する
- 各ファイル先頭にバージョン番号を記載する
- 既存コードの動作を破壊しない（後方互換性を維持）

## Git運用ルール
- コミットメッセージは日本語で書く
- ファイル変更時は `sw.js` の `CACHE_NAME` バージョンを更新すること（忘れずに）
