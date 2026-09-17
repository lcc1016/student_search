// ⚠️ 請將此處替換為您的 Google Apps Script Web App 部署網址
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwdqKRQM2Y74-pnYuwKbAIgoXfR95t2fWJaAH3AfTuVsFiKgPSCWK7s7Y9B3XfCdUjtuQ/exec";

let allOptions = [];
let timer = null;

window.onload = function() {
  const searchTypeEl = document.getElementById("searchType");
  const keywordInputEl = document.getElementById("keywordInput");

  // 綁定事件監聽器
  searchTypeEl.addEventListener("change", onTypeChange);
  keywordInputEl.addEventListener("input", onInputKeyword);
  keywordInputEl.addEventListener("focus", showDropdown);

  onTypeChange();

  document.addEventListener("click", function(e) {
    const input = document.getElementById("keywordInput");
    const panel = document.getElementById("dropdownPanel");
    if (e.target !== input && e.target !== panel) {
      panel.style.display = "none";
    }
  });
};

function onTypeChange() {
  const type = document.getElementById("searchType").value;
  document.getElementById("headerTitle").innerText = "- " + type + "查找";
  document.getElementById("inputLabel").innerText = "2. 請輸入/選擇" + type + "：";
  
  const input = document.getElementById("keywordInput");
  input.value = "";
  input.disabled = true;
  input.placeholder = "載入選項中，請稍候...";

  document.getElementById("dropdownPanel").style.display = "none";
  document.getElementById("resultContent").style.display = "none";
  document.getElementById("message").innerText = "";

  // 改用 fetch API 呼叫 GAS 後端取得清單
  const apiUrl = `${GAS_WEB_APP_URL}?action=getOptions&searchType=${encodeURIComponent(type)}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(options => {
      allOptions = options || [];
      input.disabled = false;
      input.placeholder = "輸入關鍵字過濾，或直接點選...";
      renderDropdown(allOptions);
    })
    .catch(err => {
      console.error("載入選項失敗：", err);
      input.placeholder = "載入選項失敗，請重新存取或檢查 API 設定";
    });
}

function renderDropdown(list) {
  const panel = document.getElementById("dropdownPanel");
  panel.innerHTML = "";

  if (list.length === 0) {
    panel.style.display = "none";
    return;
  }

  list.slice(0, 200).forEach(function(item) {
    let div = document.createElement("div");
    div.className = "dropdown-item";
    div.innerText = item;
    div.onclick = function() {
      document.getElementById("keywordInput").value = item;
      panel.style.display = "none";
      executeSearch(item);
    };
    panel.appendChild(div);
  });
}

function showDropdown() {
  if (allOptions.length > 0) {
    onInputKeyword();
  }
}

function onInputKeyword() {
  clearTimeout(timer);
  const val = document.getElementById("keywordInput").value.trim();
  const panel = document.getElementById("dropdownPanel");

  const filtered = allOptions.filter(opt => opt.toLowerCase().includes(val.toLowerCase()));
  renderDropdown(filtered);
  panel.style.display = filtered.length > 0 ? "block" : "none";

  if (val !== "") {
    timer = setTimeout(function() {
      executeSearch(val);
    }, 400);
  } else {
    document.getElementById("resultContent").style.display = "none";
    document.getElementById("message").innerText = "";
  }
}

function executeSearch(keyword) {
  const type = document.getElementById("searchType").value;
  const loading = document.getElementById("loading");
  const message = document.getElementById("message");
  const resultContent = document.getElementById("resultContent");
  const tbody = document.getElementById("resultBody");
  const avatarBox = document.getElementById("avatarBox");

  loading.style.display = "block";
  message.innerText = "";

  // 改用 fetch API 進行單筆資料查詢
 const GAS_WEB_APP_URL = "https://script.google.com/a/macros/mihjh.cyc.edu.tw/s/AKfycbwdqKRQM2Y74-pnYuwKbAIgoXfR95t2fWJaAH3AfTuVsFiKgPSCWK7s7Y9B3XfCdUjtuQ/exec";

  fetch(apiUrl)
    .then(response => response.json())
    .then(res => {
      loading.style.display = "none";
      if (res.success) {
        if (res.photoUrl) {
          avatarBox.innerHTML = `<img src="${res.photoUrl}" class="avatar-img" alt="學生照片" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'no-avatar\\'>照片載入失敗</div>';">`;
        } else {
          avatarBox.innerHTML = `<div class="no-avatar">暫無照片</div>`;
        }

        tbody.innerHTML = "";
        res.data.forEach(function(item) {
          let tr = document.createElement("tr");
          tr.innerHTML = `<th>${item.label}</th><td>${item.value}</td>`;
          tbody.appendChild(tr);
        });
        
        resultContent.style.display = "block";
      } else {
        resultContent.style.display = "none";
        if (!allOptions.includes(keyword)) {
          message.innerText = "請繼續輸入或從下拉選單中選擇...";
        } else {
          message.innerText = res.message;
        }
      }
    })
    .catch(err => {
      console.error("查詢失敗：", err);
      loading.style.display = "none";
      message.innerText = "連線失敗，請稍後再試。";
    });
}