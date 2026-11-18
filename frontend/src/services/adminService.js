import api from "./api.js";

export async function obterResumoAdmin() {
  const { data } = await api.get("/api/admin/resumo");
  return data;
}

export async function listarUsuariosAdmin() {
  const { data } = await api.get("/api/admin/usuarios");
  return data;
}

export async function alterarRoleUsuarioAdmin(id, role) {
  const { data } = await api.put(`/api/admin/usuarios/${id}/role`, { role });
  return data;
}

export async function excluirUsuarioAdmin(id) {
  const { data } = await api.delete(`/api/admin/usuarios/${id}`);
  return data;
}

export async function listarProjetosAdmin() {
  const { data } = await api.get("/api/admin/projetos");
  return data;
}

export async function excluirProjetoAdmin(id) {
  const { data } = await api.delete(`/api/admin/projetos/${id}`);
  return data;
}

export async function listarLicoesAdmin() {
  const { data } = await api.get("/api/admin/licoes");
  return data;
}

export async function adicionarLicaoAdmin(dados) {
  const { data } = await api.post("/api/admin/licoes", dados);
  return data;
}

export async function excluirLicaoAdmin(licaoId) {
  const { data } = await api.delete(`/api/admin/licoes/${licaoId}`);
  return data;
}

