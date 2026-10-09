const $ = (id) => document.getElementById(id);

const traitDefinitions = [
  { key: "intelligence", label: "الذكاء", emoji: "🧠" },
  { key: "humor", label: "الفكاهة", emoji: "😄" },
  { key: "ambition", label: "الطموح", emoji: "🎯" },
  { key: "kindness", label: "اللطف والحنان", emoji: "💗" },
  { key: "loyalty", label: "الوفاء", emoji: "🛡️" },
  { key: "calm", label: "الهدوء", emoji: "🍃" }
];

const defaults = {
  intelligence: 4, humor: 4, ambition: 4,
  kindness: 5, loyalty: 5, calm: 3
};

const colorMap = {
  pink: "#f4a7ca", purple: "#a99af5", green: "#91d7bc",
  blue: "#8cc9f2", black: "#494257"
};
const skinMap = {
  light: "#f5d0b5", medium: "#d99c72", deep: "#89553d", fantasy: "#d9c9ff"
};
const genderEmoji = { girl: "👩🏻‍🎤", boy: "👨🏻‍🎤", any: "🧑🏻‍🎤" };
const hairEmoji = { waves: "〰️", curly: "➰", short: "✂️" };

function makeCharacter() {
  return {
    nickname: "", gender: "girl", hair: "waves", skin: "light",
    eyes: "brown", clothes: "pink", accessory: "✨", traits: { ...defaults }
  };
}

let owner = makeCharacter();
let friend = makeCharacter();
let incomingChallenge = null;
let lastResultText = "";

function showScreen(screenId) {
  ["homeScreen", "builderScreen", "shareScreen", "friendScreen", "resultScreen"]
    .forEach(id => $(id).classList.toggle("hidden", id !== screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

function avatarFace(character) {
  return genderEmoji[character.gender] || genderEmoji.any;
}

function renderAvatar(elementId, character) {
  const avatar = $(elementId);
  if (!avatar) return;
  const face = avatar.querySelector("span");
  const accessory = avatar.querySelector("i");
  face.textContent = avatarFace(character);
  accessory.textContent = character.accessory === "none" ? "" : character.accessory;
  avatar.style.background = `linear-gradient(145deg, ${skinMap[character.skin]}, ${colorMap[character.clothes]})`;
  avatar.style.borderColor = "#fff";
  avatar.setAttribute("aria-label", "معاينة كرتونية للشخصية");
}

function updateOwnerPreview() {
  renderAvatar("ownerAvatar", owner);
  $("avatarCaption").textContent = owner.nickname || "شخصيتك المثالية";
}

function updateFriendPreview() {
  renderAvatar("friendAvatar", friend);
}

function bindChoices(containerId, selector, onSelect) {
  const container = $(containerId);
  container.querySelectorAll(selector).forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(selector).forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      onSelect(button.dataset.value, button);
    });
  });
}

function buildTraits(containerId, character) {
  const container = $(containerId);
  container.innerHTML = "";
  traitDefinitions.forEach(trait => {
    const wrapper = document.createElement("div");
    wrapper.className = "trait";
    wrapper.innerHTML = `
      <div class="trait-head">
        <span>${trait.emoji} ${trait.label}</span>
        <span id="${containerId}-${trait.key}-value">${character.traits[trait.key]}</span>
      </div>
      <input type="range" min="1" max="5" step="1"
        value="${character.traits[trait.key]}" aria-label="${trait.label}">
    `;
    const range = wrapper.querySelector("input");
    range.addEventListener("input", () => {
      character.traits[trait.key] = Number(range.value);
      $(`${containerId}-${trait.key}-value`).textContent = range.value;
    });
    container.appendChild(wrapper);
  });
}

function setInitialChoice(containerId, value) {
  const container = $(containerId);
  container.querySelectorAll("[data-value]").forEach(button => {
    button.classList.toggle("selected", button.dataset.value === value);
  });
}

function bindOwnerControls() {
  bindChoices("ownerGenderChoices", "button", value => {
    owner.gender = value; updateOwnerPreview();
  });
  bindChoices("ownerHairChoices", "button", value => {
    owner.hair = value; updateOwnerPreview();
  });
  bindChoices("ownerSkinChoices", "button", value => {
    owner.skin = value; updateOwnerPreview();
  });
  bindChoices("ownerClothesChoices", "button", value => {
    owner.clothes = value; updateOwnerPreview();
  });
  bindChoices("ownerAccessoryChoices", "button", value => {
    owner.accessory = value; updateOwnerPreview();
  });
  $("ownerEyes").addEventListener("change", event => { owner.eyes = event.target.value; });
  $("ownerNickname").addEventListener("input", event => {
    owner.nickname = event.target.value.slice(0, 24);
    $("avatarCaption").textContent = owner.nickname || "شخصيتك المثالية";
  });
  buildTraits("ownerTraits", owner);
}

function resetOwnerForm() {
  owner = makeCharacter();
  $("ownerNickname").value = "";
  $("ownerEyes").value = "brown";
  setInitialChoice("ownerGenderChoices", owner.gender);
  setInitialChoice("ownerHairChoices", owner.hair);
  setInitialChoice("ownerSkinChoices", owner.skin);
  setInitialChoice("ownerClothesChoices", owner.clothes);
  setInitialChoice("ownerAccessoryChoices", owner.accessory);
  buildTraits("ownerTraits", owner);
  updateOwnerPreview();
}

function encodeCharacter(character) {
  const bytes = new TextEncoder().encode(JSON.stringify(character));
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeCharacter(value) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !parsed.traits || !["girl", "boy", "any"].includes(parsed.gender)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function makeChallengeUrl(character) {
  const url = new URL(window.location.href);
  url.hash = "challenge=" + encodeCharacter(character);
  return url.href;
}

function readChallengeFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#challenge=")) return null;
  return decodeCharacter(hash.slice("#challenge=".length));
}

function setupFriendForm() {
  friend = makeCharacter();
  if (incomingChallenge && ["girl", "boy", "any"].includes(incomingChallenge.gender)) {
    friend.gender = incomingChallenge.gender;
  }
  $("friendNickname").value = "";
  $("friendEyes").value = "brown";
  setInitialChoice("friendGenderChoices", friend.gender);
  setInitialChoice("friendHairChoices", friend.hair);
  setInitialChoice("friendSkinChoices", friend.skin);
  setInitialChoice("friendClothesChoices", friend.clothes);
  setInitialChoice("friendAccessoryChoices", friend.accessory);

  bindChoices("friendGenderChoices", "button", value => {
    friend.gender = value; updateFriendPreview();
  });
  bindChoices("friendHairChoices", "button", value => {
    friend.hair = value; updateFriendPreview();
  });
  bindChoices("friendSkinChoices", "button", value => {
    friend.skin = value; updateFriendPreview();
  });
  bindChoices("friendClothesChoices", "button", value => {
    friend.clothes = value; updateFriendPreview();
  });
  bindChoices("friendAccessoryChoices", "button", value => {
    friend.accessory = value; updateFriendPreview();
  });
  $("friendEyes").onchange = event => { friend.eyes = event.target.value; };
  buildTraits("friendTraits", friend);
  updateFriendPreview();
  $("friendHeading").textContent = incomingChallenge.nickname
    ? `صمّم شخصية تناسب ${incomingChallenge.nickname}`
    : "صمّم شخصية تناسب صديقك";
}

function calculateResult(original, guess) {
  const appearanceKeys = ["gender", "hair", "skin", "eyes", "clothes", "accessory"];
  let appearanceMatches = 0;
  appearanceKeys.forEach(key => {
    if (original[key] === guess[key]) appearanceMatches++;
  });
  const appearanceScore = Math.round(appearanceMatches / appearanceKeys.length * 100);

  const maxDifference = traitDefinitions.length * 4;
  let difference = 0;
  const closeTraits = [];
  traitDefinitions.forEach(trait => {
    const delta = Math.abs(Number(original.traits[trait.key]) - Number(guess.traits[trait.key]));
    difference += delta;
    if (delta <= 1) closeTraits.push(trait.label);
  });
  const traitScore = Math.round((1 - difference / maxDifference) * 100);
  const total = Math.round(appearanceScore * 0.4 + traitScore * 0.6);
  return { total, appearanceScore, traitScore, closeTraits };
}

function showResult() {
  if (!incomingChallenge) {
    toast("لم نعثر على بيانات التحدي في الرابط.");
    return;
  }
  friend.nickname = $("friendNickname").value.trim();
  friend.eyes = $("friendEyes").value;
  const result = calculateResult(incomingChallenge, friend);
  renderAvatar("resultOwnerAvatar", incomingChallenge);
  renderAvatar("resultFriendAvatar", friend);
  $("scoreValue").textContent = `${result.total}%`;

  const list = $("matchDetails");
  list.innerHTML = "";
  [
    `تشابه المظهر: ${result.appearanceScore}%`,
    `تشابه الصفات: ${result.traitScore}%`,
    result.closeTraits.length
      ? `صفات متقاربة: ${result.closeTraits.join("، ")}`
      : "تختلف اختياراتكما في عدة صفات — وهذا جزء من المتعة!"
  ].forEach(text => {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  });

  let message;
  if (result.total >= 80) message = "واو! يبدو أنك فهمت ذوق صديقك جيدًا ✨";
  else if (result.total >= 60) message = "هناك تقارب جميل بين اختياراتكما 💗";
  else if (result.total >= 40) message = "توجد بعض الاختلافات اللطيفة — ناقشا اختياراتكما! 👀";
  else message = "مفاجأة! لكل منكما تصور مختلف، وهذا يجعل التحدي ممتعًا 😄";
  $("resultMessage").textContent = message;
  lastResultText = `DREAMDUO 💗\nنسبة التشابه: ${result.total}%\nالمظهر: ${result.appearanceScore}%\nالصفات: ${result.traitScore}%\n${message}\nالنتيجة ترفيهية فقط.`;
  showScreen("resultScreen");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("تم النسخ بنجاح ✨");
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    if (ok) toast("تم النسخ بنجاح ✨");
    else window.prompt("انسخي النص يدويًا:", text);
  }
}

$("startButton").addEventListener("click", () => {
  showScreen("builderScreen");
  $("stepProgress").style.width = "100%";
});
$("cancelBuilder").addEventListener("click", () => showScreen("homeScreen"));
$("brandHome").addEventListener("click", event => {
  event.preventDefault();
  showScreen("homeScreen");
});
$("createChallenge").addEventListener("click", () => {
  owner.nickname = $("ownerNickname").value.trim();
  owner.eyes = $("ownerEyes").value;
  renderAvatar("savedAvatar", owner);
  $("challengeLink").value = makeChallengeUrl(owner);
  showScreen("shareScreen");
});
$("copyChallengeLink").addEventListener("click", () => copyText($("challengeLink").value));
$("previewChallenge").addEventListener("click", () => {
  incomingChallenge = owner;
  setupFriendForm();
  showScreen("friendScreen");
});
$("makeAnother").addEventListener("click", () => {
  resetOwnerForm();
  showScreen("builderScreen");
});
$("revealResult").addEventListener("click", showResult);
$("copyResult").addEventListener("click", () => copyText(lastResultText));
$("backHome").addEventListener("click", () => {
  history.replaceState(null, "", window.location.pathname + window.location.search);
  incomingChallenge = null;
  showScreen("homeScreen");
});

bindOwnerControls();
updateOwnerPreview();
const sharedChallenge = readChallengeFromUrl();
if (sharedChallenge) {
  incomingChallenge = sharedChallenge;
  setupFriendForm();
  showScreen("friendScreen");
} else {
  showScreen("homeScreen");
}
