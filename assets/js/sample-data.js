(function (root) {
  "use strict";

  root.CESIUM_STAGE_SAMPLE_DATA = {
    floodBands: [
      {
        id: "flood-00-10",
        name: "0.0m - 1.0m 低窪積水",
        minLevel: 0,
        color: "#3aa0ff",
        coordinates: [
          [120.6501, 24.1012],
          [120.6652, 24.1038],
          [120.6718, 24.0951],
          [120.6592, 24.0887],
          [120.6464, 24.0933],
        ],
      },
      {
        id: "flood-10-25",
        name: "1.0m - 2.5m 河岸漫淹",
        minLevel: 1,
        color: "#2c7be5",
        coordinates: [
          [120.6402, 24.1084],
          [120.6744, 24.1119],
          [120.6845, 24.0956],
          [120.6628, 24.0811],
          [120.6334, 24.0924],
        ],
      },
      {
        id: "flood-25-40",
        name: "2.5m - 4.0m 道路中斷",
        minLevel: 2.5,
        color: "#1457c9",
        coordinates: [
          [120.6288, 24.1162],
          [120.6844, 24.121],
          [120.7008, 24.0964],
          [120.664, 24.0702],
          [120.6164, 24.0875],
        ],
      },
      {
        id: "flood-40-50",
        name: "4.0m+ 高風險範圍",
        minLevel: 4,
        color: "#082f8f",
        coordinates: [
          [120.6126, 24.1254],
          [120.6974, 24.1302],
          [120.7191, 24.096],
          [120.665, 24.0588],
          [120.5978, 24.0816],
        ],
      },
    ],
    cctv: [
      {
        id: "cctv-wuri-01",
        name: "烏日溪南路 CCTV",
        longitude: 120.6428,
        latitude: 24.0956,
        groundElevation: 1.1,
        note: "低窪道路",
      },
      {
        id: "cctv-wuri-02",
        name: "烏日高鐵特區 CCTV",
        longitude: 120.6547,
        latitude: 24.1058,
        groundElevation: 2.2,
        note: "交通節點",
      },
      {
        id: "cctv-dadu-01",
        name: "大肚橋下 CCTV",
        longitude: 120.6708,
        latitude: 24.0912,
        groundElevation: 3.1,
        note: "橋梁監控",
      },
      {
        id: "cctv-nantun-01",
        name: "南屯工業區 CCTV",
        longitude: 120.6874,
        latitude: 24.1164,
        groundElevation: 4.6,
        note: "產業區",
      },
      {
        id: "cctv-taichung-01",
        name: "市區高點 CCTV",
        longitude: 120.7065,
        latitude: 24.1284,
        groundElevation: 7.8,
        note: "高地參考",
      },
    ],
    roads: [
      {
        id: "road-01",
        name: "示範道路 A",
        minLevel: 2.5,
        coordinates: [
          [120.632, 24.094],
          [120.654, 24.101],
          [120.686, 24.097],
        ],
      },
      {
        id: "road-02",
        name: "示範道路 B",
        minLevel: 3.5,
        coordinates: [
          [120.646, 24.116],
          [120.662, 24.096],
          [120.671, 24.078],
        ],
      },
    ],
    debrisFlows: [
      {
        id: "debris-flow-east-01",
        name: "霧峰山溝泥流",
        minLevel: 1.5,
        coordinates: [
          [120.723, 24.118],
          [120.706, 24.106],
          [120.691, 24.098],
          [120.674, 24.093],
          [120.658, 24.089],
        ],
      },
      {
        id: "debris-flow-east-02",
        name: "大里溪側坡泥流",
        minLevel: 2.8,
        coordinates: [
          [120.716, 24.071],
          [120.701, 24.082],
          [120.684, 24.087],
          [120.665, 24.086],
        ],
      },
      {
        id: "debris-flow-west-01",
        name: "大肚山邊坡泥流",
        minLevel: 3.6,
        coordinates: [
          [120.612, 24.132],
          [120.626, 24.119],
          [120.642, 24.108],
          [120.655, 24.099],
        ],
      },
    ],
  };
})(window);
