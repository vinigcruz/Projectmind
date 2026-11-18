package com.projectmind.dto;

import java.time.LocalDate;
import java.util.List;

public record AnaliseProjetoDTO(
    Long projetoId,
    String nomeProjeto,
    Integer scoreSaude,
    Caracteristicas caracteristicas,
    Cronograma cronograma,
    Previsao previsao,
    List<RiscoAnalisado> riscos,
    double exposicaoTotalRiscosDias,
    Historico historico,
    List<String> licoesRelevantes,
    List<String> alertas,
    List<String> premissas
) {

    public AnaliseProjetoDTO semLicoes() {
        return new AnaliseProjetoDTO(
            projetoId,
            nomeProjeto,
            scoreSaude,
            caracteristicas,
            cronograma,
            previsao,
            riscos,
            exposicaoTotalRiscosDias,
            historico,
            List.of(),
            alertas,
            premissas
        );
    }

    public record Caracteristicas(
        int totalTarefas,
        int concluidas,
        int emAndamento,
        int naoIniciadas,
        int semDuracao,
        int duracaoCpmDias,
        double duracaoMediaDias,
        int tarefasCriticas,
        double percentualCritico,
        double densidadeDependencias,
        int tarefasSemPredecessora
    ) {}

    public record Cronograma(
        LocalDate dataInicio,
        LocalDate dataFimEstimadaCpm,
        LocalDate dataPrazoContratado,
        long diasDecorridos,
        double progressoRealPercentual,
        double progressoPlanejadoPercentual,
        Double spi,
        double atrasoDias,
        String situacaoPrazo, // NAO_INICIADO, NO_PRAZO, ATRASADO, ADIANTADO, CONCLUIDO, SEM_DADOS
        List<TarefaCronograma> tarefas
    ) {}

    public record TarefaCronograma(
        Long id,
        String descricao,
        int duracao,
        int inicioMaisCedo,
        int fimMaisCedo,
        int folga,
        boolean critica,
        int percentualConcluido,
        LocalDate dataInicioEstimada,
        LocalDate dataFimEstimada,
        LocalDate dataConclusaoReal,
        String situacao,
        long diasAtraso
    ) {}

    public record Previsao(
        boolean disponivel,
        String metodo,
        LocalDate dataTerminoEarnedSchedule,
        LocalDate dataTerminoP50,
        LocalDate dataTerminoP80,
        Double probabilidadeNoPrazo,
        double fatorCalibracaoHistorica,
        int amostrasHistoricas,
        String observacao
    ) {}

    public record RiscoAnalisado(
        Long id,
        String descricao,
        double probabilidade,
        double impactoDias,
        double exposicaoDias,
        String severidade
    ) {}

    public record Historico(
        int amostrasHistoricasUsuario,
        Double razaoDuracaoMediana,
        Double razaoDuracaoP10,
        Double razaoDuracaoP90,
        int tarefasConcluidasProjeto,
        int tarefasConcluidasComAtraso,
        int analisesAnteriores,
        Integer ultimoScore,
        String tendenciaScore // MELHORANDO, ESTAVEL, PIORANDO, SEM_HISTORICO
    ) {}
}
