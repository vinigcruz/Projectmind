package com.projectmind.controller;

import com.projectmind.domain.LicaoAprendida;
import com.projectmind.domain.Projeto;
import com.projectmind.domain.Risco;
import com.projectmind.domain.Tarefa;
import com.projectmind.service.RAGService;
import com.projectmind.repository.ProjetoRepository;
import com.projectmind.repository.RiscoRepository;
import com.projectmind.repository.TarefaRepository;
import com.projectmind.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projetos")
@CrossOrigin(origins = "*")
public class ProjetoController {

    private final ProjetoRepository projetoRepository;
    private final TarefaRepository tarefaRepository;
    private final UsuarioRepository usuarioRepository;
    private final RiscoRepository riscoRepository;
    private final RAGService ragService;

    public ProjetoController(
        ProjetoRepository projetoRepository,
        TarefaRepository tarefaRepository,
        UsuarioRepository usuarioRepository,
        RiscoRepository riscoRepository,
        RAGService ragService
    ) {
        this.projetoRepository = projetoRepository;
        this.tarefaRepository = tarefaRepository;
        this.usuarioRepository = usuarioRepository;
        this.riscoRepository = riscoRepository;
        this.ragService = ragService;
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        try { usuarioRepository.count(); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // GET /api/projetos - Lista os projetos do usuário logado
    @GetMapping
    public ResponseEntity<List<Projeto>> listarProjetos(
            @RequestParam(required = false) Long usuarioId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long idFinal = usuarioId != null ? usuarioId : headerUserId;
        if (idFinal == null && authHeader != null && authHeader.contains("pm-token-")) {
            try {
                String token = authHeader.replace("Bearer ", "").trim();
                idFinal = Long.parseLong(token.replace("pm-token-", "").trim());
            } catch (Exception ignored) {}
        }

        if (idFinal != null) {
            List<Projeto> projetos = projetoRepository.findByUsuarioId(idFinal);
            return ResponseEntity.ok(projetos);
        }

        // Se nenhum ID for fornecido, retorna vazio para que perfis novos subam limpos
        return ResponseEntity.ok(List.of());
    }

    // GET /api/projetos/{id} - Busca detalhes de um projeto específico
    @GetMapping("/{id}")
    public ResponseEntity<?> obterProjetoPorId(@PathVariable Long id) {
        return projetoRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Projeto não encontrado")));
    }

    // POST /api/projetos - Cria um novo projeto vinculado ao usuário
    @PostMapping
    public ResponseEntity<?> criarProjeto(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String nome = (String) body.get("nome");
        String descricao = (String) body.get("descricao");

        if (nome == null || nome.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "O nome do projeto é obrigatório"));
        }

        Long usuarioId = null;
        if (body.get("usuarioId") != null) {
            try {
                usuarioId = Long.valueOf(body.get("usuarioId").toString());
            } catch (Exception ignored) {}
        }
        if (usuarioId == null && headerUserId != null) {
            usuarioId = headerUserId;
        }
        if (usuarioId == null && authHeader != null && authHeader.contains("pm-token-")) {
            try {
                String token = authHeader.replace("Bearer ", "").trim();
                usuarioId = Long.parseLong(token.replace("pm-token-", "").trim());
            } catch (Exception ignored) {}
        }

        Projeto projeto = new Projeto();
        projeto.setNome(nome.trim());
        projeto.setDescricao(descricao != null ? descricao.trim() : null);
        projeto.setDataInicio(LocalDate.now());

        if (usuarioId != null) {
            usuarioRepository.findById(usuarioId).ifPresent(projeto::setUsuario);
        }

        Projeto salvo = projetoRepository.save(projeto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    // POST /api/projetos/{id}/tarefas - Adiciona uma tarefa ao projeto
    @PostMapping("/{id}/tarefas")
    public ResponseEntity<?> adicionarTarefa(@PathVariable Long id, @RequestBody Tarefa tarefa) {
        Projeto projeto = projetoRepository.findById(id).orElse(null);
        if (projeto == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Projeto não encontrado"));
        }
        tarefa.setProjeto(projeto);

        if (tarefa.getStatus() != null && !tarefa.getStatus().trim().isEmpty()) {
            tarefa.setStatus(tarefa.getStatus().trim());
            if ("Feito".equalsIgnoreCase(tarefa.getStatus())) {
                if (tarefa.getPercentualConcluido() == null || tarefa.getPercentualConcluido() == 0) {
                    tarefa.setPercentualConcluido(100);
                }
            } else if ("Fazendo".equalsIgnoreCase(tarefa.getStatus())) {
                if (tarefa.getPercentualConcluido() == null || tarefa.getPercentualConcluido() == 0) {
                    tarefa.setPercentualConcluido(50);
                }
            } else if ("A Fazer".equalsIgnoreCase(tarefa.getStatus())) {
                tarefa.setPercentualConcluido(0);
            }
        } else {
            if (tarefa.getPercentualConcluido() == null) {
                tarefa.setPercentualConcluido(0);
                tarefa.setStatus("A Fazer");
            } else if (tarefa.getPercentualConcluido() == 100) {
                tarefa.setStatus("Feito");
            } else if (tarefa.getPercentualConcluido() > 0) {
                tarefa.setStatus("Fazendo");
            } else {
                tarefa.setStatus("A Fazer");
            }
        }

        int dur = (tarefa.getDuracaoDias() != null && tarefa.getDuracaoDias() > 0) ? tarefa.getDuracaoDias() : 1;
        if (tarefa.getPercentualConcluido() != null && tarefa.getPercentualConcluido() >= 100) {
            if (tarefa.getDataConclusaoReal() == null) tarefa.setDataConclusaoReal(LocalDate.now());
            if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now().minusDays(dur));
        } else if (tarefa.getPercentualConcluido() != null && tarefa.getPercentualConcluido() > 0) {
            if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now());
        }

        Tarefa salva = tarefaRepository.save(tarefa);
        if (salva.getPercentualConcluido() != null && salva.getPercentualConcluido() >= 100) {
            try { ragService.aprenderComTarefaConcluida(projeto, salva); } catch (Exception ignored) {}
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    // PUT /api/projetos/{projetoId}/tarefas/{tarefaId} - Atualiza tarefa, progresso e datas de execução
    @PutMapping("/{projetoId}/tarefas/{tarefaId}")
    public ResponseEntity<?> atualizarTarefa(
            @PathVariable Long projetoId,
            @PathVariable Long tarefaId,
            @RequestBody Tarefa dadosAtualizados) {
        return tarefaRepository.findById(tarefaId).map(tarefa -> {
            if (tarefa.getProjeto() != null && !tarefa.getProjeto().getId().equals(projetoId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "A tarefa não pertence a este projeto"));
            }
            if (dadosAtualizados.getDescricao() != null && !dadosAtualizados.getDescricao().trim().isEmpty()) {
                tarefa.setDescricao(dadosAtualizados.getDescricao().trim());
            }
            if (dadosAtualizados.getDuracaoDias() != null) {
                tarefa.setDuracaoDias(dadosAtualizados.getDuracaoDias());
            }
            if (dadosAtualizados.getTipoDependencia() != null) {
                tarefa.setTipoDependencia(dadosAtualizados.getTipoDependencia());
            }

            // Atualização de Status explícito
            if (dadosAtualizados.getStatus() != null && !dadosAtualizados.getStatus().trim().isEmpty()) {
                String novoStatus = dadosAtualizados.getStatus().trim();
                tarefa.setStatus(novoStatus);
                if ("Feito".equalsIgnoreCase(novoStatus)) {
                    tarefa.setPercentualConcluido(100);
                    if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now());
                    if (tarefa.getDataConclusaoReal() == null) tarefa.setDataConclusaoReal(LocalDate.now());
                } else if ("A Fazer".equalsIgnoreCase(novoStatus)) {
                    tarefa.setPercentualConcluido(0);
                    tarefa.setDataInicioReal(null);
                    tarefa.setDataConclusaoReal(null);
                } else if ("Fazendo".equalsIgnoreCase(novoStatus)) {
                    if (tarefa.getPercentualConcluido() == null || tarefa.getPercentualConcluido() == 0 || tarefa.getPercentualConcluido() == 100) {
                        tarefa.setPercentualConcluido(50);
                    }
                    if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now());
                    tarefa.setDataConclusaoReal(null);
                }
            }

            // Atualização de progresso e datas reais
            if (dadosAtualizados.getPercentualConcluido() != null) {
                int pct = Math.max(0, Math.min(100, dadosAtualizados.getPercentualConcluido()));
                tarefa.setPercentualConcluido(pct);

                if (pct == 0) {
                    tarefa.setStatus("A Fazer");
                    if (dadosAtualizados.getDataInicioReal() == null) tarefa.setDataInicioReal(null);
                    if (dadosAtualizados.getDataConclusaoReal() == null) tarefa.setDataConclusaoReal(null);
                } else if (pct < 100) {
                    tarefa.setStatus("Fazendo");
                    if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now());
                    tarefa.setDataConclusaoReal(null);
                } else { // 100%
                    tarefa.setStatus("Feito");
                    if (tarefa.getDataInicioReal() == null) tarefa.setDataInicioReal(LocalDate.now());
                    if (tarefa.getDataConclusaoReal() == null) tarefa.setDataConclusaoReal(LocalDate.now());
                }
            }

            if (dadosAtualizados.getDataInicioReal() != null) {
                tarefa.setDataInicioReal(dadosAtualizados.getDataInicioReal());
            }
            if (dadosAtualizados.getDataConclusaoReal() != null) {
                tarefa.setDataConclusaoReal(dadosAtualizados.getDataConclusaoReal());
                tarefa.setPercentualConcluido(100);
                tarefa.setStatus("Feito");
            }

            Tarefa atualizada = tarefaRepository.save(tarefa);
            if (atualizada.getPercentualConcluido() != null && atualizada.getPercentualConcluido() >= 100) {
                try { ragService.aprenderComTarefaConcluida(atualizada.getProjeto(), atualizada); } catch (Exception ignored) {}
            }
            return ResponseEntity.ok(atualizada);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Tarefa não encontrada")));
    }

    // DELETE /api/projetos/{projetoId}/tarefas/{tarefaId} - Exclui a tarefa de fato do banco de dados
    @DeleteMapping("/{projetoId}/tarefas/{tarefaId}")
    public ResponseEntity<?> excluirTarefa(
            @PathVariable Long projetoId,
            @PathVariable Long tarefaId) {
        return tarefaRepository.findById(tarefaId).map(tarefa -> {
            if (tarefa.getProjeto() != null && !tarefa.getProjeto().getId().equals(projetoId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "A tarefa não pertence a este projeto"));
            }

            // Remove referências dessa tarefa como predecessora em outras tarefas do projeto
            List<Tarefa> todasTarefas = tarefaRepository.findByProjetoIdOrderByOrdemSequencialAsc(projetoId);
            for (Tarefa t : todasTarefas) {
                if (t.getIdsPredecessoras() != null && t.getIdsPredecessoras().contains(tarefaId)) {
                    t.getIdsPredecessoras().remove(tarefaId);
                    tarefaRepository.save(t);
                }
            }

            tarefaRepository.delete(tarefa);
            return ResponseEntity.ok(Map.of("message", "Tarefa excluída com sucesso!"));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Tarefa não encontrada")));
    }

    // POST /api/projetos/{id}/riscos - Cadastra um risco no projeto
    @PostMapping("/{id}/riscos")
    public ResponseEntity<?> adicionarRisco(@PathVariable Long id, @RequestBody Risco risco) {
        Projeto projeto = projetoRepository.findById(id).orElse(null);
        if (projeto == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Projeto não encontrado"));
        }
        if (risco.getDescricao() == null || risco.getDescricao().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A descrição do risco é obrigatória"));
        }

        double prob = risco.getProbabilidade() != null ? risco.getProbabilidade() : 0.5;
        if (prob > 1.0 && prob <= 100.0) prob /= 100.0;
        risco.setProbabilidade(Math.max(0.01, Math.min(1.0, prob)));

        if (risco.getImpacto() == null || risco.getImpacto() < 0) {
            risco.setImpacto(1.0);
        }

        risco.setId(null);
        risco.setProjeto(projeto);
        Risco salvo = riscoRepository.save(risco);
        try { ragService.aprenderComRisco(projeto, salvo); } catch (Exception ignored) {}
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    // PUT /api/projetos/{projetoId}/riscos/{riscoId} - Atualiza um risco do projeto
    @PutMapping("/{projetoId}/riscos/{riscoId}")
    public ResponseEntity<?> atualizarRisco(
            @PathVariable Long projetoId,
            @PathVariable Long riscoId,
            @RequestBody Risco dadosAtualizados) {
        return riscoRepository.findById(riscoId).map(risco -> {
            if (risco.getProjeto() != null && !risco.getProjeto().getId().equals(projetoId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "O risco não pertence a este projeto"));
            }
            if (dadosAtualizados.getDescricao() != null && !dadosAtualizados.getDescricao().trim().isEmpty()) {
                risco.setDescricao(dadosAtualizados.getDescricao().trim());
            }
            if (dadosAtualizados.getProbabilidade() != null) {
                double prob = dadosAtualizados.getProbabilidade();
                if (prob > 1.0 && prob <= 100.0) prob /= 100.0;
                risco.setProbabilidade(Math.max(0.01, Math.min(1.0, prob)));
            }
            if (dadosAtualizados.getImpacto() != null && dadosAtualizados.getImpacto() >= 0) {
                risco.setImpacto(dadosAtualizados.getImpacto());
            }

            double prob = risco.getProbabilidade() != null ? risco.getProbabilidade() : 0.5;
            double imp = risco.getImpacto() != null ? risco.getImpacto() : 1.0;
            double exposicao = prob * imp;
            if (exposicao >= 3.0) risco.setNivelSeveridade("Crítico");
            else if (exposicao >= 1.5) risco.setNivelSeveridade("Alto");
            else if (exposicao >= 0.5) risco.setNivelSeveridade("Médio");
            else risco.setNivelSeveridade("Baixo");

            Risco salvo = riscoRepository.save(risco);
            try { ragService.aprenderComRisco(salvo.getProjeto(), salvo); } catch (Exception ignored) {}
            return ResponseEntity.ok(salvo);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Risco não encontrado")));
    }

    // DELETE /api/projetos/{projetoId}/riscos/{riscoId} - Exclui um risco do projeto
    @DeleteMapping("/{projetoId}/riscos/{riscoId}")
    public ResponseEntity<?> excluirRisco(@PathVariable Long projetoId, @PathVariable Long riscoId) {
        return riscoRepository.findById(riscoId).map(risco -> {
            if (risco.getProjeto() != null && !risco.getProjeto().getId().equals(projetoId)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "O risco não pertence a este projeto"));
            }
            riscoRepository.delete(risco);
            return ResponseEntity.ok(Map.of("message", "Risco excluído com sucesso!"));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Risco não encontrado")));
    }

    // PUT /api/projetos/{id} - Atualiza o nome / descrição de um projeto no banco
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizarProjeto(@PathVariable Long id, @RequestBody Projeto dadosAtualizados) {
        return projetoRepository.findById(id).<ResponseEntity<?>>map(projeto -> {
            if (dadosAtualizados.getNome() != null && !dadosAtualizados.getNome().trim().isEmpty()) {
                projeto.setNome(dadosAtualizados.getNome().trim());
            }
            if (dadosAtualizados.getDescricao() != null) {
                projeto.setDescricao(dadosAtualizados.getDescricao().trim());
            }
            if (dadosAtualizados.getDataInicio() != null) {
                projeto.setDataInicio(dadosAtualizados.getDataInicio());
            }
            if (dadosAtualizados.getDataFimPlanejada() != null) {
                projeto.setDataFimPlanejada(dadosAtualizados.getDataFimPlanejada());
            }
            Projeto salvo = projetoRepository.save(projeto);
            return ResponseEntity.ok(salvo);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Projeto não encontrado")));
    }

    // GET /api/projetos/{id}/licoes - Lista todas as lições aprendidas da base RAG
    @GetMapping("/{id}/licoes")
    public ResponseEntity<List<LicaoAprendida>> listarLicoes(@PathVariable Long id) {
        return ResponseEntity.ok(ragService.todasAsLicoes());
    }

    // POST /api/projetos/{id}/licoes - Registra uma nova lição aprendida na base RAG
    @PostMapping("/{id}/licoes")
    public ResponseEntity<?> adicionarLicao(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String categoria = body.getOrDefault("categoria", "Geral");
        String descricao = body.get("descricaoConhecimento");
        if (descricao == null || descricao.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A descrição da lição aprendida é obrigatória"));
        }
        LicaoAprendida salva = ragService.salvarLicao(categoria, descricao);
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    // DELETE /api/projetos/{id}/licoes/{licaoId} - Remove uma lição aprendida
    @DeleteMapping("/{id}/licoes/{licaoId}")
    public ResponseEntity<?> excluirLicao(@PathVariable Long id, @PathVariable Long licaoId) {
        boolean removida = ragService.excluirLicao(licaoId);
        if (removida) {
            return ResponseEntity.ok(Map.of("message", "Lição excluída com sucesso!"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Lição não encontrada"));
    }

    // DELETE /api/projetos/{id} - Remove um projeto
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletarProjeto(@PathVariable Long id) {
        if (projetoRepository.existsById(id)) {
            projetoRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Projeto excluído com sucesso!"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Projeto não encontrado"));
    }
}