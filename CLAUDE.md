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
- push前に `wc -l` で全ファイル500行チェック
- sw.jsのキャッシュバージョンを上げ忘れないこと

## v1.0互換の注意点
- v1.0バックアップのrouteIdは数値（0-10）、v2.0は文字列（'route_1'等）。変換が必要
- v1.0の座標はposition.lat/lngで格納されている。v2.0はlat/lng直接
- v1.0にはallItems配列があり、同一住所の全台の個別データを持っている
- v1.0にはfloors（階数）、model（機種名）、reason（メンテナンス理由）等のフィールドがある

## 実戦で学んだこと
- 電話番号にスラッシュ区切りがある場合がある（例: 03-3279-7440/03-3279-8039）。発信時は最初の番号を使う
- ルートは10色必要（v1.0が10ルートまで使っていた）
- 管理番号（MF XXXXXX形式）は顧客の重要な識別子。リストと吹き出しに表示する
- 階数情報はビルメンテナンスで必須。吹き出しに表示する
- Termuxの/tmp権限問題は `export TMPDIR=~/tmp` で解決

<!-- v2.1 精算書統合完了確認 2026-02-21 -->
