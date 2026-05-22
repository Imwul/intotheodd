import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Dices, 
  UserPlus, 
  BookOpen, 
  FolderHeart, 
  PenTool, 
  HelpCircle, 
  Trash2, 
  Plus, 
  ChevronRight, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Heart,
  Skull,
  Search,
  Sparkles,
  RefreshCw,
  Flame,
  Volume2,
  Cloud,
  Settings,
  LogOut
} from 'lucide-react';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Safe localStorage override to prevent crashes in private browsing or security-restricted environments
const localStorage = (() => {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    console.warn("localStorage is blocked or unavailable. Using safe in-memory fallback.");
    const memoryStorage = {};
    return {
      getItem: (key) => memoryStorage[key] || null,
      setItem: (key, value) => { memoryStorage[key] = String(value); },
      removeItem: (key) => { delete memoryStorage[key]; },
      clear: () => { for (const k in memoryStorage) delete memoryStorage[k]; },
      key: (i) => Object.keys(memoryStorage)[i] || null,
      get length() { return Object.keys(memoryStorage).length; }
    };
  }
})();

// Default Firebase Client SDK configuration for skogsduvasbookshop
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBiEh_2YmbU9W_isONi2FugkTzDIYJ0mE",
  authDomain: "skogsduvasbookshop.firebaseapp.com",
  databaseURL: "https://skogsduvasbookshop-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "skogsduvasbookshop",
  storageBucket: "skogsduvasbookshop.firebasestorage.app",
  messagingSenderId: "1051912666392",
  appId: "1:1051912666392:web:effb955c211c174b26326d"
};

/* ==========================================================
   DATA STRUCTURES (INTO THE ODD CORE)
   ========================================== */

const STARTER_PACKAGES = {
  "3-9": {
    1: { gear: ["Sword (d6)", "Pistol (d6)", "Modern Armour (현대식 갑옷, Armour 1)"], trait: "Sense nearby unearthly beings (주변의 비자연적 존재 감지)" },
    2: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Sword (d6)", "Flashbang (섬광탄)"], trait: "Sense nearby Arcana (주변의 아카나 감지)" },
    3: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Club (d6)"], trait: "Immunity to extreme heat and cold (극심한 더위와 추위에 면역)" },
    4: { gear: ["Pistol (d6)", "Knife (d6)"], trait: "Telepathy if target fails WIL Save (의지 Save 판정 실패 시 텔레파시)" },
    5: { gear: ["Blunderbuss (나팔총, d8 Bulky)", "Hatchet (d6)", "Mutt (똥개 - 5s, STR d10, d6 물기)"], trait: "Dreams show your undiscovered surroundings (꿈을 통해 발견되지 않은 주변 지형 탐지)" },
    6: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Hatchet (d6)", "Flashbang (섬광탄)"], trait: "Iron Limb (무쇠 의수)", hasArcanum: true }
  },
  "10": {
    1: { gear: ["Rifle (소총, d8 Bulky)", "Bayonet (d6)", "Lighter Boy (조명수 고용인)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    2: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Hatchet (d6)", "Hawk (매 - 50s, STR d8, d6 발톱)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    3: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Protective Gloves (보호용 장갑)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    4: { gear: ["Claymore (클레이모어 대검, d8 Bulky)", "Pistol (d6)", "2 Acid Flasks (산성 병 2개)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    5: { gear: ["Brace of Pistols (피스톨 한 쌍, d8 Bulky)", "Steel Wire (강철 와이어)", "Grappling Hook (갈고리 닻)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    6: { gear: ["Rifle (소총, d8 Bulky)", "Mace (d6)", "Eagle (독수리 - 50s, STR d8, d6 발톱)", "Poison (독약 - lose d20 STR if consumed)"], trait: "None" }
  },
  "11": {
    1: { gear: ["Rifle (소총, d8 Bulky)", "Modern Armour (현대식 갑옷, Armour 1)", "Hound (하운드 사냥개 - 50s, STR 2d6, d6 물기)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    2: { gear: ["Hatchet (d6)", "Pistol (d6)", "Bolt-Cutters (볼트 커터)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    3: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Mallet (나무망치)", "Marbles (구슬)", "Fancy Hat (화려한 모자)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    4: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Bayonet (d6)"], trait: "Mutt with telepathic link (텔레파시 연결을 가진 똥개)" },
    5: { gear: ["Machete (d6)", "Brace of Pistols (피스톨 한 쌍, d8 Bulky)", "Talking Parrot (말하는 앵무새 - 10s, STR d6, d4 발톱)"], trait: "Never Sleep (불면증 - 잠을 자지 않음)" },
    6: { gear: ["Club (d6)", "3 Bombs (d10 Blast 범위공격)", "Rocket (d10)"], trait: "Darkvision (어둠시야)" }
  },
  "12": {
    1: { gear: ["Club (d6)", "Throwing Knives (던지기용 단검, d6)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    2: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Mule (노새 - 5s)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    3: { gear: ["Pick-Axe (곡괭이, d6)", "Manacles (수갑)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    4: { gear: ["Pistol (d6)", "Rocket (d10)"], trait: "Toxin-Immune (독소 면역)" },
    5: { gear: ["Harpoon Gun (작살총, d8 Bulky)", "Baton (d6)", "Acid (산성액, d6)"], trait: "Slightly Magnetic (미세한 자성 신체)" },
    6: { gear: ["Maul (대형 망치, d8 Bulky)", "Dagger (d6)", "Chain (쇠사슬)"], trait: "None" }
  },
  "13": {
    1: { gear: ["Pistol (d6)", "Ether (에테르 마취제)", "Poison (독약)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    2: { gear: ["Sword (d6)", "Pistol (d6)", "Crude Armour (조잡한 갑옷, Armour 1, Bulky)"], trait: "None" },
    3: { gear: ["Pistol (d6)", "Smoke-bomb (연막탄)", "Mutt (똥개 - 5s, STR d10, d6 물기)", "Shovel (삽)"], trait: "None" },
    4: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Portable Ram (휴대용 파성퇴)", "Game Set (보드게임 세트)"], trait: "None" },
    5: { gear: ["Bolt-Cutters (볼트 커터)", "Blunderbuss (나팔총, d8 Bulky)", "Fiddle (바이올린)"], trait: "None" },
    6: { gear: ["Longaxe (양손 도끼, d8 Bulky)", "Rum (럼주)", "Bomb (d10 Blast 범위공격)"], trait: "None" }
  },
  "14": {
    1: { gear: ["Cane (지팡이, d6)", "Acid (산성액, d6)", "Spyglass (망원경)"], trait: "Has Arcanum (아르카눔 보유)", hasArcanum: true },
    2: { gear: ["Pistol (d6)", "Bell (방울)", "Steel Wire (강철 와이어)", "Smoke-bomb (연막탄)"], trait: "None" },
    3: { gear: ["Longaxe (양손 도끼, d8 Bulky)", "Throwing Axes (던지기용 도끼)", "Fire Oil (화염 유동제, d6/rd)"], trait: "None" },
    4: { gear: ["Pistol (d6)", "Saw (톱)", "Animal Trap (동물 덫)", "Spyglass (망원경)"], trait: "None" },
    5: { gear: ["Pistol (d6)", "Grease (기름칠 도구)", "Hand Drill (수동 드릴)", "Drum (북)"], trait: "None" },
    6: { gear: ["Dagger (d6)", "Fire Oil (화염 유동제, d6/rd)", "Mirror (거울)"], trait: "None" }
  },
  "15": {
    1: { gear: ["Brace of Pistols (피스톨 한 쌍, d8 Bulky)", "Canary (카나리아)", "Ether (에테르 마취제)"], trait: "None" },
    2: { gear: ["Longaxe (양손 도끼, d8 Bulky)", "Ferret (페럿)", "Fire Oil (화염 유동제, d6/rd)"], trait: "None" },
    3: { gear: ["Club (d6)", "Ether (에테르 마취제)", "Crowbar (쇠지렛대)", "Flute (플루트)"], trait: "None" },
    4: { gear: ["Bow (활, d6 Bulky)", "Knife (d6)", "Rocket (d10)", "Fire Oil (화염 유동제, d6/rd)"], trait: "None" },
    5: { gear: ["Sword & Dagger (검과 단검, d8 Bulky)", "Magnifying Glass (돋보기)"], trait: "Lost Eye (외눈 - 묘사용)" },
    6: { gear: ["Pistol (d6)", "Knife (d6)", "Bomb (d10 Blast 범위공격)", "Saw (톱)"], trait: "None" }
  },
  "16": {
    1: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Pocket-watch (회중시계)", "Bomb (d10 Blast 범위공격)"], trait: "None" },
    2: { gear: ["Staff (지팡이, d6 Bulky)", "Tongs (집게)", "Glue (접착제)"], trait: "None" },
    3: { gear: ["Hatchet (d6)", "Net (그물)", "Fire Oil (화염 유동제, d6/rd)"], trait: "Burnt Face (화상 입은 얼굴 - 묘사용)" },
    4: { gear: ["Pistol (d6)", "Whip (채찍, d6)", "Cigars (시가 담배)"], trait: "Lost Eye (외눈 - 묘사용)" },
    5: { gear: ["Pistol (d6)", "Acid (산성액, d6)", "Animal Repellent (동물 퇴치제)"], trait: "Prosthetic Hand (기계 의수)" },
    6: { gear: ["Pistol (d6)", "Bomb (d10 Blast 범위공격)", "Shovel (삽)"], trait: "Glowing Eyes (빛나는 눈)" }
  },
  "17": {
    1: { gear: ["Halberd (할버드 도끼창, d8 Bulky)", "Fake Pistol (가짜 권총)"], trait: "Artificial Lung (인공 폐)" },
    2: { gear: ["Pistol (d6)", "Net (그물)", "Trumpet (트럼펫)"], trait: "Prosthetic Leg (기계 의족)" },
    3: { gear: ["Club (d6)", "Paint (페인트)", "Crowbar (쇠지렛대)"], trait: "Loud Lungs (우렁찬 폐활량)" },
    4: { gear: ["Musket (머스킷 소총, d8 Bulky)", "Accordion (아코디언)"], trait: "No Nose / Scent (코가 없음 / 후각 특화)" },
    5: { gear: ["Sword (d6)", "Steel Wire (강철 와이어)"], trait: "Ugly Mutation (괴상한 돌연변이)" },
    6: { gear: ["Staff (지팡이, d6 Bulky)", "Throwing Knives (던지기용 단검, d6)"], trait: "None" }
  },
  "18": {
    1: { gear: ["Garotte (목조르기 철사, d6)", "Musket (머스킷 소총, d8 Bulky)"], trait: "Mute (벙어리)" },
    2: { gear: ["Pistol (d6)", "Grease (기름칠 도구)", "Hacksaw (쇠톱)"], trait: "One Arm (외팔)" },
    3: { gear: ["Pistol (d6)", "Cigars (시가 담배)", "Poison (독약)"], trait: "Fugitive (도망자)" },
    4: { gear: ["Sword (d6)", "Shield (+1 Armour, Bulky 무거운 짐)"], trait: "Illiterate (문맹)" },
    5: { gear: ["Sword (d6)", "Ferret (페럿)", "Tattered Clothes (누더기 옷)"], trait: "Debt (지하 사채업자에게 3G 빚짐)" },
    6: { gear: ["Mace (d6)", "Pigeon (전서구 비둘기)"], trait: "Disfigured (흉측하게 변형된 외모)" }
  }
};

const STANDARD_ARCANA = {
  11: { name: "Gatekeeper’s Sigil (차원문의 인장)", desc: "Create a gate between two flat surfaces that you can see. The gates close if you pass through or break line of sight." },
  12: { name: "Pierced Heart (관통된 심장)", desc: "State an object you desire. The heart indicates its direction and vague distance." },
  13: { name: "Pale Flame (창백한 불꽃)", desc: "An object you touch glows with white light. Contact with the glowing object causes a chilling pain. The effect wears off when the Arcanum is used again." },
  14: { name: "Soul Chain (영혼의 사슬)", desc: "Target must pass a DEX Save to avoid your touch, or they lose d6 WIL and you get a glimpse of their current desire." },
  15: { name: "Gavel of the Unbreakable Seal (봉인의 의사봉)", desc: "One door, window, etc. is sealed until you open it." },
  16: { name: "Foul Censer (타락의 향로)", desc: "Green smoke surrounds you and everyone within 20ft. Missiles cannot pass through the smoke." },
  21: { name: "Bleeding Stave (유혈의 지팡이)", desc: "Spews blood-like oil onto a 10ft area. Anyone moving or standing on the oil must make a DEX Save to avoid falling and being unable to move on their turn. Disappears in a harmless flash if ignited." },
  22: { name: "Pain Idol (고통의 우상)", desc: "Roll a die of your choice. If the result is odd, you lose that much STR, if it's even your target loses that much STR." },
  23: { name: "Webbed Hands (갈퀴 손)", desc: "Climb sheer surfaces as if you were a spider." },
  24: { name: "Sunblessed Bands (태양의 팔찌)", desc: "Glow and hum lightly. Anybody attacking you suffers Damage equal to that they cause to you. If you attack a target yourself then the effect ends until you Rest." },
  25: { name: "Flesh-Tome of Babble (바벨의 살점서)", desc: "Speak in a strange sounding language. Every living thing is able to understand and reply in the same tongue if they wish." },
  26: { name: "Tyrant’s Rod (폭군의 홀)", desc: "Order a target to drop, fall, flee or halt unless they pass a WIL Save." },
  31: { name: "Black Veil (칠흑의 장막)", desc: "Target must pass a WIL Save or is blinded until you lift the curse or they Rest. Blinded individuals may require a DEX Save to carry out other actions, and attacks are Impaired." },
  32: { name: "Strands of Suffering (고통의 실타래)", desc: "Strands spread between two surfaces up to 20ft apart. Those within only move very slowly and painfully unless they pass a DEX Save." },
  33: { name: "Heat Ray (열선 방출기)", desc: "One metal object becomes too hot to touch. If it cannot be quickly dropped/removed the wielder suffers d8 Damage, ignoring armour." },
  34: { name: "Miniaturisation Coil (소형화 코일)", desc: "Touch an object to shrink it into a tiny miniature. Restore the object to original size at will. The original object can be up to your size (living targets must be willing)." },
  35: { name: "Frozen Cloud (얼어붙은 구름)", desc: "Floats at your will. Anybody within takes d6 Damage and cannot move unless they pass a STR Save." },
  36: { name: "Many Phase Key (위상 변화 열쇠)", desc: "Phase through a wall or floor with any objects you are carrying." },
  41: { name: "Skull Magnet (두개골 자석)", desc: "You may attract or repel a single target that has a boney skull, unless they pass a WIL Save." },
  42: { name: "Transreal Mirror (반사영역의 거울)", desc: "A perfect duplicate of you is formed. It acts independently and just like the original. It cannot interact physically with anything. The double lasts until dismissed or a new double is created." },
  43: { name: "Gorger’s Mask (식신 장군 가면)", desc: "The wearer can consume anything safely." },
  44: { name: "Tomb Box (유골 상자)", desc: "Contains three tiny skeletons that obey whoever holds the box. They are too small to do any real damage, but are quite agile and clever." },
  45: { name: "Howling Lantern (포효하는 랜턴)", desc: "Blowing into the lantern causes a roar that terrifies prey animals, but attracts predators." },
  46: { name: "Rainbow Blade (무지갯빛 칼날)", desc: "This sword (d6) can fire a beam of harmless light in any colour the wielder wishes." },
  51: { name: "Hawk of Prosperity (번영의 매)", desc: "A mechanical bird (3hp, d6 claws) that will only help you to accumulate wealth. Requires a Shilling each day as food." },
  52: { name: "Inquisitor’s Hood (심문관의 후드)", desc: "Speak a question with two possible answers. The target must pass a WIL Save or answer as honestly as they can. If they pass their Save you blurt out an inconvenient truth." },
  53: { name: "Winter’s Sickle (겨울의 낫)", desc: "Anybody taking Damage from this Sickle (d6) is Deprived and feels cold to their bones until they spend at least an hour warming by a fire." },
  54: { name: "Grief Cup (비탄의 잔)", desc: "Anybody drinking from this cup has upsetting visions showing the consequences of their past actions." },
  55: { name: "Victory Globe (서약의 구체)", desc: "Swear an oath aloud. The globe gently guides you in the direction that would help you achieve the oath, but if you fail to complete it before the end of the day it lashes your mind for d12 WIL loss." },
  56: { name: "Moon Lens (달빛 렌즈)", desc: "Look at two objects and ask a question. The lens highlights the one object that best answers the question. It cannot predict the future." },
  61: { name: "Fool’s Coin (바보의 주화)", desc: "Anybody that values money will crave this coin the first time they see it. The effect wears off after an hour." },
  62: { name: "Chance Rose (기회의 장미)", desc: "Crush this ceramic rose to change the odds of success for a single action to 50%. This cannot make the impossible possible. The rose reforms at the start of each day." },
  63: { name: "Homing Stick (회귀하는 막대)", desc: "A staff that can be called to return to you, flying by the best route possible." },
  64: { name: "False Platter (거짓된 쟁반)", desc: "Anybody viewing this platter sees an illusion of luxury that they are craving right now." },
  65: { name: "Gold Visor (황금 바이저)", desc: "While wearing this you visualise a general sense of somebody's honesty and sincerity while they speak." },
  66: { name: "Infinity Icon (무한의 성상)", desc: "You can stop time, but you can do nothing but observe and think during this time." }
};

const GREATER_ARCANA = [
  { name: "Hypno-Torch (면죄의 횃불)", desc: "Target repeats their current action until you say stop, or they pass the Save on their turn." },
  { name: "Inferno Device (화염 증폭기)", desc: "Cause a source of fire to explode, causing d10 Damage to all within 20ft." },
  { name: "Power Leech (능력 갈취의 기생충)", desc: "Target must pass a WIL Save, or else you swap STR scores with them. Either side returns to its original value when they Rest." },
  { name: "Fire Blooded Scroll (불타는 혈서)", desc: "Target feels their blood begin to boil. They take d6 Damage, ignoring armour, each round, until they pass the Save." },
  { name: "Mind Probe (사념의 촉수)", desc: "You are able to dig into the innermost thoughts of the target. They may pass a WIL Save to resist." },
  { name: "Book of Despair (절망의 백서)", desc: "Summon a 20ft area of tentacles that lash out and grab. Anyone within must pass a STR Save to break free. The mass of tentacles has 10hp and is destroyed at 0hp." }
];

const LEGENDARY_ARCANA = [
  { name: "Weather Altar (기상 제단)", desc: "Cause the weather within a mile radius to change for the rest of the day. In the case of dangerous weather, you cannot target specific individuals or inescapable lethality." },
  { name: "Obliteration Prism (소멸의 프리즘)", desc: "Choose a target and roll d12. If this is equal or higher than their current hp they are completely destroyed in a blast of fire." },
  { name: "Rebirth Coffin (부활의 관)", desc: "A corpse is miraculously restored to life if they pass a WIL Save. If they fail the Save, the remains are utterly destroyed." },
  { name: "Space Cube (공간 차원의 큐브)", desc: "You and up to one companion are teleported to a location you have been to before." },
  { name: "Malice Gong (징벌의 공)", desc: "All enemies within 20ft lose d6 STR." }
];

/* Random Name & Background Tables */
const FIRST_NAMES = ["Ezekial", "Uthred", "Toku", "Kaelen", "Krieger", "Havel", "Cassian", "Vesper", "Scylla", "Darius", "Orson", "Gideon", "Mika", "Sloan", "Wulfric", "Balthazar", "Thane", "Jorun", "Luther", "Silas"];
const LAST_NAMES = ["Bane", "Vance", "Blackwood", "Ashford", "Grimm", "Sterling", "Kross", "Talon", "Ironwood", "Drake", "Vander", "Rook", "Gallow", "Holloway", "Winter", "Hawthorne", "Stoker", "Falk", "Malice", "Sever"];

const BACKGROUNDS = [
  "Debt-ridden Explorer from Bastion (Bastion(바스티온)의 빚쟁이 탐험가)",
  "Disgraced Scholar of the Deep Country (Deep Country(디프 컨트리)의 몰락한 학자)",
  "Underground Smuggler seeking fortune (Underworld(지하세계)의 암시장 밀수꾼)",
  "Outcast Mechanical Apprentice (추방당한 태엽장치 기계공 도제)",
  "Former Mercenary of Starfall (Starfall(스타폴) 용병단 출신의 칼잡이)",
  "Uncanny Seeker of unearthly Arcana (Arcana(아카나)의 탐구자)",
  "Fugitive seeking refuge in the Deep Country (Deep Country(디프 컨트리)로 도망쳐 온 탈옥수)",
  "Factory Scavenger with metallic cough (Bastion(바스티온) 공장 지대의 폐품 회수업자)"
];

/* Solo Sparks Lists */
const SPARK_ACTIONS = [
  "공격하다 (Attack)", "방어하다 (Defend)", "부수다 (Break)", "속삭이다 (Whisper)", 
  "부패하다 (Decay)", "발굴하다 (Exhume)", "점화하다 (Ignite)", "정화하다 (Purge)", 
  "머무르다 (Hold)", "드러내다 (Reveal)", "변화하다 (Mutate)", "복구하다 (Restore)", 
  "흡수하다 (Siphon)", "소환하다 (Summon)", "속박하다 (Shackle)", "방출하다 (Unleash)", 
  "왜곡하다 (Distort)", "활성화하다 (Trigger)", "무효화하다 (Neutralize)", "매혹하다 (Charm)"
];

const SPARK_SUBJECTS = [
  "유물 (Relic)", "인장 (Sigil)", "통제장치 (Device)", "시신 (Corpse)", 
  "껍질 (Husk)", "그림자 (Shadow)", "왕관 (Crown)", "금고 (Vault)", 
  "문양 (Symbol)", "바람 (Breath)", "심장 (Heart)", "거울 (Mirror)", 
  "독극물 (Toxin)", "태엽장치 (Gear)", "불꽃 (Flame)", "동전 (Coin)", 
  "사슬 (Chain)", "소리 (Echo)", "피 (Blood)", "열쇠 (Key)"
];

const SPARK_DESCRIPTORS = [
  "부식된 (Corroded)", "기묘한 (Uncanny)", "얼어붙은 (Frozen)", "빛나는 (Sunblessed)", 
  "피 흘리는 (Bleeding)", "증기가 넘치는 (Vaporous)", "자성을 띤 (Magnetic)", "야성적인 (Feral)", 
  "망가진 (Broken)", "황금빛의 (Gilded)", "칠흑의 (Obsidian)", "따스한 (Warm)", 
  "반향하는 (Echoing)", "거대한 (Vast)", "썩어가는 (Rotten)", "유리 같은 (Glassy)", 
  "위험한 (Dread)", "맥박 치는 (Pulsing)", "가짜의 (Fake)", "신성한 (Divine)"
];

const ROOM_LAYOUTS = [
  "조용하고 튼튼한 석조 방 (A quiet, sturdy stone chamber)",
  "나무 판자가 썩어가는 복도 (A rotting wooden corridor)",
  "폭이 매우 좁은 벽돌 터널 (A very narrow brick tunnel)",
  "오물과 빗물이 찬 철제 하수구 (A flooded iron sewer shaft)",
  "타일들이 끊임없이 색을 바꾸는 환상적인 대성당 (A spectacular cathedral with color-shifting tiles)",
  "천장이 붕괴한 고대 대리석 묘실 (A caved-in ancient marble crypt)",
  "녹슨 톱니바퀴들이 삐걱거리는 태엽식 정비실 (A dusty clockwork workshop)",
  "철제 파이프에서 뜨거운 증기가 품어져 나오는 보일러실 (A steaming boiler engine room)",
  "오랫동안 방치된 지하 생물 연구소 (An overgrown underground dome)",
  "깊이를 알 수 없는 거대한 검은 수직 나락 (A bottomless obsidian vertical shaft)"
];

const ROOM_CONTENTS = [
  "단단한 쇠빗장으로 잠긴 10피트 높이의 나무문 (Sturdy wooden doors barred from the other side)",
  "색이 끊임없이 요동치는 벽면 모자이크 타일 (A shifting tile mural giving off slight heat)",
  "뜨거운 녹색 증기가 새어 나오는 철 파이프 (A leaking pipe with green vapor)",
  "녹이 가득 슨 철제 보물 상자 (A rusted heavy iron chest)",
  "이상한 문양이 새겨진 해골 더미 (A pile of skulls with strange carvings)",
  "나직한 진동음과 함께 빛을 뿜는 청동 콘솔 (A humming ancient bronze control console)",
  "검고 끈적거리는 기름진 유체 웅덩이 (A pool of viscous black blood-like oil)",
  "속이 텅 빈 거대한 구리 석상 (A hollow colossal copper statue)",
  "쇠사슬에 묶여 소리 내며 웅크린 기형적 변이체 (A chained mutant whimpering in the corner)",
  "수북이 쌓여 방치된 구리 동전들과 청동 톱니바퀴들 (A pile of copper coins and discarded brass gears)"
];

const ROOM_DANGERS = [
  "천장에 매달린 가스 주머니 (DEX Save(구제 판정) 실패 시 가스 누출로 STR d6 소실)",
  "침입자를 인식해 쇠화살을 발사하는 감지식 태엽 덫 (d6 Damage(피해))",
  "머리를 어지럽히는 기묘한 보랏빛 독버섯 자생지 (WIL Save(구제 판정) 실패 시 1시간 동안 의식 혼미)",
  "타일 문양이 움직이며 가짜 환영으로 침입자의 눈을 흐림 (공격이 Impaired(약화됨) 상태가 됨)",
  "극심한 냉기가 불어닥치는 이상 저온 구역 (Deprived(박탈됨) 상태가 됨)",
  "갑자기 뒤에서 내려앉는 무거운 쇠창살 덫",
  "인기척을 감지하면 눈을 뜨는 난폭한 가죽 포식자 (HP 5, d6 bite)",
  "바닥의 숨겨진 압력판 (DEX Save(구제 판정) 실패 시 유리 파편 투하로 d4 Damage(피해))",
  "금속 아이템을 강하게 끌어당기는 천장 자기장 구역 (철제 무기를 휘두를 때 난이도 상승)",
  "바닥에 누워 자는 척하다 뒤를 덮치는 부상당한 노상강도 (HP 4, Pistol d6)"
];

const ENCOUNTERS_BASTION = [
  { name: "Arcana Collector (아카나 수집광)", stats: "HP 4, STR 9, DEX 11, WIL 12, Sword (d6)", desc: "유물을 노리고 플레이어 일행의 물건을 훔치거나 탐색하려는 교활한 수집가." },
  { name: "Mutated Outcast (변이된 추방자)", stats: "HP 3, STR 12, DEX 8, WIL 6, Claws (d4)", desc: "여분의 기형적인 팔을 가진, 굶주리고 흥분한 상태의 가련한 변이체." },
  { name: "Borough Watch Guard (바스티온 순찰대원)", stats: "HP 6, STR 10, DEX 10, WIL 10, Rifle (d8, Bulky 무거운 짐), Armour 1", desc: "규율을 중시하고 외지인을 감시하는 차가운 순찰 경비대원." },
  { name: "Clockwork Sweeper (태엽장치 청소 전차)", stats: "HP 5, STR 11, DEX 12, WIL 5, Shock Baton (d6)", desc: "오작동을 일으켜 지나가는 움직이는 모든 것을 쓰레기로 인식하고 파괴하려는 기계." },
  { name: "Desperate Footpad (시달리는 노상강도)", stats: "HP 4, STR 8, DEX 11, WIL 9, Pistol (d6)", desc: "빚쟁이에 쫓기며 총구를 들이대고 돈을 요구하는 성마른 도둑." },
  { name: "Rabid Mastiff (광견병에 걸린 사냥개)", stats: "HP 5, STR 10, DEX 8, WIL 4, Bite (d6)", desc: "거친 호흡을 하며 이빨을 드러내고 곧바로 달려드는 거대한 불독." }
];

const ENCOUNTERS_DEEP = [
  { name: "Feral Fog-Beast (야생 안개 야수)", stats: "HP 8, STR 14, DEX 10, WIL 7, Claws (d8), Armour 1", desc: "빛나는 두 눈을 제외하고는 온통 안개처럼 흐릿한 검은 가죽의 포식 동물." },
  { name: "Deceptive Cultist (기만적인 이단 교도)", stats: "HP 4, STR 9, DEX 12, WIL 11, Dagger (d6)", desc: "쟁반 위의 고품격 음식 환영으로 길 잃은 탐험가를 유인해 노리는 광신도." },
  { name: "Outdated War Automaton (구식 전투 오토마톤)", stats: "HP 12, STR 16, DEX 6, WIL 8, Heavy Gun (d10, Bulky 무거운 짐), Armour 2", desc: "반파되었으나 여전히 무장 프로토콜이 작동하는 무거운 녹빛 태엽 골렘." },
  { name: "Mad Hermit (미친 은둔자)", stats: "HP 5, STR 8, DEX 9, WIL 13, Staff (지팡이, d6 Bulky)", desc: "기이한 고대 주문(바벨의 살점서와 동일한 혀)으로 소리를 질러 정신을 공격하는 미치광이." },
  { name: "Giant Leech (거대 거머리)", stats: "HP 6, STR 11, DEX 7, WIL 3, Blood Drain (d6)", desc: "금속이나 방어구를 가리지 않고 살점으로 스며들어 체액을 빠는 거대한 벌레." },
  { name: "Angry Mob (성난 군중)", stats: "HP 4, STR 10, DEX 9, WIL 8, Torches & Pitchforks (d6, Bulky 무거운 짐)", desc: "외부인을 마녀나 재앙으로 치부하고 불태우려 드는 적대적인 마을 무리." }
];

const ENCOUNTERS_UNDERWORLD = [
  { name: "Crystal Guardian (결정 파수꾼)", stats: "HP 10, STR 13, DEX 11, WIL 10, Crystal Beam (d8), Armour 2", desc: "푸른 결정체로 된 수호자. 침입자를 향해 살을 도려내는 빛을 발사합니다." },
  { name: "Floating Shadow (부유하는 그림자)", stats: "HP 7, STR 7, DEX 15, WIL 12, Chilling Grip (d6)", desc: "만지는 이의 열을 빼앗아 동상에 이르게 하는 차갑고 비물리적인 위령." },
  { name: "Three Tomb Skeletons (세 마리의 무덤 해골)", stats: "HP 2 each, STR 6, DEX 13, WIL 5, Claws (d4)", desc: "유골 상자에서 기어 나온 듯한, 작지만 매우 날쌔고 영리한 앙상한 유해들." },
  { name: "Abyssal Mutant Warrior (심연의 변이체 전사)", stats: "HP 8, STR 13, DEX 9, WIL 8, Maul (대형 망치, d8 Bulky), Crude Armour 1", desc: "강철 가면과 기형적인 팔로 무시무시한 쇠망치를 내리치는 광전사 비스무리한 기사." },
  { name: "Blind Colossal Burrower (눈먼 거대 천공수)", stats: "HP 15, STR 15, DEX 8, WIL 5, Bite (d10), Armour 1", desc: "거대한 진동음과 함께 흙벽을 뚫고 지나가며 경로 내 모든 것을 씹어 삼키는 거대한 지렁이." },
  { name: "Reflected Double (반사된 거울 분신)", stats: "HP matches attacker, Stats match yours, Copy Weapon", desc: "벽면의 푸른 타일 광채에서 걸어 나와 거울처럼 일치하는 무기로 살의를 보이는 거울 분신." }
];


/* ==========================================
   REACT APP CORE
   ========================================== */

export default function App() {
  // App navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Game campaigns state
  const [party, setParty] = useState([]);
  const [journalEntries, setJournalEntries] = useState([
    {
      id: 1,
      title: "제 1화: 지하로 통하는 오래된 대문",
      date: "2026-05-22",
      content: "Bastion(바스티온) 지하 깊숙이 위치한 오래된 석조 문앞에 도착했다. 수많은 빚을 탕감하고 명성을 떨치기 위해선 이곳을 기필코 뚫어야 한다. 준비물은 식량과 횃불, 그리고 불안감이 전부다.\n\n오라클을 통해 이 단단한 갈색 목재 문이 안쪽에서 쇠장으로 굳게 닫혀있음을 발견했다. 도끼를 꺼내 부수기로 했다. 시끄러운 소리가 동굴 전체에 울려 퍼졌지만, 다행히 즉각적인 위협은 감지되지 않았다."
    }
  ]);
  const [selectedEntryId, setSelectedEntryId] = useState(1);
  const [journalText, setJournalText] = useState("");
  const [journalTitle, setJournalTitle] = useState("");
  
  // Dice rollers state
  const [diceRollResult, setDiceRollResult] = useState(null);
  const [diceRollLabel, setDiceRollLabel] = useState("");
  const [diceHistory, setDiceHistory] = useState([]);
  
  // Oracle State
  const [tension, setTension] = useState(0);
  const [oracleAnswer, setOracleAnswer] = useState(null);
  const [complicationText, setComplicationText] = useState("");
  
  // Spark Table Generator State
  const [sparkAction, setSparkAction] = useState("");
  const [sparkSubject, setSparkSubject] = useState("");
  const [sparkDescriptor, setSparkDescriptor] = useState("");
  
  // Custom Generator State
  const [generatedRoom, setGeneratedRoom] = useState(null);
  const [generatedEncounter, setGeneratedEncounter] = useState(null);
  const [encounterRegion, setEncounterRegion] = useState("bastion");
  
  // UI States
  const [toasts, setToasts] = useState([]);
  const [arcanumSearch, setArcanumSearch] = useState("");
  const [activeRuleId, setActiveRuleId] = useState("rules-saves");

  // Firebase Firestore Sync States
  const [firebaseConfigRaw, setFirebaseConfigRaw] = useState("");
  const [firebaseSyncKey, setFirebaseSyncKey] = useState("");
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);
  const [lastFirebaseSync, setLastFirebaseSync] = useState("");
  const [showFirebaseSettings, setShowFirebaseSettings] = useState(false);

  // Firebase Storage Hydrator
  useEffect(() => {
    const savedFbConfig = localStorage.getItem('firebase_config') || "";
    setFirebaseConfigRaw(savedFbConfig);

    const savedFbKey = localStorage.getItem('firebase_sync_key') || "";
    setFirebaseSyncKey(savedFbKey);

    const savedFbSyncTime = localStorage.getItem('firebase_last_sync') || "";
    setLastFirebaseSync(savedFbSyncTime);
  }, []);

  // Dynamic Firebase Instance Fetcher
  const getFirestoreDb = () => {
    let config = DEFAULT_FIREBASE_CONFIG;
    if (firebaseConfigRaw) {
      try {
        config = JSON.parse(firebaseConfigRaw);
      } catch (err) {
        console.error("Firebase config parse error, falling back to default:", err);
      }
    }

    try {
      const firebaseApps = getApps();
      let app;
      if (firebaseApps.length === 0) {
        app = initializeApp(config);
      } else {
        app = firebaseApps[0] || getApp();
      }
      return getFirestore(app);
    } catch (err) {
      console.error("Firebase Initialization Error:", err);
      showToast("Firebase 설정 분석 중 오류가 발생했습니다. 올바른 JSON 형식인지 확인해 주세요.", "danger");
      return null;
    }
  };

  const handleSaveFirebaseSettings = (configJson, syncKey) => {
    const trimmedKey = syncKey.trim();
    if (!trimmedKey) {
      showToast("동기화 키(캠페인 코드)를 입력해 주세요.", "danger");
      return;
    }

    if (configJson.trim()) {
      try {
        const parsedConfig = JSON.parse(configJson);
        if (!parsedConfig.apiKey || !parsedConfig.projectId) {
          showToast("Firebase Config가 유효하지 않습니다. apiKey와 projectId가 포함되어 있어야 합니다.", "danger");
          return;
        }
      } catch (err) {
        showToast("Firebase SDK 설정이 올바른 JSON 형식이 아닙니다.", "danger");
        return;
      }
    }

    setFirebaseConfigRaw(configJson.trim());
    localStorage.setItem('firebase_config', configJson.trim());

    setFirebaseSyncKey(trimmedKey);
    localStorage.setItem('firebase_sync_key', trimmedKey);

    showToast("Firebase 설정이 안전하게 저장되었습니다.", "success");
    setShowFirebaseSettings(false);
  };

  const handleClearFirebaseSettings = () => {
    if (confirm("Firebase 연동 설정을 모두 삭제하시겠습니까? 로컬 데이터는 보존됩니다.")) {
      setFirebaseConfigRaw("");
      setFirebaseSyncKey("");
      setLastFirebaseSync("");
      localStorage.removeItem('firebase_config');
      localStorage.removeItem('firebase_sync_key');
      localStorage.removeItem('firebase_last_sync');
      showToast("Firebase 연동이 해제되었습니다.", "info");
    }
  };

  const performFirebaseSync = async (mode = 'sync') => {
    if (!firebaseSyncKey) {
      showToast("비밀 캠페인 코드를 입력해 주세요.", "danger");
      setShowFirebaseSettings(true);
      return;
    }

    const db = getFirestoreDb();
    if (!db) return;

    setIsFirebaseSyncing(true);
    try {
      const docRef = doc(db, "saves", firebaseSyncKey);
      
      const localData = {
        party,
        journalEntries,
        tension,
        lastUpdated: new Date().toISOString()
      };

      if (mode === 'upload') {
        await setDoc(docRef, localData);
        const nowStr = new Date().toLocaleString();
        setLastFirebaseSync(nowStr);
        localStorage.setItem('firebase_last_sync', nowStr);
        showToast("Firebase 클라우드에 성공적으로 저장했습니다!", "success");
      } 
      else if (mode === 'download') {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          showToast("해당 동기화 키로 클라우드에 저장된 백업이 없습니다.", "danger");
          return;
        }
        
        const cloudData = docSnap.data();
        if (cloudData.party) setParty(cloudData.party);
        if (cloudData.journalEntries) {
          setJournalEntries(cloudData.journalEntries);
          if (cloudData.journalEntries.length > 0) {
            setSelectedEntryId(cloudData.journalEntries[0].id);
          }
        }
        if (cloudData.tension !== undefined) setTension(cloudData.tension);

        const nowStr = new Date().toLocaleString();
        setLastFirebaseSync(nowStr);
        localStorage.setItem('firebase_last_sync', nowStr);
        showToast("Firebase 클라우드에서 데이터를 성공적으로 불렀왔습니다!", "success");
      }
    } catch (err) {
      console.error("Firebase Sync Error:", err);
      showToast("Firebase 클라우드 동기화 실패. 규칙 및 구성을 다시 확인하십시오.", "danger");
    } finally {
      setIsFirebaseSyncing(false);
    }
  };

  // Load from local storage
  useEffect(() => {
    const savedParty = localStorage.getItem('alone_party');
    const savedJournal = localStorage.getItem('alone_journal');
    const savedTension = localStorage.getItem('alone_tension');
    
    if (savedParty) {
      try {
        const parsed = JSON.parse(savedParty);
        if (Array.isArray(parsed)) {
          setParty(parsed);
        } else {
          setParty([]);
        }
      } catch (e) {
        console.error("Failed to parse saved party:", e);
        setParty([]);
      }
    }
    if (savedJournal) {
      try {
        const parsed = JSON.parse(savedJournal);
        if (Array.isArray(parsed)) {
          setJournalEntries(parsed);
          if (parsed.length > 0 && parsed[0]) {
            setSelectedEntryId(parsed[0].id || 1);
            setJournalTitle(parsed[0].title || "");
            setJournalText(parsed[0].content || "");
          }
        }
      } catch (e) {
        console.error("Failed to parse saved journal:", e);
      }
    }
    if (savedTension) {
      const parsedTension = parseInt(savedTension, 10);
      if (!isNaN(parsedTension)) {
        setTension(parsedTension);
      }
    }
  }, []);

  // Save to local storage when state changes
  useEffect(() => {
    localStorage.setItem('alone_party', JSON.stringify(party));
  }, [party]);

  useEffect(() => {
    localStorage.setItem('alone_journal', JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem('alone_tension', tension.toString());
  }, [tension]);

  // Sync editor when active entry changes
  useEffect(() => {
    const entry = journalEntries.find(e => e.id === selectedEntryId);
    if (entry) {
      setJournalTitle(entry.title);
      setJournalText(entry.content);
    }
  }, [selectedEntryId, journalEntries]);

  // Custom visual toast alert
  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  /* Helper: Roll Dice */
  const rollDice = (sides, label = "", count = 1) => {
    let sum = 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      sum += roll;
    }
    
    const displayRoll = count > 1 ? `${rolls.join(" + ")} = ${sum}` : `${sum}`;
    setDiceRollResult(sum);
    setDiceRollLabel(`${count}d${sides} (${label})`);
    
    const newHistoryItem = {
      timestamp: new Date().toLocaleTimeString(),
      label: `${count}d${sides} (${label})`,
      result: displayRoll
    };
    
    setDiceHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
    return sum;
  };

  /* Helper: Generate unique Into the Odd Character */
  const generateNewCharacter = () => {
    // 1. Roll 3d6 for ability scores in order
    const strRoll = rollDice(6, "STR Roll", 3);
    const dexRoll = rollDice(6, "DEX Roll", 3);
    const wilRoll = rollDice(6, "WIL Roll", 3);
    
    // 2. Roll 1d6 for HP
    const hpRoll = rollDice(6, "HP Roll", 1);
    
    // 3. Determine Highest ability score
    const highestVal = Math.max(strRoll, dexRoll, wilRoll);
    let highestRange = "3-9";
    if (highestVal >= 10 && highestVal <= 18) {
      highestRange = highestVal.toString();
    }
    
    const hpCol = hpRoll; // 1-6 column matches HP directly
    
    // Look up Starter Package
    const pkgRow = STARTER_PACKAGES[highestRange] || STARTER_PACKAGES["3-9"];
    const pkg = pkgRow[hpCol] || pkgRow[1];
    
    // Assign starter items
    const inventory = [];
    
    // Check if package has an Arcanum
    let characterArcanum = null;
    if (pkg.hasArcanum) {
      // Roll d66 (two d6, tens and units)
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d66 = d1 * 10 + d2;
      characterArcanum = STANDARD_ARCANA[d66] || STANDARD_ARCANA[11];
      inventory.push({ name: `아르카눔: ${characterArcanum.name}`, bulky: false, isArcanum: true, desc: characterArcanum.desc });
    }
    
    // Add regular gear
    pkg.gear.forEach(item => {
      const isBulky = item.includes(" B)") || item.includes("Bulky");
      inventory.push({ name: item, bulky: isBulky, isArcanum: false });
    });
    
    // General exploration stuff
    inventory.push({ name: "Rations (보급식량)", bulky: false });
    inventory.push({ name: "Lantern (랜턴)", bulky: false });
    
    // Roll random names
    const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
    const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    
    const newChar = {
      id: Date.now(),
      name,
      background: bg,
      strMax: strRoll,
      strCur: strRoll,
      dexMax: dexRoll,
      dexCur: dexRoll,
      wilMax: wilRoll,
      wilCur: wilRoll,
      hpMax: hpRoll,
      hpCur: hpRoll,
      armour: pkg.gear.some(g => g.includes("Armour")) ? 1 : 0,
      trait: pkg.trait,
      inventory,
      isCompanions: false
    };
    
    setParty(prev => [...prev, newChar]);
    showToast(`${name} 캐릭터가 파티에 합류했습니다!`, "success");
    setActiveTab('characters');
  };

  /* Helper: Add blank Custom Character */
  const addBlankCharacter = () => {
    const newChar = {
      id: Date.now(),
      name: "새 탐험가",
      background: "Bastion(바스티온)을 헤매는 방랑자",
      strMax: 10,
      strCur: 10,
      dexMax: 10,
      dexCur: 10,
      wilMax: 10,
      wilCur: 10,
      hpMax: 3,
      hpCur: 3,
      armour: 0,
      trait: "없음",
      inventory: [
        { name: "Hand Weapon (d6 무기)", bulky: false },
        { name: "Rations (보급식량)", bulky: false }
      ],
      isCompanions: true
    };
    setParty(prev => [...prev, newChar]);
    showToast("신규 캐릭터 슬롯이 비어있습니다. 직접 편집하세요.", "info");
  };

  /* Delete character */
  const deleteCharacter = (id, name) => {
    if (confirm(`${name} 캐릭터를 파티에서 은퇴시키겠습니까?`)) {
      setParty(prev => prev.filter(c => c.id !== id));
      showToast(`${name} 캐릭터가 은퇴했습니다.`, "info");
    }
  };

  /* Edit Character fields */
  const updateCharacterStat = (charId, statName, value) => {
    setParty(prev => prev.map(c => {
      if (c.id === charId) {
        const val = Math.max(0, parseInt(value, 10) || 0);
        return { ...c, [statName]: val };
      }
      return c;
    }));
  };

  /* Add Item to Inventory */
  const addItemToInventory = (charId, itemName, isBulky) => {
    if (!itemName.trim()) return;
    setParty(prev => prev.map(c => {
      if (c.id === charId) {
        return {
          ...c,
          inventory: [...c.inventory, { name: itemName, bulky: isBulky }]
        };
      }
      return c;
    }));
    showToast("아이템이 인벤토리에 추가되었습니다.", "success");
  };

  /* Remove Item from Inventory */
  const removeItemFromInventory = (charId, itemIdx) => {
    setParty(prev => prev.map(c => {
      if (c.id === charId) {
        const newInv = [...c.inventory];
        newInv.splice(itemIdx, 1);
        return { ...c, inventory: newInv };
      }
      return c;
    }));
  };

  /* Perform Save roll (Roll d20 <= Score) */
  const performSaveRoll = (charName, statName, score) => {
    const d20 = rollDice(20, `${charName}의 ${statName} Save 판정`);
    const success = d20 <= score || d20 === 1;
    const isFail = d20 > score && d20 !== 1 || d20 === 20;
    
    let resultText = "";
    if (d20 === 1) resultText = "★ 대성공 (항상 성공)";
    else if (d20 === 20) resultText = "☠ 대실패 (항상 실패)";
    else if (success) resultText = `성공 (d20: ${d20} <= 능력치: ${score})`;
    else resultText = `실패 (d20: ${d20} > 능력치: ${score})`;
    
    showToast(`${charName} - ${statName} Save 판정: ${resultText}`, success ? "success" : "danger");
  };

  /* ==========================================
     OSR SOLO ORACLE LOGIC
     ========================================== */
  
  const rollOracle = (likelihood) => {
    const d20 = rollDice(20, `Oracle: ${likelihood}`);
    
    // Set threshold based on likelihood and tension
    // Tension increases likelihood of extreme results (1 or 20)
    let threshold = 10; // Even odds
    if (likelihood === 'likely') threshold = 6;
    if (likelihood === 'unlikely') threshold = 16;
    
    let result = "";
    let isComplication = false;
    
    if (d20 === 1) {
      result = "예, 게다가... (Yes, and...) - 기대 이상의 큰 혜택이나 엄청난 진척이 발생합니다!";
      setTension(prev => Math.max(0, prev - 1));
    } else if (d20 === 20) {
      result = "아니오, 게다가... (No, and...) - 대재앙! 예상치 못한 아주 치명적인 곤경이나 부가 피해가 불어닥칩니다.";
      setTension(prev => Math.min(10, prev + 2));
      isComplication = true;
    } else if (d20 <= threshold) {
      // Success (Yes)
      if (d20 % 2 === 0) {
        result = "예 (Yes) - 원하는 방향으로 깔끔하게 흘러갑니다.";
      } else {
        result = "예, 하지만... (Yes, but...) - 원하는 일은 성취되나, 경미한 방해 요구나 작은 대가가 따릅니다.";
        setTension(prev => Math.min(10, prev + 1));
      }
    } else {
      // Failure (No)
      if (d20 % 2 !== 0) {
        result = "아니오 (No) - 실패했습니다. 다른 방법을 찾아야 합니다.";
      } else {
        result = "아니오, 하지만... (No, but...) - 실패했으나, 작은 실마리나 사소한 위안 거리가 남습니다.";
      }
    }
    
    setOracleAnswer(result);
    
    // Add complication if tension is high or d20 is even failures
    if (isComplication || (d20 > threshold && d20 % 5 === 0)) {
      const complicationIdx = Math.floor(Math.random() * ROOM_DANGERS.length);
      setComplicationText(`위험 상황: ${ROOM_DANGERS[complicationIdx]}`);
    } else {
      setComplicationText("");
    }
    
    showToast("오라클이 질문에 반응했습니다.", "success");
  };

  /* Generate Spark Table words */
  const generateSparks = () => {
    const act = SPARK_ACTIONS[Math.floor(Math.random() * SPARK_ACTIONS.length)];
    const subj = SPARK_SUBJECTS[Math.floor(Math.random() * SPARK_SUBJECTS.length)];
    const desc = SPARK_DESCRIPTORS[Math.floor(Math.random() * SPARK_DESCRIPTORS.length)];
    
    setSparkAction(act);
    setSparkSubject(subj);
    setSparkDescriptor(desc);
    
    showToast("기묘한 단어가 뇌리에 스쳤습니다.", "info");
  };

  /* Generate Random Room */
  const generateRandomRoomDetails = () => {
    const layout = ROOM_LAYOUTS[Math.floor(Math.random() * ROOM_LAYOUTS.length)];
    const content = ROOM_CONTENTS[Math.floor(Math.random() * ROOM_CONTENTS.length)];
    const danger = ROOM_DANGERS[Math.floor(Math.random() * ROOM_DANGERS.length)];
    
    setGeneratedRoom({ layout, content, danger });
    showToast("방의 기하학적 배치가 생성되었습니다.", "success");
  };

  /* Generate Random Encounter */
  const generateRandomEncounterDetails = () => {
    let pool = ENCOUNTERS_BASTION;
    if (encounterRegion === "deep") pool = ENCOUNTERS_DEEP;
    if (encounterRegion === "underworld") pool = ENCOUNTERS_UNDERWORLD;
    
    const monster = pool[Math.floor(Math.random() * pool.length)];
    setGeneratedEncounter(monster);
    showToast("위험한 실루엣이 시야에 어른거립니다.", "danger");
  };

  /* Inject roll or oracle result directly into journal */
  const injectTextToJournal = (textToAppend) => {
    if (!textToAppend) return;
    setJournalText(prev => `${prev}\n\n[기록] ${textToAppend}`);
    showToast("텍스트가 일지에 기록되었습니다. 우측 상단의 저장 버튼을 잊지 마세요!", "info");
  };

  /* ==========================================
     CAMPAIGN JOURNAL LOGIC
     ========================================== */
  
  const createNewJournalEntry = () => {
    const newEntry = {
      id: Date.now(),
      title: `신규 탐험 일지 (${new Date().toLocaleDateString()})`,
      date: new Date().toISOString().split('T')[0],
      content: "여기에 새로운 탐험 일지를 작성해 솔로 플레이 스토리를 기록해 나가세요. \n\n왼쪽 패널의 오라클 판정 결과나 주사위 롤 결과를 즉시 이곳으로 가져와(Inject) 삽입할 수도 있습니다."
    };
    
    setJournalEntries(prev => [newEntry, ...prev]);
    setSelectedEntryId(newEntry.id);
    showToast("새 탐험 페이지가 서가에 추가되었습니다.", "success");
  };

  const saveCurrentJournalEntry = () => {
    setJournalEntries(prev => prev.map(e => {
      if (e.id === selectedEntryId) {
        return { ...e, title: journalTitle, content: journalText };
      }
      return e;
    }));
    showToast("탐험 기록이 로컬 저장소에 완벽히 저장되었습니다.", "success");
  };

  const deleteJournalEntry = (id) => {
    if (journalEntries.length <= 1) {
      showToast("적어도 한 개의 탐험 일지는 소장해야 합니다.", "danger");
      return;
    }
    if (confirm("이 탐험 기록 페이지를 찢어 버리시겠습니까? 되돌릴 수 없습니다.")) {
      const remaining = journalEntries.filter(e => e.id !== id);
      setJournalEntries(remaining);
      setSelectedEntryId(remaining[0].id);
      showToast("일지 기록이 영구 폐기되었습니다.", "info");
    }
  };

  /* Export / Import backup */
  const exportCampaignData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ party, journalEntries, tension })
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `alone-in-the-odd-campaign-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("캠페인 백업 파일 다운로드 시작.", "success");
  };

  const importCampaignData = (event) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.party) setParty(parsed.party);
        if (parsed.journalEntries) {
          setJournalEntries(parsed.journalEntries);
          if (parsed.journalEntries.length > 0) {
            setSelectedEntryId(parsed.journalEntries[0].id);
          }
        }
        if (parsed.tension) setTension(parsed.tension);
        showToast("탐험 캠페인 데이터가 성공적으로 복구되었습니다!", "success");
      } catch (err) {
        showToast("유효하지 않은 백업 파일양식입니다.", "danger");
      }
    };
    fileReader.readAsText(event.target.files[0]);
  };

  let firebaseProjectName = "";
  if (firebaseConfigRaw) {
    try {
      const parsed = JSON.parse(firebaseConfigRaw);
      firebaseProjectName = parsed.projectId || "";
    } catch (e) {}
  }

  return (
    <div className="app-container">
      {/* Toast Alert stack */}
      <div className="ui-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`ui-toast ${t.type === 'success' ? 'save-success' : t.type === 'danger' ? 'save-fail' : ''}`}>
            {t.type === 'danger' ? <Skull size={14} /> : <Sparkles size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="cosmic-emblem-container">
            <svg viewBox="0 0 160 160" className="cosmic-emblem">
              {/* Stars Background inside emblem */}
              <circle cx="80" cy="80" r="75" fill="#0f172a" stroke="rgba(234, 88, 12, 0.2)" strokeWidth="1" />
              <circle cx="80" cy="80" r="70" stroke="rgba(234, 88, 12, 0.08)" strokeDasharray="3, 3" fill="none" />
              
              {/* Tiny Stars */}
              <circle cx="45" cy="45" r="0.5" fill="#fff" opacity="0.8" />
              <circle cx="115" cy="115" r="0.5" fill="#fff" opacity="0.6" />
              <circle cx="120" cy="50" r="0.7" fill="#ea580c" opacity="0.9" />
              <circle cx="50" cy="110" r="0.6" fill="#fff" opacity="0.7" />
              
              {/* Prussian blue spiky starburst (The botanical form) */}
              <g stroke="rgba(0, 229, 255, 0.4)" strokeWidth="0.5">
                {/* North Leaf */}
                <path d="M80 80 Q72 40 80 15 Q88 40 80 80" fill="#0e2338" opacity="0.9" />
                <path d="M80 80 Q77 45 80 20 Q83 45 80 80" fill="#1b3f61" />
                {/* South Leaf */}
                <path d="M80 80 Q72 120 80 145 Q88 120 80 80" fill="#0e2338" opacity="0.9" />
                <path d="M80 80 Q77 115 80 140 Q83 115 80 80" fill="#1b3f61" />
                {/* East Leaf */}
                <path d="M80 80 Q120 72 145 80 Q120 88 80 80" fill="#0e2338" opacity="0.9" />
                <path d="M80 80 Q115 77 140 80 Q115 83 80 80" fill="#1b3f61" />
                {/* West Leaf */}
                <path d="M80 80 Q40 72 15 80 Q40 88 80 80" fill="#0e2338" opacity="0.9" />
                <path d="M80 80 Q45 77 20 80 Q45 83 80 80" fill="#1b3f61" />
                
                {/* Diagonal Leaves */}
                <path d="M80 80 Q105 55 125 35 Q108 68 80 80" fill="#0b1d30" opacity="0.8" />
                <path d="M80 80 Q102 58 120 40 Q106 65 80 80" fill="#163452" />
                <path d="M80 80 Q55 105 35 125 Q68 108 80 80" fill="#0b1d30" opacity="0.8" />
                <path d="M80 80 Q58 102 40 120 Q65 106 80 80" fill="#163452" />
                <path d="M80 80 Q55 55 35 35 Q68 52 80 80" fill="#0b1d30" opacity="0.8" />
                <path d="M80 80 Q58 58 40 40 Q65 54 80 80" fill="#163452" />
                <path d="M80 80 Q105 105 125 125 Q108 92 80 80" fill="#0b1d30" opacity="0.8" />
                <path d="M80 80 Q102 102 120 120 Q106 95 80 80" fill="#163452" />
              </g>
              
              {/* Outer Gold Rope Loops */}
              <path d="M 45 45 C 30 70, 30 90, 45 115" fill="none" stroke="#ea580c" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.75" />
              <path d="M 115 45 C 130 70, 130 90, 115 115" fill="none" stroke="#ea580c" strokeWidth="1.2" opacity="0.8" />
              <path d="M 45 45 C 70 30, 90 30, 115 45" fill="none" stroke="#ea580c" strokeWidth="1" strokeDasharray="3,1" opacity="0.6" />
              
              {/* Orbital paths */}
              <ellipse cx="80" cy="80" rx="55" ry="18" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.75" transform="rotate(-15 80 80)" />
              <ellipse cx="80" cy="80" rx="35" ry="50" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.5" transform="rotate(35 80 80)" />
              
              {/* Center Glowing Orb */}
              <circle cx="80" cy="80" r="16" fill="rgba(0, 229, 255, 0.1)" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="0.5" />
              <circle cx="80" cy="80" r="10" fill="rgba(0, 229, 255, 0.25)" />
              <circle cx="80" cy="80" r="8" className="cosmic-orb-pulse" fill="#e0faff" />
              
              {/* Tiny spikes on the orb */}
              <g stroke="#00e5ff" strokeWidth="0.75">
                <line x1="80" y1="68" x2="80" y2="70" />
                <line x1="80" y1="90" x2="80" y2="92" />
                <line x1="68" y1="80" x2="70" y2="80" />
                <line x1="90" y1="80" x2="92" y2="80" />
                <line x1="71" y1="71" x2="73" y2="73" />
                <line x1="89" y1="89" x2="87" y2="87" />
                <line x1="71" y1="89" x2="73" y2="87" />
                <line x1="89" y1="71" x2="87" y2="73" />
              </g>
              
              {/* Handwriting labels */}
              <text x="24" y="52" className="cosmic-annotation-text">Ashes'</text>
              <text x="22" y="60" className="cosmic-annotation-text">demise</text>
              <line x1="43" y1="58" x2="52" y2="65" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              
              <text x="96" y="98" className="cosmic-annotation-text">the orb</text>
              <path d="M94 95 Q87 90 85 85" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              
              <text x="108" y="72" className="cosmic-annotation-text">Oscillating</text>
              <text x="110" y="80" className="cosmic-annotation-text">plant</text>
              
              <text x="112" y="32" className="cosmic-annotation-text">1 Alive!</text>
            </svg>
          </div>
          <h1 className="brand-title">
            Alone in <span>the Odd</span>
          </h1>
          <div className="brand-subtitle">
            OSR Solo RPG Companion
          </div>
        </div>

        <nav className="nav-menu">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Shield size={16} />
              <span>작업소 (Dashboard)</span>
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              <UserPlus size={16} />
              <span>탐험 대원 ({party.length})</span>
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'oracle' ? 'active' : ''}`}
              onClick={() => setActiveTab('oracle')}
            >
              <Dices size={16} />
              <span>지하 오라클 판정</span>
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'journal' ? 'active' : ''}`}
              onClick={() => setActiveTab('journal')}
            >
              <PenTool size={16} />
              <span>탐험 일지 기록</span>
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              <BookOpen size={16} />
              <span>참조 서면 & 아르카눔</span>
            </button>
          </li>
        </nav>

        <div className="sidebar-footer">
          <div>VERSION 1.0.0 (Local First)</div>
          <div style={{ marginTop: '4px' }}>Data stored in LocalStorage</div>
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="main-viewport">
        
        {/* ==================== TAB: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">어둠 속의 <span>작업소</span></h2>
                <div className="panel-desc">솔로 RPG를 시작하기 전 파티원 장비를 롤링하거나 주사위를 던질 수 있는 허브입니다.</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={exportCampaignData}>
                  <Download size={14} />
                  <span>백업 파일 추출</span>
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={14} />
                  <span>복구 파일 불러오기</span>
                  <input type="file" accept=".json" onChange={importCampaignData} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Left area: Dice Tray and Welcome */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Global Quick Dice Rollers */}
                <div className="dice-tray-widget">
                  <h3 className="card-title">
                    <Dices size={16} style={{ color: 'var(--color-gold)' }} />
                    <span>실시간 물리 주사위 쟁반 (Dice Tray)</span>
                  </h3>
                  <div className="dice-list">
                    <button className="dice-btn" onClick={() => rollDice(4, "d4 roll")}>d4</button>
                    <button className="dice-btn" onClick={() => rollDice(6, "d6 roll")}>d6</button>
                    <button className="dice-btn" onClick={() => rollDice(8, "d8 roll")}>d8</button>
                    <button className="dice-btn" onClick={() => rollDice(10, "d10 roll")}>d10</button>
                    <button className="dice-btn" onClick={() => rollDice(12, "d12 roll")}>d12</button>
                    <button className="dice-btn" onClick={() => rollDice(20, "d20 roll")}>d20</button>
                    <button className="dice-btn" onClick={() => rollDice(100, "d100 roll")}>d100</button>
                    <button className="dice-btn" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }} onClick={() => rollDice(6, "3d6 Ability roll", 3)}>
                      3d6 능력치롤
                    </button>
                    {/* Thousand Year Old Vampire style roll d10 - d6 */}
                    <button className="dice-btn" style={{ borderColor: 'var(--color-purple)', color: 'var(--color-purple)' }} onClick={() => {
                      const d10 = Math.floor(Math.random() * 10) + 1;
                      const d6 = Math.floor(Math.random() * 6) + 1;
                      const res = d10 - d6;
                      setDiceRollResult(res);
                      setDiceRollLabel("d10 - d6 (뱀파이어 이동)");
                      setDiceHistory(prev => [{ timestamp: new Date().toLocaleTimeString(), label: "d10 - d6", result: `${d10} - ${d6} = ${res}` }, ...prev]);
                    }}>
                      d10 - d6 롤
                    </button>
                  </div>

                  {diceRollResult !== null && (
                    <div className="rolled-result-box">
                      <div className="stat-label">{diceRollLabel}</div>
                      <div className="rolled-value">{diceRollResult}</div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ marginTop: '10px', padding: '4px 8px', fontSize: '10px' }}
                        onClick={() => injectTextToJournal(`주사위 판정 결과 [${diceRollLabel}]: ${diceRollResult}`)}
                      >
                        주사위 값을 일지에 기록하기
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Instruction Card */}
                <div className="card">
                  <h3 className="card-title">
                    <HelpCircle size={16} />
                    <span>Alone in the Odd 플레이 수칙</span>
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-bright)' }}>
                    <p style={{ marginBottom: '10px' }}>
                      <strong>1. 파티 구성</strong>: <span style={{ color: 'var(--color-gold)' }}>[탐험 대원]</span> 탭으로 가서 <strong>"공식 스타터 캐릭터 자동 생성"</strong> 버튼을 누르세요. 
                      주사위로 능력치와 HP를 즉시 굴려 룰북 규격의 장비를 즉석 조합해줍니다. 1~3명의 파티원을 꾸리는 것을 매우 권장합니다 (Into the Odd는 몹시 치명적입니다!).
                    </p>
                    <p style={{ marginBottom: '10px' }}>
                      <strong>2. 상황 설정 및 질문</strong>: 맵이나 소설을 그려나가다가 결단이 필요할 땐 <span style={{ color: 'var(--color-gold)' }}>[지하 오라클 판정]</span> 탭에서 Yes/No 질문을 던지세요. 
                      판정에 Complication(위기) 요소가 끼면 긴장도가 축적됩니다.
                    </p>
                    <p>
                      <strong>3. 기록 남기기</strong>: 진행과 주사위 굴림 내역을 <span style={{ color: 'var(--color-gold)' }}>[탐험 일지 기록]</span>에 서술하세요. 주사위 결과 박스 옆의 기록 버튼을 누르면 탐험 일지에 마크다운 형식으로 자동 연동 덧붙이기가 됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right column: Active party list summary & dice history */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Firebase Campaign Sync Widget */}
                <div className="card cloud-sync-card firebase-sync-card">
                  {(!firebaseSyncKey || showFirebaseSettings) ? (
                    <div>
                      <h3 className="card-title" style={{ color: 'var(--color-purple)' }}>
                        <Cloud size={16} style={{ color: 'var(--color-purple)' }} />
                        <span>파이어베이스 클라우드 설정</span>
                      </h3>

                      <div className="cloud-guide-box" style={{ borderLeft: '3px solid var(--color-purple)', padding: '12px', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '4px', marginBottom: '14px' }}>
                        <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.6', color: 'var(--text-white)' }}>
                          🚀 <strong>skogsduvasbookshop</strong> 프로젝트가 앱에 기본 내장되어 있습니다!
                        </p>
                        <p style={{ fontSize: '12px', margin: '6px 0 0 0', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                          비밀 캠페인 코드(동기화 키)만 입력하시면 즉시 안전한 실시간 클라우드 동기화가 활성화됩니다.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-white)', fontWeight: '700' }}>
                            SYNC KEY (비밀 캠페인 코드)
                          </label>
                          <input 
                            type="text" 
                            className="text-input" 
                            placeholder="예: my-secret-campaign-2026"
                            defaultValue={firebaseSyncKey}
                            id="firebase-key-input"
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            기기 간에 이 코드가 완전히 일치해야 동일한 데이터를 연동할 수 있습니다.
                          </span>
                        </div>

                        <details style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                          <summary style={{ fontSize: '12px', color: 'var(--color-purple)', cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
                            고급 설정 (커스텀 Firebase 프로젝트 연동 및 보안 규칙)
                          </summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px', padding: '10px', background: 'rgba(0, 0, 0, 0.15)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                              <p style={{ margin: '0 0 8px 0' }}>
                                커스텀 Firebase 프로젝트를 연동하시려면 아래에 SDK 설정 객체(JSON)를 입력하세요.
                              </p>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-white)', fontWeight: '700' }}>
                                FIREBASE WEB APP CONFIG JSON (선택 사항)
                              </label>
                              <textarea 
                                className="textarea-config" 
                                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app",\n  ...\n}`}
                                defaultValue={firebaseConfigRaw}
                                id="firebase-config-input"
                                style={{ minHeight: '100px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-white)', fontWeight: '700' }}>
                                권장 FIRESTORE 보안 규칙 (Firestore Security Rules)
                              </label>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                안전한 동기화를 위해 Firebase Console의 Firestore Rules 탭에 아래 규칙을 적용해 주세요:
                              </div>
                              <div className="code-block-rules" style={{ margin: 0, padding: '8px', fontSize: '11px', maxHeight: '150px', overflowY: 'auto' }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 기존 saves 컬렉션 허용 (로그인 불필요)
    match /saves/{syncId} {
      allow read, write: if true;
    }
    
    // 🩸 천년 동안 살아온 흡혈귀 세이브 허용 (로그인 상태)
    match /vampire_saves/{userId} {
      allow read, write: if true;
    }
  }
}`}
                              </div>
                            </div>
                          </div>
                        </details>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, background: 'var(--color-purple)', borderColor: 'var(--color-purple)', color: '#fff' }}
                            onClick={() => {
                              const configVal = document.getElementById('firebase-config-input')?.value || '';
                              const keyVal = document.getElementById('firebase-key-input')?.value || '';
                              handleSaveFirebaseSettings(configVal, keyVal);
                            }}
                          >
                            클라우드 연동 활성화
                          </button>
                          {firebaseSyncKey && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ flex: 0.5 }}
                              onClick={() => setShowFirebaseSettings(false)}
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="card-title">
                        <Cloud size={16} style={{ color: 'var(--color-purple)' }} />
                        <span>파이어베이스 클라우드 동기화</span>
                      </h3>
                      <div>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          파이어베이스 파이어스토어와 성공적으로 연동되었습니다! 언제든지 탐험 상황을 저장하거나 복구하세요.
                        </p>

                        <div className="cloud-info-row">
                          <span className="cloud-info-label">연동 프로젝트</span>
                          <span className="cloud-info-value" style={{ color: 'var(--color-purple)', fontWeight: 'bold' }}>
                            {firebaseProjectName || 'skogsduvasbookshop'}
                          </span>
                        </div>
                        <div className="cloud-info-row">
                          <span className="cloud-info-label">비밀 캠페인 코드</span>
                          <span className="cloud-info-value" style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{firebaseSyncKey}</span>
                        </div>
                        <div className="cloud-info-row">
                          <span className="cloud-info-label">연동 상태</span>
                          <span className="cloud-status-badge firebase-connected">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-purple)', display: 'inline-block', marginRight: '6px' }}></span>
                            연동 완료
                          </span>
                        </div>
                        <div className="cloud-info-row">
                          <span className="cloud-info-label">최근 동기화</span>
                          <span className="cloud-info-value">{lastFirebaseSync || '기록 없음'}</span>
                        </div>

                        <div className="cloud-btn-group" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, background: 'var(--color-purple)', borderColor: 'var(--color-purple)', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                            onClick={() => performFirebaseSync('upload')}
                            disabled={isFirebaseSyncing}
                          >
                            {isFirebaseSyncing ? <RefreshCw size={12} className="spin-loader" /> : <Upload size={12} />}
                            <span>클라우드 저장</span>
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                            onClick={() => performFirebaseSync('download')}
                            disabled={isFirebaseSyncing}
                          >
                            {isFirebaseSyncing ? <RefreshCw size={12} className="spin-loader" /> : <Download size={12} />}
                            <span>클라우드 복구</span>
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(15, 23, 42, 0.08)', paddingTop: '12px' }}>
                          <button 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', fontSize: '11px' }}
                            onClick={() => setShowFirebaseSettings(true)}
                          >
                            <Settings size={12} />
                            <span>설정 변경</span>
                          </button>
                          <button 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-red)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                            onClick={handleClearFirebaseSettings}
                          >
                            <LogOut size={12} />
                            <span>연동 해제</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Party Tracker widget */}
                <div className="card">
                  <h3 className="card-title">
                    <Heart size={16} style={{ color: 'var(--color-red)' }} />
                    <span>현재 탐험 대원 상태 ({party.length})</span>
                  </h3>
                  {party.length === 0 ? (
                    <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-dark)' }}>
                      활성화된 탐험 대원이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {party.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-gold)' }}>{c.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '8px' }}>HP {c.hpCur}/{c.hpMax}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-red)' }}>S {c.strCur}</span>
                            <span style={{ color: 'var(--color-cyan)' }}>D {c.dexCur}</span>
                            <span style={{ color: 'var(--color-purple)' }}>W {c.wilCur}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '14px' }}
                    onClick={generateNewCharacter}
                  >
                    대원 신속 징집하기
                  </button>
                </div>

                {/* Dice history log widget */}
                <div className="card">
                  <h3 className="card-title">
                    <RotateCcw size={16} />
                    <span>주사위 기록 보관함</span>
                  </h3>
                  {diceHistory.length === 0 ? (
                    <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-dark)', fontSize: '12px' }}>
                      기록이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      {diceHistory.map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-muted)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{h.label}</span>
                          <span style={{ color: 'var(--color-gold)', fontWeight: '700' }}>{h.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: CHARACTERS ==================== */}
        {activeTab === 'characters' && (
          <div>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">지하 <span>탐험 대원 관리자</span></h2>
                <div className="panel-desc">지하 심연으로 걸어 내려갈 파티 대원들을 관리하고 주사위 판정을 다이렉트로 수행합니다.</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={generateNewCharacter}>
                  <UserPlus size={14} />
                  <span>공식 스타터 캐릭터 자동 생성</span>
                </button>
                <button className="btn btn-secondary" onClick={addBlankCharacter}>
                  <Plus size={14} />
                  <span>수동 캐릭터 슬롯 추가</span>
                </button>
              </div>
            </div>

            {party.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Skull size={48} style={{ color: 'var(--text-dark)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>활성화된 파티원이 한 명도 존재하지 않습니다!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                  위의 "공식 스타터 캐릭터 자동 생성" 버튼을 눌러 Into the Odd Remastered 사양의 주사위 능력치 조합과 고유 장비를 즉시 징집하십시오.
                </p>
                <button className="btn btn-primary" onClick={generateNewCharacter}>
                  대원 자동 생성하기
                </button>
              </div>
            ) : (
              <div className="party-grid">
                {party.map(c => {
                  const bulkyCount = c.inventory.filter(i => i.bulky).length;
                  const isHpReducedToZero = bulkyCount >= 3;
                  
                  return (
                    <div key={c.id} className="character-card">
                      {isHpReducedToZero && (
                        <div style={{ backgroundColor: 'var(--color-red)', color: '#000', fontSize: '10px', fontWeight: '800', textAlign: 'center', padding: '4px', textTransform: 'uppercase' }}>
                          ⚠️ 무거운 짐 초과 상태! HP가 강제로 0이 됩니다. (Bulky 아이템 3개 이상 보유)
                        </div>
                      )}
                      <div className="char-header">
                        <div className="char-name-row">
                          <input 
                            type="text" 
                            className="char-name" 
                            style={{ background: 'none', border: 'none', width: '70%', fontWeight: '700', padding: 0 }}
                            value={c.name}
                            onChange={(e) => updateCharacterStat(c.id, 'name', e.target.value)}
                          />
                          <button 
                            className="inv-delete-btn" 
                            style={{ padding: '4px' }}
                            onClick={() => deleteCharacter(c.id, c.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input 
                          type="text" 
                          className="char-background"
                          style={{ background: 'none', border: 'none', width: '100%', padding: 0 }} 
                          value={c.background}
                          onChange={(e) => updateCharacterStat(c.id, 'background', e.target.value)}
                        />
                      </div>

                      <div className="char-body">
                        {/* Interactive Stats Panel */}
                        <div className="stats-grid">
                          {/* HP Stat */}
                          <div className="stat-box stat-hp">
                            <span className="stat-label">Hit Protection</span>
                            <div className="stat-value">{isHpReducedToZero ? 0 : c.hpCur}</div>
                            <div className="stat-edit-row">
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'hpCur', Math.max(0, c.hpCur - 1))}>-</button>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {c.hpMax}</span>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'hpCur', Math.min(c.hpMax, c.hpCur + 1))}>+</button>
                            </div>
                          </div>

                          {/* STR Stat (Click to Roll Save) */}
                          <div className="stat-box stat-str clickable-roll" onClick={() => performSaveRoll(c.name, 'STR', c.strCur)}>
                            <span className="stat-label">Strength</span>
                            <div className="stat-value">{c.strCur}</div>
                            <div className="stat-edit-row" onClick={e => e.stopPropagation()}>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'strCur', Math.max(0, c.strCur - 1))}>-</button>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {c.strMax}</span>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'strCur', Math.min(c.strMax, c.strCur + 1))}>+</button>
                            </div>
                          </div>

                          {/* DEX Stat (Click to Roll Save) */}
                          <div className="stat-box stat-dex clickable-roll" onClick={() => performSaveRoll(c.name, 'DEX', c.dexCur)}>
                            <span className="stat-label">Dexterity</span>
                            <div className="stat-value">{c.dexCur}</div>
                            <div className="stat-edit-row" onClick={e => e.stopPropagation()}>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'dexCur', Math.max(0, c.dexCur - 1))}>-</button>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {c.dexMax}</span>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'dexCur', Math.min(c.dexMax, c.dexCur + 1))}>+</button>
                            </div>
                          </div>

                          {/* WIL Stat (Click to Roll Save) */}
                          <div className="stat-box stat-wil clickable-roll" onClick={() => performSaveRoll(c.name, 'WIL', c.wilCur)}>
                            <span className="stat-label">Willpower</span>
                            <div className="stat-value">{c.wilCur}</div>
                            <div className="stat-edit-row" onClick={e => e.stopPropagation()}>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'wilCur', Math.max(0, c.wilCur - 1))}>-</button>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {c.wilMax}</span>
                              <button className="stat-mini-btn" onClick={() => updateCharacterStat(c.id, 'wilCur', Math.min(c.wilMax, c.wilCur + 1))}>+</button>
                            </div>
                          </div>
                        </div>

                        {/* Special Trait or Notes */}
                        <div style={{ marginBottom: '14px', padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.01)', borderRadius: '4px', border: '1px solid var(--border-muted)' }}>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}>고유 특성/결손 효과</span>
                          <div style={{ fontSize: '12px', marginTop: '2px', color: '#e3e4e6' }}>{c.trait}</div>
                        </div>

                        {/* Interactive Inventory */}
                        <div className="inventory-section">
                          <div className="inv-header">
                            <span>인벤토리 소지 목록</span>
                            <span style={{ color: bulkyCount >= 3 ? 'var(--color-red)' : 'var(--text-muted)' }}>
                              부피 가중치: {bulkyCount}/2 B
                            </span>
                          </div>
                          
                          <div className="inv-list">
                            {c.inventory.map((item, idx) => {
                              // If it has damage notations e.g. (d6), we can extract it for rolling
                              const dmgMatch = item.name.match(/\((d[468102]+)/);
                              const damageDie = dmgMatch ? parseInt(dmgMatch[1].substring(1), 10) : null;
                              
                              return (
                                <div key={idx} className={`inv-item ${item.bulky ? 'bulky' : ''} ${item.isArcanum ? 'arcanum' : ''}`} title={item.desc || ""}>
                                  <span className="inv-item-name">
                                    {item.isArcanum ? <Sparkles size={11} /> : <Shield size={11} />}
                                    <span>{item.name}</span>
                                    {damageDie && (
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '2px 4px', fontSize: '9px', display: 'inline-flex', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          rollDice(damageDie, `${c.name}의 무기 피해 판정`);
                                        }}
                                      >
                                        피해(d{damageDie})
                                      </button>
                                    )}
                                  </span>
                                  <button 
                                    className="inv-delete-btn" 
                                    onClick={() => removeItemFromInventory(c.id, idx)}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Item form */}
                          <div className="inv-input-row" style={{ marginTop: '12px' }}>
                            <input 
                              type="text" 
                              id={`new-item-${c.id}`}
                              placeholder="새 장비명 입력..." 
                              className="text-input"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const inputEl = document.getElementById(`new-item-${c.id}`);
                                  const isBulky = document.getElementById(`bulky-chk-${c.id}`).checked;
                                  addItemToInventory(c.id, inputEl.value, isBulky);
                                  inputEl.value = "";
                                  document.getElementById(`bulky-chk-${c.id}`).checked = false;
                                }
                              }}
                            />
                            <label className="checkbox-label" style={{ padding: '0 6px' }}>
                              <input type="checkbox" id={`bulky-chk-${c.id}`} />
                              <span>부피(B)</span>
                            </label>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px' }}
                              onClick={() => {
                                const inputEl = document.getElementById(`new-item-${c.id}`);
                                const isBulky = document.getElementById(`bulky-chk-${c.id}`).checked;
                                addItemToInventory(c.id, inputEl.value, isBulky);
                                inputEl.value = "";
                                document.getElementById(`bulky-chk-${c.id}`).checked = false;
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: ORACLE & GENERATOR ==================== */}
        {activeTab === 'oracle' && (
          <div>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">지하 <span>오라클 & 탐사 발전기</span></h2>
                <div className="panel-desc">진행 도중 발생하는 불확실한 질문에 답을 얻거나, 미지의 공간 및 적을 무작위로 생성합니다.</div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Left Column: Oracle & Sparks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* OSR Yes/No Oracle */}
                <div className="card">
                  <h3 className="card-title">
                    <Dices size={16} style={{ color: 'var(--color-gold)' }} />
                    <span>D20 솔로 운명 판단 (Yes/No Oracle)</span>
                  </h3>
                  
                  {/* Tension Meter widget */}
                  <div className="tension-meter" style={{ marginBottom: '18px' }}>
                    <div className="tension-header">
                      <span>탐사 구역 긴장도 미터 (Tension)</span>
                      <span>수치: {tension} / 10</span>
                    </div>
                    <div className="tension-bar-container">
                      <div className="tension-bar" style={{ width: `${tension * 10}%` }}></div>
                    </div>
                    <div className="tension-btns">
                      <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => setTension(prev => Math.max(0, prev - 1))}>
                        긴장 완화 (-1)
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => setTension(prev => Math.min(10, prev + 1))}>
                        긴장 고조 (+1)
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '10px', marginLeft: 'auto' }} onClick={() => setTension(0)}>
                        초기화
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    일어나고자 하는 징후나 질문의 실현 가능성을 선택하고 주사위를 굴리십시오:
                  </p>

                  <div className="oracle-card-grid">
                    <button className="oracle-card" onClick={() => rollOracle('likely')}>
                      <div className="oracle-card-label" style={{ color: 'var(--color-green)' }}>그럴듯함 (Likely)</div>
                      <div className="oracle-card-chance">1-6은 예 / 7-20은 아니오</div>
                    </button>
                    <button className="oracle-card" onClick={() => rollOracle('odds')}>
                      <div className="oracle-card-label" style={{ color: 'var(--color-gold)' }}>반반임 (Even Odds)</div>
                      <div className="oracle-card-chance">1-10은 예 / 11-20은 아니오</div>
                    </button>
                    <button className="oracle-card" onClick={() => rollOracle('unlikely')}>
                      <div className="oracle-card-label" style={{ color: 'var(--color-red)' }}>희박함 (Unlikely)</div>
                      <div className="oracle-card-chance">1-15는 아니오 / 16-20은 예</div>
                    </button>
                  </div>

                  {oracleAnswer && (
                    <div className="rolled-result-box" style={{ marginTop: '20px', borderStyle: 'solid' }}>
                      <div className="stat-label">오라클 판정 결과</div>
                      <div style={{ fontSize: '15px', color: 'var(--text-bright)', fontWeight: '700', marginTop: '6px' }}>{oracleAnswer}</div>
                      
                      {complicationText && (
                        <div style={{ marginTop: '8px', color: 'var(--color-red)', fontSize: '12px', fontWeight: 'bold' }}>
                          {complicationText}
                        </div>
                      )}
                      
                      <button 
                        className="btn btn-secondary" 
                        style={{ marginTop: '12px', padding: '4px 8px', fontSize: '10px' }}
                        onClick={() => injectTextToJournal(`오라클 판정: ${oracleAnswer} ${complicationText ? ` / ${complicationText}` : ''}`)}
                      >
                        이 오라클 답변을 일지에 기록하기
                      </button>
                    </div>
                  )}
                </div>

                {/* Spark Generator */}
                <div className="card">
                  <h3 className="card-title">
                    <Sparkles size={16} style={{ color: 'var(--color-cyan)' }} />
                    <span>영감의 기묘한 영 단어 생성기 (Sparks)</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    상황의 은유나 추상적인 대답이 필요할 때 단어 조합 영감을 떠올리십시오:
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={generateSparks}>
                    영감 구절 롤링하기
                  </button>

                  {sparkAction && (
                    <div className="rolled-result-box" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="stat-label">영감 단어 조합 결과</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '16px', fontWeight: '700' }}>
                        <span style={{ color: 'var(--color-red)' }}>{sparkDescriptor}</span>
                        <span style={{ color: 'var(--color-cyan)' }}>{sparkSubject}</span>
                        <span style={{ color: 'var(--color-gold)' }}>{sparkAction}</span>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 6px', fontSize: '9px', marginTop: '6px' }}
                        onClick={() => injectTextToJournal(`영감의 단어: ${sparkDescriptor} ${sparkSubject} ${sparkAction}`)}
                      >
                        이 단어 조합을 일지에 기록하기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Environment & Being Generators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Room / Dungeon Details */}
                <div className="card">
                  <h3 className="card-title">
                    <BookOpen size={16} />
                    <span>지하 공간 즉석 지도기 (Room Generator)</span>
                  </h3>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={generateRandomRoomDetails}>
                    다음 방의 구조 롤링하기
                  </button>

                  {generatedRoom && (
                    <div className="gen-result-card">
                      <div className="gen-result-title">방의 기하학적 형상</div>
                      <p className="gen-result-text" style={{ marginBottom: '10px', color: 'var(--text-bright)' }}>{generatedRoom.layout}</p>
                      
                      <div className="gen-result-title">방 내부 내용물</div>
                      <p className="gen-result-text" style={{ marginBottom: '10px', color: '#e3e4e6' }}>{generatedRoom.content}</p>
                      
                      <div className="gen-result-title">숨겨진 위협/이상현상</div>
                      <p className="gen-result-text" style={{ color: 'var(--color-red)' }}>{generatedRoom.danger}</p>
                      
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', marginTop: '14px', padding: '4px 8px', fontSize: '10px' }}
                        onClick={() => injectTextToJournal(`공간 발견: ${generatedRoom.layout} / 내부: ${generatedRoom.content} / 위협: ${generatedRoom.danger}`)}
                      >
                        이 공간 데이터를 일지에 기록하기
                      </button>
                    </div>
                  )}
                </div>

                {/* Encounter Generator */}
                <div className="card">
                  <h3 className="card-title">
                    <Skull size={16} style={{ color: 'var(--color-red)' }} />
                    <span>기묘한 지하 괴물/변이체 조우기</span>
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <button 
                      className={`btn btn-secondary ${encounterRegion === 'bastion' ? 'btn-primary' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
                      onClick={() => setEncounterRegion('bastion')}
                    >
                      Bastion (바스티온) 지하
                    </button>
                    <button 
                      className={`btn btn-secondary ${encounterRegion === 'deep' ? 'btn-primary' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
                      onClick={() => setEncounterRegion('deep')}
                    >
                      Deep Country (디프 컨트리) 숲속
                    </button>
                    <button 
                      className={`btn btn-secondary ${encounterRegion === 'underworld' ? 'btn-primary' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
                      onClick={() => setEncounterRegion('underworld')}
                    >
                      Underworld (지하세계)의 밑바닥
                    </button>
                  </div>

                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={generateRandomEncounterDetails}>
                    기습적인 만남 발생!
                  </button>

                  {generatedEncounter && (
                    <div className="gen-result-card" style={{ borderColor: 'rgba(255, 51, 102, 0.4)' }}>
                      <div className="char-name-row">
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-red)' }}>{generatedEncounter.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '4px' }}>
                        능력 수치: {generatedEncounter.stats}
                      </div>
                      <p style={{ fontSize: '12px', color: '#c4c8cd', marginTop: '8px', lineHeight: '1.5' }}>
                        {generatedEncounter.desc}
                      </p>
                      
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', marginTop: '14px', padding: '4px 8px', fontSize: '10px' }}
                        onClick={() => injectTextToJournal(`전투/대치 돌입: ${generatedEncounter.name} (${generatedEncounter.stats}) - ${generatedEncounter.desc}`)}
                      >
                        이 대치 조우를 일지에 기록하기
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: JOURNAL ==================== */}
        {activeTab === 'journal' && (
          <div className="stark-book-page">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">탐험 <span>일지 보관소 (Journal)</span></h2>
                <div className="panel-desc">스토리 플롯과 전투 전개 상황을 마크다운 양식으로 낱낱이 상세히 기록합니다.</div>
              </div>
              <button className="btn btn-primary" onClick={createNewJournalEntry}>
                <Plus size={14} />
                <span>새 탐험 챕터 추가</span>
              </button>
            </div>

            <div className="journal-layout">
              {/* Sidebar list of entries */}
              <div className="journal-sidebar">
                {journalEntries.map(e => (
                  <div 
                    key={e.id} 
                    className={`entry-list-item ${e.id === selectedEntryId ? 'active' : ''}`}
                    onClick={() => setSelectedEntryId(e.id)}
                  >
                    <div className="entry-item-title">{e.title}</div>
                    <div className="entry-item-date">{e.date}</div>
                  </div>
                ))}
              </div>

              {/* Edit workspace area */}
              <div className="journal-editor">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="text-input" 
                    style={{ fontSize: '16px', fontWeight: '700', padding: '10px 14px' }}
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={saveCurrentJournalEntry}>
                    <Save size={14} />
                    <span>저장</span>
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteJournalEntry(selectedEntryId)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="textarea-journal"
                    placeholder="지하에서 벌어지는 참극과 탐험의 상세 서사 로그를 마크다운 양식으로 적어나가십시오..."
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                  />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '11px', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>
                    자동저장 완료됨 (임시) | 저장 버튼 필수
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-gold)', marginBottom: '8px' }}>일지 작성 팁</h4>
                  <ul style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-muted)', marginLeft: '18px' }}>
                    <li>주사위 굴림, 오라클 판정, 방의 형상 생성 결과 창의 <strong>"기록 버튼"</strong>을 클릭하면 이 일지 창 아래에 자동으로 포맷팅 덧붙이기가 수행됩니다.</li>
                    <li>모든 탐사 이력은 브라우저 localstorage에 정밀히 보관되며, 작업소 화면에서 언제든 통째로 추출(JSON)해 저장할 수 있습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: RULES REFERENCE ==================== */}
        {activeTab === 'rules' && (
          <div className="stark-book-page">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">지하 <span>탐사 수칙 & 아르카눔 백과</span></h2>
                <div className="panel-desc">Into the Odd Remastered의 핵심 규칙 번역본과 희귀 아르카눔 사전을 수시로 탐독하십시오.</div>
              </div>
            </div>

            <div className="rules-grid">
              {/* Reference index sidebar */}
              <div className="rules-sidebar">
                <ul className="rules-menu">
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-saves' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-saves')}
                  >
                    1. Save (구제 판정)
                  </li>
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-turns' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-turns')}
                  >
                    2. Turns & Actions (순서와 행동)
                  </li>
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-combat' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-combat')}
                  >
                    3. Combat & Damage (전투와 피해)
                  </li>
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-resting' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-resting')}
                  >
                    4. Rest & Ability Loss (휴식과 능력치 소실)
                  </li>
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-bulky' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-bulky')}
                  >
                    5. Bulky (무거운 짐 부피 규정)
                  </li>
                  <li 
                    className={`rules-menu-item ${activeRuleId === 'rules-arcana' ? 'active' : ''}`}
                    onClick={() => setActiveRuleId('rules-arcana')}
                  >
                    6. Arcana (희귀 아르카눔 백과사전)
                  </li>
                </ul>
              </div>

              {/* Reference Body content */}
              <div className="rules-content-body">
                
                {activeRuleId === 'rules-saves' && (
                  <div>
                    <h3>1. Save (구제 판정)</h3>
                    <p>Save (구제 판정)란 죽음의 위협, 함정, 괴물의 괴이한 특수 공격이나 정신을 어지럽히는 위험한 비술에서 대처하여 생존하기 위해 굴리는 저항 주사위 굴림입니다.</p>
                    <p><strong>판정 방법</strong>: 20면체 주사위(d20)를 굴립니다. 나온 주사위 값이 캐릭터의 <strong>해당 능력치 수치 이하</strong>라면 성공적으로 위기를 극복하거나 돌파한 것입니다.</p>
                    <ul>
                      <li><strong>d20 굴림 결과 1</strong>: <strong>Critical Success (대성공)</strong>으로 판정되며, 극도로 유리한 기회나 이점을 즉시 확보합니다.</li>
                      <li><strong>d20 굴림 결과 20</strong>: <strong>Critical Failure (대실패/재앙)</strong>로 판정되며, 판정은 무조건 실패하고 전례 없는 위기나 치명적인 Complication (추가 난관)을 직면합니다.</li>
                    </ul>
                    <div className="rules-sub-section">
                      <h4>능력치별 구제 판정 범주:</h4>
                      <ul>
                        <li><strong>Strength (근력 - STR Save)</strong>: 물리적인 위기 극복, 중독(Poison) 및 질병 저항, 육체적 방어, 무거운 충격 견디기, 기절 극복 등에 사용됩니다.</li>
                        <li><strong>Dexterity (민첩 - DEX Save)</strong>: 함정이나 떨어지는 바위 피하기, 반사 작용, 은밀한 침투, 추락 방지, 그리고 적의 기습(Surprise)에서 재빠르게 대처하기 위해 사용됩니다.</li>
                        <li><strong>Willpower (의지 - WIL Save)</strong>: 공포 극복, 신비로운 마법 효과나 초자연적 의식 극복, 타락한 비술 저항, 그리고 대원이나 몬스터 무리의 <strong>Morale (사기 판정)</strong>에 사용됩니다.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeRuleId === 'rules-turns' && (
                  <div>
                    <h3>2. Turns & Actions (순서와 행동)</h3>
                    <p>탐험 진행 중 조우나 충돌이 생겼을 때의 라운드 진행 규칙입니다.</p>
                    <p><strong>Turns (차례) 우선순위</strong>: 플레이어 대원들은 적들보다 <strong>항상 무조건 먼저 행동(Player Turn First)</strong>합니다! 복잡한 우선권(Initiative) 굴림은 필요하지 않습니다.</p>
                    <ul>
                      <li><strong>Surprise (기습)</strong>: 만약 몬스터가 교묘하게 매복했거나 플레이어 그룹이 예상치 못한 기습을 당했을 경우, 플레이어 전원은 즉시 <strong>DEX Save (민첩 구제 판정)</strong>를 굴려야 합니다. 이 판정에 실패한 대원은 첫 번째 라운드(Turn) 동안 일절 행동(Actions)이나 이동을 취할 수 없습니다.</li>
                    </ul>
                    <p><strong>대원의 Actions (행동)</strong>: 자기 차례에 각 대원은 합리적인 거리를 1회 <strong>이동(Move)</strong>할 수 있으며, 1회의 <strong>주요 행동(Action)</strong>을 개진할 수 있습니다. 행동에는 무기 공격, Arcanum (아르카눔) 유물 활성화, 동료 구급 치료, 주변 탐색 등이 포함됩니다.</p>
                    <p><strong>기교적 행동 (Trips, Shoves & Grapples)</strong>: 적을 자빠뜨리거나, 뒤로 밀치거나, 무기를 쳐내는 등의 창의적이고 전술적인 조작은 공격 명중을 굴릴 필요 없이 심판(Referee/오라클)의 중재 하에 대상 적에게 적합한 구제 판정(예: 밀치기의 경우 <strong>STR Save</strong>)을 요구하여 대상이 실패하면 즉시 성공합니다.</p>
                    <p><strong>Retainers & Companions (동행인과 고용인)</strong>: 플레이어가 고용한 추종자, Mutt (똥개)와 같은 길들인 동물, 용병들은 플레이어의 차례에 동시에 행동을 수행합니다.</p>
                  </div>
                )}

                {activeRuleId === 'rules-combat' && (
                  <div>
                    <h3>3. Combat & Damage (전투와 피해)</h3>
                    <p>Into the Odd에서는 공격의 성공 여부를 결정하는 명중 판정이 존재하지 않습니다. <strong>모든 공격은 항상 자동으로 명중합니다!</strong></p>
                    <p><strong>전투 연산</strong>: 공격자는 자신의 무기가 가진 피해 주사위(d6, d8 등)를 굴린 뒤, 피격 대상의 <strong>Armour (장갑 수치)</strong>를 뺍니다. 남은 피해량만큼 피격자의 <strong>Hit Protection (HP)</strong>를 차감합니다.</p>
                    <ul>
                      <li><strong>Armour Limit (장갑의 한계)</strong>: 캐릭터가 장비나 비술을 통해 확보할 수 있는 최대 장갑 수치는 <strong>Armour 3</strong>으로 고정됩니다.</li>
                      <li><strong>Unarmed Combat (맨손 전투)</strong>: 무기 없이 주먹이나 발길질로 공격하는 경우, 공격은 항상 <strong>Impaired (약화됨)</strong> 상태로 처리되어 무조건 <strong>d4 Damage (피해)</strong>만 가합니다.</li>
                      <li><strong>Dual Wielding (쌍수 무기)</strong>: 만약 캐릭터가 양손에 각각 하나씩 무기를 장착하고 동시 공격하는 경우, <strong>두 무기의 피해 주사위를 동시에 굴린 후 더 높은 결과값 하나만 선택</strong>해 피해를 줍니다. (피해를 중첩해서 더하지 않습니다.)</li>
                    </ul>
                    <div className="rules-sub-section">
                      <h4>특수 전투 상태:</h4>
                      <ul>
                        <li><strong>Impaired (약화됨)</strong>: 어둠 속에서 난사하거나 엄폐물 뒤의 적을 공격할 때, 혹은 불리한 위치에서 타격할 때 발동합니다. 무기에 관계없이 무조건 <strong>d4 Damage (피해)</strong>로 강제 감소합니다.</li>
                        <li><strong>Enhanced (강화됨)</strong>: 적이 무방비하게 넘어졌거나 무력화된 최적의 상황에서의 타격입니다. 무기에 관계없이 무조건 <strong>d12 Damage (피해)</strong>를 굴립니다.</li>
                        <li><strong>Blast (범위공격)</strong>: 수류탄, 화염 방사, 산성 가스 등 광역 타격 무기입니다. 효과 영역 안의 모든 생명체에게 각각 피해 주사위를 굴려 장갑을 적용해 피해를 줍니다. 만약 여러 범위공격이 한 영역에 동시에 중첩되면, 가장 높은 피해 결과물 하나만 보존됩니다.</li>
                      </ul>
                    </div>
                    <p><strong>Critical Damage (치명적인 상처)</strong>: 피해가 들어와 캐릭터의 HP가 0으로 하락하면, 초과된 나머지 피해량은 캐릭터의 <strong>STR (근력) 능력치 수치</strong>에서 즉시 직접 차감됩니다. 이 순간 대상자는 무조건 <strong>STR Save (근력 구제 판정)</strong>를 진행하여 실패하면 <strong>Critical Damage (치명적인 상처)</strong> 상태에 빠집니다. 치료 처치인 <strong>Short Rest (단기 휴식)</strong>를 받기 전까지는 일절 활동이 불가능하며, 1시간 동안 방치되면 죽습니다.</p>
                    <p><strong>Morale (사기 판정)</strong>: 적 무리의 우두머리가 쓰러지거나 무리 인원의 절반이 처단당했을 때, 남은 적들은 전의를 잃고 도망치거나 항복할 위험이 생깁니다. 적들의 리더는 자신의 <strong>WIL Save (의지 구제 판정)</strong>를 굴려야 하며, 이에 실패할 경우 적 그룹 전체가 사기를 잃고 도망가거나 무기를 버리고 즉각 투항합니다.</p>
                  </div>
                )}

                {activeRuleId === 'rules-resting' && (
                  <div>
                    <h3>4. Rest & Ability Loss (휴식과 능력치 소실)</h3>
                    <p>심연의 전투 속에서 소모된 체력을 회복하거나 소실된 능력치를 원상 복구하는 법칙입니다.</p>
                    <ul>
                      <li><strong>Ability Score Loss (능력치 소실 결과)</strong>:
                        <ul>
                          <li><strong>STR (근력) 수치가 0이 되는 경우</strong>: 캐릭터는 영양실조, 신체 파괴 등으로 즉시 <strong>사망(Instant Death)</strong>합니다.</li>
                          <li><strong>DEX (민첩) 수치가 0이 되는 경우</strong>: 전신이 마비되거나 굳어지는 <strong>paralysed (마비 기절)</strong> 상태가 됩니다.</li>
                          <li><strong>WIL (의지) 수치가 0이 되는 경우</strong>: 정신력이 붕괴하거나 미쳐버리는 <strong>broken (정신 붕괴)</strong> 상태가 됩니다.</li>
                        </ul>
                        DEX나 WIL이 0이 된 경우, 안전지대 요양인 <strong>Full Rest (장기 요양)</strong>를 거치기 전까진 결코 스스로 정신을 차리지 못합니다.
                      </li>
                      <li><strong>Short Rest (단기 휴식)</strong>: 위험이 없는 구역에서 몇 분 동안 가쁜 숨을 가다듬고 물 한 모금을 마시는 짧은 휴식입니다. **잃어버린 Hit Protection (HP)이 즉시 최대치로 완전히 재충전**됩니다. 또한, Critical Damage (치명적인 상처)를 입은 동료에게 응급처치(First Aid)를 베풀어 이 상태를 즉각 정상 환원시켜 줍니다.</li>
                      <li><strong>Full Rest (장기 요양)</strong>: Bastion (바스티온)의 안락한 요양원이나 안전한 길드 본부 가옥에서 아무 일도 하지 않고 1주일(Seven Days) 동안 푹 쉬며 요양하는 것만 뜻합니다. **소실된 모든 능력치(STR, DEX, WIL)의 손실분이 본래의 최대치 수치로 완벽하게 복구**됩니다.</li>
                    </ul>
                    <div className="rules-sub-section" style={{ borderColor: 'var(--color-red)' }}>
                      <h4 style={{ color: 'var(--color-red)' }}>⚠️ Deprived (결핍 상태)</h4>
                      <p>식량, 식수, 온기, 수면 등 생존에 필수적인 요소를 하루(24시간) 이상 제공받지 못하면, 캐릭터는 **Deprived (결핍 상태)**에 돌입합니다.</p>
                      <ul>
                        <li><strong>휴식 불가</strong>: Deprived (결핍 상태)의 캐릭터는 어떠한 <strong>Short Rest (단기 휴식)</strong>나 <strong>Full Rest (장기 요양)</strong>를 취하더라도 <strong>단 1의 HP나 능력치도 회복할 수 없습니다!</strong></li>
                        <li><strong>약화 지속</strong>: 결핍이 해결될 때까지 모든 행동과 공격 상태가 지속적으로 <strong>Impaired (약화됨)</strong> 처리됩니다. 극심한 아사 위기에 봉착하는 등 심각한 결핍이 계속되면 심판의 중재 하에 매일 또는 시간당 <strong>d6의 직접 피해</strong>를 누적해 받게 됩니다.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeRuleId === 'rules-bulky' && (
                  <div>
                    <h3>5. Bulky (무거운 짐 부피 규정)</h3>
                    <p>Into the Odd는 미세한 무게(파운드/kg) 단위의 복잡한 계산을 배제하고 단순하지만 매우 치명적인 슬롯 부피 제한 규정을 채택합니다.</p>
                    <p>장비 목록 중 이름 오른쪽에 <strong>B (Bulky)</strong> 표시가 명시된 도구(양손 무기, 대형 머스킷, 거대한 철갑옷, 커다란 자루 등)들은 양손으로 들어야 하거나 상당한 체격 슬롯을 차치하는 짐입니다.</p>
                    <ul>
                      <li><strong>휴대 한계</strong>: 한 명의 캐릭터가 안전하게 몸에 지닐 수 있는 Bulky (무거운 짐) 등급의 아이템은 **최대 2개**뿐입니다.</li>
                      <li><strong>Shield (방패) 규정</strong>: 방패는 장착 시 **Armour +1**을 제공하지만, 그 부피로 인해 이름 오른쪽에 **B** 표시가 붙는 **Bulky (무거운 짐)** 장비로 취급됩니다.</li>
                    </ul>
                    <div className="warning-box" style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid var(--color-red)', padding: '12px', marginTop: '16px' }}>
                      <p style={{ color: 'var(--color-red)', fontWeight: 'bold', margin: 0 }}>
                        ⚠️ 중량 과다 조항: 만약 캐릭터의 인벤토리에 Bulky (무거운 짐) 태그가 지정된 아이템이 3개 이상 휴대되는 즉시, 캐릭터는 그 막중한 무게로 인해 뼈가 바스러지고 탈진하여 해당 캐릭터의 Hit Protection (HP)이 즉시 강제적·영구적으로 0이 됩니다!
                      </p>
                    </div>
                  </div>
                )}

                {activeRuleId === 'rules-arcana' && (
                  <div className="arcanum-search-container">
                    <h3>6. Arcana (희귀 아르카눔 백과사전)</h3>
                    <p>Underworld (지하세계)나 Bastion (바스티온) 기계탑 꼭대기에서 회수되는 정체불명의 불가사의한 마법 유물 사전입니다.</p>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dark)' }} />
                        <input 
                          type="text" 
                          placeholder="아르카눔 이름 검색..." 
                          className="text-input"
                          style={{ paddingLeft: '32px' }}
                          value={arcanumSearch}
                          onChange={(e) => setArcanumSearch(e.target.value)}
                        />
                      </div>
                      {arcanumSearch && (
                        <button className="btn btn-secondary" onClick={() => setArcanumSearch("")}>초기화</button>
                      )}
                    </div>

                    <div className="arcanum-dict-grid">
                      {/* 1. Standard D66 Arcana */}
                      {Object.entries(STANDARD_ARCANA)
                        .filter(([code, arc]) => arc.name.toLowerCase().includes(arcanumSearch.toLowerCase()) || arc.desc.toLowerCase().includes(arcanumSearch.toLowerCase()))
                        .map(([code, arc]) => (
                          <div key={`std-${code}`} className="arcanum-card">
                            <div className="arcanum-card-header">
                              <span>일반 유물 (d66: {code})</span>
                              <span>{arc.name}</span>
                            </div>
                            <p className="arcanum-card-desc">{arc.desc}</p>
                          </div>
                        ))
                      }

                      {/* 2. Greater Arcana */}
                      {GREATER_ARCANA
                        .filter(arc => arc.name.toLowerCase().includes(arcanumSearch.toLowerCase()) || arc.desc.toLowerCase().includes(arcanumSearch.toLowerCase()))
                        .map((arc, i) => (
                          <div key={`gt-${i}`} className="arcanum-card" style={{ borderColor: 'var(--color-purple)' }}>
                            <div className="arcanum-card-header" style={{ color: 'var(--color-purple)' }}>
                              <span>대 아르카눔</span>
                              <span>{arc.name}</span>
                            </div>
                            <p className="arcanum-card-desc">{arc.desc}</p>
                          </div>
                        ))
                      }

                      {/* 3. Legendary Arcana */}
                      {LEGENDARY_ARCANA
                        .filter(arc => arc.name.toLowerCase().includes(arcanumSearch.toLowerCase()) || arc.desc.toLowerCase().includes(arcanumSearch.toLowerCase()))
                        .map((arc, i) => (
                          <div key={`lg-${i}`} className="arcanum-card" style={{ borderColor: 'var(--color-gold)' }}>
                            <div className="arcanum-card-header" style={{ color: 'var(--color-gold)' }}>
                              <span>전설의 유물</span>
                              <span>{arc.name}</span>
                            </div>
                            <p className="arcanum-card-desc">{arc.desc}</p>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
