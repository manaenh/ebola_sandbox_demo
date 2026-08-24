# 深圳离线地理数据

本目录只包含全局态势页运行时需要的精简矢量数据。页面通过 MapLibre GL JS 读取本地 GeoJSON，不使用在线地图瓦片或远程地图 API。

## 文件

- `shenzhen-boundary.geojson`：深圳九个连续行政区的陆域融合轮廓。
- `shenzhen-districts.geojson`：同一范围内的区级边界，用于低对比度内部线条。
- `pearl-river-delta-land.geojson`：从 Natural Earth 陆地数据裁剪的珠江口区域背景，用于缩放和平移时提供更广地理上下文。

## 来源与许可

- 行政边界：OpenStreetMap relation `3464353`（深圳市）及其九个连续区级 subarea relations，数据提取于 2026-08-24。© OpenStreetMap contributors，ODbL 1.0。
- 海岸/陆地掩膜：Natural Earth `ne_10m_land`，1:10m，public domain。
- 机场坐标：OpenStreetMap way `479727227`（深圳宝安国际机场），经 Nominatim 检索核对。

深圳市关系还列出地理上分离的深汕特别合作区。当前演示画面聚焦连续的深圳主行政区，因此不将该远端合作区纳入主画幅；这避免为容纳远端区域而缩小深圳主体。此选择记录在 GeoJSON 的 `note` 属性中。

## 生成方式

`scripts/build-shenzhen-map.mjs` 将下载阶段保存在 `.source_extract/geo` 的 OSM 区级 geometry 与 Natural Earth 陆地数据相交，消除行政海域对陆地轮廓的干扰，同时裁剪珠江口区域背景，然后生成本目录中的三个文件。最终文件保留来源、许可和 relation ID。

## 点位语义

- 深圳宝安国际机场使用真实地理坐标。
- 市中心医院、家庭、市疾控中心以及交通过程点均使用 `scenario` 坐标，只用于桌面推演的空间表达，不对应真实地址。
- 病例轨迹线只表示移动历史，不表示有效暴露、感染或传播方向。
