// custom.js
window.addEventListener("load", () => {
  // 1) Cria o elemento do painel (sem posicionamento absoluto)
  const panel = document.createElement("div");
  panel.id = "hdr-panel";
  const header = document.createElement("div");
  header.className = "hdr-header";
  const title = document.createElement("strong");
  title.textContent = "Custom Headers";
  const addButton = document.createElement("button");
  addButton.id = "hdr-add";
  addButton.type = "button";
  addButton.textContent = "➕";
  const list = document.createElement("div");
  list.id = "hdr-list";
  header.append(title, addButton);
  panel.append(header, list);

  // estilos inline básicos — você pode mover para o CSS
  Object.assign(panel.style, {
    background: "#222",
    color: "#eee",
    padding: "0.5em 1em",
    fontFamily: "sans-serif",
    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    borderRadius: "4px",
    marginBottom: "1em",
  });

  // 2) Insere dentro da .scheme-container (logo abaixo de Servers/Authorize)
  const schemeContainer = document.querySelector(".scheme-container");
  if (schemeContainer) {
    schemeContainer.insertBefore(panel, schemeContainer.firstChild);
  } else {
    // fallback: se não encontrar, insere no topo do body
    document.body.prepend(panel);
  }

  // 3) Setup das interações internas do painel
  function createRow(name = "", value = "") {
    const row = document.createElement("div");
    row.className = "hdr-row";
    const nameInput = document.createElement("input");
    nameInput.className = "hdr-name";
    nameInput.placeholder = "Header name";
    nameInput.value = name;
    const valueInput = document.createElement("input");
    valueInput.className = "hdr-value";
    valueInput.placeholder = "Value";
    valueInput.value = value;
    const removeButton = document.createElement("button");
    removeButton.className = "hdr-remove";
    removeButton.type = "button";
    removeButton.textContent = "✖️";
    removeButton.onclick = () => row.remove();
    row.append(nameInput, valueInput, removeButton);
    Object.assign(row.style, {
      display: "flex",
      gap: "0.5em",
      alignItems: "center",
      flexWrap: "wrap",
    });
    return row;
  }

  addButton.onclick = () => list.appendChild(createRow());
  list.appendChild(createRow());

  // 4) Intercepta todas as chamadas fetch para injetar headers
  const _fetch = window.fetch;
  window.fetch = (input, init = {}) => {
    const headers = init.headers ? new Headers(init.headers) : new Headers();

    panel.querySelectorAll(".hdr-row").forEach((row) => {
      const name = row.querySelector(".hdr-name").value.trim();
      const val = row.querySelector(".hdr-value").value;
      if (name) headers.set(name, val);
    });

    init.headers = headers;
    return _fetch(input, init);
  };
});
