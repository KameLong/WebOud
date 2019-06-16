# WebOudのGUI構成を考える

- トップページ (app)
  - 画面遷移管理 (selector)
  - メイン画面 (main)
    - αコンテナ (layout-a)
      - タブレイアウト (layout-tab)
        - コンテンツリスト (container)
    - βコンテナ
      - タブレイアウト
        - コンテンツリスト
    
##コンテンツごとのGUI

###時刻表画面

- コンテンツ(container)
  - 時刻表(timetable)
    - 時刻表メニュー(timetable-menu)
    - 駅名タイトル(station-title)
    - 駅名(station-list)
    - 列車タイトル(train-title)
    - 列車リスト(train-list)
