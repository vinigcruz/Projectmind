package com.projectmind.service;

import com.projectmind.domain.LicaoAprendida;
import com.projectmind.domain.Projeto;
import com.projectmind.domain.Risco;
import com.projectmind.domain.Tarefa;
import com.projectmind.repository.LicaoAprendidaRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class RAGService {

    private final LicaoAprendidaRepository licaoAprendidaRepository;

    private static final Set<String> STOPWORDS = Set.of(
        "projeto", "projetos", "para", "com", "uma", "um", "este", "esta", "esse", "essa",
        "como", "sobre", "pela", "pelo", "entre", "quando", "onde", "qual", "quais",
        "mais", "muito", "cada", "deve", "devem", "sera", "foram", "pode", "podem",
        "fazer", "sendo", "tudo", "todo", "toda", "todos", "todas", "antes", "depois",
        "evita", "reduz", "durante", "contexto", "mitigar", "preventivamente"
    );

    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    public RAGService(LicaoAprendidaRepository licaoAprendidaRepository) {
        this.licaoAprendidaRepository = licaoAprendidaRepository;
    }

    public List<LicaoAprendida> todasAsLicoes() {
        return licaoAprendidaRepository.findAll();
    }

    public LicaoAprendida salvarLicao(String categoria, String descricao) {
        if (descricao == null || descricao.trim().isEmpty()) return null;
        String descLimpa = descricao.trim();
        String catLimpa = (categoria != null && !categoria.trim().isEmpty()) ? categoria.trim() : "Geral";

        // Evita duplicatas exatas ou quase idênticas
        List<LicaoAprendida> existentes = licaoAprendidaRepository.findAll();
        String normNova = normalizarTexto(descLimpa);
        for (LicaoAprendida ex : existentes) {
            if (ex.getDescricaoConhecimento() != null && normalizarTexto(ex.getDescricaoConhecimento()).equals(normNova)) {
                return ex;
            }
        }

        LicaoAprendida nova = new LicaoAprendida();
        nova.setCategoria(catLimpa);
        nova.setDescricaoConhecimento(descLimpa);
        return licaoAprendidaRepository.save(nova);
    }

    public boolean excluirLicao(Long id) {
        if (id == null || !licaoAprendidaRepository.existsById(id)) return false;
        licaoAprendidaRepository.deleteById(id);
        return true;
    }

    /**
     * Aprendizado automático (Auto-RAG) a partir do cadastro ou atualização de riscos do projeto.
     */
    public void aprenderComRisco(Projeto projeto, Risco risco) {
        if (risco == null || risco.getDescricao() == null || risco.getDescricao().isBlank()) return;
        double prob = risco.getProbabilidade() != null ? risco.getProbabilidade() : 0.5;
        if (prob > 1.0) prob /= 100.0;
        double imp = risco.getImpacto() != null ? risco.getImpacto() : 1.0;

        String nomeProj = (projeto != null && projeto.getNome() != null) ? projeto.getNome() : "projeto";
        String textoLicao = String.format(
            "Mitigação de Risco (%s): Monitorar '%s' (Probabilidade: %.0f%%, Impacto: %.0f dias) com plano de contingência prévio para proteger o caminho crítico.",
            nomeProj, risco.getDescricao().trim(), prob * 100, imp
        );
        salvarLicao("Riscos", textoLicao);
    }

    /**
     * Aprendizado automático (Auto-RAG) a partir da conclusão de tarefas do projeto.
     */
    public void aprenderComTarefaConcluida(Projeto projeto, Tarefa tarefa) {
        if (tarefa == null || tarefa.getDescricao() == null || tarefa.getDescricao().isBlank()) return;
        int durPlanejada = (tarefa.getDuracaoDias() != null && tarefa.getDuracaoDias() > 0) ? tarefa.getDuracaoDias() : 1;
        long durReal = durPlanejada;
        if (tarefa.getDataInicioReal() != null && tarefa.getDataConclusaoReal() != null) {
            long diff = ChronoUnit.DAYS.between(tarefa.getDataInicioReal(), tarefa.getDataConclusaoReal());
            if (diff > 0) durReal = diff;
        }

        String nomeProj = (projeto != null && projeto.getNome() != null) ? projeto.getNome() : "projeto";
        String textoLicao;
        if (durReal > durPlanejada) {
            textoLicao = String.format(
                "Calibração de Cronograma (%s): A entrega '%s' levou %d dias ante %d dias estimados; recomenda-se reservar buffer técnico em tarefas similares.",
                nomeProj, tarefa.getDescricao().trim(), durReal, durPlanejada
            );
        } else {
            textoLicao = String.format(
                "Execução Validada (%s): A conclusão da etapa '%s' (%d dias) confirma a viabilidade do sequenciamento adotado no backlog.",
                nomeProj, tarefa.getDescricao().trim(), durPlanejada
            );
        }
        salvarLicao("Cronograma", textoLicao);
    }

    public List<LicaoAprendida> buscarLicoesRelevantes(String contextoProjeto) {
        List<LicaoAprendida> todas = todasAsLicoes();
        return rankear(todas, contextoProjeto, Collections.emptyList(), 5);
    }

    /**
     * Rankeamento de lições aprendidas baseado em similaridade léxica (TF-Overlap) e priorização contextual.
     */
    public static List<LicaoAprendida> rankear(
        List<LicaoAprendida> licoes,
        String contexto,
        List<String> categoriasPrioritarias,
        int limite
    ) {
        if (licoes == null || licoes.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> termosContexto = extrairTermos(contexto);
        Set<String> catPrioritariasNormalizadas = categoriasPrioritarias != null
            ? categoriasPrioritarias.stream().map(RAGService::normalizarTexto).collect(Collectors.toSet())
            : Collections.emptySet();

        record ScoredLicao(LicaoAprendida licao, double score, double overlap) {}

        List<ScoredLicao> pontuadas = new ArrayList<>();

        for (LicaoAprendida l : licoes) {
            String textoCompleto = (l.getCategoria() != null ? l.getCategoria() + " " : "")
                + (l.getDescricaoConhecimento() != null ? l.getDescricaoConhecimento() : "");
            Set<String> termosLicao = extrairTermos(textoCompleto);

            double overlap = 0.0;
            for (String t : termosLicao) {
                if (termosContexto.contains(t)) {
                    overlap += 1.0;
                }
            }

            // Peso principal na interseção léxica real com as tarefas, riscos e descrição do projeto
            double score = termosLicao.isEmpty() ? 0.0 : (overlap * 2.5) / Math.sqrt(termosLicao.size());

            // Boost moderado por categoria prioritária (desempate técnico ou reforço quando já há aderência)
            if (l.getCategoria() != null && catPrioritariasNormalizadas.contains(normalizarTexto(l.getCategoria()))) {
                score += (overlap > 0 ? 0.8 : 0.25);
            }

            pontuadas.add(new ScoredLicao(l, score, overlap));
        }

        // Ordena primeiro pelas que têm overlap léxico real, depois pelo score total e pelas mais recentes (maior ID)
        pontuadas.sort((a, b) -> {
            if ((a.overlap > 0) != (b.overlap > 0)) {
                return a.overlap > 0 ? -1 : 1;
            }
            int cmpScore = Double.compare(b.score, a.score);
            if (cmpScore != 0) return cmpScore;
            Long idA = a.licao.getId() != null ? a.licao.getId() : 0L;
            Long idB = b.licao.getId() != null ? b.licao.getId() : 0L;
            return Long.compare(idB, idA);
        });

        List<LicaoAprendida> resultado = pontuadas.stream()
            .filter(p -> p.score > 0.0)
            .map(p -> p.licao)
            .limit(limite)
            .collect(Collectors.toList());

        if (resultado.isEmpty()) {
            resultado = licoes.stream()
                .filter(l -> "Geral".equalsIgnoreCase(l.getCategoria()))
                .limit(limite)
                .collect(Collectors.toList());

            if (resultado.isEmpty()) {
                resultado = licoes.stream().limit(limite).collect(Collectors.toList());
            }
        }

        return resultado;
    }

    private static Set<String> extrairTermos(String texto) {
        if (texto == null || texto.isBlank()) return Collections.emptySet();
        String normalizado = normalizarTexto(texto);
        String[] tokens = normalizado.split("[^a-z0-9]+");

        Set<String> termos = new HashSet<>();
        for (String tok : tokens) {
            if (tok.length() >= 3 && !STOPWORDS.contains(tok)) {
                if (tok.endsWith("oes") && tok.length() > 5) {
                    tok = tok.substring(0, tok.length() - 3) + "ao";
                } else if (tok.endsWith("s") && tok.length() > 4) {
                    tok = tok.substring(0, tok.length() - 1);
                }
                termos.add(tok);
            }
        }
        return termos;
    }

    private static String normalizarTexto(String texto) {
        if (texto == null) return "";
        String decomp = Normalizer.normalize(texto.toLowerCase(), Normalizer.Form.NFD);
        return DIACRITICS.matcher(decomp).replaceAll("");
    }
}
