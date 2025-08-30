let data = {}; // <-- add this

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
  // <-- make ready async
  await loadData(); // <-- load Firebase before anything else

  let currentTitle = null;
  let currentSub = null;

  async function saveDataWrapper() {
    // <-- rename to avoid conflict
    await saveData(); // <-- call your Firebase saveData
    console.log("Saved data:", JSON.stringify(data));
  }

  let mainTitles = Object.keys(data);

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

  $(document).on("click", "#addTitle", function () {
    const newTitle = "New Title";
    data[newTitle] = {};
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
        return false; // only move first checked one
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
        return false; // only move first checked one
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

  function openTitle(title) {
    currentTitle = title;
    if (!data[currentTitle]) {
      data[currentTitle] = {};
      saveData();
    }
    $("#mainView").addClass("hidden");
    $("#titleView").removeClass("hidden");
    $("#selectedMainTitle").val(title);
    renderSubTitles();

    // Retrieve last opened sublist for this title
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

    // If no match found for lastOpenedSub, fall back to first sub
    if (!lastOpenedSub && firstSub) {
      currentSub = firstSub;
      $(`.subTitle:contains("${firstSub}")`).addClass("selected");
      showSubList(firstSub);
    }
  }

  function showEmptyListArea() {
    const container = $("#subListContainer").empty();
    const listWrapper = $(`<div class="subList" style="display: flex;"></div>`);
    const controlBar = $(`
      <div class="controlBar">
        <button class="controlButton createList">//</button>
        <button class="controlButton addItem">+</button>
        <button class="controlButton deleteItems">-</button>
         <button class="controlButton collapseAll">#</button>
      </div>
    `);
    const itemColumn = $('<div class="itemColumn"></div>');

    controlBar.find(".createList").on("click", () => {
      const newSub = `List ${Object.keys(data[currentTitle]).length + 1}`;
      let uniqueSub = newSub;
      let counter = 1;
      while (data[currentTitle][uniqueSub]) {
        uniqueSub = `${newSub} (${counter++})`;
      }
      data[currentTitle][uniqueSub] = [];
      saveData();
      renderSubTitles();
      showSubList(newSub);
    });

    controlBar.find(".addItem").on("click", () => {
      if (!currentSub || !(currentSub in data[currentTitle])) return;
      const item = createItem();
      const list = data[currentTitle][currentSub];
      list.push({ value: "", state: "" });
      saveData();
      item.appendTo(itemColumn);
      item.find(".itemInput").focus();
    });

    controlBar.find(".deleteItems").on("click", () => {
      if (!currentSub) return;
      const list = data[currentTitle][currentSub];
      data[currentTitle][currentSub] = list.filter((item, i) => {
        const checkbox = itemColumn.find(".itemRow").eq(i).find(".checkbox");
        return !checkbox.hasClass("red");
      });
      saveData();
      showSubList(currentSub);
    });

    controlBar.find(".deleteList").on("click", () => {
      const spans = $("#subTitleRow .subTitle");
      spans.each(function () {
        const subName = $(this).text().trim();
        if (!subName) {
          // Find the original key this span represents before rename
          // Since keys might not match span text if edited to empty, we get keys by comparing data keys with span texts
          for (const key in data[currentTitle]) {
            if (key === subName || !subName) {
              delete data[currentTitle][key];
              break;
            }
          }
        }
      });

      saveData();
      renderSubTitles();
      showEmptyListArea();
    });

    listWrapper.append(controlBar, itemColumn).appendTo(container);
  }

  function showSubList(sub) {
    currentSub = sub;
    localStorage.setItem("lastOpenSub_" + currentTitle, sub);
    const listWrapper = $(`<div class="subList" style="display: flex;"></div>`);
    const controlBar = $(`
      <div class="controlBar">
        <button class="controlButton createList">//</button>
        <button class="controlButton addItem">+</button>
        <button class="controlButton deleteItems">-</button>
         <button class="controlButton collapseAll">#</button>
      </div>
    `);
    const itemColumn = $('<div class="itemColumn"></div>');

    controlBar.find(".createList").on("click", () => {
      const newSub = `List ${Object.keys(data[currentTitle]).length + 1}`;
      data[currentTitle][newSub] = [];
      saveData();
      renderSubTitles();
      showSubList(newSub);

      // Focus on new subtitle input
      const inputs = $("#subTitleRow").find("input.subTitle");
      inputs.last().focus().select();
    });

    controlBar.find(".addItem").on("click", () => {
      if (!currentSub || !(currentSub in data[currentTitle])) return;
      const list = data[currentTitle][currentSub];
      list.push({ value: "", state: "" }); // adds item at the bottom
      saveData();
      showSubList(currentSub); // rerender list to include new item properly
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
      const itemRows = itemColumn.find(".itemRow");
      data[currentTitle][currentSub] = list.filter((item, i) => {
        const checkbox = itemRows.eq(i).find(".checkbox");
        return !checkbox.hasClass("red");
      });
      saveData();
      showSubList(currentSub);
    });

    controlBar.find(".deleteList").on("click", () => {
      const spans = $("#subTitleRow .subTitle");
      spans.each(function () {
        const subName = $(this).text().trim();
        if (!subName) {
          // Find the original key this span represents before rename
          // Since keys might not match span text if edited to empty, we get keys by comparing data keys with span texts
          for (const key in data[currentTitle]) {
            if (key === subName || !subName) {
              delete data[currentTitle][key];
              break;
            }
          }
        }
      });

      saveData();
      renderSubTitles();
      showEmptyListArea();
    });

    const list = data[currentTitle][currentSub] || [];
    itemColumn.html("");
    list.forEach((itemData, i) => {
      const item = createItem(itemData, i); // pass the index too!
      item.appendTo(itemColumn);
    });

    $("#subListContainer").html("");
    listWrapper.append(controlBar, itemColumn).appendTo("#subListContainer");
    localStorage.setItem("lastOpenedSub_" + currentTitle, sub);
  }

  function createItem(itemData = { value: "", state: "" }, index) {
    const itemRow = $('<div class="itemRow"></div>');
    const checkbox = $(
      '<div class="checkbox" style="border: 1px solid #ccc; width: 12px; height: 12px; margin-right: 6px;"></div>'
    );
    const input = $(
      '<textarea spellcheck="false" class="itemInput" rows="1" style="font-size: 113%; outline: none;"></textarea>'
    ).val(itemData.value);

    checkbox.removeClass("red green"); // clear any previous
    if (itemData.state === "red") {
      checkbox.addClass("red");
    } else if (itemData.state === "green") {
      checkbox.addClass("green");
      input.addClass("collapsed");
    }

    // Save state in jQuery data to track toggle cycles
    checkbox.data("state", itemData.state || "");

    // Checkbox click toggles state and input collapsed class
    checkbox.on("click", function () {
      checkbox.removeClass("red green");
      if (checkbox.data("state") === "") {
        checkbox.data("state", "green").addClass("green");
        input.addClass("collapsed");
        input.css("height", "2.8em"); // 2 lines
      } else if (checkbox.data("state") === "green") {
        checkbox.data("state", "red").addClass("red");
        input.removeClass("collapsed");
        input.css("height", "auto");
        input[0].style.height = "auto";
        input[0].style.height = input[0].scrollHeight + "px";
      } else {
        checkbox.data("state", "");
        input.removeClass("collapsed");
        input.css("height", "auto");
        input[0].style.height = "auto";
        input[0].style.height = input[0].scrollHeight + "px";
      }
      updateData();
    });

    // Adjust textarea height on input
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
      console.log("Saving value:", input.val(), "for index:", index);

      if (!currentTitle || !currentSub) {
        console.log("updateData: missing currentTitle or currentSub");
        return;
      }
      if (!data[currentTitle]) {
        data[currentTitle] = {};
        console.log(`updateData: initialized data for title '${currentTitle}'`);
      }
      if (!data[currentTitle][currentSub]) {
        data[currentTitle][currentSub] = [];
        console.log(
          `updateData: initialized list for subtitle '${currentSub}'`
        );
      }

      const list = data[currentTitle][currentSub];

      if (!list[index]) {
        console.log(`updateData: initializing item at index ${index}`);
        list[index] = { value: "", state: "" };
      }

      list[index].value = input.val();
      list[index].state = checkbox.hasClass("green")
        ? "green"
        : checkbox.hasClass("red")
        ? "red"
        : "";
      saveData();

      console.log(`updateData saved item ${index} value:`, list[index].value);
    }

    itemRow.append(checkbox, input);
    setTimeout(() => {
      input[0].style.height = "auto";
      input[0].style.height = input[0].scrollHeight + "px";
    }, 0);
    return itemRow;
  }

  $("#mainTitleContainer").on("click", ".addTitle", function () {
    const newTitle = "";
    data[newTitle] = {};
    saveData();
    refreshMainView();

    const newDiv = $("#mainTitleContainer")
      .find(".mainTitle")
      .filter(function () {
        return $(this).text().trim() === "";
      });

    newDiv.attr("contenteditable", "true").focus();
  });

  $("#selectedMainTitle").on("click", function () {
    $("#titleView").addClass("hidden");
    $("#mainView").removeClass("hidden");
    refreshMainView();
  });

  $("#moveLeft").on("click", function () {
    const selected = $(".mainTitle.selected");
    if (selected.length && !selected.hasClass("addTitle")) {
      const prev = selected.prev(".mainTitle");
      if (prev.length && !prev.hasClass("addTitle")) {
        prev.before(selected);
        reorderTitles();
      }
    }
  });

  $("#moveRight").on("click", function () {
    const selected = $(".mainTitle.selected");
    if (selected.length && !selected.hasClass("addTitle")) {
      const next = selected.next(".mainTitle");
      if (next.length) {
        next.after(selected);
        reorderTitles();
      }
    }
  });

  function reorderTitles() {
    const newData = {};
    $("#mainTitleContainer .mainTitle").each(function () {
      const title = $(this).text().trim();
      if (title && title !== "+") {
        newData[title] = data[title];
      }
    });
    data = newData;
    saveData();
  }

  refreshMainView();
  $("#renameTitle").on("click", function () {
    const checked = $(".mainTitleCheckbox:checked");
    if (checked.length !== 1) {
      alert("Select exactly one title to rename.");
      return;
    }
    const oldTitle = checked.next(".mainTitle").text();
    const newTitle = prompt("New title name:", oldTitle);
    if (!newTitle || newTitle === oldTitle) return;

    data[newTitle] = data[oldTitle];
    delete data[oldTitle];
    saveData();
    refreshMainView();
  });

  $("#deleteTitle").on("click", function () {
    $(".mainTitleCheckbox:checked").each(function () {
      const title = $(this).next(".mainTitle").text();
      delete data[title];
    });
    saveData();
    refreshMainView();
  });
});
