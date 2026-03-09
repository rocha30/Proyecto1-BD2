export function setupTabs() {
  function setTabView(viewName) {
    for (const tab of document.querySelectorAll(".tab")) {
      tab.classList.toggle("active", tab.dataset.view === viewName);
    }
    for (const view of document.querySelectorAll(".view")) {
      view.classList.toggle("active", view.id === viewName);
    }
  }

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => setTabView(tab.dataset.view));
  }
}
