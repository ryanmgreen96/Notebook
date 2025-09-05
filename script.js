// 111111111111111111111111

let data = {};

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

async function saveData() {
  await setDoc(doc(window.db, "data", "shared"), { notesAppData: data });
  console.log("Saved to Firebase:", data);
}

async function loadData() {
  const docSnap = await getDoc(doc(window.db, "data", "shared"));
  if (docSnap.exists()) {
    data = docSnap.data().notesAppData || {};
  } else {
    data = {};
  }
}

$(document).ready(async function () {
  await loadData();

  let currentTitle = null;
  let currentSub = null;
  let mainTitles = Object.keys(data);

  // ------------------ MAIN VIEW ------------------
  function refreshMainView() {
    $("#mainTitleContainer").html(`
      <div id="mainTitleControls">
        <button id="addTitle">+</button>
        <button id="renameTitle">$</button>
        <button id="deleteTitle">-</button>
        <button id="moveLeft">←</button>
        <button id="moveRight">→</button>
      </div>
    `);

    mainTitles.forEach((title) => {
      const wrapper = $('<div class="mainTitleWrapper"></div>');
      const checkbox = $('<input type="checkbox" class="mainTitleCheckbox" />');
      const titleDiv = $('<div class="mainTitle">')
        .text(title)
        .attr("contenteditable", "true");

      titleDiv.on("blur", function () {
        const oldName = title;
        const newName = $(this).text().trim();
        if (newName && newName !== oldName) {
          data[newName] = data[oldName];
          delete data[oldName];
          const idx = mainTitles.indexOf(oldName);
          if (idx !== -1) mainTitles[idx] = newName;
        }
        saveData();
        refreshMainView();
      });

      titleDiv.on("click", function (e) {
        const isChecked = $(this)
          .siblings(".mainTitleCheckbox")
          .prop("checked");
        if (isChecked) {
          e.stopPropagation();
          return;
        }
        openTitle(title);
      });

      wrapper.append(checkbox, titleDiv);
      $("#mainTitleContainer").append(wrapper);
    });
  }

  // ------------------ TITLE CONTROLS ------------------
  $(document).on("click", "#addTitle", function () {
    const newTitle = "New Title";
    data[newTitle] = { "🏠 Home": [] }; // Default Home list
    mainTitles.push(newTitle);
    saveData();
    refreshMainView();
  });

  $(document).on("click", "#renameTitle", function () {
    const selected = $(".mainTitleCheckbox:checked")
      .closest(".mainTitleWrapper")
      .find(".mainTitle");
    selected.attr("contenteditable", "true").focus();
  });

  $(document).on("click", "#deleteTitle", function () {
    $(".mainTitleCheckbox:checked").each(function () {
      const title = $(this).siblings(".mainTitle").text().trim();
      delete data[title];
      mainTitles = mainTitles.filter((t) => t !== title);
    });
    saveData();
    refreshMainView();
  });

  $(document).on("click", "#moveLeft", function () {
    const wrappers = $(".mainTitleWrapper");
    wrappers.each(function (i) {
      const cb = $(this).find(".mainTitleCheckbox");
      if (cb.prop("checked") && i > 0) {
        $(this).insertBefore(wrappers.eq(i - 1));
        reorderData();
        return false;
      }
    });
    saveData();
  });

  $(document).on("click", "#moveRight", function () {
    const wrappers = $(".mainTitleWrapper");
    wrappers.each(function (i) {
      const cb = $(this).find(".mainTitleCheckbox");
      if (cb.prop("checked") && i < wrappers.length - 1) {
        $(this).insertAfter(wrappers.eq(i + 1));
        reorderData();
        return false;
      }
    });
    saveData();
  });

  function reorderData() {
    const newData = {};
    $(".mainTitleWrapper .mainTitle").each(function () {
      const t = $(this).text().trim();
      if (data[t]) newData[t] = data[t];
    });
    data = newData;
  }

  // ------------------ OPEN TITLE ------------------
  function openTitle(title) {
    currentTitle = title;
    if (!data[currentTitle]) {
      data[currentTitle] = { "🏠 Home": [] }; // ensure Home list
      saveData();
    }
    $("#mainView").addClass("hidden");
    $("#titleView").removeClass("hidden");
    $("#selectedMainTitle").val(title);
    renderSubTitles();

    const lastSub = localStorage.getItem("lastOpenSub_" + currentTitle);
    if (lastSub && data[currentTitle][lastSub]) {
      showSubList(lastSub);
    } else {
      showEmptyListArea();
    }
  }

  function renderSubTitles() {
    const subs = data[currentTitle] || {};
    const subRow = $("#subTitleRow").empty();

    let firstSub = null;
    let lastOpenedSub = localStorage.getItem("lastOpenedSub_" + currentTitle);

    for (let sub in subs) {
      if (!firstSub) firstSub = sub;

      const span = $(
        `<span class="subTitle" contenteditable="true">${sub}</span>`
      );

      span.on("click", () => {
        $(".subTitle").removeClass("selected");
        span.addClass("selected");
        currentSub = sub;
        localStorage.setItem("lastOpenedSub_" + currentTitle, sub);
        showSubList(sub);
      });

      span.on("blur", function () {
        const oldName = sub;
        const newName = $(this).text().trim();
        if (newName && newName !== oldName) {
          data[currentTitle][newName] = data[currentTitle][oldName];
          delete data[currentTitle][oldName];
          if (currentSub === oldName) currentSub = newName;
          saveData();
          renderSubTitles();
          showSubList(newName);
        }
      });

      subRow.append(span);

      if (sub === lastOpenedSub) {
        span.addClass("selected");
        currentSub = sub;
        showSubList(sub);
      }
    }

    if (!lastOpenedSub && firstSub) {
      currentSub = firstSub;
      $(`.subTitle:contains("${firstSub}")`).addClass("selected");
      showSubList(firstSub);
    }
  }

  // ------------------ LIST AREAS ------------------
  function showEmptyListArea() {
    const container = $("#subListContainer").empty();
    const listWrapper = $(`<div class="subList" style="display: flex;"></div>`);
    const controlBar = $(`
      <div class="controlBar">
        <button class="controlButton createList">//</button>
        <button class="controlButton addAbove">^</button>
        <button class="controlButton addItem">+</button>
        <button class="controlButton deleteItems">-</button>
        <button class="controlButton collapseAll">#</button>
      </div>
    `);
    const itemColumn = $('<div class="itemColumn"></div>');

    bindControlEvents(controlBar, itemColumn);
    listWrapper.append(controlBar, itemColumn).appendTo(container);
  }

  function showSubList(sub) {
    currentSub = sub;
    localStorage.setItem("lastOpenSub_" + currentTitle, sub);
    const listWrapper = $(`<div class="subList" style="display: flex;"></div>`);
    const controlBar = $(`
      <div class="controlBar">
        <button class="controlButton createList">//</button>
        <button class="controlButton addAbove">^</button>
        <button class="controlButton addItem">+</button>
        <button class="controlButton deleteItems">-</button>
        <button class="controlButton collapseAll">#</button>
      </div>
    `);
    const itemColumn = $('<div class="itemColumn"></div>');

    const list = data[currentTitle][currentSub] || [];
    itemColumn.html("");
    list.forEach((itemData, i) => {
      const item = createItem(itemData, i);
      item.appendTo(itemColumn);
    });

    $("#subListContainer").html("");
    bindControlEvents(controlBar, itemColumn);
    listWrapper.append(controlBar, itemColumn).appendTo("#subListContainer");
    localStorage.setItem("lastOpenedSub_" + currentTitle, sub);
  }

  function bindControlEvents(controlBar, itemColumn) {
    controlBar.find(".createList").on("click", () => {
      const newSub = `List ${Object.keys(data[currentTitle]).length + 1}`;
      data[currentTitle][newSub] = [];
      saveData();
      renderSubTitles();
      showSubList(newSub);
    });

    controlBar.find(".addAbove").on("click", () => {
      if (!currentSub || !(currentSub in data[currentTitle])) return;
      const list = data[currentTitle][currentSub];
      const yellowIndex = list.findIndex((item) => item.state === "yellow");

      if (yellowIndex >= 0) {
        if (yellowIndex > 0) {
          [list[yellowIndex - 1], list[yellowIndex]] = [
            list[yellowIndex],
            list[yellowIndex - 1],
          ];
        }
        saveData();
        showSubList(currentSub);
      } else {
        list.unshift({ value: "", state: "" });
        saveData();
        showSubList(currentSub);
      }
    });

    controlBar.find(".addItem").on("click", () => {
      if (!currentSub || !(currentSub in data[currentTitle])) return;
      const list = data[currentTitle][currentSub];
      const yellowIndex = list.findIndex((item) => item.state === "yellow");

      if (yellowIndex >= 0) {
        if (yellowIndex < list.length - 1) {
          [list[yellowIndex], list[yellowIndex + 1]] = [
            list[yellowIndex + 1],
            list[yellowIndex],
          ];
        }
        saveData();
        showSubList(currentSub);
      } else {
        list.push({ value: "", state: "" });
        saveData();
        showSubList(currentSub);
      }
    });

    controlBar.find(".collapseAll").on("click", () => {
      data[currentTitle][currentSub].forEach((item) => {
        item.state = "green";
      });
      saveData();
      showSubList(currentSub);
    });

    controlBar.find(".deleteItems").on("click", () => {
      if (!currentSub) return;
      const list = data[currentTitle][currentSub];
      data[currentTitle][currentSub] = list.filter(
        (item) => item.state !== "red"
      );
      saveData();
      showSubList(currentSub);
    });
  }

  // ------------------ ITEMS ------------------
  function createItem(itemData = { value: "", state: "" }, index) {
    const itemRow = $('<div class="itemRow"></div>');
    const checkbox = $(
      '<div class="checkbox" style="border: 1px solid #ccc; width: 12px; height: 12px; margin-right: 6px;"></div>'
    );
    const input = $(
      '<textarea spellcheck="false" class="itemInput" rows="1" style="font-size: 113%; outline: none;"></textarea>'
    ).val(itemData.value);

    // Restore state
    checkbox.removeClass("red green yellow");
    if (itemData.state === "red") {
      checkbox.addClass("red");
    } else if (itemData.state === "green") {
      checkbox.addClass("green");
      input.addClass("collapsed");
    } else if (itemData.state === "yellow") {
      checkbox.addClass("yellow");
    }
    checkbox.data("state", itemData.state || "");

    // Toggle states
    checkbox.on("click", function () {
      checkbox.removeClass("red green yellow");
      let currentState = checkbox.data("state");

      if (currentState === "") {
        checkbox.data("state", "green").addClass("green");
        input.addClass("collapsed").css("height", "2.8em");
      } else if (currentState === "green") {
        checkbox.data("state", "red").addClass("red");
        input.removeClass("collapsed").css("height", "auto");
        input[0].style.height = input[0].scrollHeight + "px";
      } else if (currentState === "red") {
        $(".checkbox.yellow").removeClass("yellow").data("state", "");
        checkbox.data("state", "yellow").addClass("yellow");
      } else {
        checkbox.data("state", "");
        input.removeClass("collapsed").css("height", "auto");
        input[0].style.height = input[0].scrollHeight + "px";
      }
      updateData();
    });

      input.on("dblclick", function () {
        this.select(); // selects the full text block on double-click
      });

    // Input autosave
    input.on("input", function () {
      const scrollY = window.scrollY;
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
      updateData();
      window.scrollTo(0, scrollY);
    });
    input.on("blur", updateData);

    function updateData() {
      const index = itemRow.parent().children().index(itemRow);
      if (!currentTitle || !currentSub) return;
      if (!data[currentTitle]) data[currentTitle] = {};
      if (!data[currentTitle][currentSub]) data[currentTitle][currentSub] = [];

      const list = data[currentTitle][currentSub];
      if (!list[index]) list[index] = { value: "", state: "" };

      list[index].value = input.val();
      list[index].state = checkbox.hasClass("green")
        ? "green"
        : checkbox.hasClass("red")
        ? "red"
        : checkbox.hasClass("yellow")
        ? "yellow"
        : "";
      saveData();
    }

    itemRow.append(checkbox, input);
    setTimeout(() => {
      input[0].style.height = "auto";
      input[0].style.height = input[0].scrollHeight + "px";
    }, 0);
    return itemRow;
  }

  // ------------------ NAVIGATION ------------------
  $("#selectedMainTitle").on("click", function () {
    $("#titleView").addClass("hidden");
    $("#mainView").removeClass("hidden");
    refreshMainView();
  });

  refreshMainView();
});


