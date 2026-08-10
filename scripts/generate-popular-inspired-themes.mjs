import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const executeFile = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const siteRoot = path.join(repositoryRoot, "site");
const themesRoot = path.join(siteRoot, "themes");
const catalogPath = path.join(siteRoot, "catalog.json");
const inspirationSourceUrl = "https://dreamskin.cc/gallery?community=popular";

const generatedThemes = [
  {
    id: "rainy-lounge-evening", name: "雨幕客厅", englishName: "Rainy Lounge Evening",
    description: "雨线滑过落地窗，暖灯、沙发与唱片机把工作区变成安静的夜晚。",
    englishDescription: "A warm lounge, turntable, and rain-streaked windows for quiet evening work.",
    tags: ["室内", "雨夜", "暖色"], appearance: "dark", scene: "rainy-lounge",
    palette: ["#111722", "#26384a", "#d9935c", "#f3cf95"], accent: "#e9a66d",
  },
  {
    id: "hologram-pop-stage", name: "全息舞台", englishName: "Hologram Pop Stage",
    description: "青紫灯束、全息声场与原创虚拟歌者剪影，带来明快的数字舞台感。",
    englishDescription: "An original virtual performer surrounded by cyan-magenta holograms and sound waves.",
    tags: ["全息", "音乐", "霓虹"], appearance: "dark", scene: "hologram-stage",
    palette: ["#080b1b", "#20235a", "#33e3db", "#ff62c7"], accent: "#42e6df",
  },
  {
    id: "cartoon-vault-lab", name: "奇想保险库", englishName: "Wonder Vault Lab",
    description: "原创机械伙伴守着巨型金库门，圆润造型与高饱和色彩充满玩心。",
    englishDescription: "An original mechanical companion guards a playful, high-color laboratory vault.",
    tags: ["卡通", "机械", "明亮"], appearance: "light", scene: "vault-lab",
    palette: ["#d8f5ff", "#77cfe8", "#f4b83f", "#234b67"], accent: "#1e8eb8",
  },
  {
    id: "mythic-cloud-warrior", name: "云海行者", englishName: "Mythic Cloud Walker",
    description: "原创行者立于云海残垣之间，赤金天光和墨色山影构成东方神话气质。",
    englishDescription: "An original cloud walker framed by ruined arches, ink mountains, and amber light.",
    tags: ["神话", "云海", "东方"], appearance: "dark", scene: "cloud-warrior",
    palette: ["#111417", "#394247", "#bf6b38", "#edc889"], accent: "#d69a57",
  },
  {
    id: "rose-window-morning", name: "蔷薇晨窗", englishName: "Rose Window Morning",
    description: "晨光穿过拱窗与薄纱，蔷薇、书页和玻璃瓶组成柔和的人文空间。",
    englishDescription: "Morning light, sheer curtains, roses, and open books create a gentle studio scene.",
    tags: ["晨光", "蔷薇", "室内"], appearance: "light", scene: "rose-window",
    palette: ["#f7e9e3", "#d9c9c2", "#b85f70", "#fff5d7"], accent: "#b85f70",
  },
  {
    id: "firefly-river-night", name: "流萤河谷", englishName: "Firefly River Valley",
    description: "蓝绿河谷被流萤点亮，远处小屋与星空让深夜工作保持松弛。",
    englishDescription: "A blue-green river valley illuminated by fireflies, stars, and a distant cabin.",
    tags: ["流萤", "河谷", "夜色"], appearance: "dark", scene: "firefly-river",
    palette: ["#07161d", "#123d45", "#69d58e", "#d8ef9b"], accent: "#79df99",
  },
  {
    id: "cosmic-whale-drift", name: "星海鲸歌", englishName: "Cosmic Whale Drift",
    description: "原创星鲸穿过行星光环与蓝色星尘，画面辽阔而安静。",
    englishDescription: "An original cosmic whale glides through planetary rings and blue stardust.",
    tags: ["星鲸", "宇宙", "蓝色"], appearance: "dark", scene: "cosmic-whale",
    palette: ["#061225", "#102f5b", "#4aa9d9", "#b7e9ff"], accent: "#5dc8ee",
  },
  {
    id: "aqua-ballet-hall", name: "水光舞厅", englishName: "Aqua Ballet Hall",
    description: "原创舞者在水镜大厅中旋转，浅蓝光带与金色穹顶轻盈通透。",
    englishDescription: "An original dancer moves through a mirrored aqua hall under a delicate gold dome.",
    tags: ["水光", "舞厅", "清透"], appearance: "light", scene: "aqua-hall",
    palette: ["#dff5f5", "#8dcacb", "#4b8e9b", "#d8b46c"], accent: "#3b9cab",
  },
  {
    id: "quiet-orbit-station", name: "寂静轨道", englishName: "Quiet Orbit Station",
    description: "孤独空间站掠过冰蓝行星，稀疏信号灯留出大片安静深空。",
    englishDescription: "A solitary station passes an ice-blue planet with sparse signal lights.",
    tags: ["空间站", "轨道", "冷色"], appearance: "dark", scene: "orbit-station",
    palette: ["#050912", "#18263a", "#6f9db8", "#d8f4ff"], accent: "#75b9d3",
  },
  {
    id: "red-cliff-dawn", name: "赤崖朝光", englishName: "Red Cliff Dawn",
    description: "朝阳照亮层叠赤崖、长桥与飞鸟，是一幅原创的开阔山河画卷。",
    englishDescription: "An original panoramic landscape of red cliffs, a long bridge, birds, and dawn.",
    tags: ["山河", "朝阳", "赤色"], appearance: "light", scene: "red-cliff",
    palette: ["#f1ded1", "#d59c76", "#a74331", "#ffe0a1"], accent: "#b64f37",
  },
  {
    id: "idea-cosmos", name: "灵感宇宙", englishName: "Idea Cosmos",
    description: "纸片、公式和行星围绕发光核心旋转，把灵感整理成一座小宇宙。",
    englishDescription: "Notes, formulas, and planets orbit a bright core in a compact idea universe.",
    tags: ["灵感", "宇宙", "创意"], appearance: "dark", scene: "idea-cosmos",
    palette: ["#101026", "#34235b", "#8d6de7", "#ffcc72"], accent: "#a789f1",
  },
  {
    id: "healing-forest-path", name: "森光小径", englishName: "Healing Forest Path",
    description: "清晨薄雾沿林间小径散开，叶隙光斑和溪流带来舒缓呼吸感。",
    englishDescription: "Morning mist, dappled light, and a small stream soften a quiet forest path.",
    tags: ["森林", "治愈", "自然"], appearance: "light", scene: "forest-path",
    palette: ["#dce8d5", "#729376", "#355949", "#f1d89c"], accent: "#4f8060",
  },
  {
    id: "deep-sea-fish-city", name: "深海鱼城", englishName: "Deep Sea Fish City",
    description: "巨型原创鱼群游过海底灯塔与玻璃城市，幽蓝光线层次丰富。",
    englishDescription: "Original giant fish drift above an underwater glass city and luminous beacons.",
    tags: ["深海", "鱼群", "幻想"], appearance: "dark", scene: "fish-city",
    palette: ["#03141e", "#073d52", "#2b91a1", "#9ce3d1"], accent: "#44b9b2",
  },
  {
    id: "cloud-ascent-palace", name: "云上仙途", englishName: "Cloud Ascent Palace",
    description: "悬空宫阙、云梯和纸鸢组成原创仙境，留白与青黛色适合长时间工作。",
    englishDescription: "Original floating palaces, cloud stairs, and kites form a spacious immortal realm.",
    tags: ["仙境", "宫阙", "云海"], appearance: "light", scene: "cloud-palace",
    palette: ["#e9eff0", "#9eb9bd", "#486871", "#e8b76b"], accent: "#628993",
  },
  {
    id: "porcelain-rain-garden", name: "青瓷雨庭", englishName: "Porcelain Rain Garden",
    description: "青瓷釉色落入雨庭，圆窗、荷叶和水纹构成温润的东方空间。",
    englishDescription: "Celadon glaze colors, a moon gate, lotus leaves, and rain shape a gentle garden.",
    tags: ["青瓷", "雨庭", "东方"], appearance: "light", scene: "porcelain-garden",
    palette: ["#dce9e4", "#91aaa1", "#47675d", "#e6caa0"], accent: "#5f8b7c",
  },
  {
    id: "trisolaran-orbit", name: "三日凌空", englishName: "Three Suns Orbit",
    description: "三颗恒星照亮陌生行星与几何舰队，以原创构图呈现硬科幻尺度。",
    englishDescription: "Three suns illuminate an alien planet and geometric fleet in an original sci-fi scene.",
    tags: ["三日", "太空", "科幻"], appearance: "dark", scene: "three-suns",
    palette: ["#080c16", "#2c3248", "#d56742", "#ffd28a"], accent: "#e47c55",
  },
  {
    id: "violet-letter-room", name: "紫罗兰书信", englishName: "Violet Letter Room",
    description: "原创机械书写台、紫罗兰与层叠信笺，在暮色中保留温柔秩序。",
    englishDescription: "An original mechanical writing desk, violet flowers, and letters at dusk.",
    tags: ["书信", "紫罗兰", "暮色"], appearance: "light", scene: "violet-room",
    palette: ["#eee8f0", "#b6a7c4", "#64577b", "#d7af74"], accent: "#786891",
  },
  {
    id: "ribbon-nocturne", name: "缎带夜曲", englishName: "Ribbon Nocturne",
    description: "红蓝缎带穿过黑色舞台与月轮，克制的高光构成最后一首夜曲。",
    englishDescription: "Red and blue ribbons cross a black stage and moon disc in a restrained nocturne.",
    tags: ["缎带", "夜曲", "极简"], appearance: "dark", scene: "ribbon-nocturne",
    palette: ["#090a10", "#1b2233", "#ba405d", "#82a8e2"], accent: "#d04c68",
  },
];

const popularThemes = [
  ["ink-mountain-dawn", "晨雾山水", 2219],
  ["rainy-lounge-evening", "休闲室内居家", 1090],
  ["hologram-pop-stage", "mikuu full background", 1016],
  ["cartoon-vault-lab", "保险柜 办公室 卡通 DreamSkin 2560x1440", 984],
  ["mythic-cloud-warrior", "悟空（WUKONG）", 932],
  ["rose-window-morning", "三上悠亚", 853],
  ["firefly-river-night", "firefly", 719],
  ["moon-pine-night", "月下松岚", 714],
  ["cosmic-whale-drift", "DeepSeek-鲸鱼娘", 656],
  ["aqua-ballet-hall", "芙宁娜 小白袜", 564],
  ["quiet-orbit-station", "寂静星轨", 526],
  ["red-cliff-dawn", "橘子洲头-毛主席", 504],
  ["idea-cosmos", "灵感小宇宙", 475],
  ["cream-paper-garden", "清透定制", 442],
  ["healing-forest-path", "安静氛围 森林", 434],
  ["cozy-cat-studio", "46 morning 4k", 412],
  ["deep-sea-fish-city", "大肥鱼（8.1）", 399],
  ["neon-terminal-grid", "miku-猛男版", 394],
  ["stage-black-gold", "art", 383],
  ["deep-space-nebula", "人民的AI", 382],
  ["tokyo-rain", "202509061917596371", 366],
  ["cloud-ascent-palace", "云上仙途", 360],
  ["warm-library", "好看户外治愈", 358],
  ["aurora-ridge", "【哲风壁纸】凡人修仙传 古建", 353],
  ["ocean-glass-tide", "海岸", 350],
  ["porcelain-rain-garden", "雨过青瓷", 341],
  ["desert-sunset", "mingchao_yongzhuang", 337],
  ["trisolaran-orbit", "三体-智子", 323],
  ["violet-letter-room", "Cyber · 紫罗兰永恒花园", 308],
  ["ribbon-nocturne", "缎带夜曲 · Ribbon Nocturne", 303],
];

function sceneArtwork(scene) {
  const scenes = {
    "rainy-lounge": `<g transform="translate(940 120)"><rect x="0" y="0" width="840" height="560" rx="22" fill="#172638" stroke="#d9ae7b" stroke-opacity=".35" stroke-width="12"/><g stroke="#aad0dc" stroke-width="5" opacity=".48">${Array.from({ length: 18 }, (_, index) => `<path d="M${35 + index * 46} 10l-86 540"/>`).join("")}</g><circle cx="660" cy="112" r="54" fill="#f0c987" opacity=".8"/><path d="M40 480c170-92 335-112 510-30 98 46 172 55 290 12v98H40z" fill="#203a4d"/></g><g transform="translate(1120 670)"><path d="M0 160c0-92 74-166 166-166h390c92 0 166 74 166 166v168H0z" fill="#8a543e"/><rect x="50" y="94" width="622" height="148" rx="54" fill="#bd7954"/><g fill="#e6b47f"><circle cx="180" cy="164" r="9"/><circle cx="360" cy="164" r="9"/><circle cx="540" cy="164" r="9"/></g></g><g transform="translate(916 672)"><rect width="142" height="256" rx="18" fill="#34281f"/><circle cx="71" cy="74" r="48" fill="#111" stroke="#dcaa70" stroke-width="8"/><circle cx="71" cy="74" r="11" fill="#dcaa70"/><rect x="34" y="158" width="76" height="9" rx="4" fill="#dcaa70"/></g>`,
    "hologram-stage": `<g opacity=".5" stroke="#52fff2" fill="none"><ellipse cx="1440" cy="810" rx="420" ry="150" stroke-width="7"/><ellipse cx="1440" cy="810" rx="312" ry="106" stroke-width="3"/><path d="M1020 810 1260 150M1860 810 1600 150M1190 850 870 330M1690 850 1910 330" stroke-width="10"/></g><g transform="translate(1320 224)"><circle cx="120" cy="112" r="82" fill="#0a1734" stroke="#4ee6df" stroke-width="8"/><path d="M44 108c24-104 134-128 174-26-54-26-90-12-118 34-16 28-38 32-56-8z" fill="#ff5bbf"/><path d="M76 200c-80 142-86 324-28 462h147c49-150 42-324-36-462z" fill="#193c69" stroke="#53eee6" stroke-width="7"/><path d="M50 310-80 474M188 310l156 130M80 658 22 820M166 658l80 162" stroke="#67f4ed" stroke-width="22" stroke-linecap="round"/><path d="M82 252c38 44 76 44 114 0" stroke="#ff70c9" stroke-width="12" fill="none"/></g><g fill="#ff6bc9" opacity=".8">${Array.from({ length: 12 }, (_, i) => `<rect x="${980 + i * 74}" y="${820 - (i % 4) * 36}" width="28" height="${70 + (i % 5) * 28}" rx="14"/>`).join("")}</g>`,
    "vault-lab": `<g transform="translate(1010 130)"><circle cx="430" cy="410" r="350" fill="#c1e7ec" stroke="#245d78" stroke-width="34"/><circle cx="430" cy="410" r="274" fill="#eff8f3" stroke="#e2ab3e" stroke-width="28"/><g stroke="#245d78" stroke-width="18"><circle cx="430" cy="410" r="104" fill="#f3bc45"/><path d="M430 306v208M326 410h208M356 336l148 148M504 336 356 484"/></g><g fill="#245d78">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<circle cx="${430 + Math.cos(a) * 318}" cy="${410 + Math.sin(a) * 318}" r="13"/>`; }).join("")}</g></g><g transform="translate(1340 680)"><rect x="0" y="86" width="270" height="216" rx="72" fill="#f2b93c" stroke="#245d78" stroke-width="16"/><rect x="50" y="0" width="170" height="146" rx="65" fill="#d8f4f5" stroke="#245d78" stroke-width="16"/><circle cx="102" cy="64" r="18" fill="#245d78"/><circle cx="170" cy="64" r="18" fill="#245d78"/><path d="M104 108q34 24 68 0" fill="none" stroke="#245d78" stroke-width="10"/><path d="M22 180-82 246M248 180l104 66M76 302l-34 98M196 302l34 98" stroke="#245d78" stroke-width="22" stroke-linecap="round"/></g>`,
    "cloud-warrior": `<g opacity=".78"><path d="M640 730c228-132 432-84 598 12 172 100 338 96 682-46v384H620z" fill="#151b1f"/><path d="M980 624 1250 312l178 318 212-424 280 510v364H940z" fill="#2f383d"/></g><circle cx="1540" cy="264" r="174" fill="#edb36c" opacity=".84"/><g fill="#d9d3c0" opacity=".28">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${820 + i * 140}" cy="${680 + (i % 3) * 44}" rx="170" ry="48"/>`).join("")}</g><g transform="translate(1380 360)" fill="#0c0e10"><circle cx="74" cy="74" r="42"/><path d="M24 136q48-40 98 0l78 262-76 18-36-140-10 252H4l28-258-82 164-62-35z"/><path d="M18 26q60-72 130 4l-18 28H30z"/></g><path d="M1180 810c210-98 444-92 740 28" fill="none" stroke="#d8904f" stroke-width="7" opacity=".8"/>`,
    "rose-window": `<g transform="translate(980 60)"><path d="M90 620V286C90 108 238 0 410 0s320 108 320 286v334z" fill="#fff8ec" stroke="#b87972" stroke-width="18"/><path d="M410 0v620M90 310h640" stroke="#b87972" stroke-width="12" opacity=".5"/><circle cx="410" cy="212" r="118" fill="none" stroke="#d6a189" stroke-width="12"/><path d="M292 212h236M410 94v236M326 128l168 168M494 128 326 296" stroke="#d6a189" stroke-width="7"/></g><path d="M1100 62c-90 242-66 456 52 642M1714 62c66 230 40 444-80 638" stroke="#fff" stroke-width="86" opacity=".42" fill="none"/><g transform="translate(1070 688)"><path d="M0 210h760v180H0z" fill="#977360"/><path d="M132 208q250-90 500 0" fill="#f9efe0" stroke="#d4b69d" stroke-width="8"/><path d="M382 202v180" stroke="#c59d84" stroke-width="6"/><g fill="#b75d70">${Array.from({ length: 13 }, (_, i) => `<circle cx="${610 + (i % 4) * 24}" cy="${112 + Math.floor(i / 4) * 26}" r="28"/>`).join("")}</g><path d="M650 160 600 270h126z" fill="#8a9b76"/></g>`,
    "firefly-river": `<path d="M620 716c250-232 492-284 724-132 160 104 338 110 576-8v504H610z" fill="#102f35"/><path d="M760 1080c188-220 364-334 528-342 162-8 292 84 494 342z" fill="#28747a" opacity=".72"/><path d="M1050 1080c116-172 232-268 350-286 130-20 228 84 344 286z" fill="#9ed4b4" opacity=".26"/><g fill="#bff493">${Array.from({ length: 52 }, (_, i) => `<circle cx="${720 + (i * 137) % 1160}" cy="${180 + (i * 83) % 700}" r="${3 + i % 5}" opacity="${.35 + (i % 6) / 10}"/>`).join("")}</g><g transform="translate(1440 504)"><path d="M0 210 180 60l184 150v188H0z" fill="#37291f"/><path d="M-28 212 180 28l212 184" fill="none" stroke="#151614" stroke-width="24"/><rect x="66" y="246" width="88" height="92" fill="#e9ca78"/><rect x="228" y="240" width="70" height="72" fill="#e9ca78"/></g>`,
    "cosmic-whale": `<circle cx="1510" cy="286" r="202" fill="#4d8fc2" opacity=".5"/><ellipse cx="1510" cy="286" rx="330" ry="52" fill="none" stroke="#bceaff" stroke-width="16" opacity=".65" transform="rotate(-14 1510 286)"/><g transform="translate(980 350) rotate(-8 420 230)"><path d="M70 312c80-230 294-300 538-204 96 38 172 98 256 160-106 18-192 6-278-30-84 108-206 164-358 160-72-2-132-30-158-86z" fill="#387fa4" stroke="#9adced" stroke-width="8"/><path d="M616 224c122-104 242-94 334-40-114 12-180 52-236 126z" fill="#2a6186"/><path d="M204 354c-96 116-186 128-270 88 94-48 124-102 144-186z" fill="#2b678b"/><circle cx="590" cy="184" r="14" fill="#d8fbff"/><path d="M170 280c178 76 352 76 526-8" fill="none" stroke="#b9eff4" stroke-width="8" opacity=".55"/></g><g fill="#c9f4ff">${Array.from({ length: 38 }, (_, i) => `<circle cx="${700 + (i * 151) % 1200}" cy="${80 + (i * 97) % 860}" r="${2 + i % 4}" opacity="${.25 + (i % 7) / 10}"/>`).join("")}</g>`,
    "aqua-hall": `<g transform="translate(930 70)" fill="none" stroke="#6aaeb2"><path d="M80 820V360C80 120 250 0 470 0s390 120 390 360v460" stroke-width="24"/><path d="M170 820V390c0-172 134-274 300-274s300 102 300 274v430" stroke-width="12"/><path d="M470 0v820M80 420h780" stroke-width="8" opacity=".45"/></g><ellipse cx="1400" cy="930" rx="520" ry="130" fill="#87c9cb" opacity=".35"/><g transform="translate(1330 300)"><circle cx="74" cy="82" r="48" fill="#365d68"/><path d="M32 142c32-38 72-38 106 0l42 254-94 34-84-34z" fill="#f4f0e4" stroke="#4f969f" stroke-width="8"/><path d="M18 194-92 360M152 194l132 142M56 414-38 650M126 414l72 248" fill="none" stroke="#4f969f" stroke-width="18" stroke-linecap="round"/><path d="M2 272q82 70 176 0" fill="none" stroke="#d6b368" stroke-width="18"/></g><g stroke="#fff" fill="none" opacity=".65">${Array.from({ length: 7 }, (_, i) => `<ellipse cx="1400" cy="${860 + i * 18}" rx="${120 + i * 62}" ry="${20 + i * 9}" stroke-width="4"/>`).join("")}</g>`,
    "orbit-station": `<circle cx="1540" cy="780" r="510" fill="#5e89a3" opacity=".58"/><circle cx="1540" cy="780" r="430" fill="#203a53"/><path d="M1080 714c246-86 516-56 810 92" fill="none" stroke="#cbe8f4" stroke-width="32" opacity=".28"/><g transform="translate(1040 270)"><path d="M0 220h720" stroke="#9fc6d8" stroke-width="12"/><rect x="264" y="130" width="196" height="180" rx="18" fill="#26394c" stroke="#9fc6d8" stroke-width="8"/><rect x="0" y="142" width="242" height="156" fill="#14283f" stroke="#6ea5bd" stroke-width="6"/><rect x="482" y="142" width="238" height="156" fill="#14283f" stroke="#6ea5bd" stroke-width="6"/><path d="M362 130V34M362 310v102" stroke="#b8dce8" stroke-width="10"/><circle cx="362" cy="34" r="22" fill="#e7765b"/><g stroke="#6ea5bd" stroke-width="3"><path d="M40 142v156M82 142v156M124 142v156M166 142v156M208 142v156M524 142v156M566 142v156M608 142v156M650 142v156M692 142v156"/></g></g>`,
    "red-cliff": `<circle cx="1540" cy="230" r="170" fill="#edaf65" opacity=".9"/><path d="M560 830c228-104 380-226 504-408 122 160 184 282 260 412z" fill="#b05840"/><path d="M920 856c208-134 350-222 510-340 110 164 236 260 490 356v208H780z" fill="#8d4034"/><path d="M560 950c430-136 874-130 1360 20" fill="none" stroke="#f2d1ad" stroke-width="38" opacity=".6"/><path d="M862 778c240-50 454-44 642 18" fill="none" stroke="#6d352f" stroke-width="18"/><g stroke="#6d352f" stroke-width="8">${Array.from({ length: 12 }, (_, i) => `<path d="M${900 + i * 48} ${768 + (i % 3) * 3}v72"/>`).join("")}</g><g fill="#70413b">${Array.from({ length: 13 }, (_, i) => `<path d="M${1090 + i * 58} ${170 + (i % 4) * 30}q28-28 56 0-28-12-56 0z"/>`).join("")}</g>`,
    "idea-cosmos": `<g transform="translate(1420 530)"><circle r="160" fill="#f1bd62" opacity=".2"/><circle r="100" fill="#ffd47d"/><circle r="62" fill="#fff3c3"/></g><g fill="none" stroke="#9f83e8" opacity=".7">${[260,360,470].map((radius, i) => `<ellipse cx="1420" cy="530" rx="${radius}" ry="${radius * .42}" transform="rotate(${i * 34 - 22} 1420 530)" stroke-width="${7 - i}"/>`).join("")}</g><g fill="#d8c9ff">${Array.from({ length: 8 }, (_, i) => { const x=980+(i*127)%760; const y=210+(i*173)%640; return `<g transform="translate(${x} ${y}) rotate(${i*17})"><rect x="-52" y="-38" width="104" height="76" rx="8" fill="#efe9ff" opacity=".92"/><path d="M-30-14h60M-30 5h42M-30 24h52" stroke="#7357ad" stroke-width="6"/></g>`; }).join("")}</g><g fill="#ffce72">${Array.from({ length: 16 }, (_, i) => `<circle cx="${980 + (i * 163) % 840}" cy="${140 + (i * 113) % 760}" r="${7 + i % 11}"/>`).join("")}</g>`,
    "forest-path": `<g fill="#355d49">${Array.from({ length: 13 }, (_, i) => `<path d="M${650 + i * 110} 0c-22 268-16 594 ${-42 + i * 10} 950h${98 - i * 2}c-32-330-16-642 30-950z" opacity="${.5 + (i % 3) * .13}"/>`).join("")}</g><g fill="#719877" opacity=".8">${Array.from({ length: 42 }, (_, i) => `<ellipse cx="${650 + (i * 83) % 1250}" cy="${70 + (i * 137) % 650}" rx="${42 + i % 34}" ry="${22 + i % 18}" transform="rotate(${i * 29})"/>`).join("")}</g><path d="M1300 1080c-40-230 30-408 214-534 86-58 160-128 188-236-2 176-78 306-180 416-102 110-116 228-88 354z" fill="#ead8a7" opacity=".84"/><path d="M1120 1080c88-154 190-246 306-276 94-24 192-14 304 32" fill="none" stroke="#90c5b3" stroke-width="72" opacity=".5"/><g fill="#f3dc91">${Array.from({ length: 26 }, (_, i) => `<circle cx="${820 + (i * 149) % 1000}" cy="${120 + (i * 101) % 720}" r="${8 + i % 16}" opacity=".35"/>`).join("")}</g>`,
    "fish-city": `<g transform="translate(1000 150)"><path d="M40 330c120-190 354-244 596-138 102 44 186 120 274 188-120 24-218 10-306-30-112 118-252 170-430 144-82-12-126-72-134-164z" fill="#2b8192" stroke="#86d5cb" stroke-width="10"/><path d="M660 296c132-104 246-90 330-34-102 14-178 60-248 136z" fill="#1f6175"/><circle cx="610" cy="256" r="17" fill="#d8fff2"/><g fill="#a8e5d7" opacity=".46">${Array.from({ length: 11 }, (_, i) => `<circle cx="${188 + (i * 47) % 410}" cy="${232 + (i % 4) * 56}" r="${14 + i % 21}"/>`).join("")}</g></g><g transform="translate(1040 690)" stroke="#64bdba" stroke-width="7" fill="#0a3446"><path d="M0 390V182l88-110 88 110v208zM220 390V100l94-100 94 100v290zM448 390V210l82-92 82 92v180zM650 390V72l108-112 108 112v318z"/><g fill="#a7eee0">${Array.from({ length: 24 }, (_, i) => `<rect x="${32 + (i % 8) * 104}" y="${174 + Math.floor(i / 8) * 64}" width="24" height="34" rx="12"/>`).join("")}</g></g><g fill="#a7eee0" opacity=".55">${Array.from({ length: 28 }, (_, i) => `<circle cx="${960 + (i * 73) % 900}" cy="${110 + (i * 89) % 820}" r="${4 + i % 9}"/>`).join("")}</g>`,
    "cloud-palace": `<g fill="#f3f6f3" opacity=".74">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${720 + i * 150}" cy="${650 + (i % 3) * 66}" rx="210" ry="72"/>`).join("")}</g><g transform="translate(1030 270)" fill="#58737a" stroke="#35545e" stroke-width="7"><path d="M0 430h700v230H0z"/><path d="M70 430V250h210v180M420 430V180h210v250"/><path d="M30 250h290L174 126zM380 180h290L524 30z" fill="#91adb0"/><path d="M110 430V314h62v116M492 430V258h66v172" fill="#e5eee9"/></g><path d="M1010 1000c160-106 280-196 360-270 78-72 174-86 286-38-118 32-194 96-266 178-70 78-142 148-222 210" fill="none" stroke="#d9c292" stroke-width="32" opacity=".82"/><g fill="none" stroke="#b07955" stroke-width="5">${Array.from({ length: 8 }, (_, i) => `<path d="M${860 + i * 132} ${160 + (i % 4) * 56}q62-74 124 0-62-28-124 0z"/>`).join("")}</g>`,
    "porcelain-garden": `<g transform="translate(990 80)"><path d="M40 820V350C40 142 204 0 420 0s380 142 380 350v470" fill="#bfd2cb" stroke="#52766a" stroke-width="24"/><circle cx="420" cy="400" r="242" fill="#e4eee9" stroke="#78998d" stroke-width="18"/><path d="M178 400h484M420 158v484" stroke="#91aaa0" stroke-width="8" opacity=".5"/></g><g fill="#5f8979">${Array.from({ length: 24 }, (_, i) => `<ellipse cx="${1040 + (i * 113) % 780}" cy="${660 + (i * 67) % 340}" rx="${50 + i % 30}" ry="${18 + i % 20}" transform="rotate(${i * 23})"/>`).join("")}</g><g stroke="#71978a" stroke-width="6" opacity=".7">${Array.from({ length: 20 }, (_, i) => `<path d="M${760 + i * 62} ${100 + (i % 3) * 24}l-86 560"/>`).join("")}</g><g fill="none" stroke="#e8cca0" stroke-width="10">${[120,190,270].map((radius) => `<ellipse cx="1420" cy="900" rx="${radius}" ry="${radius * .26}"/>`).join("")}</g>`,
    "three-suns": `<g>${[[1160,228,92,"#f0bd79"],[1460,170,142,"#e16c49"],[1730,340,76,"#fff0b0"]].map(([x,y,r,color]) => `<circle cx="${x}" cy="${y}" r="${r * 1.4}" fill="${color}" opacity=".12"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`).join("")}</g><circle cx="1480" cy="950" r="520" fill="#283248"/><path d="M1020 820c230-116 478-94 780 82" fill="none" stroke="#6d7893" stroke-width="26" opacity=".5"/><g fill="#a9b1c6" stroke="#d8dfed" stroke-width="4">${Array.from({ length: 12 }, (_, i) => `<path d="M${920 + (i * 83) % 920} ${430 + (i * 137) % 340}l56 18-50 28-62-18z"/>`).join("")}</g><g fill="#e17850" opacity=".65">${Array.from({ length: 18 }, (_, i) => `<circle cx="${800 + (i * 149) % 1100}" cy="${90 + (i * 79) % 730}" r="${2 + i % 5}"/>`).join("")}</g>`,
    "violet-room": `<g transform="translate(970 60)"><path d="M60 610V270C60 98 200 0 370 0s310 98 310 270v340z" fill="#ddd4e1" stroke="#716681" stroke-width="18"/><path d="M370 0v610M60 300h620" stroke="#8e7d9d" stroke-width="9" opacity=".45"/></g><g transform="translate(990 650)"><path d="M0 180h820v226H0z" fill="#6c594f"/><rect x="118" y="0" width="370" height="220" rx="28" fill="#45404c" stroke="#c5a46c" stroke-width="12"/><circle cx="302" cy="96" r="64" fill="#e8dfd5"/><path d="M192 178h220M226 214h150" stroke="#c5a46c" stroke-width="12"/><g transform="translate(536 22)" fill="#726187">${Array.from({ length: 16 }, (_, i) => `<circle cx="${(i % 4) * 34}" cy="${Math.floor(i / 4) * 34}" r="25"/>`).join("")}</g><path d="M580 150 528 294h188l-64-144z" fill="#87937a"/><g fill="#f3eadf" stroke="#9c846d" stroke-width="4"><path d="M32 118h174v112H32z" transform="rotate(-8 119 174)"/><path d="M650 144h150v98H650z" transform="rotate(9 725 193)"/></g></g>`,
    "ribbon-nocturne": `<circle cx="1510" cy="330" r="228" fill="#d8dbe3" opacity=".76"/><circle cx="1510" cy="330" r="196" fill="#11131d"/><path d="M800 1040c162-284 406-358 710-226 144 62 280 32 410-88" fill="none" stroke="#c43f5d" stroke-width="118" stroke-linecap="round"/><path d="M782 960c224-128 388-250 492-370 118-136 314-136 588 0" fill="none" stroke="#7299d4" stroke-width="72" stroke-linecap="round"/><path d="M920 1080c110-204 250-302 420-294 190 8 326 104 520 294" fill="#0c0e15"/><g fill="#f4d7df">${Array.from({ length: 16 }, (_, i) => `<circle cx="${870 + (i * 149) % 1020}" cy="${180 + (i * 107) % 700}" r="${2 + i % 4}" opacity=".62"/>`).join("")}</g>`,
  };
  return scenes[scene];
}

function renderSvg(theme) {
  const [background, secondary, accent, glow] = theme.palette;
  const dust = Array.from({ length: 44 }, (_, index) => {
    const x = 620 + (index * 173 + theme.id.length * 47) % 1280;
    const y = 30 + (index * 97 + theme.id.length * 31) % 980;
    return `<circle cx="${x}" cy="${y}" r="${1 + index % 5}" opacity="${.08 + (index % 6) * .035}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <!-- Generated by scripts/generate-popular-inspired-themes.mjs. Project-original artwork. -->
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset=".58" stop-color="${secondary}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    <radialGradient id="leftShade" cx="0" cy=".5" r="1"><stop stop-color="${background}" stop-opacity=".96"/><stop offset=".52" stop-color="${background}" stop-opacity=".42"/><stop offset="1" stop-color="${background}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow" cx=".78" cy=".3" r=".62"><stop stop-color="${glow}" stop-opacity=".36"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="${theme.id.length * 7}"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .08 0"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#background)"/>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  <g fill="${glow}">${dust}</g>
  ${sceneArtwork(theme.scene)}
  <rect width="920" height="1080" fill="url(#leftShade)"/>
  <rect width="1920" height="1080" filter="url(#grain)" opacity=".22"/>
</svg>\n`;
}

function themeColors(theme) {
  const [background, secondary, accent, glow] = theme.palette;
  if (theme.appearance === "light") {
    return {
      background, panel: "rgba(255, 255, 255, 0.84)", panelAlt: "rgba(248, 246, 241, 0.72)",
      accent: theme.accent, glow, text: "#172123", muted: "#647174", line: "rgba(23, 33, 35, 0.14)",
    };
  }
  return {
    background, panel: "rgba(10, 15, 23, 0.86)", panelAlt: `rgba(${Number.parseInt(secondary.slice(1, 3), 16)}, ${Number.parseInt(secondary.slice(3, 5), 16)}, ${Number.parseInt(secondary.slice(5, 7), 16)}, 0.72)`,
    accent: theme.accent, glow, text: "#f3f6f7", muted: "#a9b3b8", line: "rgba(255, 255, 255, 0.16)",
  };
}

async function generateTheme(theme) {
  const svgPath = path.join(themesRoot, `${theme.id}.svg`);
  const imagePath = path.join(themesRoot, `${theme.id}.png`);
  await writeFile(svgPath, renderSvg(theme));
  await executeFile(process.env.RSVG_CONVERT ?? "rsvg-convert", [
    "--format=png", "--width=1920", "--height=1080", "--output", imagePath, svgPath,
  ]);
  const image = await readFile(imagePath);
  const manifest = {
    $schema: "https://huangguang1999.github.io/paseo-skins/schema/paseo-theme-v2.schema.json",
    schemaVersion: 2,
    id: theme.id,
    version: "1.0.0",
    name: theme.name,
    description: theme.description,
    image: `${theme.id}.png`,
    appearance: theme.appearance,
    art: { focusX: 0.76, focusY: 0.52, homeOpacity: 0.96, workspaceOpacity: 0.2, utilityOpacity: 0.32 },
    colors: themeColors(theme),
    integrity: {
      algorithm: "sha256",
      sha256: createHash("sha256").update(image).digest("hex"),
      bytes: image.length,
      width: 1920,
      height: 1080,
    },
  };
  await writeFile(path.join(themesRoot, `${theme.id}.theme.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    id: theme.id,
    name: theme.name,
    englishName: theme.englishName,
    description: theme.description,
    englishDescription: theme.englishDescription,
    author: "Huang Guang",
    sourceUrl: "https://github.com/huangguang1999/paseo-skins",
    license: "Project original",
    licenseUrl: "https://github.com/huangguang1999/paseo-skins/blob/main/NOTICE.md",
    tags: theme.tags,
    accent: theme.accent,
    preview: `./themes/${theme.id}.png`,
    manifest: `./themes/${theme.id}.theme.json`,
    version: manifest.version,
    imageBytes: image.length,
  };
}

const existingCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
const catalogByIdentifier = new Map(existingCatalog.themes.map((theme) => [theme.id, theme]));
for (const generatedTheme of generatedThemes) {
  catalogByIdentifier.set(generatedTheme.id, await generateTheme(generatedTheme));
}

const themes = [];
for (const [index, [themeIdentifier, inspirationThemeName, referenceDownloads]] of popularThemes.entries()) {
  const theme = catalogByIdentifier.get(themeIdentifier);
  if (!theme) throw new Error(`Missing catalog theme: ${themeIdentifier}`);
  const manifest = JSON.parse(await readFile(path.join(siteRoot, theme.manifest.replace(/^\.\//, "")), "utf8"));
  const imageStats = await stat(path.join(siteRoot, theme.preview.replace(/^\.\//, "")));
  themes.push({
    ...theme,
    version: manifest.version,
    imageBytes: imageStats.size,
    package: `./packages/${themeIdentifier}-paseo-theme.zip`,
    popularRank: index + 1,
    referenceDownloads,
    inspirationThemeName,
    inspirationSourceUrl,
  });
}

await writeFile(catalogPath, `${JSON.stringify({ schemaVersion: 1, name: "Paseo Skins", themes }, null, 2)}\n`);
console.log(`Generated ${generatedThemes.length} original artworks and a ${themes.length}-theme popular catalog.`);
