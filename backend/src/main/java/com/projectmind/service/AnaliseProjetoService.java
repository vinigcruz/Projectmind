package com.projectmind.service;

import com.projectmind.domain.*;
import com.projectmind.dto.AnaliseProjetoDTO;
import com.projectmind.dto.AnaliseProjetoDTO.*;
import com.projectmind.repository.FeedbackIARepository;
import com.projectmind.repository.ProjetoRepository;
import com.projectmind.repository.RiscoRepository;
import com.projectmind.repository.TarefaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnaliseProjetoService {

    private final ProjetoRepository projetoRepository;
    private final TarefaRepository tarefaRepository;
    private final RiscoRepository riscoRepository;
    private final FeedbackIARepository feedbackIARepository;
    private final GrafosService grafosService;
    private final RAGService ragService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public AnaliseProjetoService(
        ProjetoRepository projetoRepository,
        TarefaRepository tarefaRepository,
        RiscoRepository riscoRepository,
        FeedbackIARepository feedbackIARepository,
        GrafosService grafosService,
        RAGService ragService
    ) {
        this.projetoRepository = projetoRepository;
        this.tarefaRepository = tarefaRepository;
        this.riscoRepository = riscoRepository;
        this.feedbackIARepository = feedbackIARepository;
        this.grafosService = grafosService;
        this.ragService = ragService;
    }

    public AnaliseProjetoDTO analisar(Long projetoId) {
        if (projetoId == null) return null;
        Projeto projeto = projetoRepository.findById(projetoId).orElse(null);
        if (projeto == null) return null;
        return analisar(projeto);
    }

    public AnaliseProjetoDTO analisar(Projeto projeto) {
        Long pid = projeto.getId();
        List<Tarefa> tarefas = pid != null
            ? tarefaRepository.findByProjetoIdOrderByIdAsc(pid)
            : (projeto.getTarefas() != null ? projeto.getTarefas() : Collections.emptyList());

        List<Risco> riscos = pid != null
            ? riscoRepository.findByProjetoId(pid)
            : (projeto.getRiscos() != null ? projeto.getRiscos() : Collections.emptyList());

        List<FeedbackIA> analisesAnteriores = pid != null
            ? feedbackIARepository.findByProjetoIdOrderByDataAnaliseDesc(pid)
            : Collections.emptyList();

        List<Tarefa> tarefasHistoricas = new ArrayList<>();
        if (projeto.getUsuario() != null && projeto.getUsuario().getId() != null) {
            try {
                tarefasHistoricas.addAll(tarefaRepository.findByProjetoUsuarioId(projeto.getUsuario().getId()));
            } catch (Exception ignored) {}
        }
        Set<Long> idsHistoricos = tarefasHistoricas.stream()
            .map(Tarefa::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        for (Tarefa t : tarefas) {
            if (t.getId() == null || !idsHistoricos.contains(t.getId())) {
                tarefasHistoricas.add(t);
            }
        }

        List<LicaoAprendida> todasLicoes = ragService.todasAsLicoes();

        return calcular(
            projeto,
            tarefas,
            riscos,
            tarefasHistoricas,
            todasLicoes,
            analisesAnteriores,
            LocalDate.now()
        );
    }

    /**
     * Motor analítico determinístico + estocástico (puro e testável unitariamente).
     */
    public AnaliseProjetoDTO calcular(
        Projeto projeto,
        List<Tarefa> tarefas,
        List<Risco> riscos,
        List<Tarefa> tarefasHistoricasUsuario,
        List<LicaoAprendida> todasLicoes,
        List<FeedbackIA> analisesAnteriores,
        LocalDate hoje
    ) {
        String nomeProjeto = projeto != null && projeto.getNome() != null ? projeto.getNome() : "Projeto";
        Long projetoId = projeto != null ? projeto.getId() : null;

        LocalDate dataInicio = (projeto != null && projeto.getDataInicio() != null) ? projeto.getDataInicio() : hoje;
        LocalDate prazoContratado = (projeto != null) ? projeto.getDataFimPlanejada() : null;

        List<String> alertas = new ArrayList<>();
        List<String> premissas = new ArrayList<>();
        premissas.add("Prazos calculados em dias corridos.");
        premissas.add("Dependências modeladas como Término-Início (FS).");
        premissas.add("Previsão baseada em Earned Schedule com Simulação de Monte Carlo calibrada.");

        if (tarefas == null || tarefas.isEmpty()) {
            alertas.add("Nenhuma tarefa cadastrada no projeto.");
            return new AnaliseProjetoDTO(
                projetoId,
                nomeProjeto,
                null,
                new Caracteristicas(0, 0, 0, 0, 0, 0, 0.0, 0, 0.0, 0.0, 0),
                new Cronograma(dataInicio, dataInicio, prazoContratado, 0, 0.0, 0.0, null, 0.0, "SEM_DADOS", Collections.emptyList()),
                new Previsao(false, "Nenhum", dataInicio, dataInicio, dataInicio, null, 1.0, 0, "Sem tarefas para previsão."),
                Collections.emptyList(),
                0.0,
                new Historico(0, null, null, null, 0, 0, 0, null, "SEM_HISTORICO"),
                Collections.emptyList(),
                alertas,
                premissas
            );
        }

        // 1. Execução do Método do Caminho Crítico (CPM)
        GrafosService.ResultadoCpm cpm;
        boolean ciclo = false;
        try {
            cpm = (grafosService != null)
                ? grafosService.calcularCpm(tarefas)
                : new GrafosService().calcularCpm(tarefas);
        } catch (IllegalStateException e) {
            ciclo = true;
            alertas.add("Dependência cíclica identificada nas tarefas do cronograma.");
            cpm = new GrafosService.ResultadoCpm(Collections.emptyList(), 0, Collections.emptyList(), true, Collections.emptyMap());
        }

        Map<Long, GrafosService.TarefaCpm> cpmMap = cpm.tarefas().stream()
            .collect(Collectors.toMap(GrafosService.TarefaCpm::id, t -> t, (a, b) -> a));

        int duracaoCpm = cpm.duracaoTotal();
        LocalDate dataFimCpm = dataInicio.plusDays(duracaoCpm);

        if (prazoContratado != null && prazoContratado.isBefore(dataFimCpm)) {
            alertas.add("O prazo contratado (" + prazoContratado.format(DATE_FMT) + ") é anterior à duração mínima física calculada pelo CPM (" + dataFimCpm.format(DATE_FMT) + ").");
        }

        // 2. Classificação de Tarefas e Progresso Físico
        int concluidas = 0;
        int emAndamento = 0;
        int naoIniciadas = 0;
        int semDuracao = 0;
        double somaDuracoes = 0.0;
        double valorPlanejadoTotal = 0.0; // BAC
        double valorAgregadoReal = 0.0;   // EV
        int totalDependencias = 0;
        int semPredecessora = 0;

        List<TarefaCronograma> tarefasCronograma = new ArrayList<>();
        LocalDate dataUltimaConclusao = null;

        for (Tarefa t : tarefas) {
            int dur = (t.getDuracaoDias() != null && t.getDuracaoDias() > 0) ? t.getDuracaoDias() : 1;
            if (t.getDuracaoDias() == null) semDuracao++;
            somaDuracoes += dur;
            valorPlanejadoTotal += dur;

            int predsCount = t.getIdsPredecessoras() != null ? t.getIdsPredecessoras().size() : 0;
            totalDependencias += predsCount;
            if (predsCount == 0) semPredecessora++;

            // Percentual real normalizado
            int pct;
            if (t.getDataConclusaoReal() != null) {
                pct = 100;
            } else if (t.getPercentualConcluido() != null) {
                pct = Math.max(0, Math.min(100, t.getPercentualConcluido()));
            } else {
                pct = 0;
            }

            if (pct >= 100) {
                concluidas++;
                if (t.getDataConclusaoReal() != null) {
                    if (dataUltimaConclusao == null || t.getDataConclusaoReal().isAfter(dataUltimaConclusao)) {
                        dataUltimaConclusao = t.getDataConclusaoReal();
                    }
                }
            } else if (pct > 0) {
                emAndamento++;
            } else {
                naoIniciadas++;
            }

            valorAgregadoReal += dur * (pct / 100.0);

            // CPM dados
            GrafosService.TarefaCpm cpmInfo = cpmMap.get(t.getId());
            int es = cpmInfo != null ? cpmInfo.inicioMaisCedo() : 0;
            int ef = cpmInfo != null ? cpmInfo.fimMaisCedo() : dur;
            int folga = cpmInfo != null ? cpmInfo.folga() : 0;
            boolean critica = cpmInfo != null && cpmInfo.critica();

            LocalDate dataInicioEstimada = dataInicio.plusDays(es);
            LocalDate dataFimEstimada = dataInicio.plusDays(ef);

            // Situação e atraso por tarefa
            String situacaoTarefa;
            long diasAtrasoTarefa = 0;

            if (pct >= 100) {
                if (t.getDataConclusaoReal() != null && t.getDataConclusaoReal().isAfter(dataFimEstimada)) {
                    diasAtrasoTarefa = ChronoUnit.DAYS.between(dataFimEstimada, t.getDataConclusaoReal());
                    situacaoTarefa = "CONCLUIDA_COM_ATRASO";
                } else {
                    situacaoTarefa = "CONCLUIDA";
                }
            } else {
                if (hoje.isAfter(dataFimEstimada)) {
                    diasAtrasoTarefa = ChronoUnit.DAYS.between(dataFimEstimada, hoje);
                    situacaoTarefa = "ATRASADA";
                    if (critica) {
                        alertas.add("Tarefa crítica '" + t.getDescricao() + "' está atrasada em " + diasAtrasoTarefa + " dia(s).");
                    }
                } else if (pct == 0 && hoje.isAfter(dataInicioEstimada)) {
                    diasAtrasoTarefa = ChronoUnit.DAYS.between(dataInicioEstimada, hoje);
                    situacaoTarefa = "INICIO_ATRASADO";
                } else if (pct > 0) {
                    situacaoTarefa = "EM_ANDAMENTO";
                } else {
                    situacaoTarefa = "NAO_INICIADA";
                }
            }

            tarefasCronograma.add(new TarefaCronograma(
                t.getId(),
                t.getDescricao(),
                dur,
                es,
                ef,
                folga,
                critica,
                pct,
                dataInicioEstimada,
                dataFimEstimada,
                t.getDataConclusaoReal(),
                situacaoTarefa,
                diasAtrasoTarefa
            ));
        }

        if (semDuracao > 0) {
            alertas.add(semDuracao + " tarefa(s) sem duração informada (adotado 1 dia como padrão).");
        }

        // 3. Métricas de Cronograma e Earned Schedule (ES)
        long diasDecorridos = hoje.isAfter(dataInicio) ? ChronoUnit.DAYS.between(dataInicio, hoje) : 0;
        double progressoRealPct = valorPlanejadoTotal > 0 ? (valorAgregadoReal / valorPlanejadoTotal) * 100.0 : 0.0;

        // Construção da curva PV(t) dia a dia
        int maxTempoPv = Math.max(duracaoCpm, (int) diasDecorridos + 30);
        double[] pvCurva = new double[maxTempoPv + 1];

        for (int d = 0; d <= maxTempoPv; d++) {
            double pv = 0.0;
            for (TarefaCronograma tc : tarefasCronograma) {
                if (d <= tc.inicioMaisCedo()) {
                    pv += 0.0;
                } else if (d >= tc.fimMaisCedo()) {
                    pv += tc.duracao();
                } else {
                    double fracao = (double) (d - tc.inicioMaisCedo()) / (double) tc.duracao();
                    pv += tc.duracao() * fracao;
                }
            }
            pvCurva[d] = pv;
        }

        double progressoPlanejadoHoje = (diasDecorridos < pvCurva.length) ? pvCurva[(int) diasDecorridos] : valorPlanejadoTotal;
        double progressoPlanejadoPct = valorPlanejadoTotal > 0 ? (progressoPlanejadoHoje / valorPlanejadoTotal) * 100.0 : 0.0;

        // Cálculo de Earned Schedule (ES_t): encontra t onde PV(t) = EV
        double earnedScheduleDias = 0.0;
        if (valorAgregadoReal >= valorPlanejadoTotal) {
            earnedScheduleDias = duracaoCpm;
        } else {
            for (int t = 0; t < maxTempoPv; t++) {
                if (valorAgregadoReal >= pvCurva[t] && valorAgregadoReal <= pvCurva[t + 1]) {
                    double deltaPv = pvCurva[t + 1] - pvCurva[t];
                    if (deltaPv > 1e-6) {
                        earnedScheduleDias = t + (valorAgregadoReal - pvCurva[t]) / deltaPv;
                    } else {
                        earnedScheduleDias = t;
                    }
                    break;
                }
            }
        }

        Double spi = null;
        double atrasoDias = 0.0;
        String situacaoPrazo;

        boolean todasConcluidas = (concluidas == tarefas.size());

        if (todasConcluidas) {
            situacaoPrazo = "CONCLUIDO";
            if (dataUltimaConclusao != null) {
                LocalDate refFim = prazoContratado != null ? prazoContratado : dataFimCpm;
                atrasoDias = ChronoUnit.DAYS.between(refFim, dataUltimaConclusao);
            } else {
                atrasoDias = 0.0;
            }
        } else if (diasDecorridos == 0 && valorAgregadoReal == 0.0) {
            situacaoPrazo = "NAO_INICIADO";
            atrasoDias = 0.0;
        } else {
            atrasoDias = (double) diasDecorridos - earnedScheduleDias;
            spi = diasDecorridos > 0 ? (earnedScheduleDias / (double) diasDecorridos) : 1.0;

            if (atrasoDias >= 1.0) {
                situacaoPrazo = "ATRASADO";
            } else if (atrasoDias <= -1.0) {
                situacaoPrazo = "ADIANTADO";
            } else {
                situacaoPrazo = "NO_PRAZO";
            }
        }

        if (!todasConcluidas && diasDecorridos > 0 && valorAgregadoReal == 0.0) {
            alertas.add("O projeto tem " + diasDecorridos + " dia(s) decorrido(s) mas nenhum avanço foi registrado nas tarefas.");
        }

        // 4. Calibração Histórica (Tarefas concluídas do usuário e do projeto atual)
        List<Double> razoesDuracao = new ArrayList<>();
        List<Tarefa> poolHistorico = new ArrayList<>();
        Set<Long> idsVistos = new HashSet<>();
        if (tarefasHistoricasUsuario != null) {
            for (Tarefa th : tarefasHistoricasUsuario) {
                poolHistorico.add(th);
                if (th.getId() != null) idsVistos.add(th.getId());
            }
        }
        if (tarefas != null) {
            for (Tarefa t : tarefas) {
                if (t.getId() == null || !idsVistos.contains(t.getId())) {
                    poolHistorico.add(t);
                }
            }
        }

        for (Tarefa th : poolHistorico) {
            int durPlanejada = (th.getDuracaoDias() != null && th.getDuracaoDias() > 0) ? th.getDuracaoDias() : 1;
            boolean isConcluida = (th.getPercentualConcluido() != null && th.getPercentualConcluido() >= 100)
                || "Feito".equalsIgnoreCase(th.getStatus())
                || th.getDataConclusaoReal() != null;

            if (isConcluida) {
                if (th.getDataInicioReal() != null && th.getDataConclusaoReal() != null) {
                    long realDias = ChronoUnit.DAYS.between(th.getDataInicioReal(), th.getDataConclusaoReal());
                    double diasEfetivos = realDias > 0 ? (double) realDias : (double) durPlanejada;
                    razoesDuracao.add(diasEfetivos / (double) durPlanejada);
                } else {
                    razoesDuracao.add(1.0);
                }
            }
        }

        Double medianaHistorica = null;
        Double p10Historico = null;
        Double p90Historico = null;
        double fatorCalibracao = 1.0;

        if (razoesDuracao.size() >= 3) {
            Collections.sort(razoesDuracao);
            medianaHistorica = percentil(razoesDuracao, 50);
            p10Historico = percentil(razoesDuracao, 10);
            p90Historico = percentil(razoesDuracao, 90);
            fatorCalibracao = Math.max(0.7, Math.min(2.5, medianaHistorica));
        } else {
            // Se poucas amostras históricas, calibra pelo SPI atual se disponível
            if (spi != null && spi > 0.05) {
                fatorCalibracao = Math.max(0.8, Math.min(2.0, 1.0 / spi));
            }
            alertas.add("Base histórica insuficiente para calibração avançada (< 3 tarefas com histórico completo).");
        }

        // 5. Análise Quantitativa de Riscos
        List<RiscoAnalisado> riscosAnalisados = new ArrayList<>();
        double exposicaoTotalRiscos = 0.0;

        if (riscos != null && !riscos.isEmpty()) {
            for (Risco r : riscos) {
                double prob = r.getProbabilidade() != null ? r.getProbabilidade() : 0.0;
                // Normaliza probabilidade caso venha de 1 a 100
                if (prob > 1.0 && prob <= 100.0) prob = prob / 100.0;
                prob = Math.max(0.0, Math.min(1.0, prob));

                double impacto = r.getImpacto() != null ? Math.max(0.0, r.getImpacto()) : 0.0;
                double exposicao = prob * impacto;
                exposicaoTotalRiscos += exposicao;

                double proporcaoProjeto = duracaoCpm > 0 ? exposicao / (double) duracaoCpm : 0.0;
                String severidade;
                if (proporcaoProjeto >= 0.10) {
                    severidade = "Crítico";
                } else if (proporcaoProjeto >= 0.05) {
                    severidade = "Alto";
                } else if (proporcaoProjeto >= 0.02) {
                    severidade = "Médio";
                } else {
                    severidade = "Baixo";
                }

                riscosAnalisados.add(new RiscoAnalisado(
                    r.getId(),
                    r.getDescricao() != null ? r.getDescricao() : "Risco sem descrição",
                    round(prob, 2),
                    round(impacto, 1),
                    round(exposicao, 1),
                    severidade
                ));
            }
        } else {
            alertas.add("Nenhum risco cadastrado. As previsões estocásticas consideram incerteza padrão.");
        }

        // 6. Previsão Estocástica (Simulação de Monte Carlo com 2000 iterações determinísticas)
        long seed = (projetoId != null ? projetoId * 31L : 7L) + tarefas.size() * 101L + (long) (valorAgregadoReal * 1000L);
        Random rng = new Random(seed);

        int N_SIMULACOES = 2000;
        double[] duracoesRestantesSimuladas = new double[N_SIMULACOES];

        double lowSpread = (p10Historico != null && medianaHistorica != null && medianaHistorica > 0)
            ? p10Historico / medianaHistorica
            : 0.85;
        double highSpread = (p90Historico != null && medianaHistorica != null && medianaHistorica > 0)
            ? p90Historico / medianaHistorica
            : 1.45;

        for (int i = 0; i < N_SIMULACOES; i++) {
            // Executa passagem direta no trabalho restante com variações triangulares
            Map<Long, Double> efSimulado = new HashMap<>();

            for (TarefaCronograma tc : tarefasCronograma) {
                double pctRestante = Math.max(0.0, 1.0 - (tc.percentualConcluido() / 100.0));
                double durBaseRestante = tc.duracao() * pctRestante;

                double variacao = sampleTriangular(rng, lowSpread * fatorCalibracao, fatorCalibracao, highSpread * fatorCalibracao);
                double durSimulada = durBaseRestante * variacao;

                double maxEfPred = (double) diasDecorridos;
                List<Long> preds = cpm.predecessorasValidas().get(tc.id());
                if (preds != null) {
                    for (Long p : preds) {
                        maxEfPred = Math.max(maxEfPred, efSimulado.getOrDefault(p, (double) diasDecorridos));
                    }
                }

                efSimulado.put(tc.id(), maxEfPred + durSimulada);
            }

            double maxFim = (double) diasDecorridos;
            for (double f : efSimulado.values()) {
                maxFim = Math.max(maxFim, f);
            }

            // Impacto dos riscos cadastrados (Bernoulli trial)
            if (riscos != null) {
                for (Risco r : riscos) {
                    double p = r.getProbabilidade() != null ? r.getProbabilidade() : 0.0;
                    if (p > 1.0 && p <= 100.0) p /= 100.0;
                    if (p > 0 && rng.nextDouble() < p) {
                        double imp = r.getImpacto() != null ? r.getImpacto() : 0.0;
                        maxFim += imp;
                    }
                }
            }

            duracoesRestantesSimuladas[i] = maxFim;
        }

        Arrays.sort(duracoesRestantesSimuladas);
        double p50Dias = duracoesRestantesSimuladas[(int) (N_SIMULACOES * 0.50)];
        double p80Dias = duracoesRestantesSimuladas[(int) (N_SIMULACOES * 0.80)];

        LocalDate dataTerminoP50 = dataInicio.plusDays((long) Math.ceil(p50Dias));
        LocalDate dataTerminoP80 = dataInicio.plusDays((long) Math.ceil(p80Dias));

        // Data término Earned Schedule determinística
        LocalDate dataTerminoEarnedSchedule;
        if (todasConcluidas) {
            dataTerminoEarnedSchedule = dataUltimaConclusao != null ? dataUltimaConclusao : dataFimCpm;
        } else if (spi != null && spi > 0.1) {
            long duracaoTotalEstimada = (long) Math.ceil(duracaoCpm / spi);
            dataTerminoEarnedSchedule = dataInicio.plusDays(duracaoTotalEstimada);
        } else {
            dataTerminoEarnedSchedule = dataFimCpm;
        }

        // Probabilidade de término no prazo
        LocalDate prazoRef = prazoContratado != null ? prazoContratado : dataFimCpm;
        long diasMaxPermitidos = ChronoUnit.DAYS.between(dataInicio, prazoRef);
        int dentroDoPrazo = 0;
        for (double d : duracoesRestantesSimuladas) {
            if (d <= diasMaxPermitidos) dentroDoPrazo++;
        }
        Double probabilidadeNoPrazo = todasConcluidas
            ? (atrasoDias <= 0 ? 100.0 : 0.0)
            : round(((double) dentroDoPrazo / (double) N_SIMULACOES) * 100.0, 1);

        Previsao previsao = new Previsao(
            true,
            "Monte Carlo (2000 simulações) + Earned Schedule",
            dataTerminoEarnedSchedule,
            dataTerminoP50,
            dataTerminoP80,
            probabilidadeNoPrazo,
            round(fatorCalibracao, 2),
            razoesDuracao.size(),
            "Estimativas calculadas com calibração empírica e modelagem estocástica de gargalos."
        );

        // 7. Cálculo do Score de Saúde do Projeto
        Integer scoreSaude;
        if (todasConcluidas) {
            scoreSaude = (int) Math.max(0, Math.min(100, 100 - (atrasoDias * 5)));
        } else {
            double componentePrazo = (probabilidadeNoPrazo != null ? probabilidadeNoPrazo : 50.0);
            double componenteSpi = (spi != null ? Math.min(1.0, spi) : 1.0) * 100.0;
            double limiteExposicao = Math.max(1.0, duracaoCpm * 0.20);
            double penalidadeRisco = Math.min(1.0, exposicaoTotalRiscos / limiteExposicao) * 100.0;
            double componenteRisco = 100.0 - penalidadeRisco;

            double scoreDouble = (0.50 * componentePrazo) + (0.30 * componenteSpi) + (0.20 * componenteRisco);
            scoreSaude = (int) Math.round(Math.max(10, Math.min(100, scoreDouble)));
        }

        // 8. Histórico e Tendência
        Integer ultimoScore = null;
        String tendenciaScore = "SEM_HISTORICO";
        if (analisesAnteriores != null && !analisesAnteriores.isEmpty()) {
            ultimoScore = analisesAnteriores.get(0).getScoreSaude();
            if (ultimoScore != null && scoreSaude != null) {
                int delta = scoreSaude - ultimoScore;
                if (delta >= 3) {
                    tendenciaScore = "MELHORANDO";
                } else if (delta <= -3) {
                    tendenciaScore = "PIORANDO";
                } else {
                    tendenciaScore = "ESTAVEL";
                }
            }
        }

        int concluidasComAtraso = 0;
        for (TarefaCronograma tc : tarefasCronograma) {
            if ("CONCLUIDA_COM_ATRASO".equals(tc.situacao())) concluidasComAtraso++;
        }

        Historico historico = new Historico(
            razoesDuracao.size(),
            medianaHistorica != null ? round(medianaHistorica, 2) : null,
            p10Historico != null ? round(p10Historico, 2) : null,
            p90Historico != null ? round(p90Historico, 2) : null,
            concluidas,
            concluidasComAtraso,
            analisesAnteriores != null ? analisesAnteriores.size() : 0,
            ultimoScore,
            tendenciaScore
        );

        // 9. Lições Aprendidas Relevantes via RAG
        List<String> categoriasPrioritarias = new ArrayList<>();
        if ("ATRASADO".equals(situacaoPrazo)) categoriasPrioritarias.add("Cronograma");
        if (!riscosAnalisados.isEmpty()) categoriasPrioritarias.add("Riscos");

        String descRiscos = (riscos != null)
            ? riscos.stream().map(Risco::getDescricao).filter(Objects::nonNull).collect(Collectors.joining(" "))
            : "";
        String contextoBusca = nomeProjeto + " " + (projeto != null && projeto.getDescricao() != null ? projeto.getDescricao() : "")
            + " " + tarefas.stream().map(Tarefa::getDescricao).filter(Objects::nonNull).collect(Collectors.joining(" "))
            + " " + descRiscos;

        List<LicaoAprendida> licoesRankeadas = RAGService.rankear(todasLicoes, contextoBusca, categoriasPrioritarias, 5);
        List<String> licoesDescricoes = licoesRankeadas.stream()
            .map(LicaoAprendida::getDescricaoConhecimento)
            .collect(Collectors.toList());

        // Montagem final do DTO
        int tarefasCriticasCount = (int) tarefasCronograma.stream().filter(TarefaCronograma::critica).count();
        double pctCritico = tarefas.size() > 0 ? ((double) tarefasCriticasCount / tarefas.size()) * 100.0 : 0.0;
        double densidadeDeps = tarefas.size() > 0 ? (double) totalDependencias / tarefas.size() : 0.0;
        double mediaDuracao = tarefas.size() > 0 ? somaDuracoes / tarefas.size() : 0.0;

        Caracteristicas caracteristicas = new Caracteristicas(
            tarefas.size(),
            concluidas,
            emAndamento,
            naoIniciadas,
            semDuracao,
            duracaoCpm,
            round(mediaDuracao, 1),
            tarefasCriticasCount,
            round(pctCritico, 1),
            round(densidadeDeps, 2),
            semPredecessora
        );

        Cronograma cronograma = new Cronograma(
            dataInicio,
            dataFimCpm,
            prazoContratado,
            diasDecorridos,
            round(progressoRealPct, 1),
            round(progressoPlanejadoPct, 1),
            spi != null ? round(spi, 2) : null,
            round(atrasoDias, 1),
            situacaoPrazo,
            tarefasCronograma
        );

        return new AnaliseProjetoDTO(
            projetoId,
            nomeProjeto,
            scoreSaude,
            caracteristicas,
            cronograma,
            previsao,
            riscosAnalisados,
            round(exposicaoTotalRiscos, 1),
            historico,
            licoesDescricoes,
            alertas,
            premissas
        );
    }

    /**
     * Formata a análise completa como contexto analítico rico para a IA Gemini.
     */
    public String formatarParaPrompt(AnaliseProjetoDTO a) {
        if (a == null) return "[Sem dados analíticos do projeto]";

        StringBuilder sb = new StringBuilder();
        sb.append("=== METADADOS ANALÍTICOS DO PROJETO (BASE QUANTITATIVA DETERMINÍSTICA E PREDITIVA) ===\n");
        sb.append(String.format("Projeto: %s (ID: %s) | Score de Saúde: %s/100 (Tendência: %s)\n",
            a.nomeProjeto(), a.projetoId(), a.scoreSaude() != null ? a.scoreSaude() : "N/D", a.historico().tendenciaScore()));

        sb.append("\n[1. CARACTERÍSTICAS E ESTRUTURA]\n");
        Caracteristicas c = a.caracteristicas();
        sb.append(String.format("- Total de Tarefas: %d (Concluídas: %d | Em Andamento: %d | Não Iniciadas: %d)\n",
            c.totalTarefas(), c.concluidas(), c.emAndamento(), c.naoIniciadas()));
        sb.append(String.format("- Duração CPM: %d dias corridos | Duração Média: %.1f dias\n",
            c.duracaoCpmDias(), c.duracaoMediaDias()));
        sb.append(String.format("- Gargalos no Caminho Crítico: %d tarefas (%.1f%% do projeto) | Densidade de Dependências: %.2f\n",
            c.tarefasCriticas(), c.percentualCritico(), c.densidadeDependencias()));

        sb.append("\n[2. DIAGNÓSTICO DE PRAZO E CRONOGRAMA]\n");
        Cronograma cr = a.cronograma();
        sb.append(String.format("- Início: %s | Término CPM: %s | Prazo Contratado: %s\n",
            cr.dataInicio() != null ? cr.dataInicio().format(DATE_FMT) : "N/D",
            cr.dataFimEstimadaCpm() != null ? cr.dataFimEstimadaCpm().format(DATE_FMT) : "N/D",
            cr.dataPrazoContratado() != null ? cr.dataPrazoContratado().format(DATE_FMT) : "Não fixado"));
        sb.append(String.format("- Dias Decorridos: %d dias\n", cr.diasDecorridos()));
        sb.append(String.format("- Progresso Físico Real: %.1f%% | Progresso Planejado (PV): %.1f%%\n",
            cr.progressoRealPercentual(), cr.progressoPlanejadoPercentual()));
        sb.append(String.format("- Índice de Desempenho do Prazo (SPI): %s\n",
            cr.spi() != null ? String.format("%.2f", cr.spi()) : "N/D"));
        sb.append(String.format("- Situação Oficial: %s | Variação de Prazo: %.1f dias %s\n",
            cr.situacaoPrazo(), Math.abs(cr.atrasoDias()), cr.atrasoDias() > 0 ? "de atraso acumulado" : (cr.atrasoDias() < 0 ? "de adiantamento" : "em dia")));

        sb.append("\n[3. PREVISÕES (MONTE CARLO + EARNED SCHEDULE)]\n");
        Previsao p = a.previsao();
        sb.append(String.format("- Método: %s (Calibração: x%.2f com %d amostras históricas)\n",
            p.metodo(), p.fatorCalibracaoHistorica(), p.amostrasHistoricas()));
        sb.append(String.format("- Término mais provável (P50 - Mediana): %s\n",
            p.dataTerminoP50() != null ? p.dataTerminoP50().format(DATE_FMT) : "N/D"));
        sb.append(String.format("- Término conservador com riscos (P80): %s\n",
            p.dataTerminoP80() != null ? p.dataTerminoP80().format(DATE_FMT) : "N/D"));
        sb.append(String.format("- Probabilidade de entrega dentro do prazo contratado: %s%%\n",
            p.probabilidadeNoPrazo() != null ? String.format("%.1f", p.probabilidadeNoPrazo()) : "N/D"));

        sb.append("\n[4. ANÁLISE QUANTITATIVA DE RISCOS]\n");
        sb.append(String.format("- Exposição Total a Riscos: %.1f dias de atraso potencial\n", a.exposicaoTotalRiscosDias()));
        if (a.riscos().isEmpty()) {
            sb.append("- Nenhum risco específico cadastrado para este projeto.\n");
        } else {
            for (RiscoAnalisado r : a.riscos()) {
                sb.append(String.format("  * [%s] %s (Probabilidade: %.0f%% | Impacto: %.1f dias | Exposição: %.1f dias)\n",
                    r.severidade(), r.descricao(), r.probabilidade() * 100, r.impactoDias(), r.exposicaoDias()));
            }
        }

        sb.append("\n[5. HISTÓRICO E LIÇÕES APRENDIDAS IDENTIFICADAS (RAG)]\n");
        if (a.licoesRelevantes().isEmpty()) {
            sb.append("- Nenhuma lição aprendida correlacionada no banco de conhecimento.\n");
        } else {
            for (String l : a.licoesRelevantes()) {
                sb.append("  * ").append(l).append("\n");
            }
        }

        if (!a.alertas().isEmpty()) {
            sb.append("\n[6. ALERTAS DO SISTEMA]\n");
            for (String al : a.alertas()) {
                sb.append("  ! ").append(al).append("\n");
            }
        }
        sb.append("=== FIM DOS METADADOS ANALÍTICOS ===\n");

        return sb.toString();
    }

    private static double sampleTriangular(Random rng, double low, double mode, double high) {
        if (low >= high) return mode;
        double u = rng.nextDouble();
        double c = (mode - low) / (high - low);
        if (u <= c) {
            return low + Math.sqrt(u * (high - low) * (mode - low));
        } else {
            return high - Math.sqrt((1.0 - u) * (high - low) * (high - mode));
        }
    }

    private static double percentil(List<Double> lista, double p) {
        if (lista.isEmpty()) return 1.0;
        int idx = (int) Math.round((p / 100.0) * (lista.size() - 1));
        idx = Math.max(0, Math.min(lista.size() - 1, idx));
        return lista.get(idx);
    }

    private static double round(double val, int casas) {
        double mult = Math.pow(10, casas);
        return Math.round(val * mult) / mult;
    }
}
