package com.projectmind.controller;

import com.projectmind.domain.LicaoAprendida;
import com.projectmind.domain.Projeto;
import com.projectmind.domain.Tarefa;
import com.projectmind.domain.Usuario;
import com.projectmind.repository.ProjetoRepository;
import com.projectmind.repository.RiscoRepository;
import com.projectmind.repository.TarefaRepository;
import com.projectmind.repository.UsuarioRepository;
import com.projectmind.service.RAGService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final UsuarioRepository usuarioRepository;
    private final ProjetoRepository projetoRepository;
    private final TarefaRepository tarefaRepository;
    private final RiscoRepository riscoRepository;
    private final RAGService ragService;

    public AdminController(
            UsuarioRepository usuarioRepository,
            ProjetoRepository projetoRepository,
            TarefaRepository tarefaRepository,
            RiscoRepository riscoRepository,
            RAGService ragService) {
        this.usuarioRepository = usuarioRepository;
        this.projetoRepository = projetoRepository;
        this.tarefaRepository = tarefaRepository;
        this.riscoRepository = riscoRepository;
        this.ragService = ragService;
    }

    private Usuario obterAdminAutenticado(Long headerUserId, String authHeader) {
        Long idFinal = headerUserId;
        if (idFinal == null && authHeader != null && authHeader.contains("pm-token-")) {
            try {
                String token = authHeader.replace("Bearer ", "").trim();
                idFinal = Long.parseLong(token.replace("pm-token-", "").trim());
            } catch (Exception ignored) {}
        }
        if (idFinal == null) return null;
        return usuarioRepository.findById(idFinal)
                .filter(Usuario::isAdmin)
                .orElse(null);
    }

    private ResponseEntity<Map<String, String>> acessoNegado() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "erro", "Acesso restrito a administradores do sistema.",
                        "error", "Acesso restrito a administradores do sistema."
                ));
    }

    // GET /api/admin/resumo - Métricas globais da plataforma
    @GetMapping("/resumo")
    public ResponseEntity<?> obterResumoGlobal(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        List<Usuario> usuarios = usuarioRepository.findAll();
        long totalAdmins = usuarios.stream().filter(Usuario::isAdmin).count();
        long totalComuns = usuarios.size() - totalAdmins;

        List<Tarefa> todasTarefas = tarefaRepository.findAll();
        long tarefasConcluidas = todasTarefas.stream()
                .filter(t -> (t.getPercentualConcluido() != null && t.getPercentualConcluido() >= 100)
                        || "Feito".equalsIgnoreCase(t.getStatus()))
                .count();

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("totalUsuarios", usuarios.size());
        resumo.put("totalAdmins", totalAdmins);
        resumo.put("totalUsuariosComuns", totalComuns);
        resumo.put("totalProjetos", projetoRepository.count());
        resumo.put("totalTarefas", todasTarefas.size());
        resumo.put("totalTarefasConcluidas", tarefasConcluidas);
        resumo.put("totalRiscos", riscoRepository.count());
        resumo.put("totalLicoesRag", ragService.todasAsLicoes().size());

        return ResponseEntity.ok(resumo);
    }

    // GET /api/admin/usuarios - Lista todos os usuários com contagem de projetos, tarefas e status de bloqueio
    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        List<Usuario> usuarios = usuarioRepository.findAll();
        usuarios.sort(Comparator.comparing(Usuario::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Usuario u : usuarios) {
            List<Projeto> projetosDoUsuario = projetoRepository.findByUsuarioIdOrderByIdAsc(u.getId());
            int totalTarefas = 0;
            for (Projeto p : projetosDoUsuario) {
                if (p.getTarefas() != null) {
                    totalTarefas += p.getTarefas().size();
                }
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", u.getId());
            item.put("nome", u.getNome());
            item.put("email", u.getEmail());
            item.put("role", u.getRole());
            item.put("isAdmin", u.isAdmin());
            item.put("isMasterAdmin", "admin@projectmind.com".equalsIgnoreCase(u.getEmail()));
            item.put("tentativasFalhas", u.getTentativasFalhas());
            item.put("bloqueado", u.isBloqueado());
            item.put("bloqueadoAte", u.getBloqueadoAte());
            item.put("totalProjetos", projetosDoUsuario.size());
            item.put("totalTarefas", totalTarefas);
            resultado.add(item);
        }

        return ResponseEntity.ok(resultado);
    }

    // PUT /api/admin/usuarios/{id}/desbloquear - Desbloqueia imediatamente um usuário bloqueado por tentativas de login
    @PutMapping("/usuarios/{id}/desbloquear")
    public ResponseEntity<?> desbloquearUsuario(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        Usuario alvo = usuarioRepository.findById(id).orElse(null);
        if (alvo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Usuário não encontrado."));
        }

        alvo.setTentativasFalhas(0);
        alvo.setBloqueadoAte(null);
        usuarioRepository.save(alvo);

        return ResponseEntity.ok(Map.of("message", "Conta de " + alvo.getNome() + " desbloqueada com sucesso!"));
    }

    // PUT /api/admin/usuarios/{id}/role - Promove para ADMIN ou rebaixa para USER
    @PutMapping("/usuarios/{id}/role")
    public ResponseEntity<?> alterarRoleUsuario(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Usuario adminLogado = obterAdminAutenticado(headerUserId, authHeader);
        if (adminLogado == null) return acessoNegado();

        String novaRole = body != null ? body.get("role") : null;
        if (novaRole == null || (!"ADMIN".equalsIgnoreCase(novaRole) && !"USER".equalsIgnoreCase(novaRole))) {
            return ResponseEntity.badRequest().body(Map.of("erro", "Perfil inválido. Use ADMIN ou USER."));
        }

        Usuario alvo = usuarioRepository.findById(id).orElse(null);
        if (alvo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Usuário não encontrado."));
        }

        if ("admin@projectmind.com".equalsIgnoreCase(alvo.getEmail()) && !"ADMIN".equalsIgnoreCase(novaRole)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("erro", "A conta-mestre admin@projectmind.com não pode ser rebaixada."));
        }

        if (adminLogado.getId().equals(alvo.getId()) && !"ADMIN".equalsIgnoreCase(novaRole)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("erro", "Você não pode remover seu próprio privilégio de administrador."));
        }

        alvo.setRole(novaRole.toUpperCase());
        Usuario salvo = usuarioRepository.save(alvo);

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("id", salvo.getId());
        resposta.put("nome", salvo.getNome());
        resposta.put("email", salvo.getEmail());
        resposta.put("role", salvo.getRole());
        resposta.put("isAdmin", salvo.isAdmin());
        resposta.put("message", "Perfil atualizado para " + salvo.getRole() + " com sucesso!");
        return ResponseEntity.ok(resposta);
    }

    // DELETE /api/admin/usuarios/{id} - Exclui uma conta de usuário
    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> excluirUsuario(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Usuario adminLogado = obterAdminAutenticado(headerUserId, authHeader);
        if (adminLogado == null) return acessoNegado();

        Usuario alvo = usuarioRepository.findById(id).orElse(null);
        if (alvo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Usuário não encontrado."));
        }

        if ("admin@projectmind.com".equalsIgnoreCase(alvo.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("erro", "A conta-mestre não pode ser excluída."));
        }

        if (adminLogado.getId().equals(alvo.getId())) {
            return ResponseEntity.badRequest().body(Map.of("erro", "Você não pode excluir sua própria conta pelo painel admin."));
        }

        usuarioRepository.delete(alvo);
        return ResponseEntity.ok(Map.of("message", "Usuário removido com sucesso!"));
    }

    // GET /api/admin/projetos - Visão global de todos os projetos de todos os usuários
    @GetMapping("/projetos")
    public ResponseEntity<?> listarTodosProjetos(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        List<Projeto> projetos = projetoRepository.findAll();
        projetos.sort(Comparator.comparing(Projeto::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Projeto p : projetos) {
            List<Tarefa> tarefas = p.getTarefas() != null ? p.getTarefas() : List.of();
            long concluidas = tarefas.stream()
                    .filter(t -> (t.getPercentualConcluido() != null && t.getPercentualConcluido() >= 100)
                            || "Feito".equalsIgnoreCase(t.getStatus()))
                    .count();
            int progresso = tarefas.isEmpty() ? 0 : (int) Math.round(
                    tarefas.stream().mapToInt(t -> t.getPercentualConcluido() != null ? t.getPercentualConcluido() : 0).average().orElse(0)
            );
            int totalRiscos = p.getRiscos() != null ? p.getRiscos().size() : 0;

            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("numeroProjeto", p.getNumeroProjeto() != null ? p.getNumeroProjeto() : p.getId());
            item.put("nome", p.getNome());
            item.put("descricao", p.getDescricao());
            item.put("dataInicio", p.getDataInicio());
            item.put("usuarioId", p.getUsuario() != null ? p.getUsuario().getId() : null);
            item.put("usuarioNome", p.getUsuario() != null ? p.getUsuario().getNome() : "Sem dono");
            item.put("usuarioEmail", p.getUsuario() != null ? p.getUsuario().getEmail() : "—");
            item.put("totalTarefas", tarefas.size());
            item.put("tarefasConcluidas", concluidas);
            item.put("totalRiscos", totalRiscos);
            item.put("progressoPercentual", progresso);
            resultado.add(item);
        }

        return ResponseEntity.ok(resultado);
    }

    // DELETE /api/admin/projetos/{id} - Exclui qualquer projeto via painel admin
    @DeleteMapping("/projetos/{id}")
    public ResponseEntity<?> excluirProjeto(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        if (!projetoRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Projeto não encontrado."));
        }
        projetoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Projeto excluído com sucesso!"));
    }

    // GET /api/admin/licoes - Central de curadoria da base RAG
    @GetMapping("/licoes")
    public ResponseEntity<?> listarLicoesRag(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();
        return ResponseEntity.ok(ragService.todasAsLicoes());
    }

    // POST /api/admin/licoes - Cadastra nova lição global no motor RAG
    @PostMapping("/licoes")
    public ResponseEntity<?> adicionarLicaoRag(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        String categoria = body != null ? body.getOrDefault("categoria", "Geral") : "Geral";
        String descricao = body != null ? body.get("descricaoConhecimento") : null;
        if (descricao == null || descricao.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("erro", "A descrição da lição aprendida é obrigatória."));
        }
        LicaoAprendida salva = ragService.salvarLicao(categoria, descricao);
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    // DELETE /api/admin/licoes/{licaoId} - Remove uma lição do motor RAG
    @DeleteMapping("/licoes/{licaoId}")
    public ResponseEntity<?> excluirLicaoRag(
            @PathVariable Long licaoId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (obterAdminAutenticado(headerUserId, authHeader) == null) return acessoNegado();

        if (ragService.excluirLicao(licaoId)) {
            return ResponseEntity.ok(Map.of("message", "Lição removida da base RAG com sucesso!"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Lição não encontrada."));
    }
}
