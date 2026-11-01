package com.projectmind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectmind.domain.FeedbackIA;
import com.projectmind.domain.Projeto;
import com.projectmind.domain.Tarefa;
import com.projectmind.dto.AnaliseProjetoDTO;
import com.projectmind.dto.DiagnosticoDTO;
import com.projectmind.repository.FeedbackIARepository;
import com.projectmind.repository.ProjetoRepository;
import com.projectmind.repository.TarefaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AuditoriaService {

    private final ProjetoRepository projetoRepository;
    private final TarefaRepository tarefaRepository;
    private final AnaliseProjetoService analiseProjetoService;
    private final FeedbackIARepository feedbackIARepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    private static final Pattern SAUDACAO_REDUNDANTE = Pattern.compile(
        "^\\s*(ol[áa]|oi|bom dia|boa tarde|boa noite)\\b[^\\n]*?(gemini|projectmind|assistente|intelig[êe]ncia artificial)[^\\n]*(\\n+|$)",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern BLOCO_TAREFAS_AUTO = Pattern.compile(
        "\\[TAREFAS_AUTO_START\\](.*?)\\[TAREFAS_AUTO_END\\]",
        Pattern.DOTALL
    );

    public AuditoriaService(
        ProjetoRepository projetoRepository,
        TarefaRepository tarefaRepository,
        AnaliseProjetoService analiseProjetoService,
        FeedbackIARepository feedbackIARepository,
        GeminiService geminiService,
        ObjectMapper objectMapper
    ) {
        this.projetoRepository = projetoRepository;
        this.tarefaRepository = tarefaRepository;
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

        String instrucaoAgenteBacklog = """
            
            REGRA AGÊNTICA DE CRIAÇÃO AUTOMÁTICA DE TAREFAS NO BACKLOG:
            - Quando o usuário pedir para criar, gerar, cadastrar, montar ou adicionar as tarefas/etapas/backlog/cronograma no projeto (seja a partir de uma ideia geral como "sistema de pedidos, vendas e estoque", seja com base nas dicas que você acabou de dar na conversa, ou a partir de RF/RNF):
              1. NÃO bloqueie e NÃO exija RF ou RNF antes de criar! Gere imediatamente de 5 a 8 tarefas técnicas completas, bem descritas e com estimativa realista de prazo em dias corridos.
              2. Apresente as tarefas criadas de forma organizada no texto da resposta e mencione de forma consultiva ao final que, caso o usuário possua Requisitos Funcionais (RF) ou Não-Funcionais (RNF) específicos adicionais depois, ele pode enviá-los para refinar ou expandir o backlog.
              3. OBRIGATORIAMENTE, inclua no final da resposta o bloco exato abaixo (uma linha JSON por tarefa, sem comentários dentro do bloco) para que o backend grave automaticamente as tarefas no banco de dados e no Backlog Kanban do projeto:
            [TAREFAS_AUTO_START]
            {"descricao": "Levantamento de Escopo e Modelagem do Banco de Dados", "duracaoDias": 4}
            {"descricao": "Desenvolvimento da API e Regras de Negócio", "duracaoDias": 6}
            [TAREFAS_AUTO_END]
            - Importante: inclua o bloco [TAREFAS_AUTO_START]...[TAREFAS_AUTO_END] SOMENTE quando o usuário pedir ou concordar em criar/gerar/adicionar tarefas para o projeto. Se ele apenas fizer uma pergunta teórica, responda normalmente e ofereça criar as tarefas no backlog caso ele deseje.
            """;

        String systemPrompt;
        if (primeiraMensagem) {
            systemPrompt = """
                Você é o assistente analítico e agente inteligente de projetos da ProjectMind.
                Você possui acesso direto aos dados matemáticos do projeto (Caminho Crítico CPM, Earned Schedule, atraso/adiantamento, riscos ponderados, histórico e previsões por Monte Carlo) e também pode criar tarefas automaticamente no Backlog do projeto quando solicitado.
                Caso o usuário envie arquivos, protótipos, diagramas, documentação, cronogramas, requisitos funcionais/não-funcionais (RF/NF) ou matriz de riscos para validação, analise o conteúdo de forma técnica, crítica e construtiva, apontando coerência com os dados do projeto, gargalos potenciais, riscos não mapeados e recomendações práticas.
                Nesta primeira mensagem da conversa, faça uma breve saudação inicial e em seguida apresente a resposta analítica precisa, profissional e orientada a dados em português.
                """ + instrucaoAgenteBacklog;
        } else {
            systemPrompt = """
                Você é o assistente analítico e agente inteligente de projetos da ProjectMind.
                Esta NÃO é a primeira mensagem da conversa.
                NÃO inclua nenhuma saudação, NÃO diga 'Olá', NÃO se apresente e NÃO repita introduções como 'Eu sou o assistente'.
                Caso o usuário envie arquivos, protótipos, diagramas, documentação, cronogramas, requisitos funcionais/não-funcionais (RF/NF) ou matriz de riscos para validação, analise o conteúdo de forma técnica, crítica e construtiva, apontando coerência com os dados do projeto, gargalos potenciais, riscos não mapeados e recomendações práticas.
                Vá DIRETO ao ponto da dúvida, validação ou criação de tarefas solicitada pelo usuário.
                """ + instrucaoAgenteBacklog;
        }

        String userPrompt = dadosAnaliticos + (contextoAdicional != null ? "[Contexto Adicional / Histórico Recente:\n" + contextoAdicional + "]\n\n" : "") + "Mensagem atual do usuário: " + pergunta;

        String resposta = geminiService.gerarResposta(systemPrompt, userPrompt);

        // Se não for a primeira mensagem, aplica o filtro cirúrgico de remoção de saudação
        if (!primeiraMensagem && resposta != null) {
            resposta = removerSaudacoesIniciais(resposta);
        }

        // Processa eventual bloco [TAREFAS_AUTO_START]...[TAREFAS_AUTO_END] para gravar no banco de dados
        if (resposta != null) {
            resposta = processarCriacaoAutomaticaTarefas(projetoId, resposta);
        }

        return resposta;
    }

    private String processarCriacaoAutomaticaTarefas(Long projetoId, String resposta) {
        Matcher matcher = BLOCO_TAREFAS_AUTO.matcher(resposta);
        if (!matcher.find()) {
            return resposta;
        }

        String blocoJson = matcher.group(1);
        String respostaLimpa = matcher.replaceAll("").trim();

        if (projetoId == null || objectMapper == null) {
            return respostaLimpa + "\n\n⚠️ Para que eu salve essas tarefas automaticamente no Backlog, selecione primeiro um projeto no menu superior da tela!";
        }

        Projeto projeto = projetoRepository.findById(projetoId).orElse(null);
        if (projeto == null) {
            return respostaLimpa;
        }

        List<Tarefa> existentes = tarefaRepository.findByProjetoIdOrderByIdAsc(projetoId);
        Set<String> descricoesExistentes = existentes.stream()
            .map(t -> t.getDescricao() != null ? t.getDescricao().trim().toLowerCase() : "")
            .collect(Collectors.toSet());

        int ordemAtual = existentes.size() + 1;
        Long ultimaTarefaId = existentes.isEmpty() ? null : existentes.get(existentes.size() - 1).getId();
        int criadasCount = 0;

        String[] linhas = blocoJson.split("\\r?\\n");
        for (String linha : linhas) {
            String l = linha.trim();
            if (l.startsWith(",") || l.endsWith(",")) {
                l = l.replaceAll("^,+|,+$", "").trim();
            }
            if (!l.startsWith("{") || !l.endsWith("}")) continue;

            try {
                JsonNode node = objectMapper.readTree(l);
                String desc = node.has("descricao") ? node.get("descricao").asText("").trim() : "";
                int duracao = node.has("duracaoDias") ? node.get("duracaoDias").asInt(4) : 4;
                if (duracao <= 0) duracao = 3;

                if (!desc.isEmpty() && !descricoesExistentes.contains(desc.toLowerCase())) {
                    Tarefa nova = new Tarefa();
                    nova.setProjeto(projeto);
                    nova.setDescricao(desc);
                    nova.setDuracaoDias(duracao);
                    nova.setStatus("A Fazer");
                    nova.setPercentualConcluido(0);
                    nova.setTipoDependencia("TI");
                    nova.setOrdemSequencial(ordemAtual++);
                    if (ultimaTarefaId != null) {
                        nova.setIdsPredecessoras(new ArrayList<>(List.of(ultimaTarefaId)));
                    }

                    Tarefa salva = tarefaRepository.save(nova);
                    ultimaTarefaId = salva.getId();
                    descricoesExistentes.add(desc.toLowerCase());
                    criadasCount++;
                }
            } catch (Exception ignored) {}
        }

        if (criadasCount > 0) {
            respostaLimpa += String.format(
                "\n\n✅ [Automação ProjectMind]: %d tarefa(s) foram cadastradas automaticamente no Backlog ('A Fazer') e integradas ao Caminho Crítico (CPM) do projeto \"%s\"!",
                criadasCount, projeto.getNome()
            );
        }

        return respostaLimpa;
    }

    private String removerSaudacoesIniciais(String texto) {
        if (texto == null || texto.isBlank()) return "";
        String filtrado = SAUDACAO_REDUNDANTE.matcher(texto).replaceFirst("").trim();
        return filtrado.isEmpty() ? texto : filtrado;
    }
}
