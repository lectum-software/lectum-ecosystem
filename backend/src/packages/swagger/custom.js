// custom.js
window.addEventListener("load", () => {
  // 1) Cria o elemento do painel (sem posicionamento absoluto)
  const panel = document.createElement("div");
  panel.id = "hdr-panel";
  panel.innerHTML = `
    <div class="hdr-header">
      <strong>Custom Headers</strong>
      <button id="hdr-add">➕</button>
    </div>
    <div id="hdr-list"></div>
  `;

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
  const list = panel.querySelector("#hdr-list");
  const addBtn = panel.querySelector("#hdr-add");

  function createRow(name = "", value = "") {
    const row = document.createElement("div");
    row.className = "hdr-row";
    row.innerHTML = `
      <input class="hdr-name" placeholder="Header name" value="${name}" />
      <input class="hdr-value" placeholder="Value" value="${value}" />
      <button class="hdr-remove">✖️</button>
    `;
    Object.assign(row.style, {
      display: "flex",
      gap: "0.5em",
      alignItems: "center",
      flexWrap: "wrap",
    });
    row.querySelector(".hdr-remove").onclick = () => row.remove();
    return row;
  }

  addBtn.onclick = () => list.appendChild(createRow());
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
