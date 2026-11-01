package com.projectmind.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectmind.domain.FeedbackIA;
import com.projectmind.domain.Projeto;
import com.projectmind.dto.AnaliseProjetoDTO;
import com.projectmind.dto.DiagnosticoDTO;
import com.projectmind.repository.FeedbackIARepository;
import com.projectmind.repository.ProjetoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AuditoriaService {

    private final ProjetoRepository projetoRepository;
    private final AnaliseProjetoService analiseProjetoService;
    private final FeedbackIARepository feedbackIARepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    private static final Pattern SAUDACAO_REDUNDANTE = Pattern.compile(
        "^\\s*(ol[áa]|oi|bom dia|boa tarde|boa noite)\\b[^\\n]*?(gemini|projectmind|assistente|intelig[êe]ncia artificial)[^\\n]*(\\n+|$)",
        Pattern.CASE_INSENSITIVE
    );

    public AuditoriaService(
        ProjetoRepository projetoRepository,
        AnaliseProjetoService analiseProjetoService,
        FeedbackIARepository feedbackIARepository,
        GeminiService geminiService,
        ObjectMapper objectMapper
    ) {
        this.projetoRepository = projetoRepository;
        this.analiseProjetoService = analiseProjetoService;
        this.feedbackIARepository = feedbackIARepository;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
    }

    /**
     * Processa a análise prescritiva com base na camada analítica quantitativa e IA generativa.
     */
    public DiagnosticoDTO processarAnaliseIA(Long projetoId) {
        Projeto projeto = projetoRepository.findById(projetoId).orElse(null);
        if (projeto == null) {
            DiagnosticoDTO dtoVazio = new DiagnosticoDTO();
            dtoVazio.setProjetoId(projetoId);
            dtoVazio.setSugestoesIA(List.of("Projeto não localizado no banco de dados."));
            return dtoVazio;
        }

        // Executa a modelagem analítica completa
        AnaliseProjetoDTO analise = analiseProjetoService.analisar(projeto);

        DiagnosticoDTO diagnostico = new DiagnosticoDTO();
        diagnostico.setProjetoId(projetoId);
        diagnostico.setScoreSaude(analise.scoreSaude() != null ? analise.scoreSaude() : 50);
        diagnostico.setAnalise(analise);

        // Caminho Crítico
        List<String> criticasIds = analise.cronograma().tarefas().stream()
            .filter(AnaliseProjetoDTO.TarefaCronograma::critica)
            .map(t -> String.valueOf(t.id()))
            .collect(Collectors.toList());
        diagnostico.setTarefasCriticasIds(criticasIds);

        if (criticasIds.isEmpty()) {
            diagnostico.setAnaliseCaminhoCritico("Nenhuma dependência crítica identificada no momento.");
        } else {
            diagnostico.setAnaliseCaminhoCritico(
                String.format("Caminho Crítico (CPM) composto por %d tarefas (IDs: %s). Duração total mínima: %d dias corridos.",
                    criticasIds.size(),
                    String.join(" -> ", criticasIds),
                    analise.caracteristicas().duracaoCpmDias()
                )
            );
        }

        diagnostico.setLicoesAprendidasRelevantes(analise.licoesRelevantes());

        // Contexto analítico estruturado para o Gemini
        String dadosAnaliticos = analiseProjetoService.formatarParaPrompt(analise);

        String systemPrompt = """
            Você é o motor analítico e prescritivo da plataforma ProjectMind, operando como um modelo inteligente de gerenciamento de projetos.
            Sua função é apresentar uma análise precisa, altamente técnica, orientada a dados e fundamentada nos metadados analíticos calculados pelo sistema (CPM, Earned Schedule, Simulação de Monte Carlo e RAG de lições aprendidas).

            DIRETRIZES FUNDAMENTAIS:
            1. Seja exato e estritamente fiel aos números fornecidos. NUNCA invente métricas, porcentagens ou datas que não constem nos dados analíticos.
            2. Estruture sua resposta com os seguintes tópicos bem definidos:
               - 1. Diagnóstico de Prazo (situação do cronograma, SPI, atraso/adiantamento e progresso real vs planejado)
               - 2. Características Estruturais do Projeto (volume de tarefas, caminho crítico e gargalos)
               - 3. Riscos Críticos e Exposição Quantitativa (impactos calculados em dias)
               - 4. Lições Aprendidas e Calibração Histórica (recomendações com base nas lições identificadas)
               - 5. Previsões Estocásticas de Entrega (cenários P50 mais provável, P80 conservador e probabilidade de cumprimento do prazo)
               - 6. Plano de Ação Prescritivo (máximo 4 ações prioritárias e acionáveis)
            3. Responda em Português do Brasil com tom analítico profissional, direto e objetivo.
            """;

        String userPrompt = "Por favor, elabore a análise prescritiva oficial do projeto com base nas medições a seguir:\n\n" + dadosAnaliticos;

        String respostaIA = geminiService.gerarResposta(systemPrompt, userPrompt);
        diagnostico.setSugestoesIA(List.of(respostaIA));

        // Registra histórico de FeedbackIA para calibrações de tendência futuras
        try {
            FeedbackIA feedback = new FeedbackIA();
            feedback.setProjeto(projeto);
            feedback.setScoreSaude(analise.scoreSaude());
            feedback.setDataAnalise(LocalDateTime.now());
            feedback.setSugestaoMelhoria(respostaIA);
            if (objectMapper != null) {
                feedback.setDiagnosticoJson(objectMapper.writeValueAsString(analise));
            }
            feedbackIARepository.save(feedback);
        } catch (Exception ignored) {}

        return diagnostico;
    }

    /**
     * Interage diretamente com a IA no contexto do chat, injetando toda a inteligência analítica do projeto.
     */
    public String interagirChatIA(Long projetoId, String pergunta, String contextoAdicional) {
        return interagirChatIA(projetoId, pergunta, contextoAdicional, true);
    }

    public String interagirChatIA(Long projetoId, String pergunta, String contextoAdicional, boolean primeiraMensagem) {
        String dadosAnaliticos = "";
        if (projetoId != null) {
            AnaliseProjetoDTO analise = analiseProjetoService.analisar(projetoId);
            if (analise != null) {
                dadosAnaliticos = analiseProjetoService.formatarParaPrompt(analise) + "\n\n";
            }
        }

        String systemPrompt;
        if (primeiraMensagem) {
            systemPrompt = """
                Você é o assistente analítico e inteligente da ProjectMind.
                Você possui acesso direto aos dados matemáticos do projeto (Caminho Crítico CPM, Earned Schedule, atraso/adiantamento, riscos ponderados, histórico e previsões por Monte Carlo).
                Caso o usuário envie arquivos, protótipos, diagramas, documentação, cronogramas, requisitos funcionais/não-funcionais (RF/NF) ou matriz de riscos para validação, analise o conteúdo de forma técnica, crítica e construtiva, apontando coerência com os dados do projeto, gargalos potenciais, riscos não mapeados e recomendações práticas.
                Nesta primeira mensagem da conversa, faça uma breve saudação inicial e em seguida apresente a resposta analítica precisa, profissional e orientada a dados em português.
                """;
        } else {
            systemPrompt = """
                Você é o assistente analítico da ProjectMind.
                Esta NÃO é a primeira mensagem da conversa.
                NÃO inclua nenhuma saudação, NÃO diga 'Olá', NÃO se apresente e NÃO repita introduções como 'Eu sou o assistente'.
                Caso o usuário envie arquivos, protótipos, diagramas, documentação, cronogramas, requisitos funcionais/não-funcionais (RF/NF) ou matriz de riscos para validação, analise o conteúdo de forma técnica, crítica e construtiva, apontando coerência com os dados do projeto, gargalos potenciais, riscos não mapeados e recomendações práticas.
                Vá DIRETO ao ponto da dúvida ou validação do usuário, utilizando com precisão as métricas analíticas e previsões do projeto calculadas.
                """;
        }

        String userPrompt = dadosAnaliticos + (contextoAdicional != null ? "[Contexto Adicional: " + contextoAdicional + "]\n\n" : "") + "Pergunta do usuário: " + pergunta;

        String resposta = geminiService.gerarResposta(systemPrompt, userPrompt);

        // Se não for a primeira mensagem, aplica o filtro cirúrgico de remoção de saudação
        if (!primeiraMensagem && resposta != null) {
            resposta = removerSaudacoesIniciais(resposta);
        }

        return resposta;
    }

    private String removerSaudacoesIniciais(String texto) {
        if (texto == null || texto.isBlank()) return "";
        // Remove apenas linha de abertura com autoapresentação redundante da IA
        String filtrado = SAUDACAO_REDUNDANTE.matcher(texto).replaceFirst("").trim();
        return filtrado.isEmpty() ? texto : filtrado;
    }
}