// app.js - versão Supabase para o sistema de Pareceres
// Mantém a lógica atual de checklist, JSON, navegação e IA.
// Troca apenas a camada de dados: alunos e pareceres agora vêm do Supabase.

let alunos = [];
let avaliacoes = [];
let indiceAtual = 0;

// Ano letivo usado na tabela pareceres.
// Se quiser, pode colocar no js/config.js: const CONFIG = { ANO_LETIVO: "2026", ... }
const ANO_LETIVO = CONFIG.ANO_LETIVO || String(new Date().getFullYear());

const container = document.getElementById("avaliacaoContainer");

function normalizarId(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
}

function renderizarItens() {
  const container = document.getElementById("avaliacaoContainer");
  container.innerHTML = "";

  let totalItens = 0;

  DADOS_AVALIACAO.forEach((categoria) => {
    const details = document.createElement("details");
    details.className = "category-card";

    // Desktop aberto, celular fechado
    if (window.innerWidth > 768) {
      details.open = false;
    }

    const titulo = categoria.titulo;
    const icone = categoria.icone || "📌";
    const opcoes = categoria.opcoes || categoria.itens || [];

    totalItens += opcoes.length;

    const summary = document.createElement("summary");
    summary.className = "category-header";

    summary.innerHTML = `
      <div>
        <h4>${icone} ${titulo}</h4>
      </div>
      <span class="pill warning" data-count="${titulo}">0</span>
    `;

    const body = document.createElement("div");
    body.className = "category-body";

    opcoes.forEach((opcao) => {
      const textoOpcao = typeof opcao === "string" ? opcao : opcao.texto;

      const label = document.createElement("label");
      label.className = "check-row";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.item = titulo;
      input.dataset.opcao = textoOpcao;

      input.addEventListener("change", () => {
        label.classList.toggle("active", input.checked);
        atualizarPreview();
      });

      const span = document.createElement("span");
      span.textContent = textoOpcao;

      label.appendChild(input);
      label.appendChild(span);
      body.appendChild(label);
    });

    details.appendChild(summary);
    details.appendChild(body);
    container.appendChild(details);
  });

  document.getElementById("totalItens").textContent = totalItens;
  atualizarPreview();
}

function coletarDados() {
  const selecionados = {};

  document.querySelectorAll('input[type="checkbox"]:checked').forEach((check) => {
    const item = check.dataset.item;
    const opcao = check.dataset.opcao;

    if (!selecionados[item]) selecionados[item] = [];
    selecionados[item].push(opcao);
  });

  return {
    aluno: {
      id: document.getElementById("idAluno").value,
      nome: document.getElementById("nomeAluno").value,
      turma: document.getElementById("turmaAluno").value,
      trimestre: document.getElementById("trimestre").value
    },
    avaliacao: selecionados,
    observacoes: document.getElementById("observacoes").value,
    parecer: document.querySelector(".parecer").value || ""
  };
}

function atualizarContadores() {

  const total = document.querySelectorAll(
    'input[type="checkbox"]:checked'
  ).length;

  document.getElementById("totalSelecionados").textContent = total;

  document.getElementById("sideCount").textContent =
    `${total} marcadores`;

  document.getElementById("sideNome").textContent =
    document.getElementById("nomeAluno").value || "Aluno atual";

  document.getElementById("sideId").textContent =
    `ID ${document.getElementById("idAluno").value || "--"}`;

  document.getElementById("sideTurma").textContent =
    `Turma ${document.getElementById("turmaAluno").value || "--"}`;

  DADOS_AVALIACAO.forEach(item => {

    const count = document.querySelectorAll(
      `input[data-item="${item.titulo}"]:checked`
    ).length;

    const el = document.querySelector(
      `[data-count="${item.titulo}"]`
    );

    if (!el) return;

    el.textContent = count;

    /* COR DINÂMICA */

    if (count > 0) {

      el.classList.remove("warning");
      el.classList.add("success");

    } else {

      el.classList.remove("success");
      el.classList.add("warning");

    }

  });

}

function atualizarPreview() {
  atualizarContadores();
  const dados = coletarDados();
  document.getElementById("jsonPreview").textContent = JSON.stringify(dados, null, 2);
}

function limparChecks() {
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  atualizarPreview();
}

function limparBusca() {
  document.getElementById("buscaAluno").value = "";
  document.getElementById("turmaBusca").value = "";
}

function limparTelaAvaliacao() {
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  document.getElementById("observacoes").value = "";
  document.querySelector(".parecer").value = "";
  atualizarPreview();
}

function novoRegistro() {
  document.getElementById("idAluno").value = "";
  document.getElementById("nomeAluno").value = "";
  document.getElementById("turmaAluno").value = document.getElementById("turmaBusca").value || "";
  limparTelaAvaliacao();
}

function conferirSupabase() {
  if (typeof supabaseClient === "undefined") {
    throw new Error("supabaseClient não encontrado. Confira se js/supabase-config.js foi carregado antes do app.js.");
  }
}

async function carregarAlunos() {
  conferirSupabase();

  const { data, error } = await supabaseClient
    .from("alunos")
    .select("id, nome, turma, ativo")
    .eq("ativo", true)
    .order("turma", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;

  alunos = (data || [])
    .filter(a => a && a.id !== "" && a.nome)
    .map(a => ({
      id: a.id,
      nome: a.nome,
      turma: a.turma
    }));

  console.log("Alunos carregados do Supabase:", alunos);
}

async function carregarAvaliacoes() {
  conferirSupabase();

  const { data, error } = await supabaseClient
    .from("pareceres")
    .select("id, id_aluno, nome, turma, ano_letivo, trimestre, dados_json, observacoes, parecer_texto, created_at, updated_at")
    .eq("ano_letivo", ANO_LETIVO)
    .order("updated_at", { ascending: true });

  if (error) throw error;

  avaliacoes = (data || []).map(p => ({
    id: p.id,
    id_aluno: p.id_aluno,
    nome: p.nome,
    turma: p.turma,
    ano_letivo: p.ano_letivo,
    trimestre: p.trimestre,
    dados_json: p.dados_json || {},
    observacoes: p.observacoes || "",
    parecer_texto: p.parecer_texto || "",
    parecer: p.parecer_texto || "",
    updated_at: p.updated_at
  }));

  console.log("Pareceres carregados do Supabase:", avaliacoes);
  atualizarProgressoAvaliacoes();
}

async function iniciarSistema() {
  try {
    await carregarAlunos();
    await carregarAvaliacoes();
    atualizarProgressoAvaliacoes();

    if (Array.isArray(alunos) && alunos.length > 0) {
      carregarAluno(0);
    } else {
      console.warn("Nenhum aluno carregado.");
      atualizarPreview();
      alert("Nenhum aluno encontrado na tabela alunos do Supabase.");
    }
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível carregar alunos/pareceres. Confira o Supabase, a tabela alunos e o supabase-config.js.");
  }
}

function carregarAluno(indice) {
  if (!Array.isArray(alunos) || alunos.length === 0) {
    console.warn("Lista de alunos vazia ou inválida:", alunos);
    return;
  }

  if (indice < 0 || indice >= alunos.length) {
    console.warn("Índice inválido:", indice);
    return;
  }

  const aluno = alunos[indice];

  if (!aluno) {
    console.warn("Aluno não encontrado no índice:", indice, alunos);
    return;
  }

  indiceAtual = indice;

  document.getElementById("idAluno").value = aluno.id || "";
  document.getElementById("nomeAluno").value = aluno.nome || "";
  document.getElementById("turmaAluno").value = aluno.turma || "";

  limparTelaAvaliacao();

  const trimestreAtual = document.getElementById("trimestre").value;

  const avaliacaoSalva = avaliacoes
    .filter(a =>
      String(a.id_aluno) === String(aluno.id) &&
      String(a.ano_letivo) === String(ANO_LETIVO) &&
      String(a.trimestre) === String(trimestreAtual)
    )
    .pop();

  if (avaliacaoSalva) carregarAvaliacaoSalva(avaliacaoSalva);

  atualizarPreview();
  atualizarProgressoAvaliacoes();
}

function carregarAvaliacaoSalva(avaliacaoSalva) {
  try {
    const dados = typeof avaliacaoSalva.dados_json === "string"
      ? JSON.parse(avaliacaoSalva.dados_json || "{}")
      : (avaliacaoSalva.dados_json || {});

    Object.keys(dados).forEach(item => {
      const opcoes = Array.isArray(dados[item]) ? dados[item] : [];

      opcoes.forEach(opcao => {
        const check = [...document.querySelectorAll('input[type="checkbox"]')].find(c =>
          c.dataset.item === item && c.dataset.opcao === opcao
        );
        if (check) check.checked = true;
      });
    });

    document.getElementById("observacoes").value = avaliacaoSalva.observacoes || "";
    document.querySelector(".parecer").value = avaliacaoSalva.parecer_texto || avaliacaoSalva.parecer || "";
  } catch (erro) {
    console.error("Erro ao carregar avaliação salva:", erro);
  }
}

function proximoAluno() {
  if (indiceAtual < alunos.length - 1) carregarAluno(indiceAtual + 1);
}

function alunoAnterior() {
  if (indiceAtual > 0) carregarAluno(indiceAtual - 1);
}

function primeiroAluno() {
  carregarAluno(0);
}

function ultimoAluno() {
  carregarAluno(alunos.length - 1);
}

function pesquisarAluno() {
  const termo = document.getElementById("buscaAluno").value.trim().toLowerCase();
  const turma = document.getElementById("turmaBusca").value.trim();

  const indice = alunos.findIndex(aluno => {
    const nome = String(aluno.nome || "").toLowerCase();
    const id = String(aluno.id || "").toLowerCase();
    const nomeOuIdConfere = termo === "" || nome.includes(termo) || id === termo;
    const turmaConfere = turma === "" || String(aluno.turma) === turma;
    return nomeOuIdConfere && turmaConfere;
  });

  if (indice >= 0) carregarAluno(indice);
  else alert("Aluno não encontrado.");
}

function toggleSidebar() {
  const app = document.querySelector(".app");
  app.classList.toggle("collapsed");
}

function atualizarProgressoAvaliacoes() {
  if (!Array.isArray(alunos) || !Array.isArray(avaliacoes)) return;

  const trimestreAtual = document.getElementById("trimestre").value;
  const turmaAtual = document.getElementById("turmaBusca").value || document.getElementById("turmaAluno").value;

  const alunosTurma = alunos.filter(a => String(a.turma) === String(turmaAtual));

  const avaliados = alunosTurma.filter(aluno =>
    avaliacoes.some(av =>
      String(av.id_aluno) === String(aluno.id) &&
      String(av.ano_letivo) === String(ANO_LETIVO) &&
      String(av.trimestre) === String(trimestreAtual)
    )
  );

  const total = alunosTurma.length;
  const concluidas = avaliados.length;
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  document.getElementById("percentualAvaliacoes").textContent = `${percentual}%`;
  document.getElementById("barraAvaliacoes").style.width = `${percentual}%`;
}

async function salvarNoSheets(avancarDepois = false) {
  // Mantive o nome da função para não precisar alterar o botão do HTML.
  // Agora ela salva no Supabase.

  try {
    conferirSupabase();

    const dados = coletarDados();

    const idAluno = Number(dados.aluno.id);

    if (!idAluno || !dados.aluno.nome || !dados.aluno.turma) {
      alert("Informe ID, nome e turma do aluno antes de salvar.");
      return;
    }

    // 1) Primeiro salva/atualiza o aluno
    const alunoPayload = {
      id: idAluno,
      nome: dados.aluno.nome,
      turma: dados.aluno.turma,
      ativo: true
    };

    const { error: erroAluno } = await supabaseClient
      .from("alunos")
      .upsert(alunoPayload, {
        onConflict: "id"
      });

    if (erroAluno) throw erroAluno;

    // 2) Depois salva/atualiza o parecer
    const parecerPayload = {
      id_aluno: idAluno,
      nome: dados.aluno.nome,
      turma: dados.aluno.turma,
      ano_letivo: ANO_LETIVO,
      trimestre: dados.aluno.trimestre,
      dados_json: dados.avaliacao || {},
      observacoes: dados.observacoes || "",
      parecer_texto: dados.parecer || ""
    };

    const { data, error } = await supabaseClient
      .from("pareceres")
      .upsert(parecerPayload, {
        onConflict: "id_aluno,ano_letivo,trimestre"
      })
      .select("id")
      .single();

    if (error) throw error;

    alert(
      data?.id
        ? "✔️ Parecer salvo/atualizado no Supabase!"
        : "✔️ Parecer salvo no Supabase!"
    );

    await carregarAlunos();
    await carregarAvaliacoes();

    if (avancarDepois) proximoAluno();

  } catch (err) {
    console.error("Erro ao salvar no Supabase:", err);
    alert("Erro ao salvar no Supabase: " + (err.message || "erro desconhecido"));
  }
}

async function gerarParecerIA() {
  const campoParecer = document.querySelector(".parecer");

  const dados = {
    aluno: {
      id: document.getElementById("idAluno").value,
      nome: document.getElementById("nomeAluno").value,
      turma: document.getElementById("turmaAluno").value,
      trimestre: document.getElementById("trimestre").value
    },
    avaliacao: coletarDados().avaliacao,
    observacoes: document.getElementById("observacoes").value,
    parecer: campoParecer.value || ""
  };

  campoParecer.value = "Gerando parecer, aguarde...";

  try {
    const resposta = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({
        acao: "gerar_parecer",
        dados: dados
      })
    });

    const resultado = await resposta.json();

    if (resultado.status === "ok") {
      campoParecer.value = resultado.parecer;
      atualizarPreview();
    } else {
      campoParecer.value = "";
      alert("Erro: " + resultado.mensagem);
    }
  } catch (erro) {
    campoParecer.value = "";
    alert("Erro ao conectar com a IA.");
    console.error(erro);
  }
}

["observacoes", "nomeAluno", "idAluno", "turmaAluno", "trimestre"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", atualizarPreview);

  el.addEventListener("change", () => {
    atualizarPreview();

    if (id === "trimestre" && Array.isArray(alunos) && alunos.length > 0) {
      carregarAluno(indiceAtual);
    }
  });
});

renderizarItens();
atualizarPreview();
iniciarSistema();
