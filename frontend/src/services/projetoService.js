import api from "./api.js";

export async function listarProjetos(usuarioId) {
  const params = usuarioId ? { usuarioId } : {};
  const { data } = await api.get("/api/projetos", { params });
  return data;
}

export async function obterProjeto(id) {
  const { data } = await api.get(`/api/projetos/${id}`);
  return data;
}

export async function criarProjeto(projeto) {
  const { data } = await api.post("/api/projetos", projeto);
  return data;
}

export async function adicionarTarefa(projetoId, tarefa) {
  const { data } = await api.post(`/api/projetos/${projetoId}/tarefas`, tarefa);
  return data;
}

export async function atualizarTarefa(projetoId, tarefaId, dados) {
  const { data } = await api.put(`/api/projetos/${projetoId}/tarefas/${tarefaId}`, dados);
  return data;
}

export async function excluirTarefa(projetoId, tarefaId) {
  const { data } = await api.delete(`/api/projetos/${projetoId}/tarefas/${tarefaId}`);
  return data;
}

export async function adicionarRisco(projetoId, risco) {
  const { data } = await api.post(`/api/projetos/${projetoId}/riscos`, risco);
  return data;
}

export async function atualizarRisco(projetoId, riscoId, dados) {
  const { data } = await api.put(`/api/projetos/${projetoId}/riscos/${riscoId}`, dados);
  return data;
}

export async function excluirRisco(projetoId, riscoId) {
  const { data } = await api.delete(`/api/projetos/${projetoId}/riscos/${riscoId}`);
  return data;
}

export async function listarLicoes(projetoId) {
  const { data } = await api.get(`/api/projetos/${projetoId}/licoes`);
  return data;
}

export async function adicionarLicao(projetoId, licao) {
  const { data } = await api.post(`/api/projetos/${projetoId}/licoes`, licao);
  return data;
}

export async function excluirLicao(projetoId, licaoId) {
  const { data } = await api.delete(`/api/projetos/${projetoId}/licoes/${licaoId}`);
  return data;
}

export async function atualizarProjeto(id, dados) {
  const { data } = await api.put(`/api/projetos/${id}`, dados);
  return data;
}

export async function deletarProjeto(id) {
  const { data } = await api.delete(`/api/projetos/${id}`);
  return data;
}
