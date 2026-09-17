// 1. 設定試算表 ID（取自 Google 試算表網址中 /d/ 與 /edit 之間的字串）
const SPREADSHEET_ID = "1Nv3rZZCV3X3y3t_54BmAatYBlUaJwM7te2YZFA3KNc0";

// 頁籤名稱對照表
const SHEET_NAMES = {
  "學號": "學生資料_學號",
  "班號": "學生資料_班號",
  "姓名": "學生資料_姓名"
};

let rawSheetData = []; // 儲存目前頁籤的原始表格資料 [ [headers...], [row1...], [row2...] ]
let allOptions = [];   // 下拉選單關鍵字清單
let timer = null;

window.onload = function() {
  const searchTypeEl = document.getElementById("searchType");
  const keywordInputEl = document.getElementById("keywordInput");

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

// 切換查詢類別時，直接發送 GViz 請求抓取該頁籤資料
async function onTypeChange() {
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

  const sheetName = SHEET_NAMES[type] || "學生資料_學號";

  try {
    // 讀取該分頁的完整表格資料
    rawSheetData = await fetchSheetData(sheetName);
    
    // 第一欄為選單關鍵字（跳過第0列表頭）
    allOptions = rawSheetData.slice(1)
      .map(row => (row[0] !== null && row[0] !== undefined) ? String(row[0]).trim() : "")
      .filter(val => val !== "");

    input.disabled = false;
    input.placeholder = "輸入關鍵字過濾，或直接點選...";
    renderDropdown(allOptions);
  } catch (err) {
    console.error("讀取 Google 試算表失敗：", err);
    input.placeholder = "載入資料失敗，請確認試算表分享權限為「知道連結者可檢視」";
  }
}

// 核心功能：使用 Google GViz API 取得 JSON 格式資料
function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  
  return fetch(url)
    .then(res => res.text())
    .then(text => {
      // 移除 Google GViz 回傳的外包裝字串：/*O_o*/ google.visualization.Query.setResponse({...});
      const jsonString = text.replace(/^[^\({]*\(/, "").replace(/\);?\s*$/, "");
      const data = JSON.parse(jsonString);
      
      const rows = data.table.rows;
      const cols = data.table.cols;

      // 1. 解析表頭名稱
      const headers = cols.map(col => col.label || "");

      // 2. 解析每一列內容
      const parsedRows = rows.map(r => {
        return r.c.map(cell => cell ? (cell.v !== null ? cell.v : "") : "");
      });

      return [headers, ...parsedRows];
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
    }, 300);
  } else {
    document.getElementById("resultContent").style.display = "none";
    document.getElementById("message").innerText = "";
  }
}

// 執行本地端資料搜尋
async function executeSearch(keyword) {
  const type = document.getElementById("searchType").value;
  const loading = document.getElementById("loading");
  const message = document.getElementById("message");
  const resultContent = document.getElementById("resultContent");
  const tbody = document.getElementById("resultBody");
  const avatarBox = document.getElementById("avatarBox");

  loading.style.display = "block";
  message.innerText = "";

  if (!rawSheetData || rawSheetData.length < 2) {
    loading.style.display = "none";
    message.innerText = "資料庫無資料";
    return;
  }

  const headers = rawSheetData[0];
  const rows = rawSheetData.slice(1);
  const cleanKeyword = String(keyword).trim().toLowerCase();

  // 尋找匹配的列
  const matchedRow = rows.find(r => String(r[0]).trim().toLowerCase() === cleanKeyword);

  if (!matchedRow) {
    loading.style.display = "none";
    resultContent.style.display = "none";
    if (!allOptions.includes(keyword)) {
      message.innerText = "請繼續輸入或從下拉選單中選擇...";
    } else {
      message.innerText = `查無此 ${type} 的學生資料：${keyword}`;
    }
    return;
  }

  // 組合學生詳細資料
  let studentDetails = [];
  let studentId = "";

  headers.forEach((label, idx) => {
    let val = matchedRow[idx];
    let labelName = String(label).trim();

    if (labelName === "學號") {
      studentId = String(val).trim();
    }

    studentDetails.push({
      label: labelName,
      value: (val !== "" && val !== null && val !== undefined) ? val : "—"
    });
  });

  // 抓取 PIC 工作表中的照片
  let photoUrl = "";
  try {
    const picData = await fetchSheetData("PIC");
    const picRows = picData.slice(1);
    const picMatched = picRows.find(r => String(r[0]).trim() === studentId);
    if (picMatched && picMatched[3]) {
      photoUrl = convertDriveUrl(String(picMatched[3]).trim());
    }
  } catch (e) {
    console.warn("無法取得照片資料表 (PIC)", e);
  }

  // 渲染畫面
  loading.style.display = "none";
  if (photoUrl) {
    avatarBox.innerHTML = `<img src="${photoUrl}" class="avatar-img" alt="學生照片" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'no-avatar\\'>照片載入失敗</div>';">`;
  } else {
    avatarBox.innerHTML = `<div class="no-avatar">暫無照片</div>`;
  }

  tbody.innerHTML = "";
  studentDetails.forEach(function(item) {
    let tr = document.createElement("tr");
    tr.innerHTML = `<th>${item.label}</th><td>${item.value}</td>`;
    tbody.appendChild(tr);
  });

  resultContent.style.display = "block";
}

// 輔助函式：轉換 Google Drive 照片連結為可顯示的縮圖
function convertDriveUrl(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w500";
  }
  return url;
}