package com.projectmind.controller;

import com.projectmind.domain.Usuario;
import com.projectmind.dto.AnaliseProjetoDTO;
import com.projectmind.dto.DiagnosticoDTO;
import com.projectmind.dto.PromptRequestDTO;
import com.projectmind.repository.UsuarioRepository;
import com.projectmind.service.AnaliseProjetoService;
import com.projectmind.service.AuditoriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auditoria")
@CrossOrigin(origins = "*")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;
    private final AnaliseProjetoService analiseProjetoService;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaController(
            AuditoriaService auditoriaService,
            AnaliseProjetoService analiseProjetoService,
            UsuarioRepository usuarioRepository) {
        this.auditoriaService = auditoriaService;
        this.analiseProjetoService = analiseProjetoService;
        this.usuarioRepository = usuarioRepository;
    }

    private boolean isUsuarioAdmin(Long headerUserId, String authHeader) {
        Long idFinal = headerUserId;
        if (idFinal == null && authHeader != null && authHeader.contains("pm-token-")) {
            try {
                String token = authHeader.replace("Bearer ", "").trim();
                idFinal = Long.parseLong(token.replace("pm-token-", "").trim());
            } catch (Exception ignored) {
            }
        }
        if (idFinal == null)
            return false;
        return usuarioRepository.findById(idFinal).map(Usuario::isAdmin).orElse(false);
    }

    // POST /api/auditoria/analisar/{projetoId}
    // Executa a auditoria completa: Grafos (CPM) + RAG + Monte Carlo + Gemini IA
    @PostMapping("/analisar/{projetoId}")
    public ResponseEntity<DiagnosticoDTO> executarAuditoriaCompleta(
            @PathVariable Long projetoId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        DiagnosticoDTO diagnostico = auditoriaService.processarAnaliseIA(projetoId);
        if (!isUsuarioAdmin(headerUserId, authHeader) && diagnostico != null) {
            diagnostico.setLicoesAprendidasRelevantes(List.of());
            if (diagnostico.getAnalise() != null) {
                diagnostico.setAnalise(diagnostico.getAnalise().semLicoes());
            }
        }
        return ResponseEntity.ok(diagnostico);
    }

    // GET /api/auditoria/metricas/{projetoId}
    // Retorna as métricas analíticas e preditivas do projeto
    @GetMapping("/metricas/{projetoId}")
    public ResponseEntity<?> obterMetricasProjeto(
            @PathVariable Long projetoId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        AnaliseProjetoDTO analise = analiseProjetoService.analisar(projetoId);
        if (analise == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isUsuarioAdmin(headerUserId, authHeader)) {
            analise = analise.semLicoes();
        }
        return ResponseEntity.ok(analise);
    }

    // POST /api/auditoria/chat
    // Endpoint para conversar interativamente no chat com a IA Gemini
    @PostMapping("/chat")
    public ResponseEntity<?> interagirChatIA(@RequestBody PromptRequestDTO request) {
        Long projetoId = request.getProjetoId();
        String pergunta = request.getPergunta();
        String contexto = request.getContextoAdicional();
        boolean primeiraMensagem = request.getPrimeiraMensagem() != null ? request.getPrimeiraMensagem() : true;

        if (pergunta == null || pergunta.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A pergunta não pode ser vazia."));
        }

        String respostaIA = auditoriaService.interagirChatIA(projetoId, pergunta, contexto, primeiraMensagem);
        return ResponseEntity.ok(Map.of("resposta", respostaIA));
    }
}
