$(document).ready(function () {
  
  let data = JSON.parse(localStorage.getItem("notesAppData") || "{}");
  let currentTitle = null;
  let currentSub = null;

 function saveData() {
   localStorage.setItem("notesAppData", JSON.stringify(data));
   console.log("Saved data:", JSON.stringify(data));
 }


  function refreshMainView() {
    $("#mainTitleContainer").html('');
    $('<div class="mainTitle addTitle">+</div>').appendTo("#mainTitleContainer");
    for (let title in data) {
      const titleDiv = $('<div class="mainTitle">').text(title);
      titleDiv.on("click", () => openTitle(title));
      $("#mainTitleContainer").append(titleDiv);
    }
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
    showEmptyListArea();
  }

function renderSubTitles() {
  const subs = data[currentTitle] || {};
  const subRow = $("#subTitleRow").empty();

  for (let sub in subs) {
    const span = $(
      `<span class="subTitle" contenteditable="true">${sub}</span>`
    );

    span.on("click", () => {
      $(".subTitle").removeClass("selected");
      span.addClass("selected");
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
        <button class="controlButton deleteList">X</button>
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
      list.unshift({ value: "", state: "" });
      saveData();
      item.prependTo(itemColumn);
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
    const listWrapper = $(`<div class="subList" style="display: flex;"></div>`);
    const controlBar = $(`
      <div class="controlBar">
        <button class="controlButton createList">//</button>
        <button class="controlButton addItem">+</button>
        <button class="controlButton deleteItems">-</button>
        <button class="controlButton deleteList">X</button>
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
     list.unshift({ value: "", state: "" }); // add empty item
     saveData();
     showSubList(currentSub); // rerender list to include new item properly
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
    itemColumn.html('');
    list.forEach((itemData, i) => {
      const item = createItem(itemData, i); // pass the index too!
      item.appendTo(itemColumn);
    });


    $("#subListContainer").html('');
    listWrapper.append(controlBar, itemColumn).appendTo("#subListContainer");
  }

  

  function createItem(itemData = { value: "", state: "" }, index) {
    const itemRow = $('<div class="itemRow"></div>');
    const checkbox = $(
      '<div class="checkbox" style="border: 1px solid #ccc; width: 12px; height: 12px; margin-right: 6px;"></div>'
    );
  const input = $(
    '<textarea class="itemInput" rows="1" style="font-size: 113%; outline: none;"></textarea>'
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
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
      updateData();
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
    const newTitle = prompt("New title name:");
    if (!newTitle) return;
    data[newTitle] = {};
    saveData();
    refreshMainView();
  });

  $("#selectedMainTitle").on("click", function () {
    $("#titleView").addClass("hidden");
    $("#mainView").removeClass("hidden");
    refreshMainView();
  });

  refreshMainView();
});
